import { Component, inject, PLATFORM_ID } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrderService } from '../../../services/order.service';
import { MatDivider } from "@angular/material/divider";

type DpStatus = 'PickedUp'|'InTransit'|'Delivered';

@Component({
  standalone: true,
  host: { ngSkipHydration: '' },
  selector: 'app-delivery-orders',
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
  imports: [NgIf, NgFor, DatePipe, MatCardModule, MatButtonModule, MatSnackBarModule, MatDivider,CommonModule]
})
export class DeliveryOrdersComponent {
  private api = inject(OrderService);
  private snack = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  /** Commandes dispo (non assignées) */
  available: any[] = [];
  /** Mes livraisons actives (assignées à moi ET non Delivered) */
  mine: any[] = [];
  /** Mes livraisons terminées (status = Delivered) */
  done: any[] = [];

  loading = false;

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loading = true;
    Promise.all([
      this.api.getDeliveryMine().toPromise(),
      this.api.getDeliveryAvailable().toPromise()
    ])
    .then(([mine, available]) => {
      const m = (mine ?? []) as any[];
      this.done = m.filter(o => o.status === 'Delivered');
      this.mine = m.filter(o => o.status !== 'Delivered');
      this.available = available ?? [];
      this.loading = false;
    })
    .catch(() => {
      this.loading = false;
      this.snack.open('Erreur de chargement', '', { duration: 1500 });
    });
  }

  assign(id: number) {
    this.api.assignSelf(id).subscribe({
      next: () => { 
        this.snack.open('Commande assignée', '', { duration: 1200 }); 
        this.refresh(); 
      },
      error: e => this.snack.open(typeof e?.error === 'string' ? e.error : 'Impossible d’assigner', '', { duration: 1500 })
    });
  }

  update(id: number, status: DpStatus) {
    this.api.dpUpdateStatus(id, status).subscribe({
      next: () => { 
        this.snack.open('Statut mis à jour', '', { duration: 1200 }); 
        this.refresh(); 
      },
      error: e => this.snack.open(typeof e?.error === 'string' ? e.error : 'Échec mise à jour', '', { duration: 1500 })
    });
  }

  trackById = (_: number, o: any) => o.id;
}
