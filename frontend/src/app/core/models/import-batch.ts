export interface ImportBatchDetail {
  id: number;
  filename: string;
  recordCount: number;
  status: string;
  importedBy: string;
  importedAt: string;
  analyzedCount: number;
  fraudCount: number;
}