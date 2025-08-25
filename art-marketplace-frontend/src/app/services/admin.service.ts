import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';

export interface AdminUser { 
  id: number; 
  username: string; 
  role: string;
  isActive: boolean;
}

export interface AdminCreateUserDto { 
  username: string; 
  password: string; 
  role: 'Client'|'Artisan'|'DeliveryPartner'|'Admin'; 
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = 'https://localhost:7136/api/admin';
  private storageKey = 'admin-users-cache';
  private overridesKey = 'admin-users-overrides';

  
  private mockUsers: AdminUser[] = [
    { id: 1, username: 'admin', role: 'Admin', isActive: true },
    { id: 2, username: 'client1', role: 'Client', isActive: true },
    { id: 3, username: 'artisan1', role: 'Artisan', isActive: true },
    { id: 4, username: 'delivery1', role: 'DeliveryPartner', isActive: false },
    { id: 5, username: 'client2', role: 'Client', isActive: true },
  ];

  constructor(private http: HttpClient) {}
  
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`).pipe(
      map(users => {
        this.saveToCache(users);
        // ✅ TOUJOURS appliquer les overrides, même en cas de succès API
        const usersWithOverrides = this.applyLocalOverrides(users);
        return this.ensureCurrentAdminIsActive(usersWithOverrides);
      }),
      catchError((error) => {
        console.warn('🚨 API indisponible, utilisation des données en cache/mock', error);
        const cachedUsers = this.getCachedUsers();
        const users = cachedUsers.length > 0 ? cachedUsers : this.mockUsers;
        const usersWithOverrides = this.applyLocalOverrides(users);
        return of(this.ensureCurrentAdminIsActive(usersWithOverrides)).pipe(delay(300));
      })
    );
  }


private ensureCurrentAdminIsActive(users: AdminUser[]): AdminUser[] {
    // Récupérer le nom d'utilisateur connecté (vous devrez adapter selon votre AuthService)
    const currentUsername = this.getCurrentUsername();
    
    return users.map(user => {
      // Si c'est l'utilisateur connecté et qu'il est admin, le forcer comme actif
      if (user.username === currentUsername && user.role === 'Admin') {
        return { ...user, isActive: true };
      }
      return user;
    });
  }

  private getCurrentUsername(): string {
    // Adapter selon votre implémentation AuthService
    // Exemple avec localStorage
    return localStorage.getItem('username') || 'admin';
  }

  // la méthode createUser
  createUser(dto: AdminCreateUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.api}/users`, dto).pipe(
      map(user => {
        this.addUserToCache(user);
        return user;
      }),
      catchError((error) => {
        console.warn('🚨 API indisponible, création locale uniquement', error);
        const newUser: AdminUser = {
          id: Date.now(),
          username: dto.username,
          role: dto.role,
          isActive: true
        };
        this.addUserToCache(newUser);
        return of(newUser).pipe(delay(200));
      })
    );
  }

  //  la méthode deleteUser 
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`).pipe(
      map(() => {
        this.removeUserFromCache(id);
        return void 0;
      }),
      catchError((error) => {
        console.warn('🚨 API indisponible, suppression locale uniquement', error);
        this.removeUserFromCache(id);
        // ✅ Retourner immédiatement
        return of(void 0).pipe(delay(100)); // Délai réduit
      })
    );
  }

  activateUser(id: number): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.api}/users/${id}/activate`, {}).pipe(
      map(user => {
        this.updateUserInCache(user);
        return user;
      }),
      catchError((error) => {
        console.warn('🚨 API indisponible, activation locale uniquement', error);
        const updatedUser = this.updateUserStatusLocally(id, true);
        // Retourner immédiatement l'utilisateur mis à jour
        return of(updatedUser).pipe(delay(100)); // Délai réduit
      })
    );
  }

  deactivateUser(id: number): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.api}/users/${id}/deactivate`, {}).pipe(
      map(user => {
        this.updateUserInCache(user);
        return user;
      }),
      catchError((error) => {
        console.warn('🚨 API indisponible, désactivation locale uniquement', error);
        const updatedUser = this.updateUserStatusLocally(id, false);
        //  Retourner immédiatement l'utilisateur mis à jour
        return of(updatedUser).pipe(delay(100)); // Délai réduit
      })
    );
  }

  
  clearCache(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.overridesKey);
    console.log('Cache et overrides nettoyés');
  }


  private saveToCache(users: AdminUser[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(users));
    } catch (e) {
      console.warn('Impossible de sauvegarder en cache', e);
    }
  }

  private getCachedUsers(): AdminUser[] {
    try {
      const cached = localStorage.getItem(this.storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn('Impossible de lire le cache', e);
      return [];
    }
  }

  private addUserToCache(user: AdminUser): void {
    const users = this.getCachedUsers();
    users.push(user);
    this.saveToCache(users);
  }

  private updateUserInCache(updatedUser: AdminUser): void {
    const users = this.getCachedUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      this.saveToCache(users);
    }
  }

  private removeUserFromCache(id: number): void {
    let users = this.getCachedUsers();
    if (users.length === 0) {
      users = [...this.mockUsers]; // Copie des données mockées
    }
    
    const filtered = users.filter(u => u.id !== id);
    this.saveToCache(filtered);
    
    // Aussi supprimer des overrides
    const overrides = this.getLocalOverrides();
    delete overrides[id];
    this.saveLocalOverrides(overrides);
  }

  private applyLocalOverrides(users: AdminUser[]): AdminUser[] {
    const overrides = this.getLocalOverrides();
    const result = users.map(user => {
      const override = overrides[user.id];
      if (override !== undefined) {
        console.log(`🔄 Override appliqué pour user ${user.id}: ${override.isActive ? 'actif' : 'inactif'}`);
        return { ...user, isActive: override.isActive };
      }
      return user;
    });
    
    return result;
  }
 forceLocalUserStatus(id: number, isActive: boolean): void {
    const overrides = this.getLocalOverrides();
    overrides[id] = { isActive };
    this.saveLocalOverrides(overrides);
    
    // Mettre à jour le cache aussi
    const users = this.getCachedUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], isActive };
      this.saveToCache(users);
    }
  }

  private updateUserStatusLocally(id: number, isActive: boolean): AdminUser {
    const overrides = this.getLocalOverrides();
    overrides[id] = { isActive };
    this.saveLocalOverrides(overrides);
    
    // mettre à jour le cache principal
    let users = this.getCachedUsers();
    if (users.length === 0) {
      users = [...this.mockUsers];
    }
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      const updatedUser = { ...users[userIndex], isActive };
      users[userIndex] = updatedUser;
      this.saveToCache(users);
      
      return updatedUser;
    }
    
    return { id, username: `user${id}`, role: 'Client', isActive };
  }


  private saveLocalOverrides(overrides: Record<number, {isActive: boolean}>): void {
    try {
      localStorage.setItem(this.overridesKey, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Impossible de sauvegarder les overrides locaux', e);
    }
  }

  private getLocalUsers(): AdminUser[] {
    return this.mockUsers;
  }

  private getLocalOverrides(): Record<number, {isActive: boolean}> {
    try {
      const overrides = localStorage.getItem(this.overridesKey);
      return overrides ? JSON.parse(overrides) : {};
    } catch (e) {
      console.warn('Impossible de lire les overrides locaux', e);
      return {};
    }
  }

  
}