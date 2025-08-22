import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type OrderStatus = 'Pending' | 'InProduction' | 'Shipped' | 'Delivered';

export interface Order {
  id: number;
  productId: number;
  clientId: number;
  artisanId: number;
  status: OrderStatus;
  orderDate: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = 'https://localhost:7136/api/order';

  constructor(private http: HttpClient) {}

  create(productId: number) {                 // Client: passer commande
    return this.http.post<Order>(this.api, { productId });
  }
  myOrders() {                                // Client: mes commandes
    return this.http.get<Order[]>(`${this.api}/mine`);
  }
  artisanOrders() {                           // Artisan: commandes reçues
    return this.http.get<Order[]>(`${this.api}/artisan`);
  }
  updateStatus(id: number, status: OrderStatus) { // Artisan: changer statut
    return this.http.put<void>(`${this.api}/${id}/status`, { status });
  }


  // Livreur: mes livraisons
getDeliveryMine() {
  return this.http.get<any[]>(`${this.api}/delivery`);
}
// Livreur: livraisons disponibles (non assignées)
getDeliveryAvailable() {
  return this.http.get<any[]>(`${this.api}/delivery/available`);
}
// Livreur: s'auto-assigner
assignSelf(id: number) {
  return this.http.put<void>(`${this.api}/${id}/assign-self`, {});
}
// Livreur: mettre à jour statut (PickedUp | InTransit | Delivered)
dpUpdateStatus(id: number, status: 'PickedUp'|'InTransit'|'Delivered') {
  return this.http.put<void>(`${this.api}/delivery/${id}/status`, { status });
}

}

