import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor, CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { ProductService, Product } from '../../services/product.service';
import { OrderService, Order } from '../../services/order.service';
import { EarningsService, Earnings } from '../../services/earnings.service';
import { DeliveryService, DeliveryOrder } from '../../services/delivery.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, NgIf, NgFor, CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private productsApi = inject(ProductService);
  private ordersApi = inject(OrderService);
  private earningsApi = inject(EarningsService);
  private deliveryApi = inject(DeliveryService);
  private cdr = inject(ChangeDetectorRef);

  username = this.auth.getUsername();
  role = this.auth.getRole();

  loading = true;
  error: string | null = null;

  // Artisan
  prodMine: Product[] = [];
  ordersArtisan: Order[] = [];
  earnings: Earnings | null = null;

  // Client
  ordersClient: Order[] = [];

  // Delivery Partner
  deliveries: DeliveryOrder[] = [];

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.loading = true;
    this.error = null;

    const r = this.role;

    if (r === 'Artisan') {
      // Mes produits
      this.productsApi.mine()
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: (p) => { this.prodMine = p.slice(0, 3); },
          error: () => { this.error = 'Impossible de charger vos produits.'; }
        });

      // Dernières commandes reçues (limitées à 3)
      this.ordersApi.artisanOrders().subscribe({
        next: (o) => { this.ordersArtisan = o.slice(0, 3); this.cdr.markForCheck(); },
        error: () => {  }
      });

      // Revenus
      this.earningsApi.get().subscribe({
        next: (e) => { this.earnings = e; this.cdr.markForCheck(); },
        error: () => { /* silencieux */ }
      });

    } else if (r === 'Client') {
      // Mes dernières commandes 
      this.ordersApi.myOrders()
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: (o) => { this.ordersClient = o.slice(0, 3); },
          error: () => { this.error = 'Impossible de charger vos commandes.'; }
        });

    } else if (r === 'DeliveryPartner') {
      // Mes livraisons (livreur)
      this.deliveryApi.mine()
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: (d) => { this.deliveries = d.slice(0, 5); }, // un peu plus d’items
          error: () => { this.error = 'Impossible de charger vos livraisons.'; }
        });

    } else {
      
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
