import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

import { ProductService, Product } from '../../../services/product.service';
import { CartService } from '../../../services/cart.service';

import { debounceTime, startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from "../../../material.module";

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    RouterModule,
    MaterialModule
],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class ProductsListComponent {
onImageError($event: ErrorEvent) {
throw new Error('Method not implemented.');
}
  private api = inject(ProductService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  cart = inject(CartService);

  loading = false;
  products: Product[] = [];
  error: string | null = null;

  form = this.fb.group({
    q: [''],
    minPrice: [''],
    maxPrice: [''],
    sort: ['recent' as 'recent' | 'priceAsc' | 'priceDesc']
  });

  ngOnInit(): void {
    // charge la liste à l'init puis à chaque changement de filtres (debounce 300ms)
    this.form.valueChanges.pipe(
      startWith(this.form.value),
      debounceTime(300),
      switchMap(v => {
        this.loading = true;
        const query: any = {
          q: (v.q ?? '').toString().trim() || undefined,
          minPrice: v.minPrice ? Number(v.minPrice) : undefined,
          maxPrice: v.maxPrice ? Number(v.maxPrice) : undefined,
          sort: (v.sort ?? 'recent') as any
        };
        return this.api.list(query).pipe(
          catchError(err => {
            this.error = typeof err?.error === 'string' ? err.error : 'Erreur chargement produits';
            return of<Product[]>([]);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.products = data;
      this.loading = false;
      this.cdr.detectChanges(); // utile avec provideZonelessChangeDetection()
    });
  }

  open(p: Product) {
    this.router.navigate(['/products', p.id]);
  }

  addToCart(p: Product) {
    this.cart.add({ productId: p.id, title: p.title, price: p.price }, 1);
    this.snack.open('Ajouté au panier', '', { duration: 1200 });
  }

  trackById = (_: number, p: Product) => p.id;
}
