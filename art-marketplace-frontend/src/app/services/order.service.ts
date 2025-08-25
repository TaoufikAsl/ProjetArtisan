import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type OrderStatus = 'Pending' | 'InProduction' | 'Shipped' | 'Delivered';

export interface Order {
  id: number;
  productId: number;
  clientId: number;
  artisanId: number;
  status: OrderStatus | 'PickedUp' | 'InTransit';
  orderDate: string;
}

export interface EarningsDto {
  total: number;
  ordersCount: number;
  from?: string | null;
  to?: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = 'https://localhost:7136/api/order';

  constructor(private http: HttpClient) {}

  create(productId: number) {
    return this.http.post<Order>(this.api, { productId });
  }

  myOrders() {
    return this.http.get<Order[]>(`${this.api}/mine`);
  }

  artisanOrders() {
    return this.http.get<Order[]>(`${this.api}/artisan`);
  }

  updateStatus(id: number, status: OrderStatus) {
    return this.http.put<void>(`${this.api}/${id}/status`, { status });
  }

  getArtisanEarnings(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<EarningsDto>(`${this.api}/artisan/earnings`, { params });
  }

  getDeliveryMine() {
    return this.http.get<Order[]>(`${this.api}/delivery`);
  }

  getDeliveryAvailable() {
    return this.http.get<Order[]>(`${this.api}/delivery/available`);
  }

  assignSelf(id: number) {
    return this.http.put<void>(`${this.api}/${id}/assign-self`, {});
  }

  dpUpdateStatus(id: number, status: 'PickedUp' | 'InTransit' | 'Delivered') {
    return this.http.put<void>(`${this.api}/delivery/${id}/status`, { status });
  }
}
