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

const APP = 'TT Fraud Detection';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    title: `Connexion — ${APP}`,
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'superadmin',
    title: `Super Administration — ${APP}`,
    canActivate: [authGuard],
    loadComponent: () => import('./features/superadmin/superadmin.component').then(m => m.SuperAdminComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: `Tableau de bord — ${APP}`,
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'statistics',
        title: `Statistiques — ${APP}`,
        loadComponent: () => import('./features/statistics/statistics/statistics.component').then(m => m.StatisticsComponent)
      },
      {
        path: 'imports',
        title: `Imports — ${APP}`,
        canActivate: [analysteGuard],
        loadComponent: () => import('./features/imports/import-list/import-list.component').then(m => m.ImportListComponent)
      },
      {
        path: 'cdrs',
        title: `CDR — ${APP}`,
        loadComponent: () => import('./features/cdr/cdr-list/cdr-list.component').then(m => m.CdrListComponent)
      },
      {
        path: 'cdrs/import',
        title: `Import CDR — ${APP}`,
        canActivate: [analysteGuard],
        loadComponent: () => import('./features/cdr/cdr-import/cdr-import.component').then(m => m.CdrImportComponent)
      },
      {
        path: 'predictions',
        title: `Predictions ML — ${APP}`,
        loadComponent: () => import('./features/predictions/prediction-list/prediction-list.component').then(m => m.PredictionListComponent)
      },
      {
        path: 'alerts',
        title: `Alertes — ${APP}`,
        loadComponent: () => import('./features/alerts/alert-list/alert-list.component').then(m => m.AlertListComponent)
      },
      {
        path: 'profile',
        title: `Mon profil — ${APP}`,
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'tickets',
        title: `Support — ${APP}`,
        loadComponent: () => import('./features/tickets/tickets.component').then(m => m.TicketsComponent)
      },
      {
        path: 'interventions',
        title: `Interventions — ${APP}`,
        loadComponent: () => import('./features/interventions/interventions.component').then(m => m.InterventionsComponent)
      }
    ]
  },
  {
    path: '**',
    title: `Page introuvable — ${APP}`,
    loadComponent: () => import('./features/misc/not-found.component').then(m => m.NotFoundComponent)
  }
];
