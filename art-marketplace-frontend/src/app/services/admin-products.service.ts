import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface AdminProduct {
  id: number; title: string; price: number;
  description?: string; imageUrl?: string;
  artisanId: number; isApproved: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private api = 'https://localhost:7136/api/product';

   readonly pendingCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {}
  getPending() { return this.http.get<AdminProduct[]>(`${this.api}/admin/pending`); }
  fetchPendingCount() { return this.http.get<{count:number}>(`${this.api}/pending/count`); }//compteur
  bumpPendingCount(delta: number) { this.pendingCount$.next(Math.max(0, (this.pendingCount$.value || 0) + delta));}
  approve(id: number) { return this.http.put<void>(`${this.api}/admin/${id}/approve`, {}); }
  remove(id: number) { return this.http.delete<void>(`${this.api}/admin/${id}`); }
}
