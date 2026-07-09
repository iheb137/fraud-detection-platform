export interface Prediction {
  id: number;
  cdrId: number;
  callId: string;
  fraudScore: number;
  isFraud: boolean;
  modelVersion: string;
  predictedAt: string;
  analystLabel?: boolean;
}