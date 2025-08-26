/**
 * API Execution Queue
 * 
 * Manages rate-limited execution of API requests to prevent overwhelming the indexer.
 * Requests are queued and executed with configurable delays between calls.
 */

import { API_QUEUE } from '@/config/constants';

interface QueuedRequest<T> {
  id: string;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class ApiExecutionQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastExecutionTime = 0;
  private requestCounter = 0;

  constructor(
    private delayMs: number = 200 // Default 200ms between requests (5 requests per second)
  ) {}

  /**
   * Submit a request to the queue and get a promise for the result
   */
  async submit<T>(executor: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `req_${++this.requestCounter}_${Date.now()}`,
        executor,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(request);
      console.log(`[API Queue] Request ${request.id} queued. Queue length: ${this.queue.length}`);
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue sequentially with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    console.log(`[API Queue] Starting queue processing. Queue length: ${this.queue.length}`);
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastExecution = now - this.lastExecutionTime;

      // If not enough time has passed since last execution, wait
      if (timeSinceLastExecution < this.delayMs) {
        const waitTime = this.delayMs - timeSinceLastExecution;
        console.log(`[API Queue] Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Get the next request
      const request = this.queue.shift();
      if (!request) break;

      console.log(`[API Queue] Executing request ${request.id}. Remaining in queue: ${this.queue.length}`);
      
      // Execute the request
      this.lastExecutionTime = Date.now();
      const startTime = Date.now();
      
      try {
        const result = await request.executor();
        const duration = Date.now() - startTime;
        console.log(`[API Queue] Request ${request.id} completed in ${duration}ms`);
        request.resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`[API Queue] Request ${request.id} failed after ${duration}ms:`, error);
        request.reject(error as Error);
      }
    }

    console.log(`[API Queue] Queue processing completed. Queue is now empty.`);
    this.processing = false;
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      lastExecutionTime: this.lastExecutionTime,
      delayMs: this.delayMs
    };
  }

  /**
   * Update queue configuration
   */
  configure(delayMs?: number) {
    if (delayMs !== undefined) this.delayMs = delayMs;
  }

  /**
   * Clear the queue (useful for testing)
   */
  clear() {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
  }
}

// Create singleton instance with configurable settings
export const apiQueue = new ApiExecutionQueue(
  API_QUEUE.REQUEST_DELAY_MS // Configurable delay between requests
);

/**
 * Convenience wrapper for queueing GraphQL requests
 */
export async function queuedRequest<T>(executor: () => Promise<T>): Promise<T> {
  return apiQueue.submit(executor);
}