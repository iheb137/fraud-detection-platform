import { Component, ViewEncapsulation, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, FormsModule],
  template: `
    <div class="stats-page">

      <div class="page-header">
        <div>
          <h1>Statistiques & Analyses</h1>
          <p>Visualisation des tendances de fraude — Tunisie Telecom</p>
        </div>
        <div class="header-actions">
          <div class="period-selector">
            <button [class.active]="selectedDays === 7" (click)="setPeriod(7)">7 jours</button>
            <button [class.active]="selectedDays === 14" (click)="setPeriod(14)">14 jours</button>
            <button [class.active]="selectedDays === 30" (click)="setPeriod(30)">30 jours</button>
          </div>
          <button mat-raised-button class="btn-csv" (click)="downloadCSV()">
            <mat-icon>download</mat-icon> Export CSV
          </button>
          <button mat-raised-button class="btn-tt" (click)="downloadPDF()">
            <mat-icon>picture_as_pdf</mat-icon> Export PDF
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" *ngIf="summary">
        <div class="kpi-card">
          <div class="kpi-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-val">{{ summary.totalCdrs | number }}</span>
            <span class="kpi-lbl">CDR importes</span>
            <span class="kpi-trend up">Total enregistrements</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-val">{{ summary.totalAnalyzed | number }}</span>
            <span class="kpi-lbl">Analyses ML</span>
            <span class="kpi-trend up">Par Random Forest</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-val">{{ summary.totalFrauds | number }}</span>
            <span class="kpi-lbl">Fraudes detectees</span>
            <span class="kpi-trend down">Alertes generees</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-val" [class.danger]="summary.fraudRate > 30">{{ summary.fraudRate }}%</span>
            <span class="kpi-lbl">Taux de fraude</span>
            <span class="kpi-trend" [class.down]="summary.fraudRate > 30" [class.up]="summary.fraudRate <= 30">
              {{ summary.fraudRate > 30 ? 'Niveau eleve' : 'Niveau acceptable' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">

        <!-- Trend Line -->
        <div class="chart-card wide">
          <div class="chart-header">
            <div class="chart-title">
              <div class="chart-title-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </div>
              <div>
                <h3>Evolution des Fraudes</h3>
                <p>Fraudes vs appels legitimes sur {{ selectedDays }} jours</p>
              </div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas #trendChart></canvas>
          </div>
        </div>

        <!-- Country Bar -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <div class="chart-title-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <h3>Fraudes par Pays</h3>
                <p>Top pays sources de fraude</p>
              </div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas #countryChart></canvas>
          </div>
        </div>

        <!-- Hour Heatmap -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <div class="chart-title-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <h3>Distribution Horaire</h3>
                <p>Heures de pointe des fraudes</p>
              </div>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas #hourChart></canvas>
          </div>
        </div>

        <!-- Severity Donut -->
        <div class="chart-card donut-card">
          <div class="chart-header">
            <div class="chart-title">
              <div class="chart-title-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3>Alertes par Severite</h3>
                <p>Repartition LOW / MEDIUM / HIGH</p>
              </div>
            </div>
          </div>
          <div class="chart-wrap donut-wrap">
            <canvas #severityChart></canvas>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .stats-page { max-width: 1400px; }

    .page-header {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 28px;
    }
    .page-header h1 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .header-actions { display: flex; align-items: center; gap: 12px; }

    .period-selector {
      display: flex; background: var(--bg-card); border-radius: 10px;
      border: 1px solid #e0e0e0; overflow: hidden;
    }
    .period-selector button {
      padding: 9px 18px; border: none; background: transparent;
      font-size: 13px; font-weight: 500; cursor: pointer; color: #666;
      transition: all 0.2s;
    }
    .period-selector button:hover { background: #f5f5f5; }
    .period-selector button.active { background: #E30613; color: white; font-weight: 700; }

    .btn-csv { background: #0072BC !important; color: white !important; border-radius: 8px !important; font-weight: 600 !important; }
    .btn-tt { background: #E30613 !important; color: white !important; border-radius: 8px !important; font-weight: 600 !important; }

    /* KPIs */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--bg-card); border-radius: 16px; padding: 22px;
      display: flex; align-items: center; gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      transition: transform 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .kpi-icon svg { width: 24px; height: 24px; }
    .kpi-icon.blue { background: #e3f2fd; } .kpi-icon.blue svg { stroke: #0072BC; }
    .kpi-icon.green { background: #e8f5e9; } .kpi-icon.green svg { stroke: #00A651; }
    .kpi-icon.red { background: #fde8e8; } .kpi-icon.red svg { stroke: #E30613; }
    .kpi-icon.orange { background: #fff3e0; } .kpi-icon.orange svg { stroke: #f57c00; }

    .kpi-val { display: block; font-size: 30px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .kpi-val.danger { color: #E30613; }
    .kpi-lbl { display: block; font-size: 13px; font-weight: 600; color: #555; margin-top: 6px; }
    .kpi-trend { display: block; font-size: 11px; margin-top: 3px; }
    .kpi-trend.up { color: #00A651; }
    .kpi-trend.down { color: #E30613; }

    /* Charts */
    .charts-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .chart-card {
      background: var(--bg-card); border-radius: 16px; padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .chart-card.wide { grid-column: 1 / -1; }

    .chart-header { margin-bottom: 20px; }
    .chart-title { display: flex; align-items: center; gap: 14px; }
    .chart-title-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .chart-title-icon svg { width: 20px; height: 20px; }
    .chart-title-icon.red { background: #fde8e8; } .chart-title-icon.red svg { stroke: #E30613; }
    .chart-title-icon.blue { background: #e3f2fd; } .chart-title-icon.blue svg { stroke: #0072BC; }
    .chart-title-icon.orange { background: #fff3e0; } .chart-title-icon.orange svg { stroke: #f57c00; }
    .chart-title-icon.green { background: #e8f5e9; } .chart-title-icon.green svg { stroke: #00A651; }

    .chart-title h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
    .chart-title p { font-size: 12px; color: var(--text-muted); margin: 0; }

    .chart-wrap { position: relative; height: 300px; }
    .chart-wrap canvas { max-height: 300px; }
    .donut-wrap { height: 260px; }
    .donut-wrap canvas { max-height: 260px; }

    /* DARK MODE */
    body.dark-mode .stats-page { background: #12141f; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
    body.dark-mode .kpi-card { background: #1e2130 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.3) !important; }
    body.dark-mode .kpi-val { color: #e8eaf0 !important; }
    body.dark-mode .kpi-lbl { color: #c0c4d0 !important; }
    body.dark-mode .kpi-trend { color: #8b92a8 !important; }
    body.dark-mode .chart-card { background: #1e2130 !important; }
    body.dark-mode .chart-title h3 { color: #e8eaf0 !important; }
    body.dark-mode .chart-title p { color: #8b92a8 !important; }
    body.dark-mode .period-selector { background: #1e2130 !important; border-color: rgba(255,255,255,0.1) !important; }
    body.dark-mode .period-selector button { color: #8b92a8 !important; background: transparent !important; }
    body.dark-mode .period-selector button.active { background: #E30613 !important; color: white !important; }  `]
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  @ViewChild('trendChart') trendChartRef!: ElementRef;
  @ViewChild('countryChart') countryChartRef!: ElementRef;
  @ViewChild('hourChart') hourChartRef!: ElementRef;
  @ViewChild('severityChart') severityChartRef!: ElementRef;

  selectedDays = 14;
  summary: any;
  trendChart?: Chart;
  countryChart?: Chart;
  hourChart?: Chart;
  severityChart?: Chart;
  trendData: any[] = [];
  countryData: any[] = [];
  chartsReady = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.loadAll(); }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    setTimeout(() => this.loadAll(), 100);
  }

  setPeriod(days: number): void {
    this.selectedDays = days;
    this.loadAll();
  }

  loadAll(): void {
    if (!this.chartsReady) return;
    this.api.getStatisticsSummary(this.selectedDays).subscribe(s => this.summary = s);
    this.api.getFraudTrend(this.selectedDays).subscribe(data => {
      this.trendData = data;
      this.buildTrendChart(data);
    });
    this.api.getByCountry().subscribe(data => {
      this.countryData = data;
      this.buildCountryChart(data);
    });
    this.api.getByHour().subscribe(data => this.buildHourChart(data));
    this.api.getBySeverity().subscribe(data => this.buildSeverityChart(data));
  }

  buildTrendChart(data: any[]): void {
    if (this.trendChart) { this.trendChart.destroy(); this.trendChart = undefined; }
    const ctx = this.trendChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const gradRed = ctx.createLinearGradient(0, 0, 0, 300);
    gradRed.addColorStop(0, 'rgba(227,6,19,0.3)');
    gradRed.addColorStop(1, 'rgba(227,6,19,0.02)');
    const gradGreen = ctx.createLinearGradient(0, 0, 0, 300);
    gradGreen.addColorStop(0, 'rgba(0,166,81,0.25)');
    gradGreen.addColorStop(1, 'rgba(0,166,81,0.02)');
    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Fraudes',
            data: data.map(d => d.frauds),
            borderColor: '#E30613',
            backgroundColor: gradRed,
            fill: true, tension: 0.4,
            pointBackgroundColor: '#E30613',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 5, borderWidth: 2.5
          },
          {
            label: 'Legitimes',
            data: data.map(d => d.legitimes),
            borderColor: '#00A651',
            backgroundColor: gradGreen,
            fill: true, tension: 0.4,
            pointBackgroundColor: '#00A651',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 5, borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleColor: 'white',
            bodyColor: 'rgba(255,255,255,0.8)',
            padding: 12, cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  buildCountryChart(data: any[]): void {
    if (this.countryChart) { this.countryChart.destroy(); this.countryChart = undefined; }
    const ctx = this.countryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const colors = ['#E30613','#0072BC','#00A651','#FFD700','#9C27B0','#FF5722','#607D8B','#795548'];
    this.countryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.country || 'Inconnu'),
        datasets: [{
          label: 'Fraudes',
          data: data.map(d => d.frauds),
          backgroundColor: data.map((_, i) => colors[i % colors.length] + 'CC'),
          borderColor: data.map((_, i) => colors[i % colors.length]),
          borderWidth: 1, borderRadius: 8, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e', titleColor: 'white',
            bodyColor: 'rgba(255,255,255,0.8)', padding: 12, cornerRadius: 10
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  buildHourChart(data: any[]): void {
    if (this.hourChart) { this.hourChart.destroy(); this.hourChart = undefined; }
    const ctx = this.hourChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const hours = Array.from({length: 24}, (_, i) => i);
    const values = hours.map(h => {
      const found = data.find((d: any) => Number(d.hour) === h);
      return found ? Number(found.frauds) : 0;
    });
    const maxVal = Math.max(...values, 1);
    this.hourChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours.map(h => h + 'h'),
        datasets: [{
          label: 'Fraudes',
          data: values,
          backgroundColor: values.map(v => {
            const ratio = v / maxVal;
            if (ratio > 0.6) return '#E30613CC';
            if (ratio > 0.3) return '#FF9800CC';
            return '#0072BCCC';
          }),
          borderRadius: 5, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e', titleColor: 'white',
            bodyColor: 'rgba(255,255,255,0.8)', padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx) => ` ${ctx.parsed.y} fraudes` }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } }
        }
      }
    });
  }

  buildSeverityChart(data: any[]): void {
    if (this.severityChart) { this.severityChart.destroy(); this.severityChart = undefined; }
    const ctx = this.severityChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.severityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.severity),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: ['#E30613', '#FF9800', '#0072BC'],
          borderWidth: 3, borderColor: 'white', hoverOffset: 10
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1a1a2e', titleColor: 'white',
            bodyColor: 'rgba(255,255,255,0.8)', padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} alertes` }
          }
        },
        cutout: '68%'
      }
    });
  }

  downloadCSV(): void {
    const headers = 'Date,Total,Fraudes,Legitimes';
    const rows = this.trendData.map(d => `${d.date},${d.total},${d.frauds},${d.legitimes}`);
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-fraude-${this.selectedDays}j-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadPDF(): void {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const logoBase64 = this.getTTLogoBase64();

    const trendRows = this.trendData.map(d => `
      <tr>
        <td>${d.date}</td>
        <td>${d.total || 0}</td>
        <td style="color:#E30613;font-weight:700">${d.frauds || 0}</td>
        <td style="color:#00A651;font-weight:700">${d.legitimes || 0}</td>
        <td>${d.total > 0 ? ((d.frauds / d.total) * 100).toFixed(1) + '%' : '0%'}</td>
      </tr>`).join('');

    const countryRows = this.countryData.slice(0, 10).map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.country || 'Inconnu'}</td>
        <td style="color:#E30613;font-weight:700">${d.frauds || 0}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Fraude - Tunisie Telecom</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--bg-card); color: var(--text-primary); }

  .page { width: 210mm; min-height: 297mm; padding: 0; }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 32px 40px 28px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .logo-circle {
    width: 64px; height: 64px; border-radius: 50%;
    background: var(--bg-card); display: flex; align-items: center;
    justify-content: center; overflow: hidden;
  }
  .logo-circle img { width: 54px; height: 54px; object-fit: contain; }
  .company { color: white; }
  .company-name { font-size: 22px; font-weight: 800; display: block; }
  .company-sub { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 2px; }
  .header-right { text-align: right; }
  .report-badge {
    background: #E30613; color: white;
    padding: 8px 20px; border-radius: 20px;
    font-size: 13px; font-weight: 700; display: inline-block; margin-bottom: 8px;
  }
  .report-date { color: rgba(255,255,255,0.6); font-size: 12px; display: block; }

  /* Color bar */
  .color-bar { display: flex; height: 5px; }
  .cb1 { flex:1; background:#E30613; }
  .cb2 { flex:1; background:#FFD700; }
  .cb3 { flex:1; background:#00A651; }
  .cb4 { flex:1; background:#0072BC; }

  /* Body */
  .body { padding: 32px 40px; }

  /* Title section */
  .report-title { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
  .report-title h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
  .report-title p { font-size: 13px; color: var(--text-secondary); }
  .period-badge {
    display: inline-block; background: #fde8e8; color: #E30613;
    padding: 5px 14px; border-radius: 20px; font-size: 12px;
    font-weight: 700; margin-top: 10px;
  }

  /* KPIs */
  .kpi-section { margin-bottom: 28px; }
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: var(--text-secondary); margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .section-title::after { content: ''; flex:1; height:1px; background:#f0f0f0; }
  .kpi-row { display: flex; gap: 12px; }
  .kpi-box {
    flex: 1; border-radius: 12px; padding: 18px 16px;
    border-left: 4px solid transparent; background: var(--bg-card2);
  }
  .kpi-box.blue { border-left-color: #0072BC; background: #f0f7ff; }
  .kpi-box.green { border-left-color: #00A651; background: #f0faf5; }
  .kpi-box.red { border-left-color: #E30613; background: #fff5f5; }
  .kpi-box.orange { border-left-color: #f57c00; background: #fff8f0; }
  .kpi-num { display: block; font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1; }
  .kpi-num.danger { color: #E30613; }
  .kpi-name { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 6px; font-weight: 500; }

  /* Tables */
  .table-section { margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1a1a2e; }
  thead th {
    padding: 12px 14px; text-align: left;
    font-size: 11px; font-weight: 700; color: white;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  tbody tr { border-bottom: 1px solid #f5f5f5; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody td { padding: 10px 14px; font-size: 12px; color: #2c3e50; }

  /* Footer */
  .footer {
    background: var(--bg-card2); border-top: 2px solid #E30613;
    padding: 20px 40px;
    display: flex; justify-content: space-between; align-items: center;
    margin-top: auto;
  }
  .footer-left { font-size: 11px; color: var(--text-muted); line-height: 1.8; }
  .footer-left strong { color: var(--text-primary); }
  .footer-right { text-align: right; font-size: 11px; color: #bbb; }
  .confidential {
    display: inline-block; border: 1px solid #E30613;
    color: #E30613; padding: 4px 10px; border-radius: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    margin-bottom: 4px;
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="logo-circle">
        <img src="http://localhost:4200/tt.png" alt="TT">
      </div>
      <div class="company">
        <span class="company-name">Tunisie Telecom</span>
        <span class="company-sub">Direction des Systemes d'Information</span>
      </div>
    </div>
    <div class="header-right">
      <span class="report-badge">RAPPORT DE FRAUDE</span>
      <span class="report-date">Genere le ${date} a ${now}</span>
    </div>
  </div>

  <div class="color-bar">
    <div class="cb1"></div><div class="cb2"></div>
    <div class="cb3"></div><div class="cb4"></div>
  </div>

  <div class="body">

    <div class="report-title">
      <h1>Rapport de Detection des Appels Frauduleux</h1>
      <p>Analyse automatique basee sur le modele Machine Learning (Random Forest)</p>
      <span class="period-badge">Periode analysee : ${this.selectedDays} derniers jours</span>
    </div>

    <div class="kpi-section">
      <div class="section-title">Resume executif</div>
      <div class="kpi-row">
        <div class="kpi-box blue">
          <span class="kpi-num">${this.summary?.totalCdrs || 0}</span>
          <span class="kpi-name">CDR importes</span>
        </div>
        <div class="kpi-box green">
          <span class="kpi-num">${this.summary?.totalAnalyzed || 0}</span>
          <span class="kpi-name">Appels analyses</span>
        </div>
        <div class="kpi-box red">
          <span class="kpi-num">${this.summary?.totalFrauds || 0}</span>
          <span class="kpi-name">Fraudes detectees</span>
        </div>
        <div class="kpi-box orange">
          <span class="kpi-num ${(this.summary?.fraudRate || 0) > 30 ? 'danger' : ''}">${this.summary?.fraudRate || 0}%</span>
          <span class="kpi-name">Taux de fraude</span>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="section-title">Evolution journaliere des fraudes</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total appels</th>
            <th>Fraudes</th>
            <th>Legitimes</th>
            <th>Taux</th>
          </tr>
        </thead>
        <tbody>${trendRows || '<tr><td colspan="5" style="text-align:center;color:#bbb;padding:20px">Aucune donnee disponible</td></tr>'}</tbody>
      </table>
    </div>

    <div class="table-section">
      <div class="section-title">Top pays a risque</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Pays</th>
            <th>Nombre de fraudes</th>
          </tr>
        </thead>
        <tbody>${countryRows || '<tr><td colspan="3" style="text-align:center;color:#bbb;padding:20px">Aucune donnee disponible</td></tr>'}</tbody>
      </table>
    </div>

  </div>

  <div class="footer">
    <div class="footer-left">
      <strong>Plateforme de Detection des Appels Frauduleux</strong><br>
      Developpe par <strong>Ihebeddine Saafi</strong> — Stage Ingenieur Ete 2026<br>
      Tunisie Telecom — Direction des Systemes d'Information
    </div>
    <div class="footer-right">
      <div class="confidential">CONFIDENTIEL</div><br>
      &copy; 2026 Tunisie Telecom<br>
      Tous droits reserves
    </div>
  </div>

</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 800);
    }
  }

  getTTLogoBase64(): string { return ''; }
}