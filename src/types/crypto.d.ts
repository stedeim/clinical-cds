// Global type augmentation for Node-like crypto in edge/browser runtime.
declare global {
  interface Crypto {
    randomUUID(): string;
  }
}

export {};
