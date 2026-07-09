import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { DashboardKpis, AlertsSummary } from '../../../core/models/dashboard';
import { Prediction } from '../../../core/models/prediction';
import { AnalystScopeSelectorComponent } from '../../../shared/components/analyst-scope-selector/analyst-scope-selector.component';
import { RetrainWidgetComponent } from '../../../shared/components/retrain-widget/retrain-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule,
            MatTableModule, MatButtonModule, RouterModule, AnalystScopeSelectorComponent, RetrainWidgetComponent],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1>Tableau de Bord</h1>
          <p>Vue d'ensemble de la detection de fraude — Tunisie Telecom</p>
        </div>
      </div>

      <app-analyst-scope-selector (scopeChange)="onScopeChange($event)"></app-analyst-scope-selector>

      <app-retrain-widget [adminIds]="adminIds"></app-retrain-widget>

      <div class="kpi-grid" *ngIf="kpis; else loadingKpis">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><mat-icon>phone_in_talk</mat-icon></div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpis.totalCdrs | number }}</span>
            <span class="kpi-label">CDR Totaux</span>
            <span class="kpi-sub">Enregistrements d'appels</span>
          </div>
        </div>
        <div class="kpi-card kpi-analyzed">
          <div class="kpi-icon"><mat-icon>psychology</mat-icon></div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpis.totalAnalyzed | number }}</span>
            <span class="kpi-label">Appels Analyses</span>
            <span class="kpi-sub">Par le modele ML</span>
          </div>
        </div>
        <div class="kpi-card kpi-fraud">
          <div class="kpi-icon"><mat-icon>gpp_bad</mat-icon></div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpis.totalFrauds | number }}</span>
            <span class="kpi-label">Fraudes Detectees</span>
            <span class="kpi-sub kpi-rate">Taux : {{ kpis.fraudRate }}%</span>
          </div>
        </div>
        <div class="kpi-card kpi-alerts">
          <div class="kpi-icon"><mat-icon>notifications_active</mat-icon></div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpis.openAlerts | number }}</span>
            <span class="kpi-label">Alertes Ouvertes</span>
            <span class="kpi-sub">En attente de traitement</span>
          </div>
        </div>
      </div>

      <ng-template #loadingKpis>
        <div class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>
      </ng-template>

      <div class="card fraud-rate-card" *ngIf="kpis">
        <div class="fraud-rate-header">
          <div>
            <h3>Taux de Fraude Global</h3>
            <p>Ratio fraudes detectees / appels analyses</p>
          </div>
          <span class="fraud-rate-value"
                [class.high]="kpis.fraudRate > 30"
                [class.medium]="kpis.fraudRate > 10 && kpis.fraudRate <= 30"
                [class.low]="kpis.fraudRate <= 10">
            {{ kpis.fraudRate }}%
          </span>
        </div>
        <div class="fraud-rate-bar">
          <div class="fraud-rate-fill" [style.width.%]="kpis.fraudRate"
               [class.fill-high]="kpis.fraudRate > 30"
               [class.fill-medium]="kpis.fraudRate > 10 && kpis.fraudRate <= 30"
               [class.fill-low]="kpis.fraudRate <= 10">
          </div>
        </div>
      </div>

      <div class="bottom-grid">
        <div class="card top-suspicious" *ngIf="topSuspicious.length > 0">
          <div class="card-header">
            <h3><mat-icon>warning_amber</mat-icon> Top Appels Suspects</h3>
            <button mat-button routerLink="/predictions" class="btn-tt-outline">Voir tout</button>
          </div>
          <table mat-table [dataSource]="topSuspicious">
            <ng-container matColumnDef="callId">
              <th mat-header-cell *matHeaderCellDef>Call ID</th>
              <td mat-cell *matCellDef="let p">
                <span class="call-id">{{ p.callId | slice:0:18 }}...</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Score</th>
              <td mat-cell *matCellDef="let p">
                <div class="score-bar-container">
                  <div class="score-bar" [style.width.%]="p.fraudScore * 100"
                       [class.score-high]="p.fraudScore >= 0.7"
                       [class.score-medium]="p.fraudScore >= 0.4 && p.fraudScore < 0.7"
                       [class.score-low]="p.fraudScore < 0.4"></div>
                  <span class="score-text">{{ (p.fraudScore * 100).toFixed(0) }}%</span>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let p">
                <span class="badge" [class.badge-danger]="p.isFraud" [class.badge-success]="!p.isFraud">
                  {{ p.isFraud ? 'FRAUDE' : 'LEGITIME' }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['callId', 'score', 'status']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['callId', 'score', 'status'];"></tr>
          </table>
        </div>

        <div class="card alerts-summary">
          <div class="card-header">
            <h3><mat-icon>summarize</mat-icon> Resume des Alertes</h3>
            <button mat-button routerLink="/alerts" class="btn-tt-outline">Gerer</button>
          </div>
          <div class="alert-stats" *ngIf="alertsSummary">
            <div class="alert-stat open">
              <div class="stat-circle">{{ alertsSummary.open }}</div>
              <div class="stat-info">
                <span class="stat-label">Ouvertes</span>
                <span class="stat-desc">En attente</span>
              </div>
            </div>
            <div class="alert-stat progress">
              <div class="stat-circle">{{ alertsSummary.inProgress }}</div>
              <div class="stat-info">
                <span class="stat-label">En cours</span>
                <span class="stat-desc">En traitement</span>
              </div>
            </div>
            <div class="alert-stat resolved">
              <div class="stat-circle">{{ alertsSummary.resolved }}</div>
              <div class="stat-info">
                <span class="stat-label">Resolues</span>
                <span class="stat-desc">Traitees</span>
              </div>
            </div>
          </div>

          <div class="copyright-card">
            <div class="copyright-content">
              <img src="tt.png" alt="TT" class="copyright-logo-img">
              <div>
                <p class="copyright-title">Plateforme de Detection de Fraude</p>
                <p class="copyright-dev">Developpee par <strong>Ihebeddine Saafi</strong></p>
                <p class="copyright-year">Stage Ingenieur &middot; Direction SI &middot; Ete 2026</p>
                <p class="copyright-rights">&copy; 2026 Tunisie Telecom &mdash; Tous droits reserves</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { max-width: 1400px; padding-bottom: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .page-header p { font-size: 13px; color: var(--text-muted); }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      border-left: 4px solid transparent;
      transition: transform 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); }

    .kpi-primary { border-left-color: #0072BC; }
    .kpi-primary .kpi-icon { background: #e3f2fd; color: #0072BC; }
    .kpi-analyzed { border-left-color: #00A651; }
    .kpi-analyzed .kpi-icon { background: #e8f5e9; color: #00A651; }
    .kpi-fraud { border-left-color: #E30613; }
    .kpi-fraud .kpi-icon { background: #fde8e8; color: #E30613; }
    .kpi-alerts { border-left-color: #FFD700; }
    .kpi-alerts .kpi-icon { background: #fffde7; color: #f57f17; }

    .kpi-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-icon mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .kpi-value { display: block; font-size: 32px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .kpi-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 4px; }
    .kpi-sub { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .kpi-rate { color: #E30613 !important; font-weight: 600 !important; }

    .fraud-rate-card { padding: 20px 24px; margin-bottom: 24px; }
    .fraud-rate-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 12px;
    }
    .fraud-rate-header h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .fraud-rate-header p { font-size: 12px; color: var(--text-muted); }

    .fraud-rate-value { font-size: 28px; font-weight: 800; }
    .fraud-rate-value.high { color: #E30613; }
    .fraud-rate-value.medium { color: #f57c00; }
    .fraud-rate-value.low { color: #00A651; }

    .fraud-rate-bar { height: 10px; background: #f0f0f0; border-radius: 5px; overflow: hidden; }
    .fraud-rate-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }
    .fraud-rate-fill.fill-high { background: linear-gradient(90deg, #E30613, #ff4444); }
    .fraud-rate-fill.fill-medium { background: linear-gradient(90deg, #f57c00, #ffb74d); }
    .fraud-rate-fill.fill-low { background: linear-gradient(90deg, #00A651, #66bb6a); }

    .bottom-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }

    .card-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 16px;
    }
    .card-header h3 {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600;
    }
    .card-header h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: #E30613; }

    .call-id { font-family: monospace; font-size: 12px; color: #666; }

    .score-bar-container { display: flex; align-items: center; gap: 8px; width: 140px; }
    .score-bar { height: 6px; border-radius: 3px; flex: 1; }
    .score-bar.score-high { background: #E30613; }
    .score-bar.score-medium { background: #f57c00; }
    .score-bar.score-low { background: #00A651; }
    .score-text { font-size: 12px; font-weight: 600; color: #555; min-width: 32px; }

    .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .badge-danger { background: #fde8e8; color: #E30613; }
    .badge-success { background: #e8f5e9; color: #00A651; }

    .empty-state { text-align: center; padding: 40px; color: #ccc; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    .empty-state p { font-size: 14px; }

    .alert-stats { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .alert-stat {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 16px; border-radius: 12px;
    }
    .alert-stat.open { background: #fde8e8; }
    .alert-stat.open .stat-circle { background: #E30613; }
    .alert-stat.progress { background: #fff3e0; }
    .alert-stat.progress .stat-circle { background: #f57c00; }
    .alert-stat.resolved { background: #e8f5e9; }
    .alert-stat.resolved .stat-circle { background: #00A651; }

    .stat-circle {
      width: 44px; height: 44px; border-radius: 50%;
      color: white; font-size: 18px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-label { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .stat-desc { display: block; font-size: 11px; color: var(--text-muted); }

    .copyright-card {
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-radius: 12px; padding: 16px; margin-top: 8px;
    }
    .copyright-content { display: flex; align-items: center; gap: 14px; }
    .copyright-logo-img { width: 44px; height: 44px; object-fit: contain; }
    .copyright-title { font-size: 12px; font-weight: 700; color: white; margin-bottom: 2px; }
    .copyright-dev { font-size: 11px; color: rgba(255,255,255,0.7); }
    .copyright-dev strong { color: #FFD700; }
    .copyright-year { font-size: 10px; color: rgba(255,255,255,0.5); }
    .copyright-rights { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 2px; }

    .loading-center { display: flex; justify-content: center; padding: 40px; }

    /* DARK MODE */
    body.dark-mode .dashboard-page { background: #12141f; }
    body.dark-mode .kpi-card { background: #1e2130 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.3) !important; }
    body.dark-mode .kpi-card .kpi-value { color: #e8eaf0 !important; }
    body.dark-mode .kpi-card .kpi-label { color: #c0c4d0 !important; }
    body.dark-mode .kpi-card .kpi-sub { color: #8b92a8 !important; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .card { background: #1e2130 !important; }
    body.dark-mode .fraud-rate-card { background: #1e2130 !important; }
    body.dark-mode .fraud-rate-header h3 { color: #e8eaf0 !important; }
    body.dark-mode .fraud-rate-header p { color: #8b92a8 !important; }
    body.dark-mode .fraud-rate-bar { background: #252838 !important; }
    body.dark-mode .top-suspicious { background: #1e2130 !important; }
    body.dark-mode .alerts-summary { background: #1e2130 !important; }
    body.dark-mode .card-header h3 { color: #e8eaf0 !important; }
    body.dark-mode .call-id { color: #8b92a8 !important; }
    body.dark-mode .stat-label { color: #e8eaf0 !important; }
    body.dark-mode .stat-desc { color: #8b92a8 !important; }
    body.dark-mode .alert-stat.open { background: rgba(227,6,19,0.15) !important; }
    body.dark-mode .alert-stat.progress { background: rgba(245,124,0,0.15) !important; }
    body.dark-mode .alert-stat.resolved { background: rgba(0,166,81,0.15) !important; }
    body.dark-mode .mat-mdc-table { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-header-row { background: #252838 !important; }
    body.dark-mode .mat-mdc-header-cell { color: #8b92a8 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .mat-mdc-cell { color: #e8eaf0 !important; border-bottom-color: rgba(255,255,255,0.06) !important; }
    body.dark-mode .empty-state { color: #8b92a8 !important; }
    body.dark-mode .loading-center mat-spinner { color: #E30613 !important; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  kpis?: DashboardKpis;
  alertsSummary?: AlertsSummary;
  topSuspicious: Prediction[] = [];
  private pollInterval: any;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAll();
    this.pollInterval = setInterval(() => this.loadAll(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  adminIds: number[] = [];

  onScopeChange(ids: number[]): void {
    this.adminIds = ids;
    this.loadAll();
  }

  loadAll(): void {
    this.api.getKpis(this.adminIds).subscribe(k => this.kpis = k);
    this.api.getAlertsSummary(this.adminIds).subscribe(a => this.alertsSummary = a);
    this.api.getTopSuspicious(this.adminIds).subscribe(t => this.topSuspicious = t);
  }
}
