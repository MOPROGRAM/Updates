
export type StatusType = 'select' | 'waiting' | 'done' | 'issue';

export enum Milestone {
  Training = 'Training',
  SigningContract = 'Signing Contract',
  OEC = 'OEC',
  Stamp = 'Stamp',
  Booking = 'Booking'
}

export interface UpdateLog {
  id: string;
  milestone: string;
  timestamp: string;
  user: string;
  action: string;
  note?: string;
}

export interface StatusData {
  status: StatusType;
  date?: string; // For 'done' status
  note?: string; // For 'issue' status
  updatedBy?: string;
  timestamp?: string;
}

export interface WorkerStatusMap {
  training?: StatusData;
  signingContract?: StatusData;
  oec?: StatusData;
  stamp?: StatusData;
  booking?: StatusData;
  [key: string]: StatusData | undefined;
}

export interface Worker {
  id: number | string;
  name: string;
  isRec?: boolean;
  statuses: WorkerStatusMap;
  history: UpdateLog[];
}

export interface WeeklyReportSummary {
  totalWorkers: number;
  totalSlots: number;
  completed: number;
  issues: number;
  waiting: number;
}

// --- NEW REPORTING STRUCTURES ---

export interface ReportItem {
  workerName: string;
  detail?: string; // e.g., the date, the note, or the specific issue
  timestamp?: string;
}

export interface ReportCategory {
  categoryName: string; // e.g., "Training", "OEC"
  count: number;
  items: ReportItem[];
}

export interface DetailedStats {
  recentCompletions: ReportCategory[]; // Completed in the last 7 days
  bottlenecks: ReportCategory[];       // Currently 'waiting'
  criticalIssues: ReportCategory[];    // Currently 'issue'
  upcomingArrivals: ReportItem[];      // Flight dates in future
}

export interface WeeklyReport {
  week: string;
  date: string;
  dateFormatted: string;
  workers: Worker[];
  summary: WeeklyReportSummary;
  detailedStats: DetailedStats; // Added detailed stats
}
