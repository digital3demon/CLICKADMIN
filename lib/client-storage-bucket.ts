export type ClientStorageBucket = "live" | "demo";
let currentBucket: ClientStorageBucket = "live";

export function readClientStorageBucket(): ClientStorageBucket {
  return currentBucket;
}

export function writeClientStorageBucket(next: ClientStorageBucket): void {
  currentBucket = next;
}
