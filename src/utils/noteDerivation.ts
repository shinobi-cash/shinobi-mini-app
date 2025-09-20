// utils/notes.ts
import type { Note } from "@/lib/storage/types";
import { poseidon2, poseidon3 } from "poseidon-lite";
import { encodePacked, getAddress, keccak256 } from "viem";

// BN254 scalar field (same as SNARK_SCALAR_FIELD)
const F = 21888242871839275222246405745257275088548364400416034343698204186575808495617n as const;

// ---- helpers --------------------------------------------------------------

const hexToBigInt = (hex: `0x${string}`) => BigInt(hex);
const modF = (x: bigint) => ((x % F) + F) % F;

// Turn an arbitrary byte string into a field element (uniform-ish reducer)
const fieldFromKeccak = (bytes: `0x${string}`) => modF(hexToBigInt(keccak256(bytes)));

// Normalize EIP-55 and pack typed context deterministically
function contextField(
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
  tag: `0x${string}`,
) {
  const addr = getAddress(poolAddress); // checksum normalize
  // Note: pack as (address, uint64, uint64, bytes32 tag)
  const packed = encodePacked(
    ["address", "uint64", "uint64", "bytes32"],
    [addr, BigInt(depositIndex), BigInt(changeIndex), tag],
  );
  return fieldFromKeccak(packed);
}

// Poseidon2 is arity-2; use a keyed-PRF with domain separation: H2(key, H2(ctx, dom))
const prf2 = (key: bigint, ctx: bigint, dom: bigint) => modF(poseidon2([key, modF(poseidon2([ctx, dom]))]));

// Friendly parser for userKey provided as hex/decimal/bigint
export function parseUserKey(userKey: string | bigint): bigint {
  if (typeof userKey === "bigint") return modF(userKey);
  const s = userKey.trim();
  if (s.startsWith("0x")) return modF(hexToBigInt(s as `0x${string}`));
  return modF(BigInt(s)); // decimal string
}

// ---- domain tags (bytes32 -> field) ---------------------------------------

const TAG_DEPOSIT_NULLIFIER = keccak256(encodePacked(["string"], ["shinobi.cash:DepositNullifierV1"]));
const TAG_DEPOSIT_SECRET = keccak256(encodePacked(["string"], ["shinobi.cash:DepositSecretV1"]));
const TAG_CHANGE_NULLIFIER = keccak256(encodePacked(["string"], ["shinobi.cash:ChangeNullifierV1"]));
const TAG_CHANGE_SECRET = keccak256(encodePacked(["string"], ["shinobi.cash:ChangeSecretV1"]));
const TAG_REFUND_NULLIFIER = keccak256(encodePacked(["string"], ["shinobi.cash:RefundNullifierV1"]));
const TAG_REFUND_SECRET = keccak256(encodePacked(["string"], ["shinobi.cash:RefundSecretV1"]));

const DOM_DEPOSIT_NULLIFIER = fieldFromKeccak(TAG_DEPOSIT_NULLIFIER);
const DOM_DEPOSIT_SECRET = fieldFromKeccak(TAG_DEPOSIT_SECRET);
const DOM_CHANGE_NULLIFIER = fieldFromKeccak(TAG_CHANGE_NULLIFIER);
const DOM_CHANGE_SECRET = fieldFromKeccak(TAG_CHANGE_SECRET);

// ---- public API -----------------------------------------------------------

/** depositIndex-only (changeIndex implicitly 0) */
export function deriveDepositNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, 0n, TAG_DEPOSIT_NULLIFIER);
  return prf2(k, ctx, DOM_DEPOSIT_NULLIFIER);
}

export function deriveDepositSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, 0n, TAG_DEPOSIT_SECRET);
  return prf2(k, ctx, DOM_DEPOSIT_SECRET);
}

/** explicit changeIndex for withdrawal change notes */
export function deriveChangeNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_CHANGE_NULLIFIER);
  return prf2(k, ctx, DOM_CHANGE_NULLIFIER);
}

export function deriveChangeSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_CHANGE_SECRET);
  return prf2(k, ctx, DOM_CHANGE_SECRET);
}
export function deriveRefundNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_REFUND_NULLIFIER);
  return prf2(k, ctx, DOM_CHANGE_NULLIFIER);
}

export function deriveRefundSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_REFUND_SECRET);
  return prf2(k, ctx, DOM_CHANGE_SECRET);
}

// Note commitment based on smart contract and ZK circuit
export function derivedNoteCommitment(accountKey: bigint, note: Note): bigint {
  let nullifier: bigint;
  let secret: bigint;

  if (note.changeIndex === 0) {
    // Deposit note
    nullifier = deriveDepositNullifier(accountKey, note.poolAddress, note.depositIndex);
    secret = deriveDepositSecret(accountKey, note.poolAddress, note.depositIndex);
  } else {
    // Change note
    nullifier = deriveChangeNullifier(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
    secret = deriveChangeSecret(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
  }

  const precommitment = poseidon2([nullifier, secret]);
  const commitmentHash = poseidon3([BigInt(note.amount), BigInt(note.label), precommitment]);
  return commitmentHash;
}
