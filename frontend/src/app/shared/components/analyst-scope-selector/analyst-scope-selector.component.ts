import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';

interface AdminScope {
  id: number;
  fullName: string;
  email: string;
  batchCount: number;
  cdrCount: number;
  openAlertCount: number;
}

@Component({
  selector: 'app-analyst-scope-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="scope-bar" *ngIf="admins.length > 0">
      <div class="scope-label">
        <mat-icon>filter_alt</mat-icon>
        <span>P&eacute;rim&egrave;tre :</span>
      </div>
      <button class="scope-chip" [class.active]="selected.size === 0" (click)="selectAll()">
        Tous les admins
      </button>
      <button class="scope-chip" *ngFor="let a of admins"
              [class.active]="selected.has(a.id)" (click)="toggle(a.id)"
              [title]="a.email + ' - ' + a.cdrCount + ' CDR, ' + a.openAlertCount + ' alertes ouvertes'">
        {{ a.fullName }}
        <span class="chip-count">{{ a.cdrCount }}</span>
      </button>
      <button class="btn-export" (click)="downloadDataset()" [disabled]="exporting"
              title="CSV des CDR analyses du perimetre courant, avec scores et labels">
        <mat-icon>{{ exporting ? "hourglass_top" : "download" }}</mat-icon>
        {{ exporting ? "Export..." : "Dataset ML" }}
      </button>
    </div>
  `,
  styles: [`
    .scope-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: var(--bg-card, white); border-radius: 12px;
      padding: 12px 16px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .scope-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: #555;
    }
    .scope-label mat-icon { font-size: 18px; width: 18px; height: 18px; color: #E30613; }
    .scope-chip {
      border: 1.5px solid #e0e0e0; background: transparent;
      border-radius: 20px; padding: 6px 14px;
      font-size: 13px; font-weight: 600; color: #666;
      cursor: pointer; transition: all 0.15s;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .scope-chip:hover { border-color: #E30613; color: #E30613; }
    .scope-chip.active { background: #E30613; border-color: #E30613; color: white; }
    .chip-count {
      background: rgba(0,0,0,0.12); border-radius: 10px;
      padding: 1px 8px; font-size: 11px;
    }
    .scope-chip.active .chip-count { background: rgba(255,255,255,0.25); }
    .btn-export {
      margin-left: auto;
      display: inline-flex; align-items: center; gap: 6px;
      border: none; border-radius: 20px; padding: 7px 16px;
      background: linear-gradient(135deg, #0072BC, #005a94);
      color: white; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .btn-export:hover { opacity: 0.9; }
    .btn-export[disabled] { opacity: 0.6; cursor: default; }
    .btn-export mat-icon { font-size: 16px; width: 16px; height: 16px; }
    body.dark-mode .scope-bar { background: #1e2130 !important; }
    body.dark-mode .scope-chip { border-color: rgba(255,255,255,0.15); color: #c0c4d0; }
    body.dark-mode .scope-label { color: #c0c4d0; }
  `]
})
export class AnalystScopeSelectorComponent implements OnInit {
  @Output() scopeChange = new EventEmitter<number[]>();
  admins: AdminScope[] = [];
  selected = new Set<number>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // 403 pour un ADMIN -> error -> admins reste vide -> composant invisible
    this.api.getAnalystAdmins().subscribe({
      next: (list) => this.admins = list,
      error: () => this.admins = []
    });
  }

  exporting = false;

  downloadDataset(): void {
    if (this.exporting) return;
    this.exporting = true;
    const ids = Array.from(this.selected);
    this.api.exportDataset(ids).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const scope = ids.length > 0 ? 'scope-' + ids.join('-') : 'scope-all';
        a.href = url;
        a.download = 'dataset_ml_' + scope + '.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => this.exporting = false
    });
  }

  selectAll(): void {
    this.selected.clear();
    this.scopeChange.emit([]);
  }

  toggle(id: number): void {
    if (this.selected.has(id)) { this.selected.delete(id); }
    else { this.selected.add(id); }
    // Tous coches = equivalent global -> on simplifie en global
    if (this.selected.size === this.admins.length) { this.selected.clear(); }
    this.scopeChange.emit(Array.from(this.selected));
  }
}