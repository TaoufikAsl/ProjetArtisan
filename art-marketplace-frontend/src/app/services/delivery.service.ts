import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export type DeliveryStatus = 'Shipped' | 'InTransit' | 'Delivered' | 'PickedUp';

export interface DeliveryOrder {
  id: number;
  productId: number;
  artisanId: number;
  clientId: number;
  deliveryPartnerId?: number | null;
  status: DeliveryStatus | string;   // garde large pour compat avec ton enum existant
  orderDate: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private api = 'https://localhost:7136/api/order';

  constructor(private http: HttpClient) {}

  /** Commandes assignées au livreur connecté */
  mine() {
    return this.http.get<DeliveryOrder[]>(`${this.api}/delivery`).pipe(
      catchError(() => of([] as DeliveryOrder[]))
    );
  }

  /** Se “réclamer” une commande expédiée (si tu autorises ça côté back) */
  claim(id: number) {
    return this.http.put<void>(`${this.api}/${id}/assign-self`, {});
  }

  /** Mettre à jour le statut (pris en charge / en transit / livré) */
  updateStatus(id: number, status: DeliveryStatus) {
    return this.http.put<void>(`${this.api}/delivery/${id}/status`, { status });
  }

}
