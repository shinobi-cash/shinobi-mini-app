/**
 * Unified Key Derivation Service — Deterministic + Session Restore + Zero Secrets
 * - Password: PBKDF2 with hybrid salt (deterministic + per-account random public salt)
 * - Passkey: WebAuthn PRF (HMAC-Secret) to derive deterministic bytes with UV, then HKDF -> AES-GCM
 * - Sessions: sessionStorage (UX-only), plus localStorage for per-account public salt
 */

const CONFIG = {
  PBKDF2_ITERATIONS: 310_000, // modern baseline
  KEY_LENGTH: 256, // AES-256
  HASH_ALGORITHM: "SHA-256",
  SALT_PREFIX: "shinobi-salt-",
  HKDF_INFO: new TextEncoder().encode("shinobi-kdf-v1"),
  SESSION_KEY: "shinobi_session",
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24h
};

export interface DerivedKeyResult {
  symmetricKey: CryptoKey;
  salt: Uint8Array; // combined salt used (password flow) or account salt (passkey flow)
}

export interface SessionInfo {
  accountName: string;
  authMethod: "passkey" | "password";
  lastAuthTime: number;
  environment: "iframe" | "native";
  credentialId?: string; // for quick passkey re-auth
}

/* -------------------------- Salt Utilities -------------------------- */

async function generateAccountSalt(accountName: string): Promise<Uint8Array> {
  const saltInput = CONFIG.SALT_PREFIX + accountName.toLowerCase().trim();
  const hash = await crypto.subtle.digest(CONFIG.HASH_ALGORITHM, new TextEncoder().encode(saltInput));
  return new Uint8Array(hash); // 32 bytes
}

function getOrCreateUserSalt(accountName: string): Uint8Array {
  const key = `shinobi_user_salt:${accountName.toLowerCase().trim()}`;
  const existing = localStorage.getItem(key);
  if (existing) return base64ToBytes(existing);

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  localStorage.setItem(key, bytesToBase64(salt)); // not a secret
  return salt;
}

async function buildHybridSalt(accountName: string): Promise<Uint8Array> {
  const accountSalt = await generateAccountSalt(accountName); // 32 bytes
  const userSalt = getOrCreateUserSalt(accountName); // 16 bytes
  const out = new Uint8Array(accountSalt.length + userSalt.length);
  out.set(accountSalt, 0);
  out.set(userSalt, accountSalt.length);
  return out; // 48 bytes
}

/* ---------------------- Password: PBKDF2 -> AES --------------------- */

async function deriveKeyFromPassword(password: string, accountName: string): Promise<DerivedKeyResult> {
  const salt = await buildHybridSalt(accountName);

  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);

  const symmetricKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: CONFIG.PBKDF2_ITERATIONS,
      hash: CONFIG.HASH_ALGORITHM,
    },
    keyMaterial,
    { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );

  return { symmetricKey, salt };
}

/* ---------------- Passkey: WebAuthn PRF (HKDF -> AES) --------------- */
/**
 * Derive deterministic bytes from authenticator using PRF extension.
 * Requires user verification and an existing credentialId.
 * Uses a random challenge (no replay), determinism comes from PRF input + credential secret.
 */
async function getPasskeyDerivedBytes(accountName: string, credentialId: string): Promise<Uint8Array> {
  const challenge = crypto.getRandomValues(new Uint8Array(32)); // MUST be random

  // PRF input ties derivation to this account and RP
  const prfInput = new TextEncoder().encode(`shinobi-prf:${accountName.toLowerCase().trim()}`);

  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: base64urlToArrayBuffer(credentialId), type: "public-key" }],
      userVerification: "required",
      timeout: 60_000,
      extensions: {
        // WebAuthn Level 3 PRF (aka hmac-secret). Some platforms gate behind "prf".
        prf: { eval: { first: prfInput } },
      },
    },
  })) as PublicKeyCredential | null;

  if (!cred || !cred.response) {
    throw new Error("Passkey authentication failed - no assertion received");
  }

  const extResults = cred.getClientExtensionResults?.() ?? {};
  const prf = extResults?.prf;
  const first: ArrayBuffer | undefined = prf?.results?.first as ArrayBuffer | undefined;

  if (!first || !(first instanceof ArrayBuffer)) {
    // Deterministic derivation cannot be guaranteed without PRF.
    throw new Error(
      "Authenticator does not support PRF (hmac-secret) extension; deterministic passkey KDF unavailable.",
    );
  }

  return new Uint8Array(first); // Deterministic per (credential, input, RP) with UV
}

