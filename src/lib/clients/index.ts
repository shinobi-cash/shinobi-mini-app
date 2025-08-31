/**
 * Singleton Client Instances
 */

import { BUNDLER_URL, WITHDRAWAL_ACCOUNT_PRIVATE_KEY } from "@/config/constants";
import { CONTRACTS } from "@/config/constants";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ============ APOLLO GRAPHQL CLIENT ============

const INDEXER_URL = import.meta.env.DEV ? import.meta.env.VITE_INDEXER_URL_DEV : import.meta.env.VITE_INDEXER_URL_PROD;

const INDEXER_API_TOKEN = import.meta.env.DEV
  ? import.meta.env.VITE_INDEXER_TOKEN_DEV
  : import.meta.env.VITE_INDEXER_TOKEN_PROD;
export const apolloClient = new ApolloClient({
  uri: INDEXER_URL,
  cache: new InMemoryCache(),
  headers: {
    Authorization: `Bearer ${INDEXER_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
    query: {
      errorPolicy: "all",
    },
  },
});

// Create public client for contract calls
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export async function getWithdrawalSmartAccountClient() {
  const account = privateKeyToAccount(WITHDRAWAL_ACCOUNT_PRIVATE_KEY);

  const simpleAccount = await toSimpleSmartAccount({
    owner: account,
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  const smartAccountClient = createSmartAccountClient({
    client: publicClient,
    account: simpleAccount,
    bundlerTransport: http(BUNDLER_URL),
    paymaster: {
      // Provide stub data for gas estimation - just hardcode high gas values
      async getPaymasterStubData() {
        return {
          paymaster: CONTRACTS.PAYMASTER as `0x${string}`,
          paymasterData: "0x" as `0x${string}`, // Empty paymaster data
          paymasterPostOpGasLimit: 35000n, // Above the 32,000 minimum
        };
      },
      // Provide real paymaster data for actual transaction
      async getPaymasterData() {
        return {
          paymaster: CONTRACTS.PAYMASTER as `0x${string}`,
          paymasterData: "0x" as `0x${string}`, // Empty - paymaster validates via callData
          paymasterPostOpGasLimit: 35000n, // Above the 32,000 minimum
        };
      },
    },
  });
  return smartAccountClient;
}
