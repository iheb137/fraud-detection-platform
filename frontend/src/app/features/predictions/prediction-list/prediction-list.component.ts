import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { Prediction } from '../../../core/models/prediction';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-prediction-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule,
            MatButtonModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Prédictions ML</h1>
        <p>Résultats d'analyse du modèle Random Forest</p>
      </div>
      <div class="header-stats">
        <div class="stat-chip fraud">
          <mat-icon>gpp_bad</mat-icon>
          <span>{{ fraudCount }} fraudes</span>
        </div>
        <div class="stat-chip safe">
          <mat-icon>verified_user</mat-icon>
          <span>{{ safeCount }} legitimes</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="loading-overlay" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <table mat-table [dataSource]="predictions" *ngIf="!loading">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>#</th>
          <td mat-cell *matCellDef="let p">{{ p.id }}</td>
        </ng-container>

        <ng-container matColumnDef="callId">
          <th mat-header-cell *matHeaderCellDef>Call ID</th>
          <td mat-cell *matCellDef="let p">
            <span class="call-id">{{ p.callId | slice:0:20 }}...</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="fraudScore">
          <th mat-header-cell *matHeaderCellDef>Score de Fraude</th>
          <td mat-cell *matCellDef="let p">
            <div class="score-container">
              <div class="score-gauge">
                <div class="score-fill"
                     [style.width.%]="p.fraudScore * 100"
                     [class.high]="p.fraudScore >= 0.7"
                     [class.medium]="p.fraudScore >= 0.4 && p.fraudScore < 0.7"
                     [class.low]="p.fraudScore < 0.4">
                </div>
              </div>
              <span class="score-pct" [class.text-high]="p.fraudScore >= 0.7"
                    [class.text-medium]="p.fraudScore >= 0.4 && p.fraudScore < 0.7"
                    [class.text-low]="p.fraudScore < 0.4">
                {{ (p.fraudScore * 100).toFixed(1) }}%
              </span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="verdict">
          <th mat-header-cell *matHeaderCellDef>Verdict</th>
          <td mat-cell *matCellDef="let p">
            <div class="verdict-chip" [class.fraud]="p.isFraud" [class.legit]="!p.isFraud">
              <mat-icon>{{ p.isFraud ? 'gpp_bad' : 'verified_user' }}</mat-icon>
              {{ p.isFraud ? 'FRAUDE' : 'LEGITIME' }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="model">
          <th mat-header-cell *matHeaderCellDef>Modèle</th>
          <td mat-cell *matCellDef="let p">
            <span class="badge badge-info">{{ p.modelVersion }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="label">
          <th mat-header-cell *matHeaderCellDef>V&eacute;rit&eacute; terrain</th>
          <td mat-cell *matCellDef="let p">
            <div class="label-actions" *ngIf="isAnalyste()">
              <button class="lbl-btn confirm" [class.active]="p.analystLabel === true"
                      (click)="labelAs(p, true)" title="Confirmer : vraie fraude">
                <mat-icon>check</mat-icon>
              </button>
              <button class="lbl-btn reject" [class.active]="p.analystLabel === false"
                      (click)="labelAs(p, false)" title="Infirmer : fausse alerte">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <span class="lbl-badge" *ngIf="!isAnalyste() && p.analystLabel !== null && p.analystLabel !== undefined"
                  [class.confirmed]="p.analystLabel" [class.rejected]="!p.analystLabel">
              {{ p.analystLabel ? 'Confirm&eacute;e' : 'Infirm&eacute;e' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date Analyse</th>
          <td mat-cell *matCellDef="let p">{{ p.predictedAt | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <mat-paginator [length]="totalElements" [pageSize]="20"
                     (page)="onPageChange($event)">
      </mat-paginator>
    </div>
  `,
  styles: [`
    .header-stats { display: flex; gap: 12px; }
    .stat-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &.fraud { background: #fde8e8; color: #E30613; }
      &.safe { background: #e8f5e9; color: #00A651; }
    }
    .call-id { font-family: monospace; font-size: 12px; color: #666; }
    .score-container { display: flex; align-items: center; gap: 10px; }
    .score-gauge { width: 100px; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .score-fill {
      height: 100%; border-radius: 4px; transition: width 0.5s;
      &.high { background: linear-gradient(90deg, #E30613, #ff4444); }
      &.medium { background: linear-gradient(90deg, #f57c00, #ffb74d); }
      &.low { background: linear-gradient(90deg, #00A651, #66bb6a); }
    }
    .score-pct { font-size: 13px; font-weight: 700; min-width: 44px;
      &.text-high { color: #E30613; }
      &.text-medium { color: #f57c00; }
      &.text-low { color: #00A651; }
    }
    .verdict-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.fraud { background: #fde8e8; color: #E30613; }
      &.legit { background: #e8f5e9; color: #00A651; }
    }
    .label-actions { display: flex; gap: 6px; }
    .lbl-btn {
      width: 30px; height: 30px; border-radius: 8px;
      border: 1.5px solid #e0e0e0; background: white; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .lbl-btn mat-icon { font-size: 16px; width: 16px; height: 16px; color: #999; }
    .lbl-btn.confirm:hover, .lbl-btn.confirm.active { background: #E30613; border-color: #E30613; }
    .lbl-btn.reject:hover, .lbl-btn.reject.active { background: #00A651; border-color: #00A651; }
    .lbl-btn.active mat-icon, .lbl-btn:hover mat-icon { color: white; }
    .lbl-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .lbl-badge.confirmed { background: #fde8e8; color: #E30613; }
    .lbl-badge.rejected { background: #e8f5e9; color: #00A651; }
    .loading-overlay { display: flex; justify-content: center; padding: 60px; }

    /* DARK MODE */
    body.dark-mode .predictions-page { background: #12141f; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .card { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-table { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-header-row { background: #252838 !important; }
    body.dark-mode .mat-mdc-header-cell { color: #8b92a8 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .mat-mdc-cell { color: #e8eaf0 !important; border-bottom-color: rgba(255,255,255,0.06) !important; }  `]
})
export class PredictionListComponent implements OnInit {
  predictions: Prediction[] = [];
  displayedColumns = ['id', 'callId', 'fraudScore', 'verdict', 'model', 'label', 'date'];
  totalElements = 0;
  loading = false;
  fraudCount = 0;
  safeCount = 0;

  constructor(private api: ApiService, private authService: AuthService) {}

  isAnalyste(): boolean { return this.authService.getCurrentUser()?.role === 'ANALYSTE'; }

  labelAs(p: any, label: boolean): void {
    // Re-cliquer le meme label ne fait rien (idempotent cote UX)
    if (p.analystLabel === label) return;
    this.api.labelPrediction(p.id, label).subscribe({
      next: (r) => p.analystLabel = r.analystLabel,
      error: () => {}
    });
  }

  ngOnInit(): void { this.load(); }

  load(page = 0): void {
    this.loading = true;
    this.api.getPredictions(page).subscribe({
      next: (data) => {
        this.predictions = data.content;
        this.totalElements = data.totalElements;
        this.fraudCount = data.content.filter(p => p.isFraud).length;
        this.safeCount = data.content.filter(p => !p.isFraud).length;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onPageChange(e: PageEvent): void { this.load(e.pageIndex); }
}