import type { memoryDb } from './memory-db.mjs';

export function createRefineRuntime(options?: { port?: number; providerDelay?: number }): Promise<{
  baseUrl: string;
  db: ReturnType<typeof memoryDb>;
  objects: Map<string, { bytes: Buffer; mimeType: string }>;
  providerCalls: Array<{ url: string; options: RequestInit }>;
  image: Buffer;
  output: Buffer;
  legacy: { drainJobAdmission(): Promise<void> };
  invoke(body: Record<string, unknown>): Promise<any>;
  failProvider(value: boolean): void;
  post(body: Record<string, unknown>, user?: string): Promise<{ status: number; data: any }>;
  close(): Promise<void>;
}>;
