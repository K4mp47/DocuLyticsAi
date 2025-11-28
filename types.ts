export interface Transaction {
  id: string;
  date: string; // ISO 8601 YYYY-MM-DD
  time: string;
  description: string;
  amount: number;
  currency: string;
}

export interface ExtractionResult {
  transactions: Transaction[];
  totalAmount: number;
  currency: string;
  documentDate?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface DailySpending {
  date: string;
  amount: number;
}
