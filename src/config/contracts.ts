// Deployed contract addresses on Base Sepolia (updated to match indexer)
export const CONTRACTS = {
  // SimplePrivacyPoolPaymaster (updated from indexer)
  PAYMASTER: "0xbF03af7e4870c5Cc4e3C4F9914239F5E093F959a",
  
  // Expected smart account for deterministic pattern
  EXPECTED_SMART_ACCOUNT: "0xa3aBDC7f6334CD3EE466A115f30522377787c024",
  
  // Privacy Pool contracts (updated from indexer)
  PRIVACY_POOL_ENTRYPOINT: "0xfBa5eDD64d4611ca50DD8dF9C4F94b895C66219b",
  ETH_PRIVACY_POOL: "0xB68E4f712bd0783fbc6b369409885c2319Db114a",
  
  // ERC-4337 EntryPoint (standard across networks)
  ERC4337_ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
} as const

// Network configuration
export const NETWORK = {
  CHAIN_ID: 84532, // Base Sepolia
  NAME: "Base Sepolia",
  RPC_URL: "https://sepolia.base.org",
  EXPLORER_URL: "https://sepolia.basescan.org",
} as const

// Types for deposit functionality
export interface DepositRecord {
  timestamp: string
  nullifier: string
  secret: string
  precommitment: string
  commitment: string
  label: string
  transactionHash: string
  blockNumber: string
  depositIndex: number
  amount: string
  status: "deposited" | "asp_approved" | "withdrawn"
}

// Default deposit amounts (in ETH)
export const DEFAULT_DEPOSIT_AMOUNTS = [
  "0.001",
  "0.01", 
  "0.1"
] as const

// Utility function to validate network
export function isCorrectNetwork(chainId: number): boolean {
  return chainId === NETWORK.CHAIN_ID
}

export const BUNDLER_URL = `https://api.pimlico.io/v2/84532/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`