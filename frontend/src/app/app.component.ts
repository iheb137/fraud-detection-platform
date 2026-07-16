import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <!-- Overlay global de transition (connexion / deconnexion) -->
    <div class="auth-overlay" *ngIf="authService.transition$ | async as msg">
      <div class="auth-overlay-card">
        <div class="auth-overlay-logo">TT</div>
        <div class="auth-overlay-spinner"></div>
        <span class="auth-overlay-msg">{{ msg }}</span>
      </div>
    </div>

    <ng-container *ngIf="authService.isLoggedIn$ | async; else loginTemplate">

      <!-- SUPERADMIN : layout isole sans sidebar ni header -->
      <ng-container *ngIf="isSuperAdmin()">
        <router-outlet></router-outlet>
      </ng-container>

      <!-- ADMIN / ANALYSTE : layout normal -->
      <ng-container *ngIf="!isSuperAdmin()">
        <div class="app-container">
          <app-sidebar></app-sidebar>
          <div class="main-content">
            <app-header (themeToggle)="toggleTheme()"></app-header>
            <div class="page-content">
              <router-outlet></router-outlet>
            </div>
          </div>
        </div>
      </ng-container>

    </ng-container>

    <ng-template #loginTemplate>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    .app-container { display: flex; height: 100vh; overflow: hidden; }
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .page-content { flex: 1; overflow-y: auto; padding: 24px; background: #f5f5f5; transition: background 0.3s; }
    body.dark-mode .page-content { background: #12141f !important; }

    /* ===== Overlay de transition connexion / deconnexion ===== */
    .auth-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center;
      justify-content: center; background: linear-gradient(135deg, #0b1e33 0%, #0072BC 65%, #00A651 160%);
      animation: aoFade .25s ease; }
    .auth-overlay-card { display: flex; flex-direction: column; align-items: center; gap: 18px;
      color: #fff; animation: aoRise .35s ease; }
    .auth-overlay-logo { width: 66px; height: 66px; border-radius: 18px; background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 1.6rem; letter-spacing: .02em; backdrop-filter: blur(4px); }
    .auth-overlay-spinner { width: 34px; height: 34px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; animation: aoSpin .8s linear infinite; }
    .auth-overlay-msg { font-size: 1.02rem; font-weight: 600; letter-spacing: .02em; }
    @keyframes aoSpin { to { transform: rotate(360deg); } }
    @keyframes aoFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes aoRise { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class AppComponent implements OnInit {
  isDark = false;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.isDark = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
  }

  isSuperAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'SUPERADMIN';
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme(): void {
    if (this.isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}
