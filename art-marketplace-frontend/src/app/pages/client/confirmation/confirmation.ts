import { Component, inject } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-order-confirmation',
  templateUrl: './confirmation.html',
  styleUrls: ['./confirmation.scss'],
  imports: [NgIf, NgFor, CurrencyPipe, MatCardModule, MatButtonModule, RouterLink]
})
export class OrderConfirmationComponent {
  private router = inject(Router);

  summary = ((): any => {
    const nav = this.router.getCurrentNavigation();
    const st = nav?.extras?.state as any | undefined;
    if (st?.items) return st;
    try {
      const raw = sessionStorage.getItem('am_last_checkout');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();
}
