import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, HttpClientModule],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h1>Interventions</h1>
          <p>{{ isAnalyste() ? "Signalez des fraudes aux admins concernes" : "Interventions qui vous sont assignees" }}</p>
        </div>
        <button class="btn-tt" *ngIf="isAnalyste()" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> Nouvelle intervention
        </button>
      </div>

      <!-- Formulaire creation -->
      <div class="new-form card" *ngIf="showForm && isAnalyste()">
        <h3>Nouvelle intervention</h3>

        <div class="mode-toggle">
          <button type="button" [class.active]="mode==='BATCH'" (click)="mode='BATCH'">
            <mat-icon>folder</mat-icon> Batch sp&eacute;cifique
          </button>
          <button type="button" [class.active]="mode==='TARGETED'" (click)="mode='TARGETED'">
            <mat-icon>person_pin</mat-icon> Admins cibl&eacute;s
          </button>
          <button type="button" [class.active]="mode==='ALL'" (click)="mode='ALL'">
            <mat-icon>campaign</mat-icon> Tous les admins
          </button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Titre *</label>
            <input [(ngModel)]="newInt.title" placeholder="Ex: Fraude IRSF d&eacute;tect&eacute;e">
          </div>
          <div class="form-group">
            <label>Tag *</label>
            <select [(ngModel)]="newInt.tag">
              <option value="IRSF">IRSF</option>
              <option value="SIM_BOXING">SIM Boxing</option>
              <option value="WANGIRI">Wangiri</option>
              <option value="SPOOFING">Spoofing</option>
              <option value="PBX_HACKING">PBX Hacking</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priorit&eacute;</label>
            <select [(ngModel)]="newInt.priority">
              <option value="LOW">Basse</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Haute</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </div>
          <div class="form-group" *ngIf="mode === 'BATCH'">
            <label>Batch ID *</label>
            <input [(ngModel)]="newInt.batchId" type="number" placeholder="ID du batch concern&eacute;">
          </div>
        </div>

        <div class="form-group full" *ngIf="mode === 'TARGETED'">
          <label>Admins cibles * ({{ selectedAdminIds.size }} s&eacute;lectionn&eacute;(s))</label>
          <div class="admin-chips">
            <button type="button" class="admin-chip" *ngFor="let a of admins"
                    [class.active]="selectedAdminIds.has(a.id)" (click)="toggleAdmin(a.id)"
                    [title]="a.email">
              {{ a.fullName }}
              <span class="chip-mini">{{ a.openAlertCount }} alertes</span>
            </button>
          </div>
        </div>

        <div class="broadcast-hint" *ngIf="mode === 'ALL'">
          <mat-icon>info</mat-icon>
          <span>Cette intervention sera diffus&eacute;e &agrave; <strong>{{ admins.length }}</strong> admin(s) actif(s), chacun recevra sa propre copie avec discussion individuelle.</span>
        </div>

        <div class="form-group full">
          <label>Description {{ mode === 'BATCH' ? '' : '*' }}</label>
          <textarea [(ngModel)]="newInt.description" rows="3" placeholder="D&eacute;crivez la fraude d&eacute;tect&eacute;e..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" (click)="showForm = false">Annuler</button>
          <button class="btn-tt" (click)="createIntervention()">
            {{ mode === 'BATCH' ? 'Cr&eacute;er' : 'Diffuser' }}
          </button>
        </div>
      </div>

      <!-- Layout principal -->
      <div class="int-layout">
        <!-- Liste -->
        <div class="int-list card">
          <div class="int-list-header">
            <span>{{ interventions.length }} intervention(s)</span>
          </div>
          <ng-container *ngFor="let i of displayList">
            <div class="int-item"
                 [class.selected]="selectedInt?.id === i.id"
                 [class.has-unread]="i.unreadCount > 0"
                 (click)="onItemClick(i)">
              <div class="int-item-top">
                <span class="tag-badge" [class]="'tag-' + i.tag?.toLowerCase()">{{ i.tag }}</span>
                <span class="priority-badge" [class]="'p-' + i.priority?.toLowerCase()">{{ i.priority }}</span>
                <span class="group-badge" *ngIf="i._groupCount > 1">
                  <mat-icon>campaign</mat-icon> {{ i._groupCount }}
                </span>
                <span class="unread-dot" *ngIf="i.unreadCount > 0">{{ i.unreadCount }}</span>
              </div>
              <div class="int-title">{{ i.title }}</div>
              <div class="int-meta">
                <span *ngIf="i._groupCount > 1">
                  Broadcast &mdash; {{ i._groupCount }} admins
                  <mat-icon class="expand-ic">{{ expandedGroups.has(i.groupId) ? 'expand_less' : 'expand_more' }}</mat-icon>
                </span>
                <span *ngIf="!(i._groupCount > 1)">{{ isAnalyste() ? (i.assignedTo?.firstName + ' ' + i.assignedTo?.lastName) : (i.createdBy?.firstName + ' ' + i.createdBy?.lastName) }}</span>
                <span class="status-badge" *ngIf="!(i._groupCount > 1)" [class]="'s-' + i.status?.toLowerCase()">{{ i.status }}</span>
              </div>
            </div>
            <div class="group-copies" *ngIf="i._groupCount > 1 && expandedGroups.has(i.groupId)">
              <div class="copy-item" *ngFor="let c of i._copies"
                   [class.selected]="selectedInt?.id === c.id"
                   (click)="selectIntervention(c)">
                <span class="copy-name">{{ c.assignedTo?.firstName }} {{ c.assignedTo?.lastName }}</span>
                <span class="status-badge" [class]="'s-' + c.status?.toLowerCase()">{{ c.status }}</span>
                <span class="unread-dot" *ngIf="c.unreadCount > 0">{{ c.unreadCount }}</span>
              </div>
            </div>
          </ng-container>
          <div class="empty" *ngIf="interventions.length === 0">
            <mat-icon>inbox</mat-icon>
            <p>Aucune intervention</p>
          </div>
        </div>

        <!-- Detail -->
        <div class="int-detail card" *ngIf="selectedInt">
          <div class="detail-header">
            <div>
              <h3>{{ selectedInt.title }}</h3>
              <p>{{ selectedInt.description }}</p>
              <div class="detail-badges">
                <span class="tag-badge" [class]="'tag-' + selectedInt.tag?.toLowerCase()">{{ selectedInt.tag }}</span>
                <span class="priority-badge" [class]="'p-' + selectedInt.priority?.toLowerCase()">{{ selectedInt.priority }}</span>
                <span class="status-badge" [class]="'s-' + selectedInt.status?.toLowerCase()">{{ selectedInt.status }}</span>
                <span class="group-badge" *ngIf="selectedInt.groupId">
                  <mat-icon>campaign</mat-icon> Broadcast &mdash; copie de {{ selectedInt.assignedTo?.firstName }} {{ selectedInt.assignedTo?.lastName }}
                </span>
              </div>
            </div>
            <div class="detail-actions" *ngIf="!isAnalyste()">
              <select (change)="updateStatus(selectedInt.id, $any($event.target).value)">
                <option value="">Changer statut</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="ACTION_TAKEN">ACTION_TAKEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <!-- Messages -->
          <div class="messages">
            <div class="msg" *ngFor="let m of messages"
                 [class.mine]="m.sender?.email === currentUserEmail"
                 [class.theirs]="m.sender?.email !== currentUserEmail">
              <div class="msg-av">
                <img *ngIf="m.sender?.profilePicture" [src]="m.sender.profilePicture" class="av-img">
                <span *ngIf="!m.sender?.profilePicture">{{ getInitials(m.sender) }}</span>
              </div>
              <div class="msg-bubble">
                <span class="msg-name">{{ m.sender?.firstName }} {{ m.sender?.lastName }}</span>
                <p>{{ m.content }}</p>
                <span class="msg-time">{{ m.sentAt | date:'HH:mm - dd/MM' }}</span>
              </div>
            </div>
            <div class="empty-chat" *ngIf="messages.length === 0">
              <mat-icon>chat_bubble_outline</mat-icon>
              <p>Aucun message &mdash; commencez la discussion</p>
            </div>
          </div>

          <!-- Input -->
          <div class="reply-box">
            <textarea [(ngModel)]="replyContent" placeholder="Votre message..." rows="2"
                      (keydown.enter)="$event.preventDefault(); sendMessage()"></textarea>
            <button class="btn-tt" (click)="sendMessage()" [disabled]="!replyContent.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>

        <div class="no-selection card" *ngIf="!selectedInt">
          <mat-icon>forum</mat-icon>
          <p>S&eacute;lectionnez une intervention</p>
        </div>
      </div>

      <div class="toast" *ngIf="toast" [class.success]="toastType==='success'" [class.error]="toastType==='error'">
        <mat-icon>{{ toastType === 'success' ? 'check_circle' : 'error' }}</mat-icon> {{ toast }}
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .page-header p { font-size: 13px; color: #7f8c8d; }
    .card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
    .btn-tt { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#E30613,#c20511); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-cancel { padding: 10px 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: white; cursor: pointer; font-size: 13px; }

    /* Form */
    .new-form { padding: 24px; margin-bottom: 20px; }
    .new-form h3 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }
    .form-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { margin-bottom: 16px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #555; }
    .form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; outline: none; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #E30613; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }

    /* Mode toggle (1b) */
    .mode-toggle { display: flex; gap: 8px; margin-bottom: 18px; }
    .mode-toggle button {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border: 1.5px solid #e0e0e0; border-radius: 10px;
      background: white; font-size: 12px; font-weight: 600; color: #666; cursor: pointer;
      transition: all 0.15s;
    }
    .mode-toggle button mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .mode-toggle button:hover { border-color: #E30613; color: #E30613; }
    .mode-toggle button.active { background: #E30613; border-color: #E30613; color: white; }

    /* Admin chips (1b) */
    .admin-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .admin-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 14px; border: 1.5px solid #e0e0e0; border-radius: 20px;
      background: white; font-size: 12px; font-weight: 600; color: #666; cursor: pointer;
    }
    .admin-chip:hover { border-color: #E30613; color: #E30613; }
    .admin-chip.active { background: #E30613; border-color: #E30613; color: white; }
    .chip-mini { background: rgba(0,0,0,0.1); border-radius: 10px; padding: 1px 8px; font-size: 10px; }
    .admin-chip.active .chip-mini { background: rgba(255,255,255,0.25); }

    .broadcast-hint {
      display: flex; align-items: center; gap: 10px;
      background: #fff3e0; border-left: 3px solid #f57c00; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #7a4a00;
    }
    .broadcast-hint mat-icon { color: #f57c00; font-size: 18px; width: 18px; height: 18px; }

    /* Layout */
    .int-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; height: calc(100vh - 220px); }
    .int-list { display: flex; flex-direction: column; overflow-y: auto; }
    .int-list-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 12px; font-weight: 700; color: #999; text-transform: uppercase; }
    .int-item { padding: 14px 20px; border-bottom: 1px solid #f5f5f5; cursor: pointer; transition: all 0.2s; }
    .int-item:hover { background: #fafafa; }
    .int-item.selected { background: #fde8e8; border-left: 3px solid #E30613; }
    .int-item.has-unread .int-title { font-weight: 700; }
    .int-item-top { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
    .int-title { font-size: 13px; font-weight: 500; color: #1a1a2e; margin-bottom: 6px; }
    .int-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #999; }
    .int-meta span { display: inline-flex; align-items: center; gap: 4px; }
    .expand-ic { font-size: 16px; width: 16px; height: 16px; }
    .unread-dot { margin-left: auto; background: #E30613; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; }

    /* Group broadcast (1b) */
    .group-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;
      background: #ede7f6; color: #5e35b1;
    }
    .group-badge mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .group-copies { background: #fafafa; border-bottom: 1px solid #f0f0f0; }
    .copy-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px 10px 36px; cursor: pointer; font-size: 12px; color: #555;
      border-bottom: 1px dashed #eee;
    }
    .copy-item:hover { background: #f0f0f0; }
    .copy-item.selected { background: #fde8e8; }
    .copy-name { flex: 1; font-weight: 600; }

    /* Badges */
    .tag-badge { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #e3f2fd; color: #1565c0; }
    .tag-irsf { background: #fce4ec; color: #c62828; }
    .tag-sim_boxing { background: #f3e5f5; color: #6a1b9a; }
    .tag-wangiri { background: #fff3e0; color: #e65100; }
    .tag-spoofing { background: #e8f5e9; color: #2e7d32; }
    .tag-urgent { background: #E30613; color: white; }
    .priority-badge { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .p-low { background: #e8f5e9; color: #2e7d32; }
    .p-medium { background: #fff8e1; color: #f57f17; }
    .p-high { background: #fce4ec; color: #c62828; }
    .p-critical { background: #E30613; color: white; }
    .status-badge { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .s-pending { background: #fff8e1; color: #f57f17; }
    .s-in_review { background: #e3f2fd; color: #1565c0; }
    .s-action_taken { background: #e8f5e9; color: #2e7d32; }
    .s-closed { background: #f5f5f5; color: #999; }

    /* Detail */
    .int-detail { display: flex; flex-direction: column; }
    .detail-header { padding: 20px 24px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: flex-start; }
    .detail-header h3 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .detail-header p { font-size: 13px; color: #7f8c8d; margin-bottom: 8px; }
    .detail-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .detail-actions select { padding: 8px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 12px; outline: none; }

    /* Messages */
    .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; background: #f8f9fa; }
    .msg { display: flex; gap: 10px; align-items: flex-start; }
    .msg.mine { flex-direction: row-reverse; }
    .msg-av { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#E30613,#0072BC); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; flex-shrink: 0; overflow: hidden; }
    .av-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .msg-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .msg.mine .msg-bubble { background: linear-gradient(135deg,#E30613,#c20511); color: white; }
    .msg-name { display: block; font-size: 11px; font-weight: 700; color: #999; margin-bottom: 4px; }
    .msg.mine .msg-name { color: rgba(255,255,255,0.7); }
    .msg-bubble p { font-size: 13px; line-height: 1.5; }
    .msg-time { display: block; font-size: 10px; color: #bbb; margin-top: 6px; text-align: right; }
    .msg.mine .msg-time { color: rgba(255,255,255,0.6); }

    /* Reply */
    .reply-box { padding: 16px 20px; border-top: 1px solid #e0e0e0; display: flex; gap: 12px; align-items: flex-end; }
    .reply-box textarea { flex: 1; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 13px; resize: none; outline: none; }
    .reply-box textarea:focus { border-color: #E30613; }

    .no-selection { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; }
    .no-selection mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
    .empty { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #ccc; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-chat { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #ccc; }
    .empty-chat mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .toast { position: fixed; bottom: 24px; right: 24px; padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .toast.success { background: #e8f5e9; color: #00A651; }
    .toast.error { background: #fde8e8; color: #E30613; }

    body.dark-mode .card { background: #1e2130 !important; }
    body.dark-mode .int-item { border-bottom-color: rgba(255,255,255,0.05) !important; }
    body.dark-mode .int-title { color: #e8eaf0 !important; }
    body.dark-mode .messages { background: #12141f !important; }
    body.dark-mode .msg-bubble { background: #252838 !important; }
    body.dark-mode .msg-bubble p { color: #e8eaf0 !important; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .group-copies { background: #191c29 !important; }
    body.dark-mode .copy-item { color: #c0c4d0 !important; }
    body.dark-mode .mode-toggle button { background: #252838; border-color: rgba(255,255,255,0.15); color: #c0c4d0; }
    body.dark-mode .admin-chip { background: #252838; border-color: rgba(255,255,255,0.15); color: #c0c4d0; }
  `]
})
export class InterventionsComponent implements OnInit {
  interventions: any[] = [];
  displayList: any[] = [];
  selectedInt: any = null;
  messages: any[] = [];
  showForm = false;
  replyContent = '';
  toast = '';
  toastType = 'success';
  currentUserEmail = '';

  // 1b : mode de creation + cibles broadcast
  mode: 'BATCH' | 'TARGETED' | 'ALL' = 'BATCH';
  admins: any[] = [];
  selectedAdminIds = new Set<number>();
  expandedGroups = new Set<string>();

  newInt = { title: '', description: '', tag: 'IRSF', priority: 'HIGH', batchId: null as any };

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUser()?.email || '';
    this.loadInterventions();
    this.loadAdmins();
  }

  get headers() {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.authService.getToken() });
  }

  isAnalyste(): boolean { return this.authService.getCurrentUser()?.role === 'ANALYSTE'; }

  loadAdmins(): void {
    if (!this.isAnalyste()) return;
    this.http.get<any[]>(`${environment.apiUrl}/analyst/admins`, { headers: this.headers })
      .subscribe({ next: (l) => this.admins = l || [], error: () => this.admins = [] });
  }

  loadInterventions(): void {
    this.http.get<any>(`${environment.apiUrl}/interventions`, { headers: this.headers })
      .subscribe({
        next: (r) => {
          this.interventions = r.content || [];
          this.displayList = this.buildDisplayList(this.interventions);
        }, error: () => {}
      });
  }

  /** Analyste : regroupe les copies d un broadcast (meme groupId) en une seule ligne depliable. */
  buildDisplayList(items: any[]): any[] {
    if (!this.isAnalyste()) return items;
    const seen = new Map<string, any>();
    const out: any[] = [];
    for (const it of items) {
      if (it.groupId) {
        if (!seen.has(it.groupId)) {
          const rep = { ...it, _copies: [it] };
          seen.set(it.groupId, rep);
          out.push(rep);
        } else {
          seen.get(it.groupId)._copies.push(it);
        }
      } else {
        out.push(it);
      }
    }
    for (const o of out) {
      if (o._copies) {
        o._groupCount = o._copies.length;
        o.unreadCount = o._copies.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0);
      }
    }
    return out;
  }

  onItemClick(i: any): void {
    if (i._groupCount > 1) {
      if (this.expandedGroups.has(i.groupId)) { this.expandedGroups.delete(i.groupId); }
      else { this.expandedGroups.add(i.groupId); }
    } else {
      this.selectIntervention(i._copies ? i._copies[0] : i);
    }
  }

  toggleAdmin(id: number): void {
    if (this.selectedAdminIds.has(id)) { this.selectedAdminIds.delete(id); }
    else { this.selectedAdminIds.add(id); }
  }

  selectIntervention(i: any): void {
    this.selectedInt = { ...i };
    this.http.get<any>(`${environment.apiUrl}/interventions/${i.id}`, { headers: this.headers })
      .subscribe({
        next: (r) => {
          this.messages = r.messages || [];
          this.selectedInt = { ...r, messages: null };
          this.http.put(`${environment.apiUrl}/interventions/${i.id}/read`, {}, { headers: this.headers })
            .subscribe({ next: () => this.loadInterventions(), error: () => {} });
        }, error: () => {}
      });
  }

  createIntervention(): void {
    if (!this.newInt.title.trim()) { this.showToast('Titre obligatoire', 'error'); return; }

    if (this.mode === 'BATCH') {
      if (!this.newInt.batchId) { this.showToast('Batch ID obligatoire', 'error'); return; }
      this.http.post<any>(`${environment.apiUrl}/interventions`, this.newInt, { headers: this.headers })
        .subscribe({
          next: (i) => { this.afterCreate('Intervention creee'); this.selectIntervention(i); },
          error: (e) => this.showToast(e?.error?.error || 'Erreur creation', 'error')
        });
      return;
    }

    // TARGETED / ALL -> broadcast
    if (!this.newInt.description.trim()) { this.showToast('Description obligatoire', 'error'); return; }
    const body: any = {
      title: this.newInt.title,
      description: this.newInt.description,
      tag: this.newInt.tag,
      priority: this.newInt.priority
    };
    if (this.mode === 'TARGETED') {
      if (this.selectedAdminIds.size === 0) { this.showToast('Selectionnez au moins un admin', 'error'); return; }
      body.targetAdminIds = Array.from(this.selectedAdminIds);
    }
    this.http.post<any>(`${environment.apiUrl}/interventions/broadcast`, body, { headers: this.headers })
      .subscribe({
        next: (r) => this.afterCreate('Diffusee a ' + r.createdCount + ' admin(s)'),
        error: (e) => this.showToast(e?.error?.error || 'Erreur diffusion', 'error')
      });
  }

  private afterCreate(msg: string): void {
    this.showForm = false;
    this.newInt = { title: '', description: '', tag: 'IRSF', priority: 'HIGH', batchId: null };
    this.selectedAdminIds.clear();
    this.loadInterventions();
    this.showToast(msg, 'success');
  }

  sendMessage(): void {
    if (!this.replyContent.trim() || !this.selectedInt) return;
    this.http.post<any>(`${environment.apiUrl}/interventions/${this.selectedInt.id}/messages`,
      { content: this.replyContent }, { headers: this.headers })
      .subscribe({
        next: (msg) => { this.messages.push(msg); this.replyContent = ''; this.loadInterventions(); },
        error: () => this.showToast('Erreur envoi', 'error')
      });
  }

  updateStatus(id: number, status: string): void {
    if (!status) return;
    this.http.put(`${environment.apiUrl}/interventions/${id}/status?status=${status}`, {}, { headers: this.headers })
      .subscribe({ next: () => { this.loadInterventions(); if (this.selectedInt?.id === id) this.selectedInt.status = status; }, error: () => {} });
  }

  getInitials(user: any): string {
    if (!user) return '?';
    return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
  }

  showToast(msg: string, type: string): void {
    this.toast = msg; this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}