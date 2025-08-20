// Privacy Pool configuration
export const PRIVACY_POOL_CONFIG = {
  // Default deposit amounts (in ETH)
  DEPOSIT_AMOUNTS: [
    { value: "0.01", label: "0.01 ETH" },
    { value: "0.05", label: "0.05 ETH" },
    { value: "0.1", label: "0.1 ETH" },
    { value: "0.5", label: "0.5 ETH" },
  ],

  // Withdrawal settings
  WITHDRAWAL: {
    // Minimum withdrawal amount (in wei)
    MIN_AMOUNT: BigInt("10000000000000000"), // 0.01 ETH
    
    // Maximum withdrawal amount (in wei)
    MAX_AMOUNT: BigInt("1000000000000000000"), // 1 ETH
    
    // Default relay fee (basis points - 50 = 0.5%)
    DEFAULT_RELAY_FEE_BPS: 50,
  },

  // Pool settings
  POOL: {
    // Tree depth for commitments
    TREE_DEPTH: 20,
    
    // Zero value for empty leaves
    ZERO_VALUE: BigInt(0),
  },

  // Gas settings for transactions
  GAS: {
    // Gas limit for deposit transactions
    DEPOSIT_GAS_LIMIT: 300000,
    
    // Gas limit for withdrawal transactions (sponsored by paymaster)
    WITHDRAWAL_GAS_LIMIT: 500000,
    
    // PostOp gas limit for paymaster
    POST_OP_GAS_LIMIT: 32000,
  },
} as const

// Helper functions
export const formatEthAmount = (weiAmount: bigint): string => {
  const ethAmount = Number(weiAmount) / 1e18
  return ethAmount.toFixed(4)
}

export const parseEthAmount = (ethAmount: string): bigint => {
  const weiAmount = parseFloat(ethAmount) * 1e18
  return BigInt(Math.floor(weiAmount))
}
