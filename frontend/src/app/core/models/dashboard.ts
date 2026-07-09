export interface DashboardKpis {
  totalCdrs: number;
  totalAnalyzed: number;
  totalFrauds: number;
  fraudRate: number;
  openAlerts: number;
}

export interface AlertsSummary {
  open: number;
  inProgress: number;
  resolved: number;
}