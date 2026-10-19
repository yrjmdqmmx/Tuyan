export type DrawingActivity = {
  contractVersion: 1; timeZone: string; today: string;
  days: {date:string;count:number}[];
  total:number;peak:number;longestStreak:number;currentStreak:number;
  estimatedDateImages?:number;undatedImages?:number;scope?:string;
};
export function drawingDay(value:unknown): string;
export function shiftDrawingDay(day:string,amount:number): string;
export function summarizeDrawingDays(counts:Record<string,number>,now?:Date,extra?:Record<string,unknown>): DrawingActivity;
export function drawingActivityFromJobs(jobs:Iterable<any>|AsyncIterable<any>,now?:Date): Promise<DrawingActivity>;