async function deriveKeyFromPasskey(accountName: string, credentialId: string): Promise<DerivedKeyResult> {
  // PRF-derived bytes -> HKDF -> AES-GCM
  const prfBytes = await getPasskeyDerivedBytes(accountName, credentialId);

  // You can still include the account salt as HKDF salt (recommended).
  const accountSalt = await generateAccountSalt(accountName);

  const keyMaterial = await crypto.subtle.importKey("raw", prfBytes, "HKDF", false, ["deriveKey"]);
  const symmetricKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: accountSalt,
      info: CONFIG.HKDF_INFO,
      hash: CONFIG.HASH_ALGORITHM,
    },
    keyMaterial,
    { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );

  // Return accountSalt (not hybrid) here; userSalt is not needed in passkey PRF flow
  return { symmetricKey, salt: accountSalt };
}

/* ----------------------- Passkey Registration ----------------------- */

export async function createPasskeyCredential(
  accountName: string,
  userHandle: string, // stable user handle for WebAuthn "user.id" (not secret)
): Promise<{ credentialId: string }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(userHandle);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "Shinobi Privacy Pool",
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: accountName,
        displayName: accountName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
      extensions: {
        // Advertise PRF support at registration if available; some authenticators use it to bind derivation
        prf: { eval: { first: new TextEncoder().encode("shinobi-prf:probe") } },
      },
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Failed to create passkey credential");

  return { credentialId: credential.id };
}

/* -------------------------- Session Handling ------------------------ */

export function storeSessionInfo(
  accountName: string,
  authMethod: "passkey" | "password",
  opts?: { credentialId?: string },
): void {
  const isIframe = window.self !== window.top;
  const sessionInfo: SessionInfo = {
    accountName: accountName.trim(),
    authMethod,
    credentialId: opts?.credentialId,
    lastAuthTime: Date.now(),
    environment: isIframe ? "iframe" : "native",
  };
  try {
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionInfo));
  } catch (e) {
    console.warn("Failed to store session info:", e);
  }
}

export function getStoredSessionInfo(): SessionInfo | null {
  try {
    const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return null;
    const info: SessionInfo = JSON.parse(raw);

    if (Date.now() - info.lastAuthTime > CONFIG.SESSION_TIMEOUT_MS) {
      clearSessionInfo();
      return null;
    }
    const isIframe = window.self !== window.top;
    const env = isIframe ? "iframe" : "native";
    if (info.environment !== env) {
      clearSessionInfo();
      return null;
    }
    return info;
  } catch (e) {
    console.warn("Failed to get stored session:", e);
    return null;
  }
}

export function clearSessionInfo(): void {
  try {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear session info:", e);
  }
}

export function updateSessionLastAuth(): void {
  const s = getStoredSessionInfo();
  if (s) storeSessionInfo(s.accountName, s.authMethod, { credentialId: s.credentialId });
}

/* ------------------------ Quick Re-Auth Helpers --------------------- */
/**
 * Call this on page load. It:
 *  - reads session,
 *  - if passkey: immediately triggers WebAuthn + derives key,
 *  - if password: tells caller to prompt for password (no account selection).
 */
export async function resumeAuth(): Promise<
  | { status: "passkey-ready"; result: DerivedKeyResult; accountName: string }
  | { status: "password-needed"; accountName: string }
  | { status: "none" }
> {
  const session = getStoredSessionInfo();
  if (!session) return { status: "none" };

  if (session.authMethod === "passkey" && session.credentialId) {
    const result = await deriveKeyFromPasskey(session.accountName, session.credentialId);
    updateSessionLastAuth();
    return { status: "passkey-ready", result, accountName: session.accountName };
  }

  if (session.authMethod === "password") {
    return { status: "password-needed", accountName: session.accountName };
  }

  return { status: "none" };
}

/* ------------------------------ Helpers ----------------------------- */

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ---------------------- Public API (Explicit) ----------------------- */

export const KDF = {
  deriveKeyFromPassword, // (password, accountName) -> AES-GCM key
  deriveKeyFromPasskey, // (accountName, credentialId) -> AES-GCM key (PRF required)
  createPasskeyCredential, // returns { credentialId }
  storeSessionInfo,
  getStoredSessionInfo,
  clearSessionInfo,
  resumeAuth,
};
