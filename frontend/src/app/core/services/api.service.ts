import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PageResponse, ImportBatchResponse, Cdr } from '../models/cdr';
import { Prediction } from '../models/prediction';
import { Alert } from '../models/alert';
import { DashboardKpis, AlertsSummary } from '../models/dashboard';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  importCdr(file: File): Observable<ImportBatchResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportBatchResponse>(`${this.api}/cdrs/import`, formData);
  }

  getCdrs(page = 0, size = 20, callingNumber?: string): Observable<PageResponse<Cdr>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (callingNumber) params = params.set('callingNumber', callingNumber);
    return this.http.get<PageResponse<Cdr>>(`${this.api}/cdrs`, { params });
  }

  getBatches(page = 0, size = 20): Observable<PageResponse<any>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<any>>(`${this.api}/batches`, { params });
  }

  deleteBatch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/batches/${id}`);
  }

  getBatchCdrs(batchId: number, page = 0, size = 10): Observable<PageResponse<Cdr>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<Cdr>>(`${this.api}/batches/${batchId}/cdrs`, { params });
  }

  analyzeCdr(cdrId: number): Observable<Prediction> {
    return this.http.post<Prediction>(`${this.api}/predictions/analyze/${cdrId}`, {});
  }

  analyzeBatch(batchId: number): Observable<any> {
    return this.http.post<any>(`${this.api}/predictions/analyze-batch/${batchId}`, {});
  }

  getPredictions(page = 0, size = 20): Observable<PageResponse<Prediction>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<Prediction>>(`${this.api}/predictions`, { params });
  }

  getAlerts(page = 0, size = 20): Observable<PageResponse<Alert>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<Alert>>(`${this.api}/alerts`, { params });
  }

  updateAlertStatus(id: number, status: string, note?: string): Observable<Alert> {
    return this.http.put<Alert>(`${this.api}/alerts/${id}/status?status=${status}`, {});
  }

  getKpis(adminIds?: number[]): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.api}/dashboard/kpis`, { params: this.scopeParams(adminIds) });
  }

  getTopSuspicious(adminIds?: number[]): Observable<Prediction[]> {
    return this.http.get<Prediction[]>(`${this.api}/dashboard/top-suspicious`, { params: this.scopeParams(adminIds) });
  }

  getAlertsSummary(adminIds?: number[]): Observable<AlertsSummary> {
    return this.http.get<AlertsSummary>(`${this.api}/dashboard/alerts-summary`, { params: this.scopeParams(adminIds) });
  }

  getFraudTrend(days: number): Observable<any[]> {
    const params = new HttpParams().set('days', days);
    return this.http.get<any>(`${this.api}/statistics/fraud-trend`, { params })
      .pipe(map((r: any) => Array.isArray(r) ? r : (r?.value || r?.content || [])));
  }

  getByCountry(): Observable<any[]> {
    return this.http.get<any>(`${this.api}/statistics/by-country`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r?.value || r?.content || [])));
  }

  getByHour(): Observable<any[]> {
    return this.http.get<any>(`${this.api}/statistics/by-hour`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r?.value || r?.content || [])));
  }

  getBySeverity(): Observable<any[]> {
    return this.http.get<any>(`${this.api}/statistics/by-severity`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r?.value || r?.content || [])));
  }

  getStatisticsSummary(days: number): Observable<any> {
    const params = new HttpParams().set('days', days);
    return this.http.get<any>(`${this.api}/statistics/summary`, { params })
      .pipe(map((r: any) => r?.value || r));
  }

  downloadReport(type: string, days: number): Observable<Blob> {
    const params = new HttpParams().set('type', type).set('days', days);
    return this.http.get(`${this.api}/reports/download`, { params, responseType: 'blob' });
  }

  private scopeParams(adminIds?: number[]): HttpParams {
    let params = new HttpParams();
    if (adminIds && adminIds.length > 0) {
      params = params.set('adminIds', adminIds.join(','));
    }
    return params;
  }

  labelPrediction(id: number, label: boolean): Observable<any> {
    return this.http.put<any>(`${this.api}/predictions/${id}/label?label=${label}`, {});
  }

  exportDataset(adminIds?: number[]): Observable<Blob> {
    return this.http.get(`${this.api}/analyst/dataset`, {
      params: this.scopeParams(adminIds),
      responseType: 'blob'
    });
  }

  startRetrain(adminIds?: number[]): Observable<any> {
    return this.http.post<any>(`${this.api}/analyst/retrain`, {}, { params: this.scopeParams(adminIds) });
  }

  getRetrainStatus(): Observable<any> {
    return this.http.get<any>(`${this.api}/analyst/retrain/status`);
  }

  promoteModel(): Observable<any> {
    return this.http.post<any>(`${this.api}/analyst/retrain/promote`, {});
  }

  getAnalystAdmins(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/analyst/admins`);
  }}