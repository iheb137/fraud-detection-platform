import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user_info';
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // Overlay global de transition (connexion / deconnexion)
  private transitionSubject = new BehaviorSubject<string | null>(null);
  transition$ = this.transitionSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.accessToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response));
        const first = (response as any).firstName || '';
        this.transitionSubject.next(first ? `Bienvenue, ${first} !` : 'Bienvenue !');
        setTimeout(() => {
          this.isLoggedInSubject.next(true);
          if (response.role === 'SUPERADMIN') {
            this.router.navigate(['/superadmin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
          setTimeout(() => this.transitionSubject.next(null), 450);
        }, 900);
      })
    );
  }

  logout(): void {
    this.transitionSubject.next('Deconnexion en cours...');
    setTimeout(() => {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.isLoggedInSubject.next(false);
      this.router.navigate(['/login']);
      setTimeout(() => this.transitionSubject.next(null), 450);
    }, 700);
  }

  getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }

  getCurrentUser(): AuthResponse | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  hasToken(): boolean { return !!localStorage.getItem(this.TOKEN_KEY); }
  isAdmin(): boolean { return this.getCurrentUser()?.role === 'ADMIN'; }
  isSuperAdmin(): boolean { return this.getCurrentUser()?.role === 'SUPERADMIN'; }
  isAnalyste(): boolean { return this.getCurrentUser()?.role === 'ANALYSTE'; }
}
