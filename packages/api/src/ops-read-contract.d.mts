export const OPS_KINDS: string[];
export const JOB_STATES: string[];
export const FAILURE_CATEGORIES: string[];
export const FAILURE_STAGES: string[];
export const REQUEST_STATES: string[];
export const OPS_WINDOW_SCHEMA: Record<string, unknown>;
export const OPS_EMPTY_SCHEMA: Record<string, unknown>;
export class OpsQueryError extends Error {}
export function parseOpsQuery(kind: string, input?: unknown, nowMs?: number): { from?: string; to?: string };
export function opsCount(value: unknown): number | null;
export function opsNumber(value: unknown): number | null;
export function opsTimestamp(value: unknown): string | null;
export function projectCounts(value: unknown, names: string[]): Record<string, number | null>;
