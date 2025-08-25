import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { finalize, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { OrderService, Order } from '../../../services/order.service';

interface OrderWithProduct extends Order {
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
  productDescription?: string;
}

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, RouterModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
})
export class ClientOrdersComponent implements OnInit {
  private api = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  orders: OrderWithProduct[] = [];
  error: string | null = null;

  // Données mockées pour les produits
  private mockProducts = new Map([
    [1, { title: 'Vase en céramique', price: 45.99, image: 'https://via.placeholder.com/300x200/blue/white?text=Vase', description: 'Vase artisanal en céramique' }],
    [2, { title: 'Sculpture en bois', price: 125.00, image: 'https://via.placeholder.com/300x200/brown/white?text=Sculpture', description: 'Sculpture en bois d\'olivier' }],
    [3, { title: 'Bijou fait main', price: 89.50, image: 'https://via.placeholder.com/300x200/silver/black?text=Bijou', description: 'Collier artisanal en argent' }],
  ]);

  ngOnInit(): void {
    this.api.myOrders()
      .pipe(
        map(orders => 
          orders.map(order => {
            const product = this.mockProducts.get(order.productId);
            return {
              ...order,
              productTitle: product?.title,
              productPrice: product?.price,
              productImage: product?.image,
              productDescription: product?.description
            } as OrderWithProduct;
          })
        ),
        catchError(err => {
          console.error('Erreur chargement commandes:', err);
          this.error = 'Impossible de charger vos commandes.';
          return of([]);
        }),
        finalize(() => { 
          this.loading = false; 
          this.cdr.markForCheck(); 
        })
      )
      .subscribe({
        next: (orders) => {
          this.orders = orders;
        }
      });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  }
}