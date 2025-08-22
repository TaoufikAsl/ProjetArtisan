import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface Earnings {
  total: number;
  ordersCount: number;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class EarningsService {
private api = 'https://localhost:7136/api/order/artisan/earnings';
  constructor(private http: HttpClient) {}

  get(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<Earnings>(this.api, { params });
  }
}
