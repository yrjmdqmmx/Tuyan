export interface Canvas { widthMm: number; heightMm: number; background: string }
export interface RasterAsset { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; dataUrl: string; pixelWidth: number; pixelHeight: number }
export interface ElementBase { id: string; parentId?: string }
export interface BoxGeometry { x: number; y: number; width: number; height: number }
export interface ShapeElement extends ElementBase, BoxGeometry { type: 'rect' | 'ellipse' | 'panel'; fill: string; stroke: string; strokeWidth: number }
export interface TextElement extends ElementBase, BoxGeometry { type: 'text'; text: string; fontSize: number; fontFamily: string; fontWeight: 400 | 700 | 'normal' | 'bold'; color: string; role: 'label' | 'panel-label' }
export interface ImageElement extends ElementBase, BoxGeometry { type: 'image'; assetId: string }
export interface ConnectorElement extends ElementBase { type: 'line' | 'arrow'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; fromId?: string; toId?: string }
export type FigureElement = ShapeElement | TextElement | ImageElement | ConnectorElement;
export interface RuleOverride { enabled?: boolean; value?: number | number[] | string[] | { min: number; max: number } }
export interface Rule { id: string; label: string; kind: string; value?: RuleOverride['value']; enabled?: boolean; message?: string; sourceUrl?: string; level?: 'requirement' | 'recommendation' | 'manual' }
export interface FigureDocument { schemaVersion: 'tuyan.figure/v1'; id: string; revision: number; title: string; canvas: Canvas; elements: FigureElement[]; assets: Record<string, RasterAsset>; profileId: string; ruleOverrides: Record<string, RuleOverride>; customRules: Rule[] }
export interface Check { id: string; label: string; status: 'passed' | 'problem' | 'manual' | 'unverified'; message: string; objectIds?: string[]; sourceUrl?: string }
export interface RuleEvaluation { documentRevision: number; profileId: string; baseline: Check[]; working: Check[] }
export interface Profile { readonly id: string; readonly label: string; readonly scope: string; readonly checkedAt: string; readonly sources: readonly string[]; readonly rules: readonly Readonly<Rule>[] }
export interface FigurePlan { title: string; summary?: string; nodes: { id: string; label: string; detail?: string }[]; edges?: { from: string; to: string; label?: string }[]; notes?: string[] }
export type Command = { type: 'update'; id: string; patch: Record<string, unknown> } | { type: 'add'; element: FigureElement | Record<string, unknown> } | { type: 'remove'; id: string } | { type: 'canvas'; patch: Partial<Canvas> } | { type: 'rule'; id: string; override: RuleOverride } | { type: 'custom-rule'; rule: Rule } | { type: 'remove-custom-rule'; id: string } | { type: 'rule-preset'; profileId: string; ruleOverrides: Record<string, RuleOverride>; customRules: Rule[] } | { type: 'title'; title: string } | { type: 'asset'; id: string; asset: RasterAsset } | { type: 'reorder'; ids: string[] } | { type: 'replace-content'; elements: FigureElement[]; assets: Record<string, RasterAsset>; title?: string };
export const SCHEMA_VERSION: 'tuyan.figure/v1';
export const LIMITS: Readonly<{ elements: number; assets: number; documentBytes: number; commands: number; dimensionMm: number; coordinateMm: number }>;
export const PROFILES: readonly Profile[];
export const CUSTOM_RULE_KINDS: readonly string[];
export function createDocument(input?: Partial<Omit<FigureDocument, 'canvas' | 'elements'>> & { canvas?: Partial<Canvas>; elements?: Array<FigureElement | Record<string, unknown>> }): FigureDocument;
export function validateDocument(input: unknown): FigureDocument;
export function applyCommands(input: unknown, commands: readonly Command[] | unknown, options?: { baseRevision?: number }): FigureDocument;
export function connectorEndpoints(line: ConnectorElement, elements: readonly FigureElement[]): { x1: number; y1: number; x2: number; y2: number };
export function renderSvg(input: unknown): string;
export function renderPdfSvg(input: unknown): string;
export function renderPrintSvg(input: unknown): string;
export function preserveEpsTextBoundaries(input: string): { eps: string; textBlocks: number };
export function normalizeEpsFontSubsetNames(input: string): { eps: string; renamedFonts: Array<{ resourceName: string; oldName: string; newName: string }> };
export function evaluateRules(input: unknown): RuleEvaluation;
export function documentFromPlan(plan: FigurePlan, options?: { id?: string; title?: string; profileId?: string; canvas?: Partial<Canvas>; ruleOverrides?: Record<string, RuleOverride>; customRules?: Rule[] }): FigureDocument;
export function createExampleDocument(): FigureDocument;
