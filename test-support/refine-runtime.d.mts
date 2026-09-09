import type { memoryDb } from './memory-db.mjs';

export function createRefineRuntime(options?: { port?: number; providerDelay?: number; tokenDance?: boolean }): Promise<{
  baseUrl: string;
  db: ReturnType<typeof memoryDb>;
  objects: Map<string, { bytes: Buffer; mimeType: string }>;
  providerCalls: Array<{ url: string; options: RequestInit }>;
  image: Buffer;
  output: Buffer;
  tokenDanceCalls: Array<{ url: string; options: any }>;
  setTokenDanceFailure(action: string): void;
  payTokenDance(): void;
  legacy: {
    drainJobAdmission(): Promise<void>;
    configureRuntimeFetch(fetcher: (...args: any[]) => Promise<Response>): void;
    configureProviderWorkflow(workflow: ReturnType<typeof import('../apps/paperbanana-api/src/provider-workflow.js').createProviderWorkflow>): void;
    callTextModel(...args: any[]): Promise<string>;
    callVisionModel(...args: any[]): Promise<string>;
    callImageModel(...args: any[]): Promise<string>;
  };
  invoke(body: Record<string, unknown>): Promise<any>;
  failProvider(value: boolean): void;
  post(body: Record<string, unknown>, user?: string): Promise<{ status: number; data: any }>;
  close(): Promise<void>;
}>;
