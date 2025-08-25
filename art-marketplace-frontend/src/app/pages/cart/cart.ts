import { Component, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CartService, CartItem } from '../../services/cart.service';
import { OrderService, Order } from '../../services/order.service';
import { PaymentComponent } from '../../payment/payment'; 
import { PaymentResult } from '../../services/payment.service'; 
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

type CheckoutLine = { id: number; title: string; qty: number; price: number };
type CheckoutSummary = {
  count: number;
  total: number;
  items: CheckoutLine[];
  orderIds: number[];
  ts: string;
  paymentResult?: PaymentResult; 
  deliveryOption?: string;
  deliveryPrice?: number;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, CurrencyPipe, FormsModule,
    MatCardModule, RouterModule, MatButtonModule, MatIconModule, 
    MatSnackBarModule, MatProgressSpinnerModule, MatDialogModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartPage {
  cart = inject(CartService);
  orders = inject(OrderService);
  snack = inject(MatSnackBar);
  router = inject(Router);
  dialog = inject(MatDialog);

  loading = false;

  // Corriger openPayment pour vraiment ouvrir le modal
  async openPayment() {
    const items = await firstValueFrom(this.cart.items$);
    if (!items.length) {
      this.snack.open('Panier vide', '', { duration: 1200 });
      return;
    }

    const total = items.reduce((s, it) => s + it.price * it.qty, 0);

    // Ouvrir le modal de paiement
    const dialogRef = this.dialog.open(PaymentComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'payment-dialog'
    });

    // Passer le montant au composant
    dialogRef.componentInstance.amount = total;

    // Écouter le succès du paiement
    dialogRef.componentInstance.paymentSuccess.subscribe((paymentResult: PaymentResult) => {
      dialogRef.close();
      this.processOrdersAfterPayment(items, paymentResult);
    });

    // Écouter l'annulation
    dialogRef.componentInstance.paymentCancel.subscribe(() => {
      dialogRef.close();
      this.snack.open('Paiement annulé', '', { duration: 1500 });
    });
  }

  // Nouvelle méthode pour traiter les commandes APRÈS paiement réussi
  async processOrdersAfterPayment(items: CartItem[], paymentResult: PaymentResult) {
    this.loading = true;

    try {
      // Créer toutes les commandes
      const calls = items.flatMap(it =>
        Array.from({ length: it.qty }, () => this.orders.create(it.productId))
      );
      const results: Order[] = await Promise.all(calls.map(obs => firstValueFrom(obs)));
      const orderIds = results.map(o => o.id).filter((id): id is number => typeof id === 'number');

      const summary: CheckoutSummary = {
        count: items.reduce((n, it) => n + it.qty, 0),
        total: paymentResult.amount,
        items: items.map(it => ({ id: it.productId, title: it.title, qty: it.qty, price: it.price })),
        orderIds,
        ts: new Date().toISOString(),
        paymentResult // Inclure les détails du paiement
      };

      // Sauvegarder pour survivre à F5
      try { sessionStorage.setItem('am_last_checkout', JSON.stringify(summary)); } catch {}

      this.cart.clear();
      this.snack.open('Commande validée et payée ✅', '', { duration: 2000 });

      // Navigation avec les détails complets
      this.router.navigate(['/order/confirmation'], { state: summary });
    } catch {
      this.snack.open('Erreur lors de la création des commandes', '', { duration: 2000 });
    } finally {
      this.loading = false;
    }
  }

  // Modifier checkout pour utiliser le système de paiement
  async checkout() {
    // Rediriger vers le système de paiement
    this.openPayment();
  }

  trackById = (_: number, it: CartItem) => it.productId;
}