import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Cdr } from '../../../core/models/cdr';

@Component({
  selector: 'app-cdr-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule,
            MatButtonModule, MatInputModule, MatFormFieldModule,
            MatProgressSpinnerModule, RouterModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Call Detail Records</h1>
        <p>Liste des enregistrements d'appels téléphoniques</p>
      </div>
      <button mat-raised-button class="btn-tt" routerLink="/cdrs/import">
        <mat-icon>upload_file</mat-icon> Importer CSV
      </button>
    </div>

    <div class="card">
      <div class="toolbar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Rechercher par numéro</mat-label>
          <input matInput [(ngModel)]="searchNumber" (keyup.enter)="search()" placeholder="+216...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <button mat-raised-button class="btn-tt" (click)="search()">Rechercher</button>
        <button mat-button (click)="reset()" *ngIf="searchNumber">
          <mat-icon>clear</mat-icon> Réinitialiser
        </button>
        <span class="total-count">{{ totalElements }} CDR au total</span>
      </div>

      <div class="loading-overlay" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <table mat-table [dataSource]="cdrs" *ngIf="!loading">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>#</th>
          <td mat-cell *matCellDef="let c">{{ c.id }}</td>
        </ng-container>
        <ng-container matColumnDef="callingNumber">
          <th mat-header-cell *matHeaderCellDef>Appelant</th>
          <td mat-cell *matCellDef="let c"><span class="phone-number">{{ c.callingNumber }}</span></td>
        </ng-container>
        <ng-container matColumnDef="calledNumber">
          <th mat-header-cell *matHeaderCellDef>Appelé</th>
          <td mat-cell *matCellDef="let c"><span class="phone-number">{{ c.calledNumber }}</span></td>
        </ng-container>
        <ng-container matColumnDef="callStartTime">
          <th mat-header-cell *matHeaderCellDef>Date/Heure</th>
          <td mat-cell *matCellDef="let c">{{ c.callStartTime | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>
        <ng-container matColumnDef="duration">
          <th mat-header-cell *matHeaderCellDef>Durée</th>
          <td mat-cell *matCellDef="let c">{{ formatDuration(c.callDurationSec) }}</td>
        </ng-container>
        <ng-container matColumnDef="callType">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let c">
            <span class="badge badge-info">{{ c.callType }}</span>
          </td>
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
        <ng-container matColumnDef="revenue">
          <th mat-header-cell *matHeaderCellDef>Revenu</th>
          <td mat-cell *matCellDef="let c"><strong>{{ c.revenue | number:'1.2-2' }} DT</strong></td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="cdr-row"></tr>
      </table>

      <mat-paginator [length]="totalElements" [pageSize]="pageSize"
                     [pageSizeOptions]="[10, 20, 50]"
                     (page)="onPageChange($event)">
      </mat-paginator>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .search-field { width: 280px; }
    .total-count { margin-left: auto; font-size: 13px; color: #999; }
    .phone-number { font-family: monospace; font-size: 13px; font-weight: 600; color: #0072BC; }
    .cdr-row:hover { background: #f8f9fa; cursor: pointer; }
    .loading-overlay { display: flex; justify-content: center; padding: 60px; }

    /* DARK MODE */
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .card { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-table { background: #1e2130 !important; }
    body.dark-mode .mat-mdc-header-row { background: #252838 !important; }
    body.dark-mode .mat-mdc-header-cell { color: #8b92a8 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .mat-mdc-cell { color: #e8eaf0 !important; border-bottom-color: rgba(255,255,255,0.06) !important; }  `]
})
export class CdrListComponent implements OnInit {
  cdrs: Cdr[] = [];
  displayedColumns = ['id', 'callingNumber', 'calledNumber', 'callStartTime', 'duration', 'callType', 'country', 'revenue'];
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;
  loading = false;
  searchNumber = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadCdrs(); }

  loadCdrs(): void {
    this.loading = true;
    this.api.getCdrs(this.currentPage, this.pageSize, this.searchNumber || undefined).subscribe({
      next: (data) => {
        this.cdrs = data.content;
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  search(): void { this.currentPage = 0; this.loadCdrs(); }
  reset(): void { this.searchNumber = ''; this.currentPage = 0; this.loadCdrs(); }
  onPageChange(e: PageEvent): void { this.currentPage = e.pageIndex; this.pageSize = e.pageSize; this.loadCdrs(); }

  formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
}