import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { ProductService, Product } from '../../../services/product.service';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class ProductsListComponent implements OnInit {
  private api = inject(ProductService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  products: Product[] = [];
  error: string | null = null;

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (data) => { this.products = data; this.loading = false; this.cdr.markForCheck(); },
      error: (err) => {
        this.error = typeof err?.error === 'string' ? err.error : 'Erreur chargement produits';
        this.loading = false;
        this.cdr.markForCheck(); // refresh
      }
    });
  }

  open(p: Product) {
    this.router.navigate(['/products', p.id]);
  }
}
