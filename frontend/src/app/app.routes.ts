import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

const analysteGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getCurrentUser()?.role === 'ANALYSTE') {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'superadmin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/superadmin/superadmin.component').then(m => m.SuperAdminComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'statistics',
        loadComponent: () => import('./features/statistics/statistics/statistics.component').then(m => m.StatisticsComponent)
      },
      {
        path: 'imports',
        canActivate: [analysteGuard],
        loadComponent: () => import('./features/imports/import-list/import-list.component').then(m => m.ImportListComponent)
      },
      {
        path: 'cdrs',
        loadComponent: () => import('./features/cdr/cdr-list/cdr-list.component').then(m => m.CdrListComponent)
      },
      {
        path: 'cdrs/import',
        canActivate: [analysteGuard],
        loadComponent: () => import('./features/cdr/cdr-import/cdr-import.component').then(m => m.CdrImportComponent)
      },
      {
        path: 'predictions',
        loadComponent: () => import('./features/predictions/prediction-list/prediction-list.component').then(m => m.PredictionListComponent)
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alert-list/alert-list.component').then(m => m.AlertListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/tickets/tickets.component').then(m => m.TicketsComponent)
      },
      {
        path: 'interventions',
        loadComponent: () => import('./features/interventions/interventions.component').then(m => m.InterventionsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];