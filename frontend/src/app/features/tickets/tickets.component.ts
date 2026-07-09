import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tickets',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="tickets-page">
      <div class="page-header">
        <div>
          <h1>Support & Messagerie</h1>
          <p>Contactez le Super Administrateur pour toute intervention</p>
        </div>
        <button class="btn-new-ticket" (click)="showNewTicket = !showNewTicket">
          <mat-icon>add</mat-icon> Nouveau ticket
        </button>
      </div>

      <!-- New Ticket Form -->
      <div class="card new-ticket-form" *ngIf="showNewTicket">
        <h3>Nouveau ticket de support</h3>
        <div class="nt-form">
          <div class="form-group">
            <label>Sujet</label>
            <input [(ngModel)]="newTicket.subject" placeholder="Decrivez brievement le probleme">
          </div>
          <div class="form-group">
            <label>Priorite</label>
            <select [(ngModel)]="newTicket.priority">
              <option value="LOW">Faible</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Haute</option>
            </select>
          </div>
          <div class="form-group full">
            <label>Description</label>
            <textarea [(ngModel)]="newTicket.description" rows="4" placeholder="Decrivez le probleme en detail..."></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-submit" (click)="createTicket()">
            <mat-icon>send</mat-icon> Soumettre
          </button>
          <button class="btn-cancel" (click)="showNewTicket = false">Annuler</button>
        </div>
      </div>

      <!-- Tickets Layout -->
      <div class="tickets-layout">
        <!-- Liste -->
        <div class="card tickets-list">
          <div class="tl-header">
            <h3>Mes tickets</h3>
            <span class="tl-count">{{ tickets.length }}</span>
          </div>
          <div class="tickets-actions" *ngIf="selectedIds.length > 0">
            <span>{{ selectedIds.length }} selectionne(s)</span>
            <button class="btn-delete-sel" (click)="deleteSelected()">
              <mat-icon>delete</mat-icon> Supprimer selection
            </button>
            <button class="btn-delete-all" (click)="deleteAll()">
              <mat-icon>delete_sweep</mat-icon> Supprimer tout
            </button>
          </div>
          <div class="ticket-item" *ngFor="let t of tickets"
               [class.selected]="selectedTicket?.id === t.id"
               [class.has-unread]="t.unreadCount > 0"
               [class.checked]="selectedIds.includes(t.id)">
            <input type="checkbox" class="ticket-check"
                   [checked]="selectedIds.includes(t.id)"
                   (change)="toggleSelect(t.id, $event)"
                   (click)="$event.stopPropagation()">
            <div class="ti-content" (click)="selectTicket(t)">
              <div class="ti-top">
                <span class="ti-subject">{{ t.subject }}</span>
                <span class="unread-dot" *ngIf="t.unreadCount > 0">{{ t.unreadCount }}</span>
                <span class="priority-dot" [class]="'p-' + t.priority?.toLowerCase()">{{ t.priority }}</span>
              </div>
              <div class="ti-bottom">
                <span class="ti-date">{{ t.createdAt | date:'dd/MM HH:mm' }}</span>
                <span class="ti-status" [class]="'s-' + t.status?.toLowerCase()">{{ t.status }}</span>
              </div>
            </div>
          </div>
          <div class="empty-tickets" *ngIf="tickets.length === 0">
            <mat-icon>inbox</mat-icon>
            <p>Aucun ticket</p>
          </div>
        </div>

        <!-- Detail -->
        <div class="card ticket-chat" *ngIf="selectedTicket">
          <div class="chat-header">
            <div>
              <h3>{{ selectedTicket.subject }}</h3>
              <span class="priority-dot" [class]="'p-' + selectedTicket.priority?.toLowerCase()">{{ selectedTicket.priority }}</span>
              <span class="ti-status ml" [class]="'s-' + selectedTicket.status?.toLowerCase()">{{ selectedTicket.status }}</span>
            </div>
          </div>
          <div class="chat-desc" *ngIf="selectedTicket.description">
            <mat-icon>info_outline</mat-icon>
            <p>{{ selectedTicket.description }}</p>
          </div>
          <div class="chat-messages">
            <div class="chat-msg" *ngFor="let msg of messages"
                 [class.mine]="msg.sender?.email === currentUserEmail"
                 [class.theirs]="msg.sender?.email !== currentUserEmail">
              <div class="msg-avatar">
                <img *ngIf="msg.sender?.profilePicture" [src]="msg.sender.profilePicture" class="msg-avatar-img" alt="">
                <span *ngIf="!msg.sender?.profilePicture">{{ getInitials(msg.sender) }}</span>
              </div>
              <div class="msg-bubble">
                <span class="msg-sender">{{ msg.sender?.firstName }} {{ msg.sender?.lastName }}</span>
                <p>{{ msg.content }}</p>
                <span class="msg-time">{{ msg.sentAt | date:'HH:mm — dd/MM' }}</span>
              </div>
            </div>
            <div class="chat-empty" *ngIf="messages.length === 0">
              <p>Aucun message — commencez la conversation</p>
            </div>
          </div>
          <div class="chat-input">
            <textarea [(ngModel)]="replyContent" placeholder="Votre message..." rows="2"></textarea>
            <button class="btn-send" (click)="sendMessage()" [disabled]="!replyContent.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>

        <div class="card no-ticket-selected" *ngIf="!selectedTicket">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>Selectionnez un ticket ou creez-en un nouveau</p>
        </div>
      </div>

      <div class="toast" *ngIf="toast" [class.success]="toastType==='success'" [class.error]="toastType==='error'">
        <mat-icon>{{ toastType === 'success' ? 'check_circle' : 'error' }}</mat-icon>
        {{ toast }}
      </div>
    </div>
  `,
  styles: [`
    .tickets-page { max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .page-header p { color: #7f8c8d; font-size: 14px; }
    .btn-new-ticket {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 20px; background: #E30613; color: white;
      border: none; border-radius: 10px; font-size: 13px;
      font-weight: 600; cursor: pointer;
    }

    .new-ticket-form { padding: 24px; margin-bottom: 20px; }
    .new-ticket-form h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
    .nt-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 12px; font-weight: 600; color: #555; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 14px; border: 1px solid #e0e0e0;
      border-radius: 8px; font-size: 13px; outline: none;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #E30613; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-submit { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: #E30613; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-cancel { padding: 10px 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; font-size: 13px; }

    .tickets-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; height: calc(100vh - 200px); }
    .card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }

    .tickets-list { display: flex; flex-direction: column; }
    .tl-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
    .tl-header h3 { font-size: 14px; font-weight: 700; color: #1a1a2e; }
    .tl-count { background: #E30613; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }

    .tickets-actions { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fde8e8; border-bottom: 1px solid #f5c6c6; font-size: 12px; font-weight: 600; color: #E30613; flex-wrap: wrap; }
    .btn-delete-sel, .btn-delete-all { display: flex; align-items: center; gap: 4px; padding: 5px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .btn-delete-sel { background: #E30613; color: white; }
    .btn-delete-all { background: #1a1a2e; color: white; }

    .ticket-item { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; }
    .ticket-item:hover { background: #f8f9fa; }
    .ticket-item.selected { background: #fde8e8; border-left: 3px solid #E30613; }
    .ticket-item.has-unread .ti-subject { font-weight: 700; }
    .ticket-item.checked { background: #fff3f3; }
    .ticket-check { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; accent-color: #E30613; }
    .ti-content { flex: 1; min-width: 0; }
    .unread-dot { background: #E30613; color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: auto; margin-right: 6px; }

    .ti-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 6px; }
    .ti-subject { font-size: 13px; font-weight: 500; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ti-bottom { display: flex; justify-content: space-between; align-items: center; }
    .ti-date { font-size: 11px; color: #999; }

    .priority-dot { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .p-low { background: #e8f5e9; color: #2e7d32; }
    .p-medium { background: #fff8e1; color: #f57f17; }
    .p-high { background: #fce4ec; color: #c62828; }

    .ti-status { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .ti-status.ml { margin-left: 8px; }
    .s-open { background: #e3f2fd; color: #1565c0; }
    .s-in_progress { background: #fff8e1; color: #f57f17; }
    .s-resolved { background: #e8f5e9; color: #2e7d32; }

    .empty-tickets { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #ccc; }
    .empty-tickets mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-tickets p { font-size: 13px; }

    .ticket-chat { display: flex; flex-direction: column; }
    .chat-header { padding: 18px 24px; border-bottom: 1px solid #f0f0f0; }
    .chat-header h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    .chat-desc { display: flex; align-items: flex-start; gap: 8px; padding: 12px 24px; background: #f8f9fa; border-bottom: 1px solid #f0f0f0; }
    .chat-desc mat-icon { color: #0072BC; font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .chat-desc p { font-size: 13px; color: #666; line-height: 1.5; }

    .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; background: #f8f9fa; }
    .chat-msg { display: flex; gap: 10px; align-items: flex-start; }
    .chat-msg.mine { flex-direction: row-reverse; }
    .msg-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #E30613, #0072BC);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 700; flex-shrink: 0;
      overflow: hidden;
    }
    .msg-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .msg-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .chat-msg.mine .msg-bubble { background: linear-gradient(135deg, #E30613, #c20511); color: white; }
    .msg-sender { display: block; font-size: 11px; font-weight: 700; color: #999; margin-bottom: 4px; }
    .chat-msg.mine .msg-sender { color: rgba(255,255,255,0.7); }
    .msg-bubble p { font-size: 13px; line-height: 1.5; }
    .msg-time { display: block; font-size: 10px; color: #bbb; margin-top: 4px; text-align: right; }
    .chat-msg.mine .msg-time { color: rgba(255,255,255,0.6); }
    .chat-empty { text-align: center; color: #bbb; padding: 40px; font-size: 13px; }

    .chat-input { display: flex; gap: 12px; align-items: flex-end; padding: 16px 20px; border-top: 1px solid #e0e0e0; }
    .chat-input textarea { flex: 1; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 13px; resize: none; outline: none; }
    .chat-input textarea:focus { border-color: #E30613; }
    .btn-send {
      width: 44px; height: 44px; border-radius: 50%;
      background: #E30613; border: none; color: white;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .btn-send:disabled { opacity: 0.4; cursor: not-allowed; }

    .no-ticket-selected { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; padding: 60px; }
    .no-ticket-selected mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
    .no-ticket-selected p { font-size: 14px; }

    .toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 14px 20px; border-radius: 12px;
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 600; z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    .toast.success { background: #e8f5e9; color: #00A651; }
    .toast.error { background: #fde8e8; color: #E30613; }

    body.dark-mode .new-ticket-form { background: #1e2130 !important; }
    body.dark-mode .new-ticket-form h3 { color: #e8eaf0 !important; }
    body.dark-mode .tickets-list { background: #1e2130 !important; }
    body.dark-mode .ticket-chat { background: #1e2130 !important; }
    body.dark-mode .chat-header h3 { color: #e8eaf0 !important; }
    body.dark-mode .ti-subject { color: #e8eaf0 !important; }
    body.dark-mode .chat-messages { background: #12141f !important; }
    body.dark-mode .msg-bubble { background: #252838 !important; }
    body.dark-mode .msg-bubble p { color: #e8eaf0 !important; }
    body.dark-mode .form-group input, body.dark-mode .form-group select, body.dark-mode .form-group textarea { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; color: #e8eaf0 !important; }
    body.dark-mode .chat-input textarea { background: #252838 !important; border-color: rgba(255,255,255,0.1) !important; color: #e8eaf0 !important; }
    body.dark-mode .page-header h1 { color: #e8eaf0 !important; }
    body.dark-mode .page-header p { color: #8b92a8 !important; }
  `]
})
export class TicketsComponent implements OnInit {
  tickets: any[] = [];
  selectedTicket: any = null;
  messages: any[] = [];
  selectedIds: number[] = [];
  showNewTicket = false;
  replyContent = '';
  toast = '';
  toastType = 'success';
  currentUserEmail = '';

  newTicket = { subject: '', description: '', priority: 'MEDIUM' };

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUser()?.email || '';
    this.loadTickets();
  }

  get headers() {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.authService.getToken() });
  }

  loadTickets(): void {
    this.http.get<any>(`${environment.apiUrl}/tickets`, { headers: this.headers })
      .subscribe({ next: (r) => this.tickets = r.content || [], error: () => {} });
  }

  toggleSelect(id: number, event: any): void {
    if (event.target.checked) {
      this.selectedIds = [...this.selectedIds, id];
    } else {
      this.selectedIds = this.selectedIds.filter(i => i !== id);
    }
  }

  deleteSelected(): void {
    if (!this.selectedIds.length) return;
    const ids = this.selectedIds.join(',');
    this.http.delete(`${environment.apiUrl}/tickets/batch?ids=${ids}`, { headers: this.headers })
      .subscribe({
        next: () => {
          this.selectedIds = [];
          this.selectedTicket = null;
          this.messages = [];
          this.loadTickets();
          this.showToast('Tickets supprimes', 'success');
        },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  deleteAll(): void {
    if (!this.tickets.length) return;
    const ids = this.tickets.map((t: any) => t.id).join(',');
    this.http.delete(`${environment.apiUrl}/tickets/batch?ids=${ids}`, { headers: this.headers })
      .subscribe({
        next: () => {
          this.selectedIds = [];
          this.selectedTicket = null;
          this.messages = [];
          this.loadTickets();
          this.showToast('Tous les tickets supprimes', 'success');
        },
        error: () => this.showToast('Erreur suppression', 'error')
      });
  }

  selectTicket(ticket: any): void {
    this.selectedTicket = { ...ticket };
    this.http.get<any>(`${environment.apiUrl}/tickets/${ticket.id}`, { headers: this.headers })
      .subscribe({
        next: (t) => {
          this.messages = t.messages || [];
          this.selectedTicket = { ...t, messages: null };
          this.http.put(`${environment.apiUrl}/tickets/${ticket.id}/read`, {}, { headers: this.headers })
            .subscribe({ next: () => { this.loadTickets(); }, error: () => {} });
        },
        error: () => {}
      });
  }

  createTicket(): void {
    if (!this.newTicket.subject.trim()) return;
    this.http.post<any>(`${environment.apiUrl}/tickets`, this.newTicket, { headers: this.headers })
      .subscribe({
        next: (t) => {
          this.tickets.unshift(t);
          this.showNewTicket = false;
          this.newTicket = { subject: '', description: '', priority: 'MEDIUM' };
          this.showToast('Ticket cree avec succes', 'success');
          this.selectTicket(t);
        }, error: () => this.showToast('Erreur creation ticket', 'error')
      });
  }

  sendMessage(): void {
    if (!this.replyContent.trim() || !this.selectedTicket) return;
    this.http.post<any>(`${environment.apiUrl}/tickets/${this.selectedTicket.id}/messages`,
      { content: this.replyContent }, { headers: this.headers })
      .subscribe({
        next: (msg) => { this.messages.push(msg); this.replyContent = ''; },
        error: () => this.showToast('Erreur envoi', 'error')
      });
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
