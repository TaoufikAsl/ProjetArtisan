import { Component, inject, PLATFORM_ID } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrderService } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { filter, take } from 'rxjs/operators';

type DpStatus = 'PickedUp'|'InTransit'|'Delivered';

@Component({
  standalone: true,
  host: { ngSkipHydration: '' }, // évite un état SSR figé
  selector: 'app-delivery-orders',
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
  imports: [NgIf, NgFor, CurrencyPipe, DatePipe, MatCardModule, MatButtonModule, MatSnackBarModule]
})
export class DeliveryOrdersComponent {
  private api = inject(OrderService);
  private snack = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);

  mine: any[] = [];
  available: any[] = [];
  loading = false;

  // IMPORTANT : ne pas appeler refresh() directement ici si SSR/hydratation
  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const start = () => {
      // 1) après le premier paint (le token est dispo pour l'interceptor)
      requestAnimationFrame(() => this.refresh());
      // 2) filet de sécurité : si la première passe arrive “trop tôt”, on relance une fois
      setTimeout(() => {
        if (!this.mine.length && !this.available.length) this.refresh();
      }, 300);
    };

    // Si déjà authentifié → on lance ; sinon on attend le premier true
    if (this.auth.isAuthenticated()) {
      start();
    } else {
      this.auth.state$
        .pipe(filter(Boolean), take(1))
        .subscribe(() => start());
    }
  }

  refresh() {
    this.loading = true;
    Promise.all([
      this.api.getDeliveryMine().toPromise(),
      this.api.getDeliveryAvailable().toPromise()
    ])
      .then(([mine, available]) => {
        this.mine = mine ?? [];
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
      next: () => { this.snack.open('Commande assignée', '', { duration: 1200 }); this.refresh(); },
      error: e => this.snack.open(typeof e?.error === 'string' ? e.error : 'Impossible d’assigner', '', { duration: 1500 })
    });
  }

  update(id: number, status: DpStatus) {
    this.api.dpUpdateStatus(id, status).subscribe({
      next: () => { this.snack.open('Statut mis à jour', '', { duration: 1200 }); this.refresh(); },
      error: e => this.snack.open(typeof e?.error === 'string' ? e.error : 'Échec mise à jour', '', { duration: 1500 })
    });
  }
}
