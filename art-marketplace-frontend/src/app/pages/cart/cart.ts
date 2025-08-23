import { Component, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CartService, CartItem } from '../../services/cart.service';
import { OrderService, Order } from '../../services/order.service';

type CheckoutLine = { id: number; title: string; qty: number; price: number };
type CheckoutSummary = {
  count: number;
  total: number;
  items: CheckoutLine[];
  orderIds: number[];
  ts: string;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, CurrencyPipe, FormsModule,
            MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartPage {
  cart = inject(CartService);
  orders = inject(OrderService);
  snack = inject(MatSnackBar);
  router = inject(Router);

  loading = false;

  // Checkout: crée une commande par item (répétée selon qty) en // puis redirige
  async checkout() {
    const items = await firstValueFrom(this.cart.items$);
    if (!items.length) {
      this.snack.open('Panier vide', '', { duration: 1200 });
      return;
    }
    this.loading = true;

    try {
      // créer toutes les commandes et récupérer les résultats (IDs)
      const calls = items.flatMap(it =>
        Array.from({ length: it.qty }, () => this.orders.create(it.productId))
      );
      const results: Order[] = await Promise.all(calls.map(obs => firstValueFrom(obs)));
      const orderIds = results.map(o => o.id).filter((id): id is number => typeof id === 'number');

      const total = items.reduce((s, it) => s + it.price * it.qty, 0);
      const summary: CheckoutSummary = {
        count: items.reduce((n, it) => n + it.qty, 0),
        total,
        items: items.map(it => ({ id: it.productId, title: it.title, qty: it.qty, price: it.price })),
        orderIds,
        ts: new Date().toISOString()
      };

      // pour survivre à F5
      try { sessionStorage.setItem('am_last_checkout', JSON.stringify(summary)); } catch {}

      this.cart.clear();
      this.snack.open('Commande validée ✅', '', { duration: 1500 });

      // navigation + state → rendu instantané
      this.router.navigate(['/order/confirmation'], { state: summary });
    } catch {
      this.snack.open('Échec lors du checkout', '', { duration: 2000 });
    } finally {
      this.loading = false;
    }
  }

  trackById = (_: number, it: CartItem) => it.productId;
}
