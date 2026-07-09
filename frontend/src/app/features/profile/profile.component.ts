import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <h1>Mon Profil</h1>
        <p>Gerer vos informations personnelles</p>
      </div>

      <div class="profile-layout">
        <div class="profile-card card">
          <div class="profile-avatar-section">
            <div class="profile-avatar-wrap">
              <div class="profile-avatar"
                   [style.background-image]="profile.profilePicture ? 'url(' + profile.profilePicture + ')' : 'none'">
                <span *ngIf="!profile.profilePicture">{{ getInitials() }}</span>
              </div>
              <button class="avatar-edit-btn" (click)="fileInput.click()">
                <mat-icon>photo_camera</mat-icon>
              </button>
              <input #fileInput type="file" accept="image/*" hidden (change)="onPhotoSelect($event)">
            </div>
            <div class="profile-name-section">
              <h2>{{ profile.firstName }} {{ profile.lastName }}</h2>
              <span class="role-pill" [class.admin]="profile.role==='ADMIN'" [class.analyste]="profile.role==='ANALYSTE'">
                {{ profile.role }}
              </span>
              <p class="profile-email">{{ profile.email }}</p>
              <p class="profile-dept" *ngIf="profile.department">
                <mat-icon>business</mat-icon> {{ profile.department }}
              </p>
            </div>
          </div>

          <div class="profile-form">
            <h3>Informations personnelles</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Prenom</label>
                <input [(ngModel)]="profile.firstName" placeholder="Prenom">
              </div>
              <div class="form-group">
                <label>Nom</label>
                <input [(ngModel)]="profile.lastName" placeholder="Nom">
              </div>
              <div class="form-group">
                <label>Telephone</label>
                <input [(ngModel)]="profile.phone" placeholder="+216 XX XXX XXX">
              </div>
              <div class="form-group">
                <label>Departement</label>
                <input [(ngModel)]="profile.department" placeholder="DSI, Securite...">
              </div>
              <div class="form-group full">
                <label>Bio</label>
                <textarea [(ngModel)]="profile.bio" rows="3" placeholder="Quelques mots sur vous..."></textarea>
              </div>
              <div class="form-group full">
                <label>URL de photo de profil</label>
                <input [(ngModel)]="profile.profilePicture" placeholder="https://... ou utilisez le bouton camera">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" (click)="saveProfile()">
                <mat-icon>save</mat-icon> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="toast" *ngIf="toast" [class.success]="toastType==='success'" [class.error]="toastType==='error'">
        <mat-icon>{{ toastType === 'success' ? 'check_circle' : 'error' }}</mat-icon>
        {{ toast }}
      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .page-header p { color: #7f8c8d; font-size: 14px; }

    .profile-card { padding: 32px; }

    .profile-avatar-section {
      display: flex; align-items: center; gap: 28px;
      padding-bottom: 28px; margin-bottom: 28px;
      border-bottom: 1px solid #f0f0f0;
    }
    .profile-avatar-wrap { position: relative; flex-shrink: 0; }
    .profile-avatar {
      width: 110px; height: 110px; border-radius: 50%;
      background: linear-gradient(135deg, #E30613, #0072BC);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 32px; font-weight: 700;
      background-size: cover; background-position: center;
      border: 3px solid white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .avatar-edit-btn {
      position: absolute; bottom: 2px; right: 2px;
      width: 32px; height: 32px; border-radius: 50%;
      background: #E30613; border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: white;
    }
    .avatar-edit-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .profile-name-section h2 { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 8px; }
    .role-pill {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 700; margin-bottom: 8px;
    }
    .role-pill.admin { background: #e3f2fd; color: #0072BC; }
    .role-pill.analyste { background: #e8f5e9; color: #00A651; }
    .profile-email { font-size: 13px; color: #7f8c8d; margin-bottom: 4px; }
    .profile-dept { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #7f8c8d; }
    .profile-dept mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .profile-form h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 12px; font-weight: 600; color: #555; }
    .form-group input, .form-group textarea {
      padding: 10px 14px; border: 1px solid #e0e0e0;
      border-radius: 8px; font-size: 13px; color: #1a1a2e;
      outline: none; transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: #E30613; }
    .form-actions { display: flex; }
    .btn-save {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 24px; background: #E30613; color: white;
      border: none; border-radius: 10px; font-size: 14px;
      font-weight: 600; cursor: pointer;
    }
    .btn-save:hover { background: #c20511; }

    .toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 14px 20px; border-radius: 12px;
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 600; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    .toast.success { background: #e8f5e9; color: #00A651; }
    .toast.error { background: #fde8e8; color: #E30613; }

    body.dark-mode .profile-card { background: #1e2130 !important; }
    body.dark-mode .profile-name-section h2 { color: #e8eaf0 !important; }
    body.dark-mode .profile-form h3 { color: #e8eaf0 !important; }
    body.dark-mode .form-group label { color: #8b92a8 !important; }
    body.dark-mode .form-group input,
    body.dark-mode .form-group textarea { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; color: #e8eaf0 !important; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
  `]
})
export class ProfileComponent implements OnInit {
  profile: any = {};
  toast = '';
  toastType = 'success';

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void { this.loadProfile(); }

  get headers() {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.authService.getToken() });
  }

  loadProfile(): void {
    this.http.get<any>(`${environment.apiUrl}/users/me`, { headers: this.headers })
      .subscribe({ next: (u) => this.profile = u, error: () => {} });
  }

  saveProfile(): void {
    this.http.put<any>(`${environment.apiUrl}/users/me`, this.profile, { headers: this.headers })
      .subscribe({
        next: (u) => { this.profile = u; this.showToast('Profil sauvegarde', 'success'); },
        error: () => this.showToast('Erreur', 'error')
      });
  }

  onPhotoSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.profile.profilePicture = e.target.result; };
    reader.readAsDataURL(file);
  }

  getInitials(): string {
    return ((this.profile.firstName?.[0] || '') + (this.profile.lastName?.[0] || '')).toUpperCase() || 'U';
  }

  showToast(msg: string, type: string): void {
    this.toast = msg; this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}