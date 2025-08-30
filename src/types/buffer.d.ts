/**
 * Buffer polyfill type declarations
 */

declare global {
  interface Window {
    Buffer?: {
      from(data: any, encoding?: string): Uint8Array;
      isBuffer(obj: any): boolean;
    };
  }

  var Buffer: {
    from(data: any, encoding?: string): Uint8Array;
    isBuffer(obj: any): boolean;
  };
}

export {};
