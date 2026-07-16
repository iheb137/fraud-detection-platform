import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule, MatIconModule
  ],
  template: `
    <div class="login-container">
      <div class="login-left">
        <div class="left-content">
          <div class="brand-section">
            <img src="tt.png" alt="Tunisie Telecom" class="tt-logo-img">
            <div class="brand-text">
              <h1>Tunisie Telecom</h1>
              <p class="slogan">La vie est emotions</p>
            </div>
          </div>

          <div class="divider-colors">
            <span class="c1"></span><span class="c2"></span>
            <span class="c3"></span><span class="c4"></span>
          </div>

          <div class="platform-info">
            <h2>Plateforme de Detection<br>des Appels Frauduleux</h2>
            <p>Systeme intelligent base sur le Machine Learning pour proteger le reseau telephonique tunisien.</p>
          </div>

          <div class="live-feed">
            <div class="lf-head">
              <span class="lf-dot"></span>
              <span class="lf-title">Analyse en direct</span>
              <span class="lf-badge">simulation</span>
            </div>
            <div class="lf-rows">
              <div class="lf-row" *ngFor="let f of feed" [class.fraud]="f.fraud">
                <span class="lf-time">{{ f.time }}</span>
                <span class="lf-num">{{ f.num }}</span>
                <span class="lf-country">{{ f.country }}</span>
                <div class="lf-score"><div class="lf-score-fill" [style.width.%]="f.score"></div></div>
                <span class="lf-pct">{{ f.score }}%</span>
                <span class="lf-verdict">{{ f.fraud ? 'FRAUDE' : 'LEGIT' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="left-footer">
          <p>Developpe par <strong>Ihebeddine Saafi</strong> &mdash; Stage Ingenieur Ete 2026</p>
          <p>&copy; 2026 Tunisie Telecom &mdash; Direction des Systemes d'Information</p>
        </div>
      </div>

      <div class="login-right">
        <div class="login-card">
          <div class="card-logo">
            <img src="tt.png" alt="TT" class="card-logo-img">
          </div>
          <h3>Connexion</h3>
          <p class="card-subtitle">Acces a votre espace de supervision</p>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" [class.was-submitted]="submitted">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="votre@email.com">
              <mat-icon matPrefix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required') && submitted">Email requis</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email') && submitted">Email invalide</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Mot de passe requis</mat-error>
            </mat-form-field>

            <div class="error-box" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              {{ errorMessage }}
            </div>

            <button class="btn-login" type="submit" [disabled]="loginForm.invalid || loading">
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <ng-container *ngIf="!loading">
                <mat-icon>login</mat-icon> Se connecter
              </ng-container>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      min-height: 100vh;
      background-image: url('/ttback.png');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      position: relative;
    }
    .login-container::before {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(26,26,46,0.55) 0%, rgba(22,33,62,0.45) 100%);
      z-index: 0;
    }
    .login-left {
      flex: 1.3;
      padding: 60px 70px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: white;
      position: relative;
      z-index: 1;
    }
    .left-content { position: relative; z-index: 1; }
    .brand-section { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .tt-logo-img { width: 64px; height: 64px; object-fit: contain; }
    .brand-text h1 { font-size: 24px; font-weight: 800; margin: 0; }
    .slogan { font-size: 13px; color: rgba(255,255,255,0.6); font-style: italic; margin: 2px 0 0 0; }
    .divider-colors { display: flex; height: 4px; width: 240px; margin-bottom: 36px; border-radius: 4px; overflow: hidden; }
    .divider-colors span { flex: 1; }
    .c1 { background: #E30613; } .c2 { background: #FFD700; }
    .c3 { background: #00A651; } .c4 { background: #0072BC; }
    .platform-info h2 { font-size: 34px; font-weight: 800; line-height: 1.25; margin: 0 0 16px 0; }
    .platform-info p { font-size: 15px; color: rgba(255,255,255,0.65); max-width: 460px; line-height: 1.6; margin: 0 0 36px 0; }
    .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 580px; }
    /* ===== Flux de detection live ===== */
    .live-feed { max-width: 580px; background: rgba(8, 18, 32, 0.55); border: 1px solid rgba(255,255,255,0.16);
      border-radius: 16px; backdrop-filter: blur(10px); overflow: hidden; }
    .lf-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.12); }
    .lf-dot { width: 9px; height: 9px; border-radius: 50%; background: #00A651; animation: lfPulse 1.4s ease-out infinite; }
    @keyframes lfPulse { 0% { box-shadow: 0 0 0 0 rgba(0,166,81,.5); } 100% { box-shadow: 0 0 0 9px rgba(0,166,81,0); } }
    .lf-title { color: #fff; font-weight: 700; font-size: .86rem; letter-spacing: .02em; }
    .lf-badge { margin-left: auto; font-size: .62rem; color: rgba(255,255,255,.55);
      border: 1px solid rgba(255,255,255,.3); padding: 2px 8px; border-radius: 12px;
      text-transform: uppercase; letter-spacing: .08em; }
    .lf-rows { padding: 6px 0; }
    .lf-row { display: flex; align-items: center; gap: 12px; padding: 8px 16px;
      animation: lfIn .35s ease; }
    .lf-row + .lf-row { border-top: 1px solid rgba(255,255,255,0.05); }
    @keyframes lfIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
    .lf-time { font-family: 'Consolas', monospace; font-size: .72rem; color: rgba(255,255,255,.45); width: 58px; }
    .lf-num { font-family: 'Consolas', monospace; font-size: .78rem; color: #fff; width: 128px; }
    .lf-country { font-size: .72rem; font-weight: 700; color: rgba(255,255,255,.75); width: 26px; }
    .lf-score { flex: 1; height: 5px; border-radius: 4px; background: rgba(255,255,255,.12); overflow: hidden; }
    .lf-score-fill { height: 100%; border-radius: 4px; background: #00A651; transition: width .4s; }
    .lf-row.fraud .lf-score-fill { background: #E30613; }
    .lf-pct { font-family: 'Consolas', monospace; font-size: .74rem; color: rgba(255,255,255,.8); width: 38px; text-align: right; }
    .lf-verdict { font-size: .64rem; font-weight: 800; letter-spacing: .06em; padding: 3px 9px;
      border-radius: 12px; width: 58px; text-align: center;
      background: rgba(0,166,81,.18); color: #4be08d; border: 1px solid rgba(0,166,81,.4); }
    .lf-row.fraud .lf-verdict { background: rgba(227,6,19,.18); color: #ff6b74; border-color: rgba(227,6,19,.45);
      animation: lfPulse 1.4s ease-out infinite; }
    .feature-item {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 16px;
    }
    .feature-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .feature-icon svg { width: 22px; height: 22px; }
    .feature-icon.red { background: rgba(227,6,19,0.15); }
    .feature-icon.red svg { stroke: #E30613; }
    .feature-icon.blue { background: rgba(0,114,188,0.15); }
    .feature-icon.blue svg { stroke: #0072BC; }
    .feature-icon.green { background: rgba(0,166,81,0.15); }
    .feature-icon.green svg { stroke: #00A651; }
    .feature-icon.yellow { background: rgba(255,215,0,0.15); }
    .feature-icon.yellow svg { stroke: #FFD700; }
    .feature-text { display: flex; flex-direction: column; }
    .feature-text strong { font-size: 13px; color: white; }
    .feature-text small { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
    .left-footer {
      position: relative; z-index: 1;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .left-footer p { font-size: 11px; color: rgba(255,255,255,0.35); margin: 3px 0; }
    .left-footer p strong { color: rgba(255,255,255,0.65); }

    .login-right {
      flex: 0.85;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .login-card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 48px 42px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .card-logo { margin-bottom: 18px; }
    .card-logo-img { width: 60px; height: 60px; object-fit: contain; }
    .login-card h3 { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }
    .card-subtitle { font-size: 13px; color: rgba(255,255,255,0.55); margin: 0 0 30px 0; }
    .full-width { width: 100%; margin-bottom: 10px; text-align: left; }
    .error-box {
      display: flex; align-items: center; gap: 8px;
      color: #ff6b6b; font-size: 13px;
      padding: 10px 14px;
      background: rgba(227,6,19,0.12);
      border: 1px solid rgba(227,6,19,0.25);
      border-radius: 10px; margin-bottom: 14px;
      text-align: left;
    }
    .btn-login {
      width: 100%; height: 50px;
      background: #E30613;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 6px 18px rgba(227,6,19,0.35);
    }
    .btn-login:hover:not(:disabled) {
      background: #c20511;
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(227,6,19,0.45);
    }
    .btn-login:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    :host ::ng-deep .login-card .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background-color: rgba(255,255,255,0.12) !important;
      backdrop-filter: blur(10px);
      border-radius: 14px;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
      transition: background-color 0.3s, box-shadow 0.3s;
    }
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused .mat-mdc-text-field-wrapper {
      background-color: rgba(255,255,255,0.2) !important;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.1), 0 4px 14px rgba(227,6,19,0.2);
    }
    :host ::ng-deep .login-card .mat-mdc-form-field .mat-mdc-form-field-flex {
      background: transparent !important;
    }
    :host ::ng-deep .login-card .mat-mdc-floating-label,
    :host ::ng-deep .login-card .mdc-floating-label,
    :host ::ng-deep .login-card .mdc-floating-label--float-above {
      color: rgba(255,255,255,0.6) !important;
    }
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused .mdc-floating-label {
      color: #ff6b6b !important;
    }
    :host ::ng-deep .login-card input.mat-mdc-input-element {
      background: transparent !important;
      box-shadow: none !important;
      color: #ffffff !important;
      caret-color: #ffffff !important;
    }
    :host ::ng-deep .login-card input.mat-mdc-input-element::placeholder {
      color: rgba(255,255,255,0.35) !important;
    }
    :host ::ng-deep .login-card input.mat-mdc-input-element:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.1) inset !important;
      -webkit-text-fill-color: #ffffff !important;
      transition: background-color 5000s ease-in-out 0s;
      caret-color: #ffffff;
    }
    :host ::ng-deep .login-card .mdc-notched-outline__leading,
    :host ::ng-deep .login-card .mdc-notched-outline__notch,
    :host ::ng-deep .login-card .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,0.18) !important;
    }
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #E30613 !important;
    }
    :host ::ng-deep .login-card form:not(.was-submitted) .mat-mdc-form-field-invalid .mdc-notched-outline__leading,
    :host ::ng-deep .login-card form:not(.was-submitted) .mat-mdc-form-field-invalid .mdc-notched-outline__notch,
    :host ::ng-deep .login-card form:not(.was-submitted) .mat-mdc-form-field-invalid .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,0.18) !important;
    }
    :host ::ng-deep .login-card form:not(.was-submitted) .mat-mdc-form-field-invalid .mdc-floating-label {
      color: rgba(255,255,255,0.6) !important;
    }
    :host ::ng-deep .login-card mat-icon[matPrefix] {
      color: rgba(255,255,255,0.55) !important;
      margin-right: 8px;
    }
    :host ::ng-deep .login-card .mat-mdc-form-field.mat-focused mat-icon[matPrefix] {
      color: #ff6b6b !important;
    }
    :host ::ng-deep .login-card button[matSuffix] mat-icon {
      color: rgba(255,255,255,0.55) !important;
    }
    :host ::ng-deep .login-card mat-error {
      color: #ff8a8a !important;
    }

    @media (max-width: 968px) {
      .login-left { display: none; }
      .login-right { flex: 1; }
    }
  `]
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
    this.startFeed();
  }

  // ----- Flux de detection simule (page publique : aucune donnee reelle) -----
  feed: Array<{ time: string; num: string; country: string; score: number; fraud: boolean }> = [];
  private feedTimer: any;
  private readonly legitCountries = ['TN', 'TN', 'TN', 'FR', 'DE', 'IT', 'MA'];
  private readonly fraudCountries = ['LV', 'CU', 'SL', 'GN', 'MC', 'SO'];

  private startFeed(): void {
    for (let i = 0; i < 5; i++) { this.pushFeedRow(); }
    this.feedTimer = setInterval(() => this.pushFeedRow(), 2000);
  }

  private pushFeedRow(): void {
    const fraud = Math.random() < 0.25;
    const d = () => Math.floor(Math.random() * 10);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.feed.unshift({
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      num: `+216 ${d()}${d()} XXX X${d()}${d()}`,
      country: fraud
        ? this.fraudCountries[Math.floor(Math.random() * this.fraudCountries.length)]
        : this.legitCountries[Math.floor(Math.random() * this.legitCountries.length)],
      score: fraud ? 70 + Math.floor(Math.random() * 29) : 2 + Math.floor(Math.random() * 38),
      fraud
    });
    if (this.feed.length > 6) { this.feed.pop(); }
  }

  ngOnDestroy(): void {
    if (this.feedTimer) { clearInterval(this.feedTimer); }
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.authService.login(this.loginForm.value).subscribe({
      next: () => { this.loading = false; },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.status === 401 ? 'Email ou mot de passe incorrect' : 'Erreur de connexion.';
      }
    });
  }
}