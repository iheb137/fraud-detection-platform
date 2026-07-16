import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="nf-page">
      <div class="nf-card">
        <div class="nf-code"><span>4</span><mat-icon class="nf-icon">search_off</mat-icon><span>4</span></div>
        <h1>Page introuvable</h1>
        <p>La page demand&eacute;e n'existe pas ou n'est plus disponible.<br>
           V&eacute;rifiez l'adresse ou revenez &agrave; votre espace.</p>
        <a class="nf-btn" routerLink="/dashboard"><mat-icon>home</mat-icon> Retour &agrave; mon espace</a>
      </div>
      <span class="nf-brand">Tunisie Telecom &mdash; Fraud Detection Platform</span>
    </div>
  `,
  styles: [`
    .nf-page { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 26px; background: linear-gradient(135deg, #0b1e33 0%, #0072BC 70%, #00A651 170%); }
    .nf-card { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.22);
      backdrop-filter: blur(8px); border-radius: 22px; padding: 46px 60px; text-align: center;
      color: #fff; animation: nfRise .4s ease; max-width: 480px; }
    .nf-code { display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: 5.2rem; font-weight: 900; line-height: 1; }
    .nf-icon { font-size: 4.6rem; width: 4.6rem; height: 4.6rem; color: #ffd54f; }
    h1 { margin: 14px 0 8px; font-size: 1.4rem; }
    p { font-size: .9rem; opacity: .85; line-height: 1.5; margin: 0 0 24px; }
    .nf-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #0b1e33;
      padding: 11px 22px; border-radius: 10px; font-weight: 700; text-decoration: none;
      transition: transform .15s, box-shadow .15s; }
    .nf-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.3); }
    .nf-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .nf-brand { color: rgba(255,255,255,.55); font-size: .78rem; letter-spacing: .06em; }
    @keyframes nfRise { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
  `]
})
export class NotFoundComponent {}
