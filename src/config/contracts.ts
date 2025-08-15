// Deployed contract addresses on Base Sepolia
export const CONTRACTS = {
  // Your deployed SimplePrivacyPoolPaymaster
  PAYMASTER: "0x0f97BD2171F4Cdf912Ae6E6C074B228C45B610cF",
  
  // Expected smart account for deterministic pattern
  EXPECTED_SMART_ACCOUNT: "0xa3aBDC7f6334CD3EE466A115f30522377787c024",
  
  // Privacy Pool contracts
  PRIVACY_POOL_ENTRYPOINT: "0x67992c861b7559FBB6F5B6d55Cc383472D80e0A5",
  ETH_PRIVACY_POOL: "0xbBB978Ad37d847ffa1651900Ca75837212EBdf1f",
  
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

// Contract ABIs (minimal versions needed for interactions)
export const PAYMASTER_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "setExpectedSmartAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "expectedSmartAccount",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Privacy Pool Entry Point ABI (for deposits)
export const PRIVACY_POOL_ENTRYPOINT_ABI = [
  {
    inputs: [{ name: "_precommitment", type: "uint256" }],
    name: "deposit",
    outputs: [{ name: "_commitment", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_depositor", type: "address" },
      { indexed: true, name: "_pool", type: "address" },
      { indexed: false, name: "_commitment", type: "uint256" },
      { indexed: false, name: "_amount", type: "uint256" }
    ],
    name: "Deposited",
    type: "event",
  }
] as const

// Privacy Pool ABI (for events and pool interactions)
export const PRIVACY_POOL_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_depositor", type: "address" },
      { indexed: false, name: "_commitment", type: "uint256" },
      { indexed: false, name: "_label", type: "uint256" },
      { indexed: false, name: "_value", type: "uint256" },
      { indexed: false, name: "_precommitmentHash", type: "uint256" }
    ],
    name: "Deposited",
    type: "event",
  },
  {
    inputs: [
      { name: "withdrawal", type: "tuple", components: [] },
      { name: "proof", type: "tuple", components: [] }
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable", 
    type: "function",
  },
] as const

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

// Gas limits for different operations
export const GAS_LIMITS = {
  DEPOSIT: 500000n,
  WITHDRAW: 800000n,
} as const

// Utility function to get contract address by name
export function getContractAddress(contractName: keyof typeof CONTRACTS): `0x${string}` {
  return CONTRACTS[contractName] as `0x${string}`
}

// Utility function to validate network
export function isCorrectNetwork(chainId: number): boolean {
  return chainId === NETWORK.CHAIN_ID
}