import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { finalize } from 'rxjs/operators';
import { OrderService, Order } from '../../../services/order.service';

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
})
export class ClientOrdersComponent implements OnInit {
  private api = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  orders: Order[] = [];
  error: string | null = null;

  ngOnInit(): void {
    this.api.myOrders()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: o => this.orders = o,
        error: () => this.error = 'Impossible de charger vos commandes.'
      });
  }
}
