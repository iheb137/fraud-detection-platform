export interface Alert {
  id: number;
  cdrId: number;
  callId: string;
  callingNumber: string;
  fraudScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  resolutionNote?: string;
}