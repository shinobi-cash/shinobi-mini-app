/**
 * Contract ABIs
 */

// ============ PRIVACY POOL ABIs ============

/**
 * Privacy Pool ABI - Core pool contract
 */
export const PRIVACY_POOL_ABI = [
  {
    inputs: [],
    name: "SCOPE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Privacy Pool Entry Point ABI - For relay function
 */
export const PRIVACY_POOL_ENTRYPOINT_ABI = [
  {
    type: "function",
    name: "relay",
    inputs: [
      {
        name: "_withdrawal",
        type: "tuple",
        internalType: "struct IPrivacyPool.Withdrawal",
        components: [
          {
            name: "processooor",
            type: "address",
            internalType: "address",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct ProofLib.WithdrawProof",
        components: [
          {
            name: "pA",
            type: "uint256[2]",
            internalType: "uint256[2]",
          },
          {
            name: "pB",
            type: "uint256[2][2]",
            internalType: "uint256[2][2]",
          },
          {
            name: "pC",
            type: "uint256[2]",
            internalType: "uint256[2]",
          },
          {
            name: "pubSignals",
            type: "uint256[8]",
            internalType: "uint256[8]",
          },
        ],
      },
      {
        name: "_scope",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    inputs: [{ name: "_precommitment", type: "uint256" }],
    name: "deposit",
    outputs: [{ name: "_commitment", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
  "inputs": [
    {
      "components": [
        {
          "internalType": "address",
          "name": "processooor",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "internalType": "struct IShinobiCashCrossChainHandler.CrossChainWithdrawal",
      "name": "withdrawal",
      "type": "tuple"
    },
    {
      "components": [
        {
          "internalType": "uint256[2]",
          "name": "pA",
          "type": "uint256[2]"
        },
        {
          "internalType": "uint256[2][2]",
          "name": "pB",
          "type": "uint256[2][2]"
        },
        {
          "internalType": "uint256[2]",
          "name": "pC",
          "type": "uint256[2]"
        },
        {
          "internalType": "uint256[9]",
          "name": "pubSignals",
          "type": "uint256[9]"
        }
      ],
      "internalType": "struct IShinobiCashCrossChainHandler.CrossChainWithdrawProof",
      "name": "proof",
      "type": "tuple"
    },
    {
      "internalType": "uint256",
      "name": "scope",
      "type": "uint256"
    },
    {
      "components": [
        {
          "internalType": "uint32",
          "name": "fillDeadline",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "expires",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "inputOracle",
          "type": "address"
        },
        {
          "internalType": "uint256[2][]",
          "name": "inputs",
          "type": "uint256[2][]"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "oracle",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "settler",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "token",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "recipient",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "call",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "context",
              "type": "bytes"
            }
          ],
          "internalType": "struct MandateOutput[]",
          "name": "outputs",
          "type": "tuple[]"
        }
      ],
      "internalType": "struct IShinobiCashCrossChainHandler.CrossChainIntentParams",
      "name": "intentParams",
      "type": "tuple"
    }
  ],
  "name": "processCrossChainWithdrawal",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
  }
] as const;

// ============ UTILITY TYPES ============

/**
 * Type helpers for ABI usage
 */
export type PrivacyPoolABI = typeof PRIVACY_POOL_ABI;
export type PrivacyPoolEntryPointABI = typeof PRIVACY_POOL_ENTRYPOINT_ABI;
