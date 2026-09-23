export type PaperBananaClientPlatform = "web" | "desktop" | "android";

/** Drafts remain local; AI operation snapshots are encrypted for bounded recovery. */
export interface FigureStudioPlan {
  title: string; summary: string;
  nodes: Array<{ id: string; label: string; detail?: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
  notes: string[];
}
export interface FigureStudioCapabilities {
  code: 0; formats: { svg: true; pdf: boolean; eps: boolean }; modelPlanning: boolean;
  supportedModelModes: Array<'api-key' | 'tokendance' | 'custom'>; supportedProviders: string[]; unsupportedProviders: string[];
  operationContractVersion?: 1;
  modelPlanningReason?: string;
  formatReasons: { pdf: string; eps: string }; limitations: string[];
  limits: { maxDocumentBytes: number; materialsChars: number; instructionChars: number; maxSelectedObjects: number; maxExportBytes: number };
}
export interface FigureStudioExportFile { name: string; mimeType: 'application/pdf' | 'application/postscript'; base64: string }

export interface FigureDocumentContext { id: string; revision: number; sha256: string }
export interface FigureStudioOperation {
  requestId: string;
  kind: 'plan' | 'edit';
  status: 'queued' | 'running' | 'succeeded' | 'blocked';
  requestHash: string;
  documentContext: FigureDocumentContext;
  mainRoute: Record<string, unknown>;
  providerRegions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  failure?: Record<string, unknown>;
  recovery: null | {
    canResume: boolean; action: string; message: string;
    requestState: 'not_sent' | 'rejected' | 'unknown' | 'completed';
    billingStatus: string; retryAt?: string; expiresAt?: string;
    channel?: string; billingMessage?: string;
  };
  /** Channel records are evidence of a call, not an invoice or a zero-cost claim. */
  providerCalls: Array<Record<string, unknown>>;
  result?: { plan: FigureStudioPlan } | { commands: Array<{ type: 'update'; id: string; patch: Record<string, unknown> }>; baseRevision: number };
}

export type { ImageSizeContract, ResolvedImageSize } from './image-size-contract.js'

export type { RefineInputs, RefineControls, RefineInputMetadata, AuditedProviderCallRecord, ProviderMoney, ProviderPublicPrice } from './refine.js'

export type { ProviderRegions } from './provider-regions.js'

export { MODEL_CHANNEL_LABELS, orderModelChannels, modelVersionLabel, modelVersionDetail, normalizeModelVersion, modelLifecycleLabel, modelDeveloper, modelDeveloperName, modelDeveloperAliases, presentRegistryModel, sortModelsNewestFirst } from './model-presentation.js'
export { buildAspectRatioOptions, normalizeSelectedAspectRatio } from './aspect-ratios.js'

/** TokenDance API v1. Wallet amounts are integer microyuan; payment amounts integer yuan. */
export interface TokenDanceConnection { available: boolean; connected: boolean; connectedAt: string | null; appUrl: 'https://www.paperbanana.asia/'; remoteRevokeSupported: false }
export interface TokenDanceWallet { balance: number; credits: number; credits_used: number; unit: 'microyuan'; microyuanPerYuan: 1000000; keyLimit: null; keyLimitStatus: 'not_available' }
export interface TokenDancePayment { id: string; amount: number; status: 'pending' | 'paid' | 'closed' | 'failed' | 'refunded'; payment_url?: string; alipay_url?: string; expired_at: number; created_at: number; paid_at?: number }
export interface ProviderJobRecovery { channel: string; canResume: boolean; action: 'top_up_balance' | 'reauthorize_api_key' | 'api_key_quota' | 'rate_limit' | 'retry_request' | 'review_request' | 'resume' | 'change_input' | 'check_request'; message: string; retryAt?: string; expiresAt?: string }
export interface TokenDanceCallRecord { channel: 'tokendance'; requestedModel: string; actualModel: string | null; requestId: string | null; protocol: string; supplier: null; routing: 'selected-model-auto-provider' }

export type ProviderCallRecord = TokenDanceCallRecord | import('./refine.js').AuditedProviderCallRecord | {channel:'custom'; model:string; protocol:string; status:'succeeded'; billingStatus:'unconfirmed'}

/** Recent recharge attempts, newest first; amount is integer yuan, timestamps ISO 8601. */
export interface TokenDancePaymentAttempt { attemptId: string; amount: number; state: string; createdAt?: string; checkedAt?: string; session?: TokenDancePayment }

/** Optional custom routes use the strict, versioned BYOK descriptor. Existing preset routes remain unchanged. */
export type { UniversalRoute, UniversalCustomConfig, UniversalProtocol, UniversalInputLimits, UniversalOutputLimits } from '../../api/src/universal-api.js'

export type { ModelVersion } from './model-presentation.js'

export type { ThinkingOptions, ThinkingSelection, ThinkingConfiguration, ThinkingSnapshot, ThinkingSnapshotRole } from './thinking.js'
