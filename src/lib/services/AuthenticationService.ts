/**
 * Authentication Service - Pure business logic
 * Extracted from AuthContext.tsx to separate auth flows from React state and storage coupling
 */

import type { KeyGenerationResult } from "@/utils/crypto";
import { restoreFromMnemonic } from "@/utils/crypto";
import { getAccountKey } from "@/utils/accountKey";
import type { IAuthStorageProvider } from "./interfaces/IAuthStorageProvider";

export interface AuthState {
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null;
}

export interface QuickAuthState {
  show: boolean;
  accountName: string;
}

export interface SessionRestorationResult {
  status: "passkey-ready" | "password-needed" | "none";
  authState?: AuthState;
  quickAuthState?: QuickAuthState;
}

export class AuthenticationService {
  constructor(private storageProvider: IAuthStorageProvider) {}

  /**
   * Restore session from stored auth info - exact logic from AuthContext.tsx
   */
  async restoreSession(): Promise<SessionRestorationResult> {
    try {
      const sessionInfo = await this.storageProvider.getStoredSessionInfo();
      if (!sessionInfo) {
        return { status: "none" };
      }

      if (sessionInfo.authMethod === "passkey" && sessionInfo.credentialId) {
        // Auto-restore passkey session
        const keyResult = await this.storageProvider.deriveKeyFromPasskey(
          sessionInfo.accountName,
          sessionInfo.credentialId,
        );
        const authState = await this.restoreFromSessionKey(keyResult.symmetricKey, sessionInfo.accountName);

        return {
          status: "passkey-ready",
          authState,
        };
      }

      if (sessionInfo.authMethod === "password") {
        // Show password prompt for this specific account
        return {
          status: "password-needed",
          quickAuthState: {
            show: true,
            accountName: sessionInfo.accountName,
          },
        };
      }

      return { status: "none" };
    } catch (error) {
      console.error("Session restoration failed:", error);

      // Only clear session if it's not a concurrent request error
      if (error instanceof Error && error.message.includes("A request is already pending")) {
        console.warn("WebAuthn request collision detected, skipping session clear");
      } else {
        await this.storageProvider.clearSessionInfo();
      }

      return { status: "none" };
    }
  }

  /**
   * Restore from session key - exact logic from AuthContext.tsx restoreFromSessionKey
   */
  private async restoreFromSessionKey(symmetricKey: CryptoKey, accountName: string): Promise<AuthState> {
    try {
      // Initialize storage with the derived key
      await this.storageProvider.initializeAccountSession(accountName, symmetricKey);

      // Retrieve and restore account keys
      const accountData = await this.storageProvider.getAccountData();
      if (!accountData) {
        throw new Error("Account data not found");
      }

      // Restore keys from mnemonic
      const restoredKeys = restoreFromMnemonic(accountData.mnemonic);

      return {
        publicKey: restoredKeys.publicKey,
        privateKey: restoredKeys.privateKey,
        mnemonic: accountData.mnemonic,
        accountKey: this.getAccountKey({
          privateKey: restoredKeys.privateKey,
          mnemonic: accountData.mnemonic,
        }),
      };
    } catch (error) {
      console.error("Failed to restore from session key:", error);
      throw error;
    }
  }

  /**
   * Handle quick password authentication - exact logic from AuthContext.tsx
   */
  async handleQuickPasswordAuth(password: string, accountName: string): Promise<AuthState> {
    try {
      const { symmetricKey } = await this.storageProvider.deriveKeyFromPassword(password, accountName);
      const authState = await this.restoreFromSessionKey(symmetricKey, accountName);

      // Update session timestamp
      await this.storageProvider.storeSessionInfo(accountName, "password");

      return authState;
    } catch (error) {
      console.error("Quick password auth failed:", error);
      throw error;
    }
  }

  /**
   * Set authentication keys - from AuthContext.tsx setKeys
   */
  createAuthStateFromKeys(keys: KeyGenerationResult): AuthState {
    return {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      mnemonic: keys.mnemonic,
      accountKey: this.getAccountKey({
        privateKey: keys.privateKey,
        mnemonic: keys.mnemonic,
      }),
    };
  }

  /**
   * Sign out - exact logic from AuthContext.tsx
   */
  async signOut(): Promise<void> {
    this.storageProvider.clearSession();
    await this.storageProvider.clearSessionInfo();
  }

  /**
   * Get account key - extracted from AuthContext.tsx useMemo logic
   */
  private getAccountKey(keys: { privateKey?: string; mnemonic?: string[] }): bigint | null {
    try {
      return getAccountKey({
        privateKey: keys.privateKey || undefined,
        mnemonic: keys.mnemonic || undefined,
      });
    } catch {
      return null;
    }
  }

  /**
   * Check if authenticated - extracted from AuthContext.tsx derived state
   */
  isAuthenticated(authState: AuthState): boolean {
    return !!(authState.privateKey && authState.mnemonic && authState.accountKey);
  }
}
