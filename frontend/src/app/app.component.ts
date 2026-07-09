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