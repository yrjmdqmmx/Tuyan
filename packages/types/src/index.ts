export type PaperBananaClientPlatform = "web" | "desktop" | "android";

export type { ImageSizeContract, ResolvedImageSize } from './image-size-contract.js'

export type { ProviderRegions } from './provider-regions.js'

export { MODEL_CHANNEL_LABELS, orderModelChannels, modelLifecycleLabel, modelDeveloper, presentRegistryModel, sortModelsNewestFirst } from './model-presentation.js'
export { buildAspectRatioOptions, normalizeSelectedAspectRatio } from './aspect-ratios.js'

/** TokenDance API v1. Wallet amounts are integer microyuan; payment amounts integer yuan. */
export interface TokenDanceConnection { available: boolean; connected: boolean; connectedAt: string | null; appUrl: 'https://www.paperbanana.asia/'; remoteRevokeSupported: false }
export interface TokenDanceWallet { balance: number; credits: number; credits_used: number; unit: 'microyuan'; microyuanPerYuan: 1000000; keyLimit: null; keyLimitStatus: 'not_available' }
export interface TokenDancePayment { id: string; amount: number; status: 'pending' | 'paid' | 'closed' | 'failed' | 'refunded'; payment_url?: string; alipay_url?: string; expired_at: number; created_at: number; paid_at?: number }
export interface ProviderJobRecovery { channel: 'tokendance'; canResume: boolean; action: 'top_up_balance' | 'reauthorize_api_key' | 'api_key_quota' | 'rate_limit' | 'review_request' | 'resume'; message: string; retryAt?: string; expiresAt?: string }
export interface ProviderCallRecord { channel: 'tokendance'; requestedModel: string; actualModel: string | null; requestId: string | null; protocol: string; supplier: null; routing: 'selected-model-auto-provider' }

/** Recent recharge attempts, newest first; amount is integer yuan, timestamps ISO 8601. */
export interface TokenDancePaymentAttempt { attemptId: string; amount: number; state: string; createdAt?: string; checkedAt?: string; session?: TokenDancePayment }
