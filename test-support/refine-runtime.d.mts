import type { memoryDb } from './memory-db.mjs';
import type { ReferenceSubmissionPolicy } from '../packages/api/src/reference-upload.js';

export function createRefineRuntime(options?: { port?: number; providerDelay?: number; tokenDance?: boolean; frontendOrigin?: string }): Promise<{
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
    buildVisionImageInputs(images: any[], jobId?: string, route?: {accessProvider: string; modelId: string}): Promise<any[]>;
    referenceSubmissionPolicy(provider: string, model: string, workflow?: string): ReferenceSubmissionPolicy;
    normalizeReferenceForModel(bytes: Buffer, mimeType: string, policy: ReferenceSubmissionPolicy, inspectOnly?: boolean): Promise<{bytes: Buffer; mimeType: string; width: number; height: number; changed: boolean}>;
    checkedReferenceRequest(provider: string, model: string, body: unknown): string;
    withReferenceProcessing<T>(work: () => Promise<T>, background?: boolean): Promise<T>;
    referenceProcessingState(): {active: number; peak: number};
  };
  invoke(body: Record<string, unknown>): Promise<any>;
  failProvider(value: boolean): void;
  post(body: Record<string, unknown>, user?: string): Promise<{ status: number; data: any }>;
  close(): Promise<void>;
}>;
