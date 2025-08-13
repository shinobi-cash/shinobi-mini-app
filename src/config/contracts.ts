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

export const PRIVACY_POOL_ABI = [
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