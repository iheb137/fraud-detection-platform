import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-import-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, MatTableModule, MatIconModule, MatButtonModule,
            MatProgressSpinnerModule, MatCheckboxModule, MatTooltipModule, RouterModule],
  template: `
    <div class="imports-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Historique des Imports</h1>
          <p>Gerez vos imports CSV — consultez, analysez et supprimez par batch</p>
        </div>
        <button mat-raised-button class="btn-tt" routerLink="/cdrs/import">
          <mat-icon>upload_file</mat-icon> Nouvel Import
        </button>
      </div>

      <!-- Toolbar filtres + actions -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Rechercher par nom de fichier..."
                   [(ngModel)]="searchText" (input)="applyFilter()">
          </div>
          <div class="date-filter">
            <mat-icon>calendar_today</mat-icon>
            <input type="date" [(ngModel)]="dateFrom" (change)="applyFilter()" placeholder="Date debut">
          </div>
          <div class="date-filter">
            <mat-icon>calendar_today</mat-icon>
            <input type="date" [(ngModel)]="dateTo" (change)="applyFilter()" placeholder="Date fin">
          </div>
          <button mat-button class="btn-reset" (click)="resetFilters()" *ngIf="searchText || dateFrom || dateTo">
            <mat-icon>clear</mat-icon> Reinitialiser
          </button>
        </div>
        <div class="toolbar-right" *ngIf="selectedIds.length > 0">
          <span class="selection-info">{{ selectedIds.length }} selectionne(s)</span>
          <button mat-stroked-button class="btn-archive" (click)="archiveSelected()"
                  matTooltip="Archiver la selection">
            <mat-icon>archive</mat-icon> Archiver
          </button>
          <button mat-raised-button class="btn-delete" (click)="deleteSelected()"
                  matTooltip="Supprimer definitivement">
            <mat-icon>delete_forever</mat-icon> Supprimer
          </button>
        </div>
      </div>

      <!-- Stats rapides -->
      <div class="quick-stats" *ngIf="!loading">
        <div class="qs-item">
          <span class="qs-val">{{ batches.length }}</span>
          <span class="qs-lbl">Total imports</span>
        </div>
        <div class="qs-divider"></div>
        <div class="qs-item">
          <span class="qs-val">{{ getTotalCdrs() | number }}</span>
          <span class="qs-lbl">CDR total</span>
        </div>
        <div class="qs-divider"></div>
        <div class="qs-item">
          <span class="qs-val">{{ getTotalFrauds() | number }}</span>
          <span class="qs-lbl">Fraudes detectees</span>
        </div>
        <div class="qs-divider"></div>
        <div class="qs-item">
          <span class="qs-val qs-danger">{{ getArchivedCount() }}</span>
          <span class="qs-lbl">Archives</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement des imports...</p>
      </div>

      <!-- Tableau -->
      <div class="table-container" *ngIf="!loading">

        <div class="empty-state" *ngIf="filtered.length === 0">
          <mat-icon>inbox</mat-icon>
          <h3>Aucun import trouve</h3>
          <p>Modifiez vos filtres ou importez un nouveau fichier CSV</p>
          <button mat-raised-button class="btn-tt" routerLink="/cdrs/import">
            <mat-icon>upload_file</mat-icon> Premier Import
          </button>
        </div>

        <table *ngIf="filtered.length > 0" class="imports-table">
          <thead>
            <tr>
              <th class="col-check">
                <input type="checkbox" [checked]="allSelected()"
                       [indeterminate]="someSelected()"
                       (change)="toggleAll($event)">
              </th>
              <th>Fichier</th>
              <th>Date d'import</th>
              <th>CDR</th>
              <th>Analyses</th>
              <th>Fraudes</th>
              <th>Taux fraude</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let batch of filtered"
                [class.selected]="isSelected(batch.id)"
                [class.archived]="batch.archived">
              <td class="col-check">
                <input type="checkbox" [checked]="isSelected(batch.id)"
                       (change)="toggleSelect(batch.id)">
              </td>
              <td class="col-file">
                <div class="file-info">
                  <div class="file-icon" [class.analyzed]="batch.analyzedCount > 0"
                       [class.archived-icon]="batch.archived">
                    <mat-icon>{{ batch.archived ? 'archive' : (batch.analyzedCount > 0 ? 'task_alt' : 'description') }}</mat-icon>
                  </div>
                  <div>
                    <span class="filename">{{ batch.filename }}</span>
                    <span class="imported-by">par {{ batch.importedBy }}</span>
                  </div>
                </div>
              </td>
              <td class="col-date">
                <span class="date-main">{{ batch.importedAt | date:'dd/MM/yyyy' }}</span>
                <span class="date-time">{{ batch.importedAt | date:'HH:mm' }}</span>
              </td>
              <td class="col-num">
                <span class="num-badge blue">{{ batch.recordCount | number }}</span>
              </td>
              <td class="col-num">
                <span class="num-badge green" *ngIf="batch.analyzedCount > 0">{{ batch.analyzedCount | number }}</span>
                <span class="num-badge grey" *ngIf="batch.analyzedCount === 0">—</span>
              </td>
              <td class="col-num">
                <span class="num-badge red" *ngIf="batch.fraudCount > 0">{{ batch.fraudCount | number }}</span>
                <span class="num-badge grey" *ngIf="batch.fraudCount === 0">0</span>
              </td>
              <td class="col-rate">
                <div *ngIf="batch.analyzedCount > 0" class="rate-cell">
                  <div class="mini-bar">
                    <div class="mini-fill" [style.width.%]="(batch.fraudCount / batch.recordCount) * 100"></div>
                  </div>
                  <span class="rate-pct" [class.rate-high]="(batch.fraudCount/batch.recordCount)>0.3">
                    {{ ((batch.fraudCount / batch.recordCount) * 100).toFixed(0) }}%
                  </span>
                </div>
                <span class="num-badge grey" *ngIf="batch.analyzedCount === 0">N/A</span>
              </td>
              <td>
                <span class="status-badge" [class.success]="batch.status==='SUCCESS' && !batch.archived"
                      [class.failed]="batch.status==='FAILED'"
                      [class.archived-badge]="batch.archived">
                  {{ batch.archived ? 'Archive' : batch.status }}
                </span>
              </td>
              <td class="col-actions">
                <button mat-icon-button class="action-btn view-btn"
                        (click)="viewCdrs(batch)" matTooltip="Voir les CDR">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button class="action-btn analyze-btn"
                        (click)="analyzeBatch(batch)"
                        [disabled]="analyzing === batch.id || batch.archived"
                        matTooltip="Analyser avec ML">
                  <mat-spinner diameter="16" *ngIf="analyzing === batch.id"></mat-spinner>
                  <mat-icon *ngIf="analyzing !== batch.id">psychology</mat-icon>
                </button>
                <button mat-icon-button class="action-btn archive-btn"
                        (click)="archiveBatch(batch)"
                        [matTooltip]="batch.archived ? 'Desarchiver' : 'Archiver'">
                  <mat-icon>{{ batch.archived ? 'unarchive' : 'archive' }}</mat-icon>
                </button>
                <button mat-icon-button class="action-btn delete-btn"
                        (click)="confirmDelete(batch)" matTooltip="Supprimer">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="table-footer" *ngIf="filtered.length > 0">
          <span>{{ filtered.length }} import(s) affiche(s)</span>
        </div>
      </div>

      <!-- CDR Panel -->
      <div class="cdr-panel" *ngIf="selectedBatch">
        <div class="cdr-panel-header">
          <h3><mat-icon>description</mat-icon> CDR — {{ selectedBatch.filename }}</h3>
          <button mat-icon-button (click)="selectedBatch = null"><mat-icon>close</mat-icon></button>
        </div>
        <table mat-table [dataSource]="batchCdrs" class="cdr-table">
          <ng-container matColumnDef="calling">
            <th mat-header-cell *matHeaderCellDef>Appelant</th>
            <td mat-cell *matCellDef="let c"><span class="phone">{{ c.callingNumber }}</span></td>
          </ng-container>
          <ng-container matColumnDef="called">
            <th mat-header-cell *matHeaderCellDef>Appele</th>
            <td mat-cell *matCellDef="let c"><span class="phone">{{ c.calledNumber }}</span></td>
          </ng-container>
          <ng-container matColumnDef="time">
            <th mat-header-cell *matHeaderCellDef>Date/Heure</th>
            <td mat-cell *matCellDef="let c">{{ c.callStartTime | date:'dd/MM HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>Duree</th>
            <td mat-cell *matCellDef="let c">{{ formatDuration(c.callDurationSec) }}</td>
          </ng-container>
          <ng-container matColumnDef="country">
            <th mat-header-cell *matHeaderCellDef>Pays</th>
            <td mat-cell *matCellDef="let c">
              <span class="badge" [class.badge-warning]="c.destinationCountry !== 'TN'"
                    [class.badge-success]="c.destinationCountry === 'TN'">
                {{ c.destinationCountry }}
              </span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cdrColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: cdrColumns;"></tr>
        </table>
      </div>

      <!-- Confirmation Dialog -->
      <div class="confirm-overlay" *ngIf="confirmBatch" (click)="confirmBatch = null">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <div class="confirm-icon"><mat-icon>warning_amber</mat-icon></div>
          <h3>Confirmer la suppression</h3>
          <p>Vous allez supprimer <strong>{{ confirmBatch.filename }}</strong>.</p>
          <p class="confirm-warning">Toutes les predictions et alertes associees seront supprimees du dashboard.</p>
          <div class="confirm-actions">
            <button mat-button (click)="confirmBatch = null">Annuler</button>
            <button mat-raised-button class="btn-delete" (click)="deleteBatch(confirmBatch)">
              <mat-icon>delete_forever</mat-icon> Supprimer definitivement
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast" *ngIf="toastMsg" [class.toast-success]="toastType==='success'"
           [class.toast-error]="toastType==='error'" [class.toast-info]="toastType==='info'">
        <mat-icon>{{ toastType === 'success' ? 'check_circle' : toastType === 'error' ? 'error' : 'info' }}</mat-icon>
        <span>{{ toastMsg }}</span>
      </div>

    </div>
  `,
  styles: [`
    .imports-page { max-width: 1400px; }

    .page-header {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 24px;
    }
    .page-header h1 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .toolbar {
      display: flex; align-items: center;
      justify-content: space-between;
      background: var(--bg-card); border-radius: 12px;
      padding: 14px 20px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      gap: 12px; flex-wrap: wrap;
    }
    .toolbar-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .toolbar-right { display: flex; align-items: center; gap: 10px; }

    .search-box {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg-card2); border: 1px solid #e0e0e0;
      border-radius: 8px; padding: 8px 14px; min-width: 280px;
      mat-icon { color: var(--text-muted); font-size: 18px; }
      input { border: none; background: transparent; outline: none;
              font-size: 13px; color: #333; width: 100%; }
    }

    .date-filter {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg-card2); border: 1px solid #e0e0e0;
      border-radius: 8px; padding: 8px 14px;
      mat-icon { color: var(--text-muted); font-size: 16px; }
      input { border: none; background: transparent; outline: none;
              font-size: 13px; color: #333; }
    }

    .btn-reset { color: #999 !important; font-size: 13px !important; }
    .selection-info { font-size: 13px; font-weight: 600; color: #0072BC; }

    .btn-archive {
      border-color: #0072BC !important; color: #0072BC !important;
      font-size: 13px !important; border-radius: 8px !important;
    }
    .btn-delete {
      background: #E30613 !important; color: white !important;
      font-size: 13px !important; border-radius: 8px !important;
    }

    .quick-stats {
      display: flex; align-items: center; gap: 0;
      background: var(--bg-card); border-radius: 12px;
      padding: 16px 24px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .qs-item { flex: 1; text-align: center; }
    .qs-val { display: block; font-size: 28px; font-weight: 800; color: var(--text-primary); }
    .qs-val.qs-danger { color: #E30613; }
    .qs-lbl { display: block; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .qs-divider { width: 1px; height: 40px; background: #f0f0f0; margin: 0 8px; }

    .table-container {
      background: var(--bg-card); border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      overflow: hidden;
    }

    .imports-table {
      width: 100%; border-collapse: collapse;
    }
    .imports-table thead tr {
      background: var(--bg-card2);
      border-bottom: 2px solid #e8e8e8;
    }
    .imports-table th {
      padding: 14px 16px; text-align: left;
      font-size: 12px; font-weight: 700;
      color: var(--text-secondary); text-transform: uppercase;
      letter-spacing: 0.5px; white-space: nowrap;
    }
    .imports-table td {
      padding: 14px 16px; border-bottom: 1px solid #f5f5f5;
      vertical-align: middle;
    }
    .imports-table tbody tr {
      transition: background 0.15s;
    }
    .imports-table tbody tr:hover { background: var(--hover); }
    .imports-table tbody tr.selected { background: #e8f4ff; }
    .imports-table tbody tr.archived { opacity: 0.6; }

    .col-check { width: 40px; }
    .col-check input { cursor: pointer; width: 16px; height: 16px; }

    .file-info { display: flex; align-items: center; gap: 12px; }
    .file-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: #e3f2fd; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 20px; color: #0072BC; }
    }
    .file-icon.analyzed { background: #e8f5e9; mat-icon { color: #00A651; } }
    .file-icon.archived-icon { background: #f3f3f3; mat-icon { color: var(--text-muted); } }

    .filename { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .imported-by { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .col-date .date-main { display: block; font-size: 13px; font-weight: 600; color: #2c3e50; }
    .col-date .date-time { display: block; font-size: 11px; color: var(--text-muted); }

    .num-badge {
      display: inline-block; padding: 4px 10px;
      border-radius: 20px; font-size: 12px; font-weight: 700;
    }
    .num-badge.blue { background: #e3f2fd; color: #0072BC; }
    .num-badge.green { background: #e8f5e9; color: #00A651; }
    .num-badge.red { background: #fde8e8; color: #E30613; }
    .num-badge.grey { background: #f5f5f5; color: #bbb; }

    .rate-cell { display: flex; align-items: center; gap: 8px; }
    .mini-bar {
      width: 60px; height: 6px; background: #f0f0f0;
      border-radius: 3px; overflow: hidden;
    }
    .mini-fill { height: 100%; background: #E30613; border-radius: 3px; }
    .rate-pct { font-size: 12px; font-weight: 700; color: #555; }
    .rate-pct.rate-high { color: #E30613; }

    .status-badge {
      padding: 5px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 700;
    }
    .status-badge.success { background: #e8f5e9; color: #00A651; }
    .status-badge.failed { background: #fde8e8; color: #E30613; }
    .status-badge.archived-badge { background: #f3f3f3; color: var(--text-muted); }

    .col-actions { display: flex; gap: 2px; align-items: center; }
    .action-btn { width: 34px !important; height: 34px !important; line-height: 34px !important; }
    .action-btn mat-icon { font-size: 18px !important; }
    .view-btn mat-icon { color: #0072BC; }
    .analyze-btn mat-icon { color: #00A651; }
    .archive-btn mat-icon { color: #f57c00; }
    .delete-btn mat-icon { color: #E30613; }

    .table-footer {
      padding: 12px 20px; border-top: 1px solid #f0f0f0;
      font-size: 12px; color: var(--text-muted); text-align: right;
    }

    .empty-state {
      text-align: center; padding: 80px 40px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #e0e0e0; margin-bottom: 16px; }
      h3 { font-size: 18px; color: var(--text-secondary); margin-bottom: 8px; }
      p { font-size: 14px; color: #bbb; margin-bottom: 24px; }
    }

    .loading-center {
      display: flex; flex-direction: column;
      align-items: center; padding: 80px;
      gap: 16px; color: var(--text-muted);
    }

    .cdr-panel {
      position: fixed; bottom: 0; left: 260px; right: 0;
      background: var(--bg-card); border-top: 2px solid #E30613;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
      max-height: 45vh; overflow-y: auto; z-index: 1000;
      padding: 0 24px 16px;
    }
    .cdr-panel-header {
      display: flex; align-items: center;
      justify-content: space-between; padding: 14px 0;
      position: sticky; top: 0; background: var(--bg-card);
      border-bottom: 1px solid #f0f0f0; margin-bottom: 8px;
      h3 { display: flex; align-items: center; gap: 8px;
           font-size: 14px; font-weight: 700;
           mat-icon { color: #E30613; } }
    }
    .phone { font-family: monospace; font-size: 12px; font-weight: 600; color: #0072BC; }

    .confirm-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000;
    }
    .confirm-dialog {
      background: var(--bg-card); border-radius: 20px;
      padding: 36px; max-width: 440px; width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .confirm-icon mat-icon {
      font-size: 56px; width: 56px; height: 56px;
      color: #f57c00; margin-bottom: 16px;
    }
    .confirm-dialog h3 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
    .confirm-dialog p { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
    .confirm-warning {
      background: #fff3e0; border-radius: 8px; padding: 10px 14px;
      font-size: 13px; color: #f57c00 !important; margin: 16px 0 !important;
    }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; margin-top: 8px; }

    .toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 14px 20px; border-radius: 12px;
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 600; z-index: 3000;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
      mat-icon { font-size: 20px; }
    }
    .toast-success { background: #e8f5e9; color: #00A651; border: 1px solid #c8e6c9; }
    .toast-error { background: #fde8e8; color: #E30613; border: 1px solid #ffcdd2; }
    .toast-info { background: #e3f2fd; color: #0072BC; border: 1px solid #bbdefb; }

    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* DARK MODE */
    body.dark-mode .imports-page { background: #12141f; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .toolbar { background: #1e2130 !important; }
    body.dark-mode .quick-stats { background: #1e2130 !important; }
    body.dark-mode .qs-val { color: #e8eaf0 !important; }
    body.dark-mode .qs-lbl { color: #8b92a8 !important; }
    body.dark-mode .qs-divider { background: rgba(255,255,255,0.08) !important; }
    body.dark-mode .search-box { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; }
    body.dark-mode .search-box input { color: #e8eaf0 !important; }
    body.dark-mode .date-filter { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; }
    body.dark-mode .date-filter input { color: #e8eaf0 !important; color-scheme: dark; }
    body.dark-mode .table-container { background: #1e2130 !important; }
    body.dark-mode .imports-table { background: #1e2130 !important; }
    body.dark-mode .imports-table thead tr { background: #0f1118 !important; }
    body.dark-mode .imports-table th { color: #8b92a8 !important; }
    body.dark-mode .imports-table tbody tr { border-bottom-color: rgba(255,255,255,0.06) !important; }
    body.dark-mode .imports-table tbody tr:hover { background: rgba(255,255,255,0.04) !important; }
    body.dark-mode .imports-table td { color: #e8eaf0 !important; }
    body.dark-mode .filename { color: #e8eaf0 !important; }
    body.dark-mode .imported-by { color: #8b92a8 !important; }
    body.dark-mode .date-main { color: #e8eaf0 !important; }
    body.dark-mode .date-time { color: #8b92a8 !important; }
    body.dark-mode .table-footer { color: #8b92a8 !important; border-top-color: rgba(255,255,255,0.06) !important; }
    body.dark-mode .empty-state h3 { color: #8b92a8 !important; }
    body.dark-mode .empty-state p { color: #666 !important; }
    body.dark-mode .confirm-dialog { background: #1e2130 !important; }
    body.dark-mode .confirm-dialog h3 { color: #e8eaf0 !important; }
    body.dark-mode .confirm-dialog p { color: #8b92a8 !important; }  `]
})
export class ImportListComponent implements OnInit {
  batches: any[] = [];
  filtered: any[] = [];
  loading = false;
  analyzing: number | null = null;
  selectedBatch: any = null;
  batchCdrs: any[] = [];
  confirmBatch: any = null;
  toastMsg = '';
  toastType = 'success';
  selectedIds: number[] = [];
  searchText = '';
  dateFrom = '';
  dateTo = '';
  cdrColumns = ['calling', 'called', 'time', 'duration', 'country'];

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getBatches().subscribe({
      next: (data) => {
        this.batches = (data.content || []).map((b: any) => ({ ...b, archived: false }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(): void {
    let result = [...this.batches];
    if (this.searchText) {
      const s = this.searchText.toLowerCase();
      result = result.filter(b => b.filename?.toLowerCase().includes(s));
    }
    if (this.dateFrom) {
      result = result.filter(b => new Date(b.importedAt) >= new Date(this.dateFrom));
    }
    if (this.dateTo) {
      result = result.filter(b => new Date(b.importedAt) <= new Date(this.dateTo + 'T23:59:59'));
    }
    this.filtered = result;
  }

  resetFilters(): void {
    this.searchText = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilter();
  }

  isSelected(id: number): boolean { return this.selectedIds.includes(id); }

  toggleSelect(id: number): void {
    if (this.isSelected(id)) {
      this.selectedIds = this.selectedIds.filter(i => i !== id);
    } else {
      this.selectedIds.push(id);
    }
  }

  allSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(b => this.isSelected(b.id));
  }

  someSelected(): boolean {
    return this.selectedIds.length > 0 && !this.allSelected();
  }

  toggleAll(event: any): void {
    if (event.target.checked) {
      this.selectedIds = this.filtered.map(b => b.id);
    } else {
      this.selectedIds = [];
    }
  }

  archiveBatch(batch: any): void {
    batch.archived = !batch.archived;
    this.showToast(batch.archived ? 'Batch archive avec succes' : 'Batch desarkhive', 'info');
  }

  archiveSelected(): void {
    this.batches.forEach(b => {
      if (this.selectedIds.includes(b.id)) b.archived = true;
    });
    this.showToast(this.selectedIds.length + ' batch(s) archives', 'info');
    this.selectedIds = [];
    this.applyFilter();
  }

  confirmDelete(batch: any): void { this.confirmBatch = batch; }

  deleteBatch(batch: any): void {
    this.api.deleteBatch(batch.id).subscribe({
      next: () => {
        this.batches = this.batches.filter(b => b.id !== batch.id);
        this.selectedIds = this.selectedIds.filter(id => id !== batch.id);
        this.confirmBatch = null;
        this.applyFilter();
        this.showToast('Import supprime — dashboard mis a jour', 'success');
      },
      error: () => {
        this.confirmBatch = null;
        this.showToast('Erreur lors de la suppression', 'error');
      }
    });
  }

  deleteSelected(): void {
    const ids = [...this.selectedIds];
    const calls = ids.map(id => this.api.deleteBatch(id));
    let done = 0;
    calls.forEach((call, i) => {
      call.subscribe({
        next: () => {
          this.batches = this.batches.filter(b => b.id !== ids[i]);
          done++;
          if (done === ids.length) {
            this.selectedIds = [];
            this.applyFilter();
            this.showToast(ids.length + ' import(s) supprimes', 'success');
          }
        },
        error: () => this.showToast('Erreur suppression batch ' + ids[i], 'error')
      });
    });
  }

  viewCdrs(batch: any): void {
    if (this.selectedBatch?.id === batch.id) {
      this.selectedBatch = null;
      return;
    }
    this.selectedBatch = batch;
    this.api.getBatchCdrs(batch.id).subscribe(data => {
      this.batchCdrs = data.content || [];
    });
  }

  analyzeBatch(batch: any): void {
    this.analyzing = batch.id;
    this.api.analyzeBatch(batch.id).subscribe({
      next: (res: any) => {
        this.analyzing = null;
        this.showToast('Analyse terminee : ' + (res.fraudCount || 0) + ' fraudes detectees', 'success');
        this.load();
      },
      error: () => {
        this.analyzing = null;
        this.showToast('Erreur lors de l\'analyse ML', 'error');
      }
    });
  }

  showToast(msg: string, type: string): void {
    this.toastMsg = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = '', 4000);
  }

  getTotalCdrs(): number { return this.batches.reduce((s, b) => s + (b.recordCount || 0), 0); }
  getTotalFrauds(): number { return this.batches.reduce((s, b) => s + (b.fraudCount || 0), 0); }
  getArchivedCount(): number { return this.batches.filter(b => b.archived).length; }

  formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? m + 'm ' + s + 's' : s + 's';
  }
}