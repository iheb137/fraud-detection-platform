import { Component, ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule,
            MatDividerModule, MatTooltipModule, RouterModule],
  template: `
    <header class="app-header">
      <div class="header-left"></div>
      <div class="header-right">
        <div class="header-time">
          <mat-icon>schedule</mat-icon>
          <span>{{ currentTime | date:'HH:mm' }} &mdash; {{ currentTime | date:'dd/MM/yyyy' }}</span>
        </div>
        <div class="header-divider"></div>
        <button class="theme-btn" (click)="onToggle()">
          <span *ngIf="!dark">🌙</span>
          <span *ngIf="dark">☀️</span>
        </button>
        <div class="header-divider"></div>
        <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
          <div class="user-avatar-sm">{{ getUserInitials() }}</div>
          <div class="user-info-sm">
            <span class="user-name-sm">{{ getUserName() }}</span>
            <span class="user-role-sm">{{ getUserRole() }}</span>
          </div>
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu" class="tt-user-menu" xPosition="before">
          <div class="ttm-head" (click)="$event.stopPropagation()">
            <div class="ttm-avatar">{{ getUserInitials() }}</div>
            <div class="ttm-id">
              <strong>{{ getUserName() }}</strong>
              <small>{{ getCurrentUser()?.email }}</small>
              <span class="ttm-role">{{ getUserRole() }}</span>
            </div>
          </div>
          <button mat-menu-item class="ttm-item" routerLink="/profile">
            <mat-icon>person</mat-icon>
            <span>Mon profil</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item class="ttm-item ttm-logout" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Se d&eacute;connecter</span>
          </button>
        </mat-menu>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 64px; background: var(--bg-header);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      z-index: 100;
    }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .header-time { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
    .header-time mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .header-divider { width: 1px; height: 32px; background: #e0e0e0; }
    .theme-btn {
      width: 38px; height: 38px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--bg-card2);
      cursor: pointer; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .theme-btn:hover { border-color: #E30613; background: #fde8e8; }
    .user-menu-btn {
      display: flex; align-items: center; gap: 10px;
      border-radius: 10px !important; padding: 6px 12px !important; height: auto !important;
    }
    .user-avatar-sm {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #E30613, #0072BC);
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; color: white; font-size: 11px; font-weight: 700;
    }
    .user-name-sm { display: block; font-size: 13px; font-weight: 600; color: #2c3e50; line-height: 1.2; }
    .user-role-sm { display: block; font-size: 10px; color: #aaa; text-transform: uppercase; }

    /* ===== Menu utilisateur (panneau CDK, encapsulation none requise) ===== */
    .tt-user-menu.mat-mdc-menu-panel {
      border-radius: 14px !important; min-width: 264px !important; overflow: hidden;
      box-shadow: 0 18px 50px rgba(11, 30, 51, .22) !important; margin-top: 8px;
    }
    .tt-user-menu .mat-mdc-menu-content { padding: 0 !important; }
    .ttm-head {
      display: flex; align-items: center; gap: 12px; padding: 16px;
      background: linear-gradient(120deg, #0b1e33, #0072BC); color: #fff; cursor: default;
    }
    .ttm-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.4);
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
    }
    .ttm-id { min-width: 0; }
    .ttm-id strong { display: block; font-size: 14px; line-height: 1.2; }
    .ttm-id small { display: block; font-size: 11px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ttm-role {
      display: inline-block; margin-top: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: .08em;
      background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.35);
      padding: 2px 8px; border-radius: 20px; text-transform: uppercase;
    }
    .ttm-item { height: 46px !important; font-size: 13.5px !important; }
    .ttm-item mat-icon { color: #486581; }
    .ttm-item:hover { background: #f0f5fa !important; }
    .ttm-logout, .ttm-logout mat-icon { color: #c62828 !important; }
    .ttm-logout:hover { background: #fdecea !important; }

    /* DARK MODE */
    body.dark-mode .app-header { background: #1e2130 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .header-time span { color: #8b92a8 !important; }
    body.dark-mode .header-time mat-icon { color: #8b92a8 !important; }
    body.dark-mode .header-divider { background: rgba(255,255,255,0.08) !important; }
    body.dark-mode .theme-btn { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; }
    body.dark-mode .user-name-sm { color: #e8eaf0 !important; }
    body.dark-mode .user-role-sm { color: #8b92a8 !important; }
    body.dark-mode .tt-user-menu.mat-mdc-menu-panel { background: #1e2130 !important; }
    body.dark-mode .ttm-item { color: #e8eaf0 !important; }
    body.dark-mode .ttm-item:hover { background: #252838 !important; }
  `]
})
export class HeaderComponent {
  @Output() themeToggle = new EventEmitter<void>();
  currentTime = new Date();
  dark = localStorage.getItem('theme') === 'dark';

  constructor(public authService: AuthService) {
    setInterval(() => this.currentTime = new Date(), 1000);
  }
  onToggle(): void {
    this.dark = !this.dark;
    this.themeToggle.emit();
  }

  getUserName(): string {
    const u = this.authService.getCurrentUser();
    return u ? u.firstName + ' ' + u.lastName : '';
  }
  getUserInitials(): string {
    const u = this.authService.getCurrentUser();
    if (!u) return 'U';
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  }
  getUserRole(): string { return this.authService.getCurrentUser()?.role || ''; }
  getCurrentUser() { return this.authService.getCurrentUser(); }
  logout(): void { this.authService.logout(); }
}
