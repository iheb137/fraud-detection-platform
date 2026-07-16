import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Alert } from '../../../core/models/alert';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule,
            MatButtonModule, MatProgressSpinnerModule, MatSelectModule,
            MatFormFieldModule, FormsModule, MatDialogModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Gestion des Alertes</h1>
        <p>Alertes g&eacute;n&eacute;r&eacute;es automatiquement par le syst&egrave;me de d&eacute;tection</p>
      </div>
      <div class="header-chips">
        <div class="chip open"><mat-icon>circle</mat-icon> {{ openCount }} Ouvertes</div>
        <div class="chip progress"><mat-icon>circle</mat-icon> {{ progressCount }} En cours</div>
        <div class="chip resolved"><mat-icon>circle</mat-icon> {{ resolvedCount }} R&eacute;solues</div>
      </div>
    </div>

    <div class="card">
      <div class="loading-overlay" *ngIf="loading">
        <div class="skl-stack">
          <div class="skl skl-row" *ngFor="let i of [1,2,3,4,5,6]"></div>
        </div>
      </div>

      <table mat-table [dataSource]="alerts" *ngIf="!loading">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>#</th>
          <td mat-cell *matCellDef="let a">{{ a.id }}</td>
        </ng-container>

        <ng-container matColumnDef="callingNumber">
          <th mat-header-cell *matHeaderCellDef>Num&eacute;ro Suspect</th>
          <td mat-cell *matCellDef="let a">
            <span class="phone-danger">{{ a.callingNumber }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="fraudScore">
          <th mat-header-cell *matHeaderCellDef>Score Fraude</th>
          <td mat-cell *matCellDef="let a">
            <span class="score-badge" [class.high]="a.fraudScore >= 0.7"
                  [class.medium]="a.fraudScore >= 0.4 && a.fraudScore < 0.7">
              {{ (a.fraudScore * 100).toFixed(0) }}%
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="severity">
          <th mat-header-cell *matHeaderCellDef>S&eacute;v&eacute;rit&eacute;</th>
          <td mat-cell *matCellDef="let a">
            <span class="severity-badge" [class]="'sev-' + a.severity.toLowerCase()">
              <mat-icon>{{ a.severity === 'HIGH' ? 'report' : a.severity === 'MEDIUM' ? 'warning' : 'info' }}</mat-icon>
              {{ a.severity }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let a">
            <mat-select [(value)]="a.status" (selectionChange)="updateStatus(a)"
                        class="status-select" [class]="'status-' + a.status.toLowerCase()">
              <mat-option value="OPEN">Ouverte</mat-option>
              <mat-option value="IN_PROGRESS">En cours</mat-option>
              <mat-option value="RESOLVED">R&eacute;solue</mat-option>
            </mat-select>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let a">{{ a.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"
            [class.row-high]="row.severity === 'HIGH'"
            [class.row-medium]="row.severity === 'MEDIUM'">
        </tr>
      </table>

      <mat-paginator [length]="totalElements" [pageSize]="20"
                     (page)="onPageChange($event)">
      </mat-paginator>
    </div>
  `,
  styles: [`
    .header-chips { display: flex; gap: 10px; }
    .chip {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
      mat-icon { font-size: 10px; width: 10px; height: 10px; }
      &.open { background: #fde8e8; color: #E30613; }
      &.progress { background: #fff3e0; color: #f57c00; }
      &.resolved { background: #e8f5e9; color: #00A651; }
    }
    .phone-danger { font-family: monospace; font-weight: 600; color: #E30613; font-size: 13px; }
    .score-badge {
      padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
      &.high { background: #fde8e8; color: #E30613; }
      &.medium { background: #fff3e0; color: #f57c00; }
    }
    .severity-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.sev-high { background: #fde8e8; color: #E30613; }
      &.sev-medium { background: #fff3e0; color: #f57c00; }
      &.sev-low { background: #e3f2fd; color: #1565c0; }
    }
    .status-select { font-size: 13px; }
    .row-high { border-left: 3px solid #E30613; }
    .row-medium { border-left: 3px solid #f57c00; }
    .loading-overlay { display: flex; justify-content: center; padding: 60px; }

    /* DARK MODE */
    body.dark-mode .alerts-page { background: #12141f; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .card { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-table { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-header-row { background: #252838 !important; }
    body.dark-mode .mat-mdc-header-cell { color: #8b92a8 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .mat-mdc-cell { color: #e8eaf0 !important; border-bottom-color: rgba(255,255,255,0.06) !important; }  `]
})
export class AlertListComponent implements OnInit {
  alerts: Alert[] = [];
  displayedColumns = ['id', 'callingNumber', 'fraudScore', 'severity', 'status', 'createdAt'];
  totalElements = 0;
  loading = false;
  openCount = 0;
  progressCount = 0;
  resolvedCount = 0;
  currentPage = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(page = 0): void {
    this.loading = true;
    this.currentPage = page;
    this.api.getAlerts(page).subscribe({
      next: (data: any) => {
        this.alerts = data.content || [];
        this.totalElements = data.totalElements ?? 0;
        // Compteurs globaux fournis par le backend (source de verite unique)
        this.openCount = data.openCount ?? 0;
        this.progressCount = data.inProgressCount ?? 0;
        this.resolvedCount = data.resolvedCount ?? 0;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  updateStatus(alert: Alert): void {
    // Recharge apres changement : les compteurs se mettent a jour automatiquement
    this.api.updateAlertStatus(alert.id, alert.status).subscribe({
      next: () => this.load(this.currentPage)
    });
  }

  onPageChange(e: PageEvent): void { this.load(e.pageIndex); }
}