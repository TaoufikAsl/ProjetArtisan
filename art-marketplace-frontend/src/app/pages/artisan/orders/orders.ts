import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { OrderService, Order, OrderStatus } from '../../../services/order.service';

@Component({
  selector: 'app-artisan-orders',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
})
export class ArtisanOrdersComponent implements OnInit {
  private api = inject(OrderService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  orders: Order[] = [];
  error: string | null = null;

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.api.artisanOrders()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: o => this.orders = o,
        error: () => this.error = 'Impossible de charger les commandes.'
      });
  }

  setStatus(o: Order, status: OrderStatus) {
    this.api.updateStatus(o.id, status).subscribe({
      next: () => { this.snack.open('Statut mis à jour ✅', '', { duration: 1500 }); this.load(); },
      error: () => this.snack.open('Échec mise à jour', '', { duration: 2000 })
    });
  }
}
