import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

type CheckoutLine = { id: number; title: string; qty: number; price: number };
type CheckoutSummary = {
  count: number;
  total: number;
  items: CheckoutLine[];
  orderIds?: number[];
  ts: string;
};

@Component({
  standalone: true,
  selector: 'app-order-confirmation',
  templateUrl: './confirmation.html',
  styleUrls: ['./confirmation.scss'],
  imports: [NgIf, NgFor, CurrencyPipe, MatCardModule, MatButtonModule, RouterLink]
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);

  summary: CheckoutSummary | null = null;

  ngOnInit(): void {
    // 1) état passé par le router (immédiat après checkout)
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state as CheckoutSummary | undefined) ?? null;

    if (state?.items?.length) {
      this.summary = state;
      return;
    }

    // 2) fallback F5 : lire depuis le storage et nettoyer
    try {
      const raw = sessionStorage.getItem('am_last_checkout');
      if (raw) {
        const saved = JSON.parse(raw) as CheckoutSummary;
        if (saved?.items?.length) this.summary = saved;
      }
      sessionStorage.removeItem('am_last_checkout');
    } catch {
      /* no-op */
    }
  }
}
