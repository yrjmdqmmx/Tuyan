export type VisionMode = 'none' | 'assist'
export interface CandidateReview {
  limit: number
  roundsUsed: number
  mode: 'visual' | 'text' | 'visual_code'
  status: 'not_requested' | 'passed' | 'modified_unreviewed' | 'review_failed' | 'text_reviewed' | 'issues_found'
  note?: string
  displayBackground?: '#ffffff'
  deliveredVersion?: number
  deliveredSvgHash?: string
  deliveredPngHash?: string
  reviewedVersion?: number
  reviewedSvgHash?: string
  reviewedPngHash?: string
  /** Optional typed relational diagram evidence bound to the delivered version. Semantic inference remains model-reviewed. */
  topology?: {version:number;svgHash:string;pngHash:string;topologyHash:string;topology:unknown;geometry:unknown;layout:unknown}
  /** Model audit of explicit original requirements; source quoting is provenance, not semantic proof. */
  rendererAudit?: {version?:number;svgHash?:string;pngHash?:string;originalRequirements:Array<{sourceField:string;sourceQuote:string;requirement:string;verdict:'satisfied'|'unmet'|'unsupported'|'uncertain';evidence:string}>}
  /** Program checks bind the supplied data and exact delivered PNG/SVG bytes. */
  dataValidation?: {
    renderer: string
    dataHash: string
    pngHash: string
    svgHash?: string
    renderSucceeded: boolean
    program?: Record<string, unknown>
    limitations: string[]
    [key: string]: unknown
  }
  /** Each data panel remains a fixed program result; no raster-only SVG panels. */
  composition?: {
    renderer: string
    layout?: {svgHash:string;passed:boolean;allocation:unknown;panels:unknown[];limitations:string[]}
    columns: number
    rows: number
    sharedFont: string
    legendPolicy: string
    panels: Array<{label:string;typeId:string;dataHash?:string;svgHash:string;review?:unknown}>
  }
  history?: Array<{
    round: number
    version: number
    svgHash?: string
    pngHash?: string
    submittedImageHash?: string
    status: 'passed' | 'issues_found' | 'review_failed'
    assessment?: string
    error?: string
  }>
}
export interface CandidateProgress {
  candidateId: number
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  review?: CandidateReview
  error?: string
}
export interface WorkflowSettings {
  visionMode?: VisionMode
  numCandidates?: number
  maxCriticRounds?: number
}
