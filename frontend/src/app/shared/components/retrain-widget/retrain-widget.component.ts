import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';

/**
 * Cycle MLOps analyste : reentrainer -> suivre les phases -> comparer -> promouvoir ou rejeter.
 * La promotion est TOUJOURS une decision humaine (human-in-the-loop).
 * S'auto-masque pour les ADMIN (403 sur /retrain/status).
 */
@Component({
  selector: 'app-retrain-widget',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="retrain-card" *ngIf="visible">
      <div class="rt-header">
        <div class="rt-title">
          <mat-icon>model_training</mat-icon>
          <div>
            <h3>Pipeline de r&eacute;entra&icirc;nement</h3>
            <p>Le mod&egrave;le apprend des labels de v&eacute;rit&eacute; terrain du p&eacute;rim&egrave;tre courant</p>
          </div>
        </div>
        <button class="btn-retrain" (click)="start()" [disabled]="running">
          <mat-icon>{{ running ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
          {{ running ? 'Entra&icirc;nement...' : 'R&eacute;entra&icirc;ner le mod&egrave;le' }}
        </button>
      </div>

      <!-- Progression -->
      <div class="rt-progress" *ngIf="running || state === 'DONE' || state === 'FAILED'">
        <div class="rt-bar">
          <div class="rt-fill" [style.width.%]="percent"
               [class.done]="state === 'DONE'" [class.failed]="state === 'FAILED'"></div>
        </div>
        <div class="rt-phase">
          <span>{{ phase }}</span>
          <span class="rt-pct">{{ percent }}%</span>
        </div>
        <div class="rt-logs" *ngIf="logs.length > 0">
          <div class="rt-log" *ngFor="let l of logs">{{ l }}</div>
        </div>
      </div>

      <div class="rt-error" *ngIf="state === 'FAILED'">
        <mat-icon>error_outline</mat-icon> {{ error }}
      </div>

      <!-- Comparaison + decision -->
      <div class="rt-compare" *ngIf="state === 'DONE' && metrics">
        <div class="cmp-col current">
          <span class="cmp-tag">Mod&egrave;le actuel</span>
          <span class="cmp-ver">{{ metrics.current.version }}</span>
          <span class="cmp-auc">AUC {{ metrics.current.auc }}</span>
        </div>
        <mat-icon class="cmp-arrow">arrow_forward</mat-icon>
        <div class="cmp-col candidate" [class.better]="metrics.candidate.auc >= metrics.current.auc">
          <span class="cmp-tag">Candidat</span>
          <span class="cmp-ver">{{ metrics.candidate.version }}</span>
          <span class="cmp-auc">AUC {{ metrics.candidate.auc }}</span>
          <span class="cmp-det">Precision {{ metrics.candidate.precision }} &middot; Recall {{ metrics.candidate.recall }} &middot; F1 {{ metrics.candidate.f1 }}</span>
          <span class="cmp-det">{{ metrics.candidate.trained_on }} lignes dont {{ metrics.candidate.human_labels }} labels analyste</span>
        </div>
        <div class="cmp-actions">
          <button class="btn-promote" (click)="promote()">
            <mat-icon>rocket_launch</mat-icon> Promouvoir
          </button>
          <button class="btn-reject" (click)="reset()">Rejeter</button>
        </div>
      </div>

      <div class="rt-promoted" *ngIf="state === 'PROMOTED'">
        <mat-icon>verified</mat-icon>
        <span>Mod&egrave;le <strong>{{ promotedVersion }}</strong> promu et actif &mdash; les prochaines analyses l'utiliseront.</span>
      </div>
    </div>
  `,
  styles: [`
    .retrain-card { background: var(--bg-card, white); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .rt-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .rt-title { display: flex; align-items: center; gap: 12px; }
    .rt-title mat-icon { color: #E30613; font-size: 28px; width: 28px; height: 28px; }
    .rt-title h3 { font-size: 14px; font-weight: 700; color: #1a1a2e; }
    .rt-title p { font-size: 12px; color: #999; }
    .btn-retrain { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 20px; padding: 9px 18px; background: linear-gradient(135deg,#E30613,#c20511); color: white; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-retrain[disabled] { opacity: 0.6; }
    .btn-retrain mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .rt-progress { margin-top: 14px; }
    .rt-bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .rt-fill { height: 100%; background: linear-gradient(90deg,#E30613,#f57c00); transition: width 0.5s ease; }
    .rt-fill.done { background: #00A651; }
    .rt-fill.failed { background: #E30613; }
    .rt-phase { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #666; font-weight: 600; }
    .rt-logs { margin-top: 10px; background: #1a1a2e; border-radius: 8px; padding: 10px 14px; max-height: 140px; overflow-y: auto; }
    .rt-log { font-family: monospace; font-size: 11px; color: #7ee787; line-height: 1.7; }
    .rt-error { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px; background: #fde8e8; border-radius: 8px; color: #c62828; font-size: 12px; }
    .rt-compare { display: flex; align-items: center; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
    .cmp-col { display: flex; flex-direction: column; gap: 2px; padding: 12px 18px; border-radius: 10px; background: #f8f9fa; border: 1.5px solid #e0e0e0; }
    .cmp-col.candidate.better { border-color: #00A651; background: #e8f5e9; }
    .cmp-tag { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; }
    .cmp-ver { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .cmp-auc { font-size: 13px; font-weight: 600; color: #E30613; }
    .cmp-det { font-size: 11px; color: #777; }
    .cmp-arrow { color: #ccc; }
    .cmp-actions { display: flex; gap: 10px; margin-left: auto; }
    .btn-promote { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 10px; padding: 10px 18px; background: #00A651; color: white; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-reject { border: 1px solid #e0e0e0; border-radius: 10px; padding: 10px 18px; background: white; font-size: 12px; cursor: pointer; }
    .rt-promoted { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 14px; background: #e8f5e9; border-radius: 10px; color: #00A651; font-size: 13px; }
    body.dark-mode .retrain-card { background: #1e2130 !important; }
    body.dark-mode .rt-title h3 { color: #e8eaf0; }
    body.dark-mode .cmp-col { background: #252838; border-color: rgba(255,255,255,0.1); }
    body.dark-mode .cmp-ver { color: #e8eaf0; }
    body.dark-mode .rt-bar { background: #252838; }
  `]
})
export class RetrainWidgetComponent implements OnInit, OnDestroy {
  @Input() adminIds: number[] = [];
  visible = false;
  running = false;
  state = 'IDLE';
  phase = '';
  percent = 0;
  logs: string[] = [];
  metrics: any = null;
  error = '';
  promotedVersion = '';
  private timer: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // 403 pour un ADMIN -> widget invisible ; sinon on recupere l'etat courant (job peut deja tourner)
    this.api.getRetrainStatus().subscribe({
      next: (s) => { this.visible = true; this.apply(s); if (s.state === 'RUNNING') this.poll(); },
      error: () => this.visible = false
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.state = 'RUNNING'; this.percent = 0; this.phase = 'Demarrage...'; this.logs = []; this.metrics = null;
    this.api.startRetrain(this.adminIds).subscribe({
      next: () => this.poll(),
      error: (e) => { this.running = false; this.state = 'FAILED'; this.error = e?.error?.error || 'Lancement impossible (service ML demarre ?)'; }
    });
  }

  private poll(): void {
    this.running = true;
    this.timer = setInterval(() => {
      this.api.getRetrainStatus().subscribe({
        next: (s) => {
          this.apply(s);
          if (s.state !== 'RUNNING') { this.stopPoll(); }
        },
        error: () => this.stopPoll()
      });
    }, 2000);
  }

  private apply(s: any): void {
    this.state = s.state; this.phase = s.phase; this.percent = s.percent;
    this.logs = s.logs || []; this.metrics = s.metrics; this.error = s.error || '';
    this.running = s.state === 'RUNNING';
  }

  promote(): void {
    this.api.promoteModel().subscribe({
      next: (r) => { this.state = 'PROMOTED'; this.promotedVersion = r.version; },
      error: (e) => { this.error = e?.error?.error || 'Promotion impossible'; }
    });
  }

  reset(): void { this.state = 'IDLE'; this.metrics = null; this.percent = 0; this.logs = []; }

  private stopPoll(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  ngOnDestroy(): void { this.stopPoll(); }
}