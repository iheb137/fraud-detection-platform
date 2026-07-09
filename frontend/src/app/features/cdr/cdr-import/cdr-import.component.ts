import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ImportBatchResponse } from '../../../core/models/cdr';

@Component({
  selector: 'app-cdr-import',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatIconModule, MatButtonModule,
            MatProgressBarModule, MatProgressSpinnerModule, RouterModule],
  template: `
    <div class="import-page">

      <div class="page-header">
        <div>
          <h1>Nouvel Import CDR</h1>
          <p>Importez vos fichiers CSV de Call Detail Records</p>
        </div>
        <button mat-button routerLink="/imports" class="btn-back">
          <mat-icon>arrow_back</mat-icon> Retour aux imports
        </button>
      </div>

      <div class="import-layout">

        <!-- Colonne gauche : upload + resultat -->
        <div class="col-left">

          <!-- Zone upload -->
          <div class="card upload-card" *ngIf="!result">
            <div class="upload-zone" [class.drag-over]="isDragging"
                 (dragover)="onDragOver($event)" (dragleave)="isDragging = false"
                 (drop)="onDrop($event)" (click)="fileInput.click()">
              <input #fileInput type="file" accept=".csv" hidden (change)="onFileSelect($event)">

              <div class="upload-visual">
                <div class="upload-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3>Glissez votre fichier CSV ici</h3>
                <p>ou <span class="link">cliquez pour selectionner</span></p>
                <span class="file-hint">Format accepte : CSV &nbsp;&middot;&nbsp; Taille max : 50 MB</span>
              </div>
            </div>

            <div class="selected-file" *ngIf="selectedFile">
              <div class="file-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0072BC" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div class="file-info">
                <span class="file-name">{{ selectedFile.name }}</span>
                <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
              </div>
              <button mat-raised-button class="btn-tt" (click)="upload()" [disabled]="loading">
                <mat-spinner diameter="18" *ngIf="loading"></mat-spinner>
                <span *ngIf="!loading">
                  <mat-icon>upload</mat-icon> Importer
                </span>
              </button>
            </div>

            <mat-progress-bar mode="indeterminate" *ngIf="loading" color="warn"></mat-progress-bar>
          </div>

          <!-- Resultat import -->
          <div class="card result-card" *ngIf="result">
            <div class="result-banner" [class.success]="result.status === 'SUCCESS'"
                 [class.failed]="result.status !== 'SUCCESS'">
              <div class="result-icon">
                <svg *ngIf="result.status === 'SUCCESS'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg *ngIf="result.status !== 'SUCCESS'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 *ngIf="result.status === 'SUCCESS'">Import reussi !</h3>
                <h3 *ngIf="result.status !== 'SUCCESS'">Echec de l'import</h3>
                <p>{{ result.filename }}</p>
              </div>
            </div>

            <div class="result-stats">
              <div class="rs-item">
                <span class="rs-val">{{ result.recordCount }}</span>
                <span class="rs-lbl">Total</span>
              </div>
              <div class="rs-item rs-success">
                <span class="rs-val">{{ result.successCount }}</span>
                <span class="rs-lbl">Succes</span>
              </div>
              <div class="rs-item rs-error">
                <span class="rs-val">{{ result.errorCount }}</span>
                <span class="rs-lbl">Erreurs</span>
              </div>
              <div class="rs-item rs-dup" *ngIf="result.duplicateCount">
                <span class="rs-val">{{ result.duplicateCount }}</span>
                <span class="rs-lbl">Doublons ignores</span>
              </div>
            </div>

            <div class="result-meta">
              <div class="meta-row">
                <mat-icon>schedule</mat-icon>
                <span>{{ result.importedAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
              <div class="meta-row">
                <mat-icon>tag</mat-icon>
                <span>Batch ID : <strong>#{{ result.batchId }}</strong></span>
              </div>
            </div>

            <div class="result-actions">
              <button mat-raised-button class="btn-tt btn-analyze" (click)="analyzeNow()"
                      *ngIf="!mlResult" [disabled]="analyzing">
                <mat-spinner diameter="18" *ngIf="analyzing"></mat-spinner>
                <mat-icon *ngIf="!analyzing">psychology</mat-icon>
                {{ analyzing ? 'Analyse en cours...' : 'Analyser avec ML' }}
              </button>
              <button mat-button (click)="reset()" class="btn-secondary" [disabled]="analyzing">
                <mat-icon>upload_file</mat-icon> Nouvel import
              </button>
            </div>

            <div class="ml-progress" *ngIf="analyzing">
              <mat-progress-bar mode="indeterminate" color="warn"></mat-progress-bar>
              <span>Le modele Random Forest analyse {{ result?.recordCount }} CDR, veuillez patienter...</span>
            </div>

            <div class="ml-error" *ngIf="mlError">
              <mat-icon>error_outline</mat-icon>
              <span>{{ mlError }}</span>
              <button mat-button (click)="analyzeNow()" class="btn-retry">Reessayer</button>
            </div>
          </div>

          <!-- Resultat ML -->
          <div class="card ml-card" *ngIf="mlResult">
            <div class="ml-header">
              <div class="ml-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0072BC" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <div>
                <h3>Analyse ML terminee</h3>
                <p>Resultats du modele Random Forest</p>
              </div>
            </div>
            <div class="ml-stats">
              <div class="ml-stat fraud">
                <span class="ml-val">{{ mlResult.fraudCount }}</span>
                <span class="ml-lbl">Fraudes detectees</span>
              </div>
              <div class="ml-stat safe">
                <span class="ml-val">{{ (result?.recordCount || 0) - mlResult.fraudCount }}</span>
                <span class="ml-lbl">Appels legitimes</span>
              </div>
            </div>
            <div class="ml-actions">
              <button mat-raised-button class="btn-tt" routerLink="/alerts">
                <mat-icon>notifications_active</mat-icon> Voir les alertes
              </button>
              <button mat-button routerLink="/predictions" class="btn-secondary">
                <mat-icon>bar_chart</mat-icon> Predictions
              </button>
            </div>
          </div>
        </div>

        <!-- Colonne droite : guide -->
        <div class="col-right">
          <div class="card guide-card">
            <div class="guide-header">
              <div class="guide-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0072BC" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3>Guide d'importation</h3>
                <p>Comment preparer votre fichier CSV</p>
              </div>
            </div>

            <div class="guide-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-body">
                  <strong>Format du fichier</strong>
                  <p>Le fichier doit etre au format CSV avec des virgules comme separateur.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-body">
                  <strong>Ligne d'en-tete obligatoire</strong>
                  <p>La premiere ligne doit contenir les noms des colonnes exactement comme ci-dessous.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-body">
                  <strong>Encodage UTF-8</strong>
                  <p>Sauvegardez votre fichier en UTF-8 pour eviter les problemes d'encodage.</p>
                </div>
              </div>
            </div>

            <div class="guide-columns">
              <h4>Colonnes requises</h4>
              <div class="col-grid">
                <div class="col-item required">
                  <span class="col-name">call_id</span>
                  <span class="col-type">UUID</span>
                  <span class="col-desc">Identifiant unique</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">calling_number</span>
                  <span class="col-type">String</span>
                  <span class="col-desc">Numero appelant</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">called_number</span>
                  <span class="col-type">String</span>
                  <span class="col-desc">Numero appele</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">call_start_time</span>
                  <span class="col-type">DateTime</span>
                  <span class="col-desc">YYYY-MM-DD HH:mm:ss</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">call_duration_sec</span>
                  <span class="col-type">Integer</span>
                  <span class="col-desc">Duree en secondes</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">call_type</span>
                  <span class="col-type">Enum</span>
                  <span class="col-desc">VOICE / SMS / DATA</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">destination_country</span>
                  <span class="col-type">String</span>
                  <span class="col-desc">Code pays (TN, FR...)</span>
                </div>
                <div class="col-item required">
                  <span class="col-name">call_direction</span>
                  <span class="col-type">Enum</span>
                  <span class="col-desc">IN / OUT / TRANSIT</span>
                </div>
                <div class="col-item optional">
                  <span class="col-name">imei</span>
                  <span class="col-type">String</span>
                  <span class="col-desc">ID terminal</span>
                </div>
                <div class="col-item optional">
                  <span class="col-name">cell_id</span>
                  <span class="col-type">String</span>
                  <span class="col-desc">ID cellule reseau</span>
                </div>
                <div class="col-item optional">
                  <span class="col-name">revenue</span>
                  <span class="col-type">Decimal</span>
                  <span class="col-desc">Revenu en DT</span>
                </div>
              </div>
              <div class="legend">
                <span class="leg-req">Requis</span>
                <span class="leg-opt">Optionnel</span>
              </div>
            </div>

            <div class="guide-example">
              <h4>Exemple de ligne</h4>
              <div class="example-box">
                <code>550e8400-e29b-41d4-a716-446655440001,+21671234567,+21698765432,2025-01-15 08:30:00,120,VOICE,TN,OUT,356938001,TN-TUNIS-001,0.50</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .import-page { max-width: 1400px; }

    .page-header {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 28px;
    }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .page-header p { color: #7f8c8d; font-size: 14px; }
    .btn-back { color: #666 !important; }

    .import-layout {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
      align-items: start;
    }

    .col-left { display: flex; flex-direction: column; gap: 20px; }

    /* Upload Zone */
    .upload-zone {
      border: 2px dashed #e0e0e0;
      border-radius: 16px;
      padding: 52px 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: #E30613;
      background: #fff8f8;
    }
    .upload-zone.drag-over { transform: scale(1.01); }

    .upload-visual { display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .upload-circle {
      width: 88px; height: 88px;
      background: linear-gradient(135deg, #fde8e8, #fff0f0);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
      border: 2px solid rgba(227,6,19,0.15);
    }
    .upload-circle svg { width: 40px; height: 40px; stroke: #E30613; }

    .upload-zone h3 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .upload-zone p { color: #999; font-size: 14px; margin: 0; }
    .link { color: #E30613; font-weight: 600; cursor: pointer; }
    .file-hint {
      font-size: 12px; color: #bbb;
      background: #f8f9fa; padding: 6px 16px;
      border-radius: 20px; margin-top: 4px;
    }

    .selected-file {
      display: flex; align-items: center; gap: 14px;
      margin-top: 16px; padding: 16px 20px;
      background: #f0f7ff; border-radius: 12px;
      border: 1px solid #bee3f8;
    }
    .file-icon-wrap {
      width: 44px; height: 44px; flex-shrink: 0;
    }
    .file-icon-wrap svg { width: 44px; height: 44px; }
    .file-info { flex: 1; }
    .file-name { display: block; font-size: 14px; font-weight: 600; color: #1a1a2e; }
    .file-size { display: block; font-size: 12px; color: #999; margin-top: 2px; }

    /* Resultat */
    .result-banner {
      display: flex; align-items: center; gap: 16px;
      padding: 20px; border-radius: 12px; margin-bottom: 20px;
    }
    .result-banner.success { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); }
    .result-banner.failed { background: linear-gradient(135deg, #fde8e8, #fff3f3); }
    .result-icon { width: 48px; height: 48px; flex-shrink: 0; }
    .result-icon svg { width: 48px; height: 48px; }
    .result-banner.success .result-icon svg { stroke: #00A651; }
    .result-banner.failed .result-icon svg { stroke: #E30613; }
    .result-banner h3 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; }
    .result-banner p { font-size: 13px; color: #999; margin: 0; }

    .result-stats {
      display: flex; gap: 12px; margin-bottom: 20px;
    }
    .rs-item {
      flex: 1; text-align: center; padding: 16px 8px;
      border-radius: 12px; background: #f8f9fa;
    }
    .rs-item.rs-success { background: #e8f5e9; }
    .rs-item.rs-error { background: #fde8e8; }
    .rs-item.rs-dup { background: #fff3e0; }
    .rs-dup .rs-val { color: #f57c00; }
    .rs-val { display: block; font-size: 30px; font-weight: 800; color: #1a1a2e; }
    .rs-success .rs-val { color: #00A651; }
    .rs-error .rs-val { color: #E30613; }
    .rs-lbl { display: block; font-size: 12px; color: #999; margin-top: 4px; }

    .result-meta { margin-bottom: 20px; }
    .meta-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #666; margin-bottom: 8px;
    }
    .meta-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #bbb; }
    .meta-row strong { color: #1a1a2e; }

    .result-actions { display: flex; gap: 12px; }

    /* ML Card */
    .ml-card {}
    .ml-header {
      display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
    }
    .ml-icon { width: 44px; height: 44px; flex-shrink: 0; }
    .ml-icon svg { width: 44px; height: 44px; }
    .ml-header h3 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; }
    .ml-header p { font-size: 12px; color: #999; margin: 0; }
    .ml-stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .ml-stat { flex: 1; text-align: center; padding: 20px 8px; border-radius: 12px; }
    .ml-stat.fraud { background: #fde8e8; }
    .ml-stat.safe { background: #e8f5e9; }
    .ml-val { display: block; font-size: 36px; font-weight: 800; }
    .ml-stat.fraud .ml-val { color: #E30613; }
    .ml-stat.safe .ml-val { color: #00A651; }
    .ml-lbl { display: block; font-size: 12px; color: #999; margin-top: 4px; }
    .ml-actions { display: flex; gap: 12px; }

    .btn-analyze { display: inline-flex !important; align-items: center; gap: 8px; }
    .btn-analyze mat-spinner { display: inline-block; }
    .btn-analyze mat-spinner circle { stroke: white !important; }
    .btn-analyze[disabled] { opacity: 0.75; }

    .ml-progress { margin-top: 16px; }
    .ml-progress span {
      display: block; margin-top: 8px;
      font-size: 12px; color: #999; text-align: center;
    }

    .ml-error {
      display: flex; align-items: center; gap: 10px;
      margin-top: 16px; padding: 14px 16px;
      background: #fde8e8; border-radius: 10px;
      border-left: 3px solid #E30613;
      font-size: 13px; color: #c62828;
    }
    .ml-error mat-icon { color: #E30613; flex-shrink: 0; }
    .ml-error span { flex: 1; }
    .btn-retry { color: #E30613 !important; font-weight: 600 !important; }

    body.dark-mode .ml-progress span { color: #8b92a8 !important; }
    body.dark-mode .ml-error { background: rgba(227,6,19,0.12) !important; }

    /* Guide Card */
    .guide-card { position: sticky; top: 20px; }

    .guide-header {
      display: flex; align-items: center; gap: 14px; margin-bottom: 24px;
      padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;
    }
    .guide-icon { width: 40px; height: 40px; flex-shrink: 0; }
    .guide-icon svg { width: 40px; height: 40px; }
    .guide-header h3 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; }
    .guide-header p { font-size: 12px; color: #999; margin: 0; }

    .guide-steps { margin-bottom: 24px; display: flex; flex-direction: column; gap: 14px; }
    .step { display: flex; gap: 14px; align-items: flex-start; }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: #E30613; color: white;
      font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px;
    }
    .step-body strong { display: block; font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 3px; }
    .step-body p { font-size: 12px; color: #888; margin: 0; line-height: 1.5; }

    .guide-columns { margin-bottom: 20px; }
    .guide-columns h4 { font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
    .col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .col-item {
      padding: 8px 10px; border-radius: 8px;
      border-left: 3px solid transparent;
    }
    .col-item.required { background: #f0f7ff; border-left-color: #0072BC; }
    .col-item.optional { background: #f8f9fa; border-left-color: #bbb; }
    .col-name { display: block; font-size: 11px; font-weight: 700; color: #1a1a2e; font-family: monospace; }
    .col-type { display: inline-block; font-size: 10px; color: #0072BC; background: #e3f2fd;
                padding: 1px 6px; border-radius: 4px; margin: 2px 0; }
    .col-item.optional .col-type { color: #999; background: #f0f0f0; }
    .col-desc { display: block; font-size: 10px; color: #999; margin-top: 1px; }

    .legend { display: flex; gap: 12px; margin-top: 10px; }
    .leg-req, .leg-opt {
      font-size: 11px; padding: 3px 10px; border-radius: 4px;
      display: flex; align-items: center; gap: 6px;
    }
    .leg-req::before { content: ''; display: block; width: 8px; height: 8px; border-radius: 2px; background: #0072BC; }
    .leg-opt::before { content: ''; display: block; width: 8px; height: 8px; border-radius: 2px; background: #bbb; }
    .leg-req { color: #0072BC; background: #e3f2fd; }
    .leg-opt { color: #999; background: #f0f0f0; }

    .guide-example h4 { font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; }
    .example-box {
      background: #1a1a2e; border-radius: 10px; padding: 14px 16px;
    }
    .example-box code {
      display: block; color: #00d68f; font-size: 10.5px;
      font-family: monospace; word-break: break-all; line-height: 1.6;
    }

    .btn-tt {
      background: #E30613 !important; color: white !important;
      border-radius: 10px !important; font-weight: 600 !important;
    }
    .btn-secondary { color: #666 !important; }

    /* DARK MODE */
    body.dark-mode .import-page { background: #12141f; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .upload-card { background: #1e2130 !important; }
    body.dark-mode .guide-card { background: #1e2130 !important; }
    body.dark-mode .upload-zone { border-color: rgba(255,255,255,0.12) !important; }
    body.dark-mode .upload-zone h3 { color: #e8eaf0 !important; }
    body.dark-mode .upload-zone p { color: #8b92a8 !important; }
    body.dark-mode .file-hint { background: #252838 !important; color: #8b92a8 !important; }
    body.dark-mode .selected-file { background: #252838 !important; border-color: rgba(0,114,188,0.3) !important; }
    body.dark-mode .file-name { color: #e8eaf0 !important; }
    body.dark-mode .file-size { color: #8b92a8 !important; }
    body.dark-mode .guide-header h3 { color: #e8eaf0 !important; }
    body.dark-mode .guide-header p { color: #8b92a8 !important; }
    body.dark-mode .step-body strong { color: #e8eaf0 !important; }
    body.dark-mode .step-body p { color: #8b92a8 !important; }
    body.dark-mode .guide-columns h4 { color: #e8eaf0 !important; }
    body.dark-mode .col-item.required { background: rgba(0,114,188,0.12) !important; }
    body.dark-mode .col-item.optional { background: #252838 !important; }
    body.dark-mode .col-name { color: #e8eaf0 !important; }
    body.dark-mode .col-desc { color: #8b92a8 !important; }
    body.dark-mode .guide-example h4 { color: #e8eaf0 !important; }
    body.dark-mode .result-card { background: #1e2130 !important; }
    body.dark-mode .result-banner h3 { color: #e8eaf0 !important; }
    body.dark-mode .result-banner p { color: #8b92a8 !important; }
    body.dark-mode .rs-lbl { color: #8b92a8 !important; }
    body.dark-mode .meta-row { color: #8b92a8 !important; }
    body.dark-mode .ml-card { background: #1e2130 !important; }
    body.dark-mode .ml-header h3 { color: #e8eaf0 !important; }
    body.dark-mode .ml-header p { color: #8b92a8 !important; }
    body.dark-mode .ml-lbl { color: #8b92a8 !important; }  `]
})
export class CdrImportComponent {
  selectedFile?: File;
  loading = false;
  isDragging = false;
  result?: ImportBatchResponse;
  mlResult?: any;
  analyzing = false;
  mlError = '';

  constructor(private api: ApiService) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging = true; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file?.name.endsWith('.csv')) this.selectedFile = file;
  }

  upload(): void {
    if (!this.selectedFile) return;
    this.loading = true;
    this.api.importCdr(this.selectedFile).subscribe({
      next: (res) => { this.result = res; this.loading = false; },
      error: () => this.loading = false
    });
  }

  analyzeNow(): void {
    if (!this.result || this.analyzing) return;
    this.analyzing = true;
    this.mlError = '';
    this.api.analyzeBatch(this.result.batchId).subscribe({
      next: (res) => { this.mlResult = res; this.analyzing = false; },
      error: (err) => {
        this.analyzing = false;
        this.mlError = err?.error?.message
          || 'Echec de l\'analyse. Verifiez que le service ML (port 8000) est demarre.';
      }
    });
  }

  reset(): void {
    this.selectedFile = undefined;
    this.result = undefined;
    this.mlResult = undefined;
    this.analyzing = false;
    this.mlError = '';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
}