/**
 * Shinobi Indexer SDK Client Configuration
 */

import { INDEXER_CONFIG } from "@/config/constants";
import { createShinobiClient, setShinobiClient } from "./sdk/client";

// Create the indexer client with environment-based configuration
const indexerClient = createShinobiClient({
  endpoint: INDEXER_CONFIG.ENDPOINT,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "shinobi-mini-app/1.0.0",
    ...(INDEXER_CONFIG.TOKEN && { Authorization: `Bearer ${INDEXER_CONFIG.TOKEN}` }),
  },
  timeout: 30000,
  retryDelay: 100,
});

// Set as global client for React hooks
setShinobiClient(indexerClient);

export { indexerClient };
