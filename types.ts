
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
  date?: string; // Available for all statuses now
  note?: string; 
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
  breakdown?: StatusBreakdown;
}

export interface StatusBreakdown {
  [key: string]: {
    waiting: number;
    done: number;
    issue: number;
  };
}

// --- NEW REPORTING STRUCTURES ---

export interface ReportItem {
  workerName: string;
  detail?: string; 
  timestamp?: string;
}

export interface ReportCategory {
  categoryName: string; 
  count: number;
  items: ReportItem[];
}

export interface DetailedStats {
  recentCompletions: ReportCategory[]; 
  bottlenecks: ReportCategory[];       
  criticalIssues: ReportCategory[];    
  upcomingArrivals: ReportItem[];      
}

export interface WeeklyReport {
  week: string;
  date: string;
  dateFormatted: string;
  workers: Worker[];
  summary: WeeklyReportSummary;
  detailedStats: DetailedStats; 
}

// --- AUTH & CHAT ---

export interface UserProfile {
  username: string;
  password?: string; // Optional for Google users
  isGoogle?: boolean;
  color: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  userColor: string;
}
