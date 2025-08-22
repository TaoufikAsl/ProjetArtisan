import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

type Role = 'Artisan' | 'Client' | 'DeliveryPartner' | 'Admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Pour le cours : URL en dur (compatible avec ton backend actuel)
  private api = 'https://localhost:7136/api/auth';

  // Clé de stockage
  private tokenKey = 'am_token';

  // Etat réactif simple (ex: navbar)
  private stateSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  state$ = this.stateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // =========================
  //   APPELS API AUTH
  // =========================

  /** POST /api/auth/login -> { token } */
  login(data: { username: string; password: string }) {
    return this.http.post<{ token: string }>(`${this.api}/login`, data).pipe(
      tap(res => this.saveToken(res.token))
    );
  }

  /** POST /api/auth/register -> string (texte) */
  register(data: { username: string; password: string; role: Role }) {
    return this.http.post(`${this.api}/register`, data, { responseType: 'text' });
  }

  // =========================
  //   SESSION / TOKEN
  // =========================

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      this.stateSubject.next(false);
    }
  }

  isAuthenticated(): boolean {
    const token = this.getRawToken();
    return !!token && !this.isExpired(token);
  }

  /** Utilisée par l’interceptor HTTP pour attacher le Bearer */
  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem(this.tokenKey);
    if (token && this.isExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  }

  // =========================
  //   INFOS UTILISATEUR
  // =========================

  getUsername(): string | null {
    const p = this.decodePayload();
    // ASP.NET Core: souvent "name"; on tente "unique_name" et "sub" aussi
    return (p?.name ?? p?.unique_name ?? p?.sub ?? null) as string | null;
  }

  getRole(): Role | null {
    const p = this.decodePayload();
    // Selon la config back, le rôle peut être "role" OU le claim URI .NET
    const role =
      (p?.role as string | undefined) ??
      (p?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined);

    if (!role) return null;
    if (role === 'Artisan' || role === 'Client' || role === 'DeliveryPartner' || role === 'Admin') {
      return role;
    }
    return null;
  }

  hasRole(roles: Role[]): boolean {
    const r = this.getRole();
    return !!r && roles.includes(r);
  }

  // =========================
  //   HELPERS PRIVÉS
  // =========================

  private saveToken(token: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.tokenKey, token);
    this.stateSubject.next(true);
  }

  private getRawToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.tokenKey);
  }

  /** Décodage base64url (JWT) sans vérif crypto */
  private base64UrlDecode(input: string): string {
    // JWT = base64url ( -_/ au lieu de +/ ), pas forcément paddé
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    else if (pad !== 0) throw new Error('Invalid base64url string!');
    return atob(base64);
  }

  private decodePayload(): any | null {
    const t = this.getRawToken();
    if (!t) return null;
    try {
      const payload = t.split('.')[1];
      return JSON.parse(this.base64UrlDecode(payload));
    } catch {
      return null;
    }
  }

  /** Teste l’expiration (claim `exp` en secondes epoch) */
  private isExpired(token: string): boolean {
    try {
      const payloadStr = token.split('.')[1];
      const payload = JSON.parse(this.base64UrlDecode(payloadStr));
      if (!payload?.exp) return false; // pas d’exp -> on considère valide (pour l’examen c’est OK)
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true; // si on n’arrive pas à décoder, on considère invalide
    }
  }
}
