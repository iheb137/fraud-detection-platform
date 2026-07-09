import { Component, ViewEncapsulation, OnInit, Output, EventEmitter } from '@angular/core';
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
        <mat-menu #userMenu="matMenu">
          <div class="menu-header">
            <strong>{{ getUserName() }}</strong>
            <small>{{ getCurrentUser()?.email }}</small>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon color="warn">logout</mat-icon>
            <span>Deconnexion</span>
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
    .menu-header { padding: 12px 16px; }
    .menu-header strong { display: block; font-size: 14px; }
    .menu-header small { color: #999; font-size: 12px; }

    /* DARK MODE */
    body.dark-mode .app-header { background: #1e2130 !important; border-bottom-color: rgba(255,255,255,0.08) !important; }
    body.dark-mode .header-time span { color: #8b92a8 !important; }
    body.dark-mode .header-time mat-icon { color: #8b92a8 !important; }
    body.dark-mode .header-divider { background: rgba(255,255,255,0.08) !important; }
    body.dark-mode .theme-btn { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; }
    body.dark-mode .user-name-sm { color: #e8eaf0 !important; }
    body.dark-mode .user-role-sm { color: #8b92a8 !important; }  `]
})
export class HeaderComponent implements OnInit {
  @Output() themeToggle = new EventEmitter<void>();
  currentTime = new Date();
  dark = localStorage.getItem('theme') === 'dark';

  constructor(public authService: AuthService) {
    setInterval(() => this.currentTime = new Date(), 1000);
  }

  ngOnInit(): void {}

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