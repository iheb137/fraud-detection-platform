import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive, MatIconModule],
  template: `
    <div class="sidebar">
      <div class="sidebar-logo">
        <img src="tt.png" alt="TT" class="tt-sidebar-logo">
        <div class="sidebar-brand">
          <span class="brand-name">Tunisie Telecom</span>
          <span class="brand-sub">Fraud Detection</span>
        </div>
      </div>

      <div class="sidebar-colors">
        <span class="c1"></span><span class="c2"></span>
        <span class="c3"></span><span class="c4"></span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-title">PRINCIPAL</span>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <mat-icon>dashboard</mat-icon><span>Dashboard</span>
          </a>
          <a routerLink="/statistics" routerLinkActive="active" class="nav-item">
            <mat-icon>bar_chart</mat-icon><span>Statistiques</span>
          </a>
          <a routerLink="/alerts" routerLinkActive="active" class="nav-item">
            <mat-icon>notifications_active</mat-icon><span>Alertes</span>
          </a>
        </div>

        <div class="nav-section" *ngIf="!isAnalyste()">
          <span class="nav-section-title">IMPORTS</span>
          <a routerLink="/imports" routerLinkActive="active" class="nav-item">
            <mat-icon>folder_open</mat-icon><span>Mes Imports</span>
          </a>
          <a routerLink="/cdrs/import" routerLinkActive="active" class="nav-item">
            <mat-icon>upload_file</mat-icon><span>Nouvel Import</span>
          </a>
        </div>

        <div class="nav-section">
          <span class="nav-section-title">DONNEES</span>
          <a routerLink="/cdrs" routerLinkActive="active" class="nav-item">
            <mat-icon>phone_in_talk</mat-icon><span>Tous les CDR</span>
          </a>
        </div>

        <div class="nav-section">
          <span class="nav-section-title">ANALYSE ML</span>
          <a routerLink="/predictions" routerLinkActive="active" class="nav-item">
            <mat-icon>psychology</mat-icon><span>Predictions ML</span>
          </a>
        </div>

        <div class="nav-section">
          <span class="nav-section-title">MON COMPTE</span>
          <a routerLink="/profile" routerLinkActive="active" class="nav-item">
            <mat-icon>account_circle</mat-icon><span>Mon Profil</span>
          </a>
          <a routerLink="/tickets" routerLinkActive="active" class="nav-item">
            <mat-icon>support_agent</mat-icon><span>Support</span>
            <span class="badge-notif" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          </a>
          <a routerLink="/interventions" routerLinkActive="active" class="nav-item">
            <mat-icon>warning_amber</mat-icon><span>Interventions</span>
            <span class="badge-notif" *ngIf="unreadInterventions > 0">{{ unreadInterventions }}</span>
          </a>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">{{ getUserInitials() }}</div>
          <div class="user-info">
            <span class="user-name">{{ getUserName() }}</span>
            <span class="user-role">{{ getUserRole() }}</span>
          </div>
        </div>
        <div class="sidebar-copyright">
          <p>Developpe par</p>
          <p><strong>Ihebeddine Saafi</strong></p>
          <p>Stage Ingenieur - Ete 2026</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 260px; min-width: 260px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      display: flex; flex-direction: column;
      height: 100vh; overflow-y: auto;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 12px;
      padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .tt-sidebar-logo {
      width: 44px; height: 44px; object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
    }
    .brand-name { display: block; font-size: 13px; font-weight: 700; color: white; }
    .brand-sub { display: block; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }
    .sidebar-colors {
      display: flex; height: 3px;
      span { flex: 1; }
      .c1 { background: #E30613; } .c2 { background: #FFD700; }
      .c3 { background: #00A651; } .c4 { background: #0072BC; }
    }
    .sidebar-nav { flex: 1; padding: 16px 12px; overflow-y: auto; }
    .nav-section { margin-bottom: 20px; }
    .nav-section-title {
      display: block; font-size: 10px; font-weight: 700;
      color: rgba(255,255,255,0.3); letter-spacing: 1.5px;
      padding: 0 8px; margin-bottom: 6px;
    }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 10px;
      color: rgba(255,255,255,0.6); text-decoration: none;
      font-size: 13px; font-weight: 500; margin-bottom: 3px;
      transition: all 0.2s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { background: rgba(255,255,255,0.08); color: white; }
      &.active {
        background: linear-gradient(135deg, rgba(227,6,19,0.2), rgba(227,6,19,0.1));
        color: white; border-left: 3px solid #E30613;
        mat-icon { color: #E30613; }
      }
    }
    .nav-badge {
      margin-left: auto; background: #E30613; color: white;
      font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
    }
    .sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
    .sidebar-user {
      display: flex; align-items: center; gap: 10px;
      padding: 12px; background: rgba(255,255,255,0.05);
      border-radius: 10px; margin-bottom: 12px;
    }
    .user-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #E30613, #0072BC);
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; color: white; font-size: 12px; font-weight: 700;
    }
    .user-name { display: block; font-size: 12px; font-weight: 600; color: white; }
    .user-role { display: block; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
    .sidebar-copyright {
      text-align: center;
      p { font-size: 10px; color: rgba(255,255,255,0.25); line-height: 1.6;
          strong { color: rgba(255,255,255,0.5); } }
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  unreadInterventions = 0;
  private pollInterval: any;

  constructor(public authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadUnreadCount(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    this.http.get<any>('http://localhost:8081/api/v1/tickets/unread-count', { headers })
      .subscribe({ next: (r) => this.unreadCount = r.unread || 0, error: () => {} });
    this.http.get<any>('http://localhost:8081/api/v1/interventions/unread-count', { headers })
      .subscribe({ next: (r) => this.unreadInterventions = r.unread || 0, error: () => {} });
  }

  getUserName(): string {
    const u = this.authService.getCurrentUser();
    if (!u) return '';
    return ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
  }
  getUserInitials(): string {
    const u = this.authService.getCurrentUser();
    if (!u) return 'U';
    const f = u.firstName?.[0] || '';
    const l = u.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }
  getUserRole(): string { return this.authService.getCurrentUser()?.role || ''; }
  isAnalyste(): boolean { return this.authService.getCurrentUser()?.role === 'ANALYSTE'; }
}