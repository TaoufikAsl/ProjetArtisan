import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AdminUser { id: number; username: string; role: string; }
export interface AdminCreateUserDto { username: string; password: string; role: 'Client'|'Artisan'|'DeliveryPartner'|'Admin'; }

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = 'https://localhost:7136/api/admin';
  constructor(private http: HttpClient) {}
  getUsers()        { return this.http.get<AdminUser[]>(`${this.api}/users`); }
  createUser(dto: AdminCreateUserDto) { return this.http.post<AdminUser>(`${this.api}/users`, dto); }
  deleteUser(id: number) { return this.http.delete<void>(`${this.api}/users/${id}`); }
}
