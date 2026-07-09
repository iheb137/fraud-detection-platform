import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-superadmin',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule,
            MatProgressSpinnerModule, MatTooltipModule, RouterModule],
  template: `
    <div class="sa-layout">

      <!-- Sidebar SUPERADMIN -->
      <div class="sa-sidebar">
        <div class="sa-logo">
          <img src="tt.png" alt="TT" class="sa-logo-img">
          <div>
            <span class="sa-brand">Tunisie Telecom</span>
            <span class="sa-sub">Super Administration</span>
          </div>
        </div>
        <div class="sa-colors">
          <span></span><span></span><span></span><span></span>
        </div>
        <nav class="sa-nav">
          <a class="sa-nav-item" [class.active]="activeTab === 'dashboard'" (click)="activeTab='dashboard'">
            <mat-icon>dashboard</mat-icon><span>Dashboard</span>
          </a>
          <a class="sa-nav-item" [class.active]="activeTab === 'platform'" (click)="activeTab='platform'; loadPlatform()">
            <mat-icon>monitor_heart</mat-icon><span>Plateforme</span>
          </a>
          <a class="sa-nav-item" [class.active]="activeTab === 'users'" (click)="activeTab='users'; loadUsers()">
            <mat-icon>group</mat-icon><span>Utilisateurs</span>
          </a>
          <a class="sa-nav-item" [class.active]="activeTab === 'tickets'" (click)="activeTab='tickets'; loadTickets()">
            <mat-icon>support_agent</mat-icon><span>Support</span>
            <span class="sa-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          </a>
          <a class="sa-nav-item" [class.active]="activeTab === 'profile'" (click)="activeTab='profile'">
            <mat-icon>account_circle</mat-icon><span>Mon Profil</span>
          </a>
        </nav>
        <div class="sa-footer">
          <div class="sa-user">
            <div class="sa-avatar" [style.background-image]="getAvatarBg()">
              <span *ngIf="!currentUser?.profilePicture">SA</span>
            </div>
            <div>
              <span class="sa-username">Super Admin</span>
              <span class="sa-role">SUPERADMIN</span>
            </div>
          </div>
          <button class="sa-logout" (click)="logout()">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="sa-main">

        <!-- Header -->
        <div class="sa-header">
          <h2>{{ getTabTitle() }}</h2>
          <div class="sa-header-right">
            <span class="sa-time">{{ now | date:'HH:mm — dd/MM/yyyy' }}</span>
          </div>
        </div>

        <!-- DASHBOARD TAB -->
        <div class="sa-content" *ngIf="activeTab === 'dashboard'">
          <div class="sa-kpis" *ngIf="dashboardData">
            <div class="sa-kpi red">
              <div class="sa-kpi-icon"><mat-icon>people</mat-icon></div>
              <div>
                <span class="sa-kpi-val">{{ dashboardData.totalUsers }}</span>
                <span class="sa-kpi-lbl">Total utilisateurs</span>
              </div>
            </div>
            <div class="sa-kpi green">
              <div class="sa-kpi-icon"><mat-icon>check_circle</mat-icon></div>
              <div>
                <span class="sa-kpi-val">{{ dashboardData.activeUsers }}</span>
                <span class="sa-kpi-lbl">Comptes actifs</span>
              </div>
            </div>
            <div class="sa-kpi blue">
              <div class="sa-kpi-icon"><mat-icon>admin_panel_settings</mat-icon></div>
              <div>
                <span class="sa-kpi-val">{{ dashboardData.admins }}</span>
                <span class="sa-kpi-lbl">Administrateurs</span>
              </div>
            </div>
            <div class="sa-kpi yellow">
              <div class="sa-kpi-icon"><mat-icon>analytics</mat-icon></div>
              <div>
                <span class="sa-kpi-val">{{ dashboardData.analystes }}</span>
                <span class="sa-kpi-lbl">Analystes</span>
              </div>
            </div>
          </div>

          <div class="sa-card" *ngIf="dashboardData">
            <div class="sa-card-header">
              <h3>Tous les comptes</h3>
            </div>
            <table class="sa-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Statut</th>
                  <th>Cree le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of dashboardData.users">
                  <td>
                    <div class="sa-user-cell">
                      <div class="sa-mini-avatar" [style.background-image]="user.profilePicture ? 'url(' + user.profilePicture + ')' : ''">
                        <span *ngIf="!user.profilePicture">{{ getInitials(user) }}</span>
                      </div>
                      <span>{{ user.firstName }} {{ user.lastName }}</span>
                    </div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-badge" [class]="'role-' + user.role.toLowerCase()">{{ user.role }}</span></td>
                  <td>
                    <span class="status-dot" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                      {{ user.isActive ? 'Actif' : 'Suspendu' }}
                    </span>
                  </td>
                  <td>{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
                  <td class="sa-actions">
                    <button mat-icon-button (click)="toggleActive(user)" [matTooltip]="user.isActive ? 'Suspendre' : 'Activer'">
                      <mat-icon [style.color]="user.isActive ? '#f57c00' : '#00A651'">
                        {{ user.isActive ? 'block' : 'check_circle' }}
                      </mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteUser(user)" matTooltip="Supprimer">
                      <mat-icon style="color:#E30613">delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- USERS TAB -->
        <div class="sa-content" *ngIf="activeTab === 'users'">
          <div class="sa-card">
            <div class="sa-card-header">
              <h3>Gestion des comptes</h3>
              <button class="sa-btn-primary" (click)="showCreateForm = !showCreateForm">
                <mat-icon>person_add</mat-icon> Nouveau compte
              </button>
            </div>

            <div class="sa-create-form" *ngIf="showCreateForm">
              <h4>Creer un nouveau compte</h4>
              <div class="sa-form-grid">
                <div class="sa-form-group">
                  <label>Prenom</label>
                  <input [(ngModel)]="newUser.firstName" placeholder="Prenom">
                </div>
                <div class="sa-form-group">
                  <label>Nom</label>
                  <input [(ngModel)]="newUser.lastName" placeholder="Nom">
                </div>
                <div class="sa-form-group">
                  <label>Email</label>
                  <input [(ngModel)]="newUser.email" type="email" placeholder="email@tunisietelecom.tn">
                </div>
                <div class="sa-form-group">
                  <label>Mot de passe</label>
                  <input [(ngModel)]="newUser.password" type="password" placeholder="Mot de passe">
                </div>
                <div class="sa-form-group">
                  <label>Role</label>
                  <select [(ngModel)]="newUser.role">
                    <option value="ADMIN">ADMIN</option>
                    <option value="ANALYSTE">ANALYSTE</option>
                  </select>
                </div>
                <div class="sa-form-group">
                  <label>Departement</label>
                  <input [(ngModel)]="newUser.department" placeholder="DSI, Securite...">
                </div>
              </div>
              <div class="sa-form-actions">
                <button class="sa-btn-primary" (click)="createUser()">
                  <mat-icon>save</mat-icon> Creer le compte
                </button>
                <button class="sa-btn-secondary" (click)="showCreateForm = false">Annuler</button>
              </div>
            </div>

            <table class="sa-table" *ngIf="users.length > 0">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Departement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of users">
                  <td>
                    <div class="sa-user-cell">
                      <div class="sa-mini-avatar">
                        <span>{{ getInitials(user) }}</span>
                      </div>
                      <span>{{ user.firstName }} {{ user.lastName }}</span>
                    </div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-badge" [class]="'role-' + user.role.toLowerCase()">{{ user.role }}</span></td>
                  <td>{{ user.department || '—' }}</td>
                  <td>
                    <span class="status-dot" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                      {{ user.isActive ? 'Actif' : 'Suspendu' }}
                    </span>
                  </td>
                  <td class="sa-actions">
                    <button mat-icon-button (click)="toggleActive(user)" [matTooltip]="user.isActive ? 'Suspendre' : 'Activer'">
                      <mat-icon [style.color]="user.isActive ? '#f57c00' : '#00A651'">
                        {{ user.isActive ? 'block' : 'check_circle' }}
                      </mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteUser(user)" matTooltip="Supprimer">
                      <mat-icon style="color:#E30613">delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TICKETS TAB -->
        <div class="sa-content" *ngIf="activeTab === 'tickets'">
          <div class="sa-tickets-layout">
            <!-- Liste tickets -->
            <div class="sa-card sa-tickets-list">
              <div class="sa-card-header">
                <h3>Tickets support</h3>
                <div class="sa-ticket-header-actions">
                  <span class="sa-badge-count">{{ tickets.length }}</span>
                  <button class="sa-btn-del-all" *ngIf="tickets.length > 0" (click)="deleteAllTickets()" matTooltip="Supprimer tous les tickets">
                    <mat-icon>delete_sweep</mat-icon>
                  </button>
                </div>
              </div>
              <!-- Barre selection -->
              <div class="sa-selection-bar" *ngIf="selectedTicketIds.length > 0">
                <span>{{ selectedTicketIds.length }} selectionne(s)</span>
                <button class="sa-btn-del-sel" (click)="deleteSelectedTickets()">
                  <mat-icon>delete</mat-icon> Supprimer selection
                </button>
              </div>
              <div class="sa-ticket-item" *ngFor="let t of tickets"
                   [class.selected]="selectedTicket?.id === t.id"
                   [class.checked]="selectedTicketIds.includes(t.id)">
                <input type="checkbox" class="sa-ticket-check"
                       [checked]="selectedTicketIds.includes(t.id)"
                       (change)="toggleTicketSelect(t.id, $event)"
                       (click)="$event.stopPropagation()">
                <div class="sa-ticket-content" (click)="selectTicket(t)">
                  <div class="sa-ticket-header-row">
                    <span class="sa-ticket-subject">{{ t.subject }}</span>
                    <span class="priority-badge" [class]="'priority-' + t.priority?.toLowerCase()">{{ t.priority }}</span>
                  </div>
                  <div class="sa-ticket-meta">
                    <span>
                      <span class="role-badge" [class]="'role-' + t.createdBy?.role?.toLowerCase()">{{ t.createdBy?.role }}</span>
                      {{ t.createdBy?.firstName }} {{ t.createdBy?.lastName }}
                    </span>
                    <span>{{ t.createdAt | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <span class="ticket-status" [class]="'ts-' + t.status?.toLowerCase()">{{ t.status }}</span>
                </div>
              </div>
              <div class="sa-empty" *ngIf="tickets.length === 0">
                <mat-icon>inbox</mat-icon>
                <p>Aucun ticket</p>
              </div>
            </div>

            <!-- Detail ticket -->
            <div class="sa-card sa-ticket-detail" *ngIf="selectedTicket">
              <div class="sa-ticket-detail-header">
                <div>
                  <h3>{{ selectedTicket.subject }}</h3>
                  <p>{{ selectedTicket.createdBy?.firstName }} {{ selectedTicket.createdBy?.lastName }} — {{ selectedTicket.createdBy?.email }}</p>
                </div>
                <div class="sa-ticket-actions">
                  <select [(ngModel)]="selectedTicket.status" (change)="updateTicketStatus()">
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                  <button mat-icon-button (click)="deleteTicket(selectedTicket.id)" matTooltip="Supprimer ce ticket">
                    <mat-icon style="color:#E30613">delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <div class="sa-messages">
                <div class="sa-message" *ngFor="let msg of ticketMessages"
                     [class.mine]="msg.sender?.role === 'SUPERADMIN'"
                     [class.theirs]="msg.sender?.role !== 'SUPERADMIN'">
                  <div class="sa-msg-avatar">
                    <img *ngIf="msg.sender?.profilePicture" [src]="msg.sender.profilePicture" class="sa-msg-avatar-img" alt="">
                    <span *ngIf="!msg.sender?.profilePicture">{{ getInitials(msg.sender) }}</span>
                  </div>
                  <div class="sa-msg-bubble">
                    <span class="sa-msg-sender">{{ msg.sender?.firstName }} {{ msg.sender?.lastName }}</span>
                    <p>{{ msg.content }}</p>
                    <span class="sa-msg-time">{{ msg.sentAt | date:'HH:mm — dd/MM' }}</span>
                  </div>
                </div>
                <div class="sa-empty-msg" *ngIf="ticketMessages.length === 0">
                  <p>Aucun message — commencez la discussion</p>
                </div>
              </div>

              <div class="sa-reply-box">
                <textarea [(ngModel)]="replyContent" placeholder="Tapez votre reponse..." rows="3"
                          (keydown.enter)="$event.preventDefault(); sendReply()"></textarea>
                <button class="sa-btn-primary" (click)="sendReply()" [disabled]="!replyContent.trim()">
                  <mat-icon>send</mat-icon> Envoyer
                </button>
              </div>
            </div>

            <div class="sa-card sa-no-ticket" *ngIf="!selectedTicket">
              <mat-icon>support_agent</mat-icon>
              <p>Selectionnez un ticket pour repondre</p>
            </div>
          </div>
        </div>

        <!-- PLATFORM TAB -->
        <div class="sa-content" *ngIf="activeTab === 'platform'">
          <div class="pf-services" *ngIf="platformHealth">
            <div class="pf-svc" *ngFor="let s of ['postgres','ml','kafka']"
                 [class.up]="platformHealth.services[s]?.status === 'UP'"
                 [class.down]="platformHealth.services[s]?.status !== 'UP'">
              <mat-icon>{{ platformHealth.services[s]?.status === 'UP' ? 'check_circle' : 'error' }}</mat-icon>
              <div>
                <span class="pf-svc-name">{{ s === 'postgres' ? 'PostgreSQL' : s === 'ml' ? 'Service ML' : 'Kafka' }}</span>
                <span class="pf-svc-status">{{ platformHealth.services[s]?.status }}</span>
              </div>
            </div>
          </div>

          <div class="pf-volumetry" *ngIf="platformHealth">
            <div class="pf-vol" *ngFor="let v of volKeys">
              <mat-icon [style.color]="v.color">{{ v.icon }}</mat-icon>
              <span class="pf-vol-val">{{ platformHealth.volumetry[v.key] }}</span>
              <span class="pf-vol-lbl">{{ v.label }}</span>
            </div>
          </div>

          <div class="sa-card">
            <h3>Activit&eacute; par utilisateur</h3>
            <table class="sa-table" *ngIf="usersActivity.length > 0">
              <thead><tr><th>Utilisateur</th><th>R&ocirc;le</th><th>Dernier login</th><th>Batches</th><th>CDR</th><th>Alertes ouvertes</th><th>Tickets</th></tr></thead>
              <tbody>
                <tr *ngFor="let u of usersActivity" [class.pf-inactive]="!u.isActive">
                  <td>{{ u.fullName }} <span class="pf-off" *ngIf="!u.isActive">suspendu</span></td>
                  <td><span [class]="'rb rb-' + u.role.toLowerCase()">{{ u.role }}</span></td>
                  <td>{{ u.lastLogin ? (u.lastLogin | date:'dd/MM/yyyy HH:mm') : '&mdash;' }}</td>
                  <td>{{ u.batchCount }}</td>
                  <td>{{ u.cdrCount }}</td>
                  <td>{{ u.openAlerts }}</td>
                  <td>{{ u.ticketCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sa-card">
            <h3>Activit&eacute; r&eacute;cente</h3>
            <div class="pf-event" *ngFor="let e of recentActivity">
              <mat-icon [class]="'ev-' + e.type.toLowerCase()">{{ e.type === 'IMPORT' ? 'upload_file' : e.type === 'INTERVENTION' ? 'campaign' : 'support_agent' }}</mat-icon>
              <div class="pf-event-body">
                <span class="pf-event-label">{{ e.label }}</span>
                <span class="pf-event-meta">{{ e.by }} &middot; {{ e.at | date:'dd/MM HH:mm' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PROFILE TAB -->
        <div class="sa-content" *ngIf="activeTab === 'profile'">
          <div class="sa-card sa-profile-card">
            <div class="sa-profile-header">
              <div class="sa-profile-avatar-wrap">
                <div class="sa-profile-avatar"
                     [style.background-image]="profile.profilePicture ? 'url(' + profile.profilePicture + ')' : ''">
                  <span *ngIf="!profile.profilePicture">SA</span>
                </div>
                <button class="sa-avatar-edit" (click)="fileInput.click()">
                  <mat-icon>photo_camera</mat-icon>
                </button>
                <input #fileInput type="file" accept="image/*" hidden (change)="onPhotoSelect($event)">
              </div>
              <div class="sa-profile-info">
                <h2>{{ profile.firstName }} {{ profile.lastName }}</h2>
                <span class="role-badge role-superadmin">SUPERADMIN</span>
                <p>{{ profile.email }}</p>
              </div>
            </div>

            <div class="sa-form-grid">
              <div class="sa-form-group">
                <label>Prenom</label>
                <input [(ngModel)]="profile.firstName">
              </div>
              <div class="sa-form-group">
                <label>Nom</label>
                <input [(ngModel)]="profile.lastName">
              </div>
              <div class="sa-form-group">
                <label>Telephone</label>
                <input [(ngModel)]="profile.phone" placeholder="+216...">
              </div>
              <div class="sa-form-group">
                <label>Departement</label>
                <input [(ngModel)]="profile.department">
              </div>
              <div class="sa-form-group" style="grid-column: 1/-1">
                <label>Bio</label>
                <textarea [(ngModel)]="profile.bio" rows="3" placeholder="Description..."></textarea>
              </div>
              <div class="sa-form-group" style="grid-column: 1/-1">
                <label>URL de photo (ou upload ci-dessus)</label>
                <input [(ngModel)]="profile.profilePicture" placeholder="https://...">
              </div>
            </div>
            <div class="sa-form-actions">
              <button class="sa-btn-primary" (click)="saveProfile()">
                <mat-icon>save</mat-icon> Sauvegarder
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Toast -->
    <div class="sa-toast" *ngIf="toast" [class.success]="toastType==='success'" [class.error]="toastType==='error'">
      <mat-icon>{{ toastType === 'success' ? 'check_circle' : 'error' }}</mat-icon>
      {{ toast }}
    </div>
  `,
  styles: [`
    .pf-services { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 18px; }
    .pf-svc { position: relative; display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 14px; background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.06); overflow: hidden; transition: transform .15s; }
    .pf-svc:hover { transform: translateY(-2px); }
    .pf-svc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .pf-svc.up::before { background: linear-gradient(180deg,#00A651,#7ee787); }
    .pf-svc.down::before { background: linear-gradient(180deg,#E30613,#f57c00); }
    .pf-svc mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .pf-svc.up mat-icon { color: #00A651; animation: pfPulse 2s infinite; }
    .pf-svc.down mat-icon { color: #E30613; }
    @keyframes pfPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
    .pf-svc-name { display: block; font-weight: 800; font-size: 14px; color: #1a1a2e; }
    .pf-svc-status { font-size: 11px; font-weight: 700; letter-spacing: 1px; }
    .pf-svc.up .pf-svc-status { color: #00A651; }
    .pf-svc.down .pf-svc-status { color: #E30613; }
    .pf-volumetry { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 18px; }
    .pf-vol { position: relative; background: white; border-radius: 12px; padding: 16px 14px 14px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: transform .15s, box-shadow .15s; }
    .pf-vol:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.09); }
    .pf-vol::after { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 3px; border-radius: 0 0 4px 4px; background: linear-gradient(90deg,#E30613,#f57c00); }
    .pf-vol mat-icon { font-size: 20px; width: 20px; height: 20px; margin-bottom: 4px; }
    .pf-vol-val { display: block; font-size: 22px; font-weight: 800; color: #1a1a2e; }
    .pf-vol-lbl { font-size: 11px; color: #999; font-weight: 600; }
    .rb { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: .5px; }
    .rb-admin { background: #e3f2fd; color: #1565c0; }
    .rb-analyste { background: #f3e5f5; color: #6a1b9a; }
    .rb-superadmin { background: #fde8e8; color: #E30613; }
    .pf-inactive td { opacity: 0.5; }
    .pf-off { font-size: 10px; background: #fde8e8; color: #E30613; border-radius: 8px; padding: 2px 8px; margin-left: 6px; font-weight: 700; }
    .pf-event { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f4f4f4; }
    .pf-event:last-child { border-bottom: none; }
    .pf-event mat-icon { width: 38px; height: 38px; font-size: 19px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pf-event mat-icon.ev-import { background: #e3f2fd; color: #0072BC; }
    .pf-event mat-icon.ev-intervention { background: #ede7f6; color: #5e35b1; }
    .pf-event mat-icon.ev-ticket { background: #fff3e0; color: #f57c00; }
    .pf-event-label { display: block; font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .pf-event-meta { font-size: 11px; color: #999; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .sa-layout {
      display: flex; height: 100vh; overflow: hidden;
      font-family: 'Segoe UI', sans-serif;
      background: #f5f5f5;
    }

    /* SIDEBAR */
    .sa-sidebar {
      width: 260px; min-width: 260px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      display: flex; flex-direction: column;
      height: 100vh; overflow-y: auto;
    }
    .sa-logo {
      display: flex; align-items: center; gap: 12px;
      padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .sa-logo-img { width: 44px; height: 44px; object-fit: contain; }
    .sa-brand { display: block; font-size: 13px; font-weight: 700; color: white; }
    .sa-sub { display: block; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }
    .sa-colors {
      display: flex; height: 3px;
      span { flex: 1; }
      span:nth-child(1) { background: #E30613; }
      span:nth-child(2) { background: #FFD700; }
      span:nth-child(3) { background: #00A651; }
      span:nth-child(4) { background: #0072BC; }
    }
    .sa-nav { flex: 1; padding: 16px 12px; }
    .sa-nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: 10px;
      color: rgba(255,255,255,0.6); text-decoration: none;
      font-size: 13px; font-weight: 500; margin-bottom: 4px;
      cursor: pointer; transition: all 0.2s; position: relative;
    }
    .sa-nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .sa-nav-item.active {
      background: linear-gradient(135deg, rgba(227,6,19,0.2), rgba(227,6,19,0.1));
      color: white; border-left: 3px solid #E30613;
    }
    .sa-nav-item.active mat-icon { color: #E30613; }
    .sa-badge {
      margin-left: auto; background: #E30613; color: white;
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;
    }
    .sa-footer {
      padding: 16px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: space-between;
    }
    .sa-user { display: flex; align-items: center; gap: 10px; }
    .sa-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #E30613, #0072BC);
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; color: white; font-size: 12px; font-weight: 700;
      background-size: cover; background-position: center;
    }
    .sa-username { display: block; font-size: 12px; font-weight: 600; color: white; }
    .sa-role { display: block; font-size: 10px; color: rgba(255,255,255,0.4); }
    .sa-logout { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 6px; }
    .sa-logout:hover { color: #E30613; }

    /* HEADER */
    .sa-header {
      height: 64px; background: white;
      border-bottom: 1px solid #e8e8e8;
      display: flex; align-items: center;
      justify-content: space-between; padding: 0 28px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .sa-header h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .sa-time { font-size: 13px; color: #7f8c8d; }

    /* MAIN */
    .sa-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .sa-content { flex: 1; overflow-y: auto; padding: 24px; }

    /* KPIs */
    .sa-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .sa-kpi {
      background: white; border-radius: 16px; padding: 22px;
      display: flex; align-items: center; gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      border-left: 4px solid transparent;
    }
    .sa-kpi.red { border-left-color: #E30613; }
    .sa-kpi.red .sa-kpi-icon { background: #fde8e8; color: #E30613; }
    .sa-kpi.green { border-left-color: #00A651; }
    .sa-kpi.green .sa-kpi-icon { background: #e8f5e9; color: #00A651; }
    .sa-kpi.blue { border-left-color: #0072BC; }
    .sa-kpi.blue .sa-kpi-icon { background: #e3f2fd; color: #0072BC; }
    .sa-kpi.yellow { border-left-color: #f57c00; }
    .sa-kpi.yellow .sa-kpi-icon { background: #fff3e0; color: #f57c00; }
    .sa-kpi-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
    .sa-kpi-val { display: block; font-size: 30px; font-weight: 800; color: #1a1a2e; line-height: 1; }
    .sa-kpi-lbl { display: block; font-size: 12px; color: #7f8c8d; margin-top: 6px; }

    /* CARDS */
    .sa-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 20px; }
    .sa-card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid #f0f0f0;
      h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; }
    }
    .sa-badge-count { background: #E30613; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .sa-ticket-header-actions { display: flex; align-items: center; gap: 8px; }
    .sa-btn-del-all { background: none; border: none; cursor: pointer; color: #E30613; display: flex; align-items: center; }
    .sa-btn-del-all:hover { opacity: 0.7; }

    /* TABLE */
    .sa-table { width: 100%; border-collapse: collapse; }
    .sa-table thead tr { background: #f8f9fa; }
    .sa-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; }
    .sa-table td { padding: 13px 16px; border-bottom: 1px solid #f5f5f5; font-size: 13px; color: #2c3e50; }
    .sa-table tbody tr:hover { background: #f8faff; }

    .sa-user-cell { display: flex; align-items: center; gap: 10px; }
    .sa-mini-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #E30613, #0072BC);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 700;
      background-size: cover; background-position: center; flex-shrink: 0;
    }

    .role-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .role-admin { background: #e3f2fd; color: #0072BC; }
    .role-analyste { background: #e8f5e9; color: #00A651; }
    .role-superadmin { background: #fde8e8; color: #E30613; }

    .status-dot { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-dot.active { background: #e8f5e9; color: #00A651; }
    .status-dot.inactive { background: #fde8e8; color: #E30613; }

    .sa-actions { display: flex; gap: 4px; }

    /* CREATE FORM */
    .sa-create-form {
      padding: 24px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;
      h4 { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }
    }
    .sa-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .sa-form-group { display: flex; flex-direction: column; gap: 6px; }
    .sa-form-group label { font-size: 12px; font-weight: 600; color: #555; }
    .sa-form-group input, .sa-form-group select, .sa-form-group textarea {
      padding: 10px 14px; border: 1px solid #e0e0e0;
      border-radius: 8px; font-size: 13px; color: #1a1a2e;
      outline: none; background: white; transition: border-color 0.2s;
    }
    .sa-form-group input:focus, .sa-form-group select:focus, .sa-form-group textarea:focus { border-color: #E30613; }
    .sa-form-actions { display: flex; gap: 12px; }

    .sa-btn-primary {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #E30613; color: white;
      border: none; border-radius: 10px; font-size: 13px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .sa-btn-primary:hover { background: #c20511; }
    .sa-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .sa-btn-secondary { padding: 10px 20px; background: #f5f5f5; color: #666; border: none; border-radius: 10px; font-size: 13px; cursor: pointer; }

    /* TICKETS */
    .sa-tickets-layout { display: grid; grid-template-columns: 360px 1fr; gap: 20px; height: calc(100vh - 112px); }
    .sa-tickets-list { overflow-y: auto; display: flex; flex-direction: column; }

    .sa-selection-bar {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; background: #fde8e8;
      border-bottom: 1px solid #f5c6c6;
      font-size: 12px; font-weight: 600; color: #E30613;
    }
    .sa-btn-del-sel {
      display: flex; align-items: center; gap: 4px;
      padding: 5px 12px; background: #E30613; color: white;
      border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;
    }

    .sa-ticket-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 14px 20px; border-bottom: 1px solid #f0f0f0;
      cursor: pointer; transition: background 0.15s;
    }
    .sa-ticket-item:hover { background: #f8f9fa; }
    .sa-ticket-item.selected { background: #fde8e8; border-left: 3px solid #E30613; }
    .sa-ticket-item.checked { background: #fff3f3; }
    .sa-ticket-check { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; accent-color: #E30613; margin-top: 3px; }
    .sa-ticket-content { flex: 1; min-width: 0; }
    .sa-ticket-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .sa-ticket-subject { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .sa-ticket-meta { display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 6px; }

    .priority-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .priority-high { background: #fde8e8; color: #E30613; }
    .priority-medium { background: #fff3e0; color: #f57c00; }
    .priority-low { background: #e8f5e9; color: #00A651; }

    .ticket-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .ts-open { background: #e3f2fd; color: #0072BC; }
    .ts-in_progress { background: #fff3e0; color: #f57c00; }
    .ts-resolved { background: #e8f5e9; color: #00A651; }

    .sa-ticket-detail { display: flex; flex-direction: column; overflow: hidden; }
    .sa-ticket-detail-header {
      padding: 18px 24px; border-bottom: 1px solid #f0f0f0;
      display: flex; justify-content: space-between; align-items: flex-start;
      h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
      p { font-size: 12px; color: #999; }
    }
    .sa-ticket-actions { display: flex; align-items: center; gap: 8px; }
    .sa-ticket-actions select { padding: 8px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 12px; outline: none; }

    .sa-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; background: #f8f9fa; }
    .sa-message { display: flex; gap: 10px; align-items: flex-start; }
    .sa-message.mine { flex-direction: row-reverse; }
    .sa-msg-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #E30613, #0072BC);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 700; flex-shrink: 0; overflow: hidden;
    }
    .sa-msg-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .sa-msg-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .sa-message.mine .sa-msg-bubble { background: linear-gradient(135deg, #E30613, #c20511); color: white; }
    .sa-msg-sender { display: block; font-size: 11px; font-weight: 700; color: #999; margin-bottom: 4px; }
    .sa-message.mine .sa-msg-sender { color: rgba(255,255,255,0.7); }
    .sa-msg-bubble p { font-size: 13px; line-height: 1.5; }
    .sa-msg-time { display: block; font-size: 10px; color: #bbb; margin-top: 6px; text-align: right; }
    .sa-message.mine .sa-msg-time { color: rgba(255,255,255,0.6); }
    .sa-empty-msg { text-align: center; color: #bbb; padding: 40px; font-size: 13px; }

    .sa-reply-box { padding: 16px 20px; border-top: 1px solid #e0e0e0; display: flex; gap: 12px; align-items: flex-end; }
    .sa-reply-box textarea { flex: 1; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 13px; resize: none; outline: none; }
    .sa-reply-box textarea:focus { border-color: #E30613; }

    .sa-no-ticket { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; padding: 60px; }
    .sa-no-ticket mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
    .sa-no-ticket p { font-size: 14px; }

    /* PROFILE */
    .sa-profile-card { padding: 32px; }
    .sa-profile-header { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #f0f0f0; }
    .sa-profile-avatar-wrap { position: relative; }
    .sa-profile-avatar {
      width: 100px; height: 100px; border-radius: 50%;
      background: linear-gradient(135deg, #E30613, #0072BC);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 28px; font-weight: 700;
      background-size: cover; background-position: center;
    }
    .sa-avatar-edit {
      position: absolute; bottom: 0; right: 0;
      width: 30px; height: 30px; border-radius: 50%;
      background: #E30613; border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: white;
    }
    .sa-avatar-edit mat-icon { font-size: 16px; }
    .sa-profile-info h2 { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 8px; }
    .sa-profile-info p { font-size: 13px; color: #7f8c8d; margin-top: 6px; }

    /* EMPTY */
    .sa-empty { text-align: center; padding: 40px; color: #ccc; }
    .sa-empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .sa-empty p { font-size: 14px; }

    /* TOAST */
    .sa-toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 14px 20px; border-radius: 12px;
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 600; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    }
    .sa-toast.success { background: #e8f5e9; color: #00A651; border: 1px solid #c8e6c9; }
    .sa-toast.error { background: #fde8e8; color: #E30613; border: 1px solid #ffcdd2; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class SuperAdminComponent implements OnInit, OnDestroy {
  activeTab = 'dashboard';
  dashboardData: any = null;
  platformHealth: any = null;
  usersActivity: any[] = [];
  recentActivity: any[] = [];
  volKeys = [
    { key: 'users', label: 'Utilisateurs', icon: 'group', color: '#0072BC' },
    { key: 'batches', label: 'Batches', icon: 'folder', color: '#5e35b1' },
    { key: 'cdrs', label: 'CDR', icon: 'call', color: '#00A651' },
    { key: 'predictions', label: 'Predictions', icon: 'psychology', color: '#E30613' },
    { key: 'alerts', label: 'Alertes', icon: 'notifications', color: '#f57c00' },
    { key: 'openAlerts', label: 'Alertes ouvertes', icon: 'notification_important', color: '#E30613' },
    { key: 'tickets', label: 'Tickets', icon: 'support_agent', color: '#f57c00' },
    { key: 'interventions', label: 'Interventions', icon: 'campaign', color: '#5e35b1' },
    { key: 'activeUsers', label: 'Comptes actifs', icon: 'verified_user', color: '#00A651' }
  ];
  users: any[] = [];
  tickets: any[] = [];
  selectedTicket: any = null;
  ticketMessages: any[] = [];
  ticketReply = '';
  selectedTicketIds: number[] = [];
  showCreateForm = false;
  replyContent = '';
  unreadCount = 0;
  toast = '';
  toastType = 'success';
  now = new Date();
  currentUser: any = null;
  private pollInterval: any;

  newUser = { firstName: '', lastName: '', email: '', password: '', role: 'ADMIN', department: '' };
  profile: any = { firstName: 'Super', lastName: 'Admin', email: '', phone: '', department: '', bio: '', profilePicture: '' };

  constructor(private http: HttpClient, public authService: AuthService) {
    setInterval(() => this.now = new Date(), 1000);
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30000);
    const u = this.authService.getCurrentUser();
    if (u) { this.profile.email = u.email; }
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadPlatform(): void {
    this.http.get<any>(`${environment.apiUrl}/superadmin/platform-health`, { headers: this.headers })
      .subscribe({ next: (r) => this.platformHealth = r, error: () => {} });
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/users-activity`, { headers: this.headers })
      .subscribe({ next: (r) => this.usersActivity = r || [], error: () => {} });
    this.http.get<any[]>(`${environment.apiUrl}/superadmin/recent-activity`, { headers: this.headers })
      .subscribe({ next: (r) => this.recentActivity = r || [], error: () => {} });
  }

  get headers() {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.authService.getToken() });
  }

  loadDashboard(): void {
    this.http.get(`${environment.apiUrl}/users/superadmin/dashboard`, { headers: this.headers })
      .subscribe({ next: (d: any) => this.dashboardData = d, error: () => {} });
  }

  loadUsers(): void {
    this.http.get<any[]>(`${environment.apiUrl}/users`, { headers: this.headers })
      .subscribe({ next: (u) => this.users = u.filter((x: any) => x.role !== 'SUPERADMIN'), error: () => {} });
  }

  loadTickets(): void {
    this.http.get<any>(`${environment.apiUrl}/tickets`, { headers: this.headers })
      .subscribe({ next: (r) => { this.tickets = r.content || []; }, error: () => {} });
  }

  selectTicket(ticket: any): void {
    this.selectedTicket = { ...ticket };
    this.http.get<any>(`${environment.apiUrl}/tickets/${ticket.id}`, { headers: this.headers })
      .subscribe({
        next: (t) => {
          this.ticketMessages = t.messages || [];
          this.selectedTicket = { ...t, messages: null };
          this.http.put(`${environment.apiUrl}/tickets/${ticket.id}/read`, {}, { headers: this.headers })
            .subscribe({ next: () => { this.loadTickets(); this.loadUnreadCount(); }, error: () => {} });
        }, error: () => {}
      });
  }

  toggleTicketSelect(id: number, event: any): void {
    if (event.target.checked) {
      this.selectedTicketIds = [...this.selectedTicketIds, id];
    } else {
      this.selectedTicketIds = this.selectedTicketIds.filter(i => i !== id);
    }
  }

  deleteTicket(id: number): void {
    if (!confirm('Confirmer la suppression de ce ticket ?')) return;
    this.http.delete(`${environment.apiUrl}/tickets/${id}`, { headers: this.headers })
      .subscribe({
        next: () => {
          if (this.selectedTicket?.id === id) { this.selectedTicket = null; this.ticketMessages = []; }
          this.loadTickets();
          this.showToast('Ticket supprime', 'success');
        },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  deleteSelectedTickets(): void {
    if (!this.selectedTicketIds.length) return;
    const ids = this.selectedTicketIds.join(',');
    this.http.delete(`${environment.apiUrl}/tickets/batch?ids=${ids}`, { headers: this.headers })
      .subscribe({
        next: () => {
          this.selectedTicketIds = [];
          this.selectedTicket = null;
          this.ticketMessages = [];
          this.loadTickets();
          this.showToast('Tickets supprimes', 'success');
        },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  deleteAllTickets(): void {
    if (!confirm('Confirmer la suppression de TOUS les tickets ?')) return;
    const ids = this.tickets.map((t: any) => t.id).join(',');
    this.http.delete(`${environment.apiUrl}/tickets/batch?ids=${ids}`, { headers: this.headers })
      .subscribe({
        next: () => {
          this.selectedTicketIds = [];
          this.selectedTicket = null;
          this.ticketMessages = [];
          this.loadTickets();
          this.showToast('Tous les tickets supprimes', 'success');
        },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  sendReply(): void {
    if (!this.replyContent.trim() || !this.selectedTicket) return;
    this.http.post<any>(`${environment.apiUrl}/tickets/${this.selectedTicket.id}/messages`,
      { content: this.replyContent }, { headers: this.headers })
      .subscribe({
        next: (msg) => {
          this.ticketMessages.push(msg);
          this.replyContent = '';
          this.showToast('Reponse envoyee', 'success');
          this.loadTickets();
        }, error: () => this.showToast('Erreur envoi', 'error')
      });
  }

  updateTicketStatus(): void {
    if (!this.selectedTicket) return;
    this.http.put(`${environment.apiUrl}/tickets/${this.selectedTicket.id}/status`,
      null, { headers: this.headers, params: { status: this.selectedTicket.status } })
      .subscribe({ next: () => { this.showToast('Statut mis a jour', 'success'); this.loadTickets(); }, error: () => {} });
  }

  loadUnreadCount(): void {
    this.http.get<any>(`${environment.apiUrl}/tickets/unread-count`, { headers: this.headers })
      .subscribe({ next: (r) => this.unreadCount = r.unread || 0, error: () => {} });
  }

  loadProfile(): void {
    this.http.get<any>(`${environment.apiUrl}/users/me`, { headers: this.headers })
      .subscribe({ next: (u) => { this.profile = { ...this.profile, ...u }; this.currentUser = u; }, error: () => {} });
  }

  createUser(): void {
    this.http.post<any>(`${environment.apiUrl}/users`, this.newUser, { headers: this.headers })
      .subscribe({
        next: () => {
          this.showToast('Compte cree avec succes', 'success');
          this.showCreateForm = false;
          this.newUser = { firstName: '', lastName: '', email: '', password: '', role: 'ADMIN', department: '' };
          this.loadUsers(); this.loadDashboard();
        }, error: () => this.showToast('Erreur creation compte', 'error')
      });
  }

  toggleActive(user: any): void {
    this.http.put<any>(`${environment.apiUrl}/users/${user.id}/toggle-active`, {}, { headers: this.headers })
      .subscribe({
        next: (u) => {
          user.isActive = u.isActive;
          this.showToast(u.isActive ? 'Compte active' : 'Compte suspendu', 'success');
          this.loadDashboard();
        }, error: () => this.showToast('Erreur', 'error')
      });
  }

  deleteUser(user: any): void {
    if (!confirm('Confirmer la suppression de ' + user.firstName + ' ' + user.lastName + ' ?')) return;
    this.http.delete(`${environment.apiUrl}/users/${user.id}`, { headers: this.headers })
      .subscribe({
        next: () => { this.showToast('Utilisateur supprime', 'success'); this.loadUsers(); this.loadDashboard(); },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  saveProfile(): void {
    this.http.put<any>(`${environment.apiUrl}/users/me`, this.profile, { headers: this.headers })
      .subscribe({
        next: (u) => { this.profile = u; this.currentUser = u; this.showToast('Profil sauvegarde', 'success'); },
        error: () => this.showToast('Erreur sauvegarde', 'error')
      });
  }

  onPhotoSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.profile.profilePicture = e.target.result; };
    reader.readAsDataURL(file);
  }

  getInitials(user: any): string {
    if (!user) return '?';
    return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?';
  }

  getAvatarBg(): string {
    return this.currentUser?.profilePicture ? 'url(' + this.currentUser.profilePicture + ')' : '';
  }

  getTabTitle(): string {
    const titles: any = { dashboard: 'Dashboard Super Administration', users: 'Gestion des Utilisateurs', tickets: 'Support & Messagerie', profile: 'Mon Profil' };
    return titles[this.activeTab] || '';
  }

  showToast(msg: string, type: string): void {
    this.toast = msg; this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }

  logout(): void { this.authService.logout(); }
}
