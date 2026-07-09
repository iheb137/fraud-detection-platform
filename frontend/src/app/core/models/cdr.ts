export interface Cdr {
  id: number;
  callId: string;
  callingNumber: string;
  calledNumber: string;
  callStartTime: string;
  callDurationSec: number;
  callType: string;
  destinationCountry: string;
  callDirection: string;
  revenue: number;
  createdAt: string;
}

export interface ImportBatchResponse {
  batchId: number;
  filename: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  duplicateCount?: number;
  status: string;
  importedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}