import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgFor } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// Forms
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';

// Services
import { ProductService, Product } from '../../../../services/product.service';
import { OrderService } from '../../../../services/order.service';
import { ReviewService, Review } from '../../../../services/review.service';
import { AuthService } from '../../../../services/auth.service';
import { CartService } from '../../../../services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, NgIf, NgFor,
    MatCardModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    ReactiveFormsModule, FormsModule
  ],
  templateUrl: './detail.html',
  styleUrls: ['./detail.scss']
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private products = inject(ProductService);
  private orders = inject(OrderService);
  private reviewsApi = inject(ReviewService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private cart = inject(CartService);

  loading = true;
  product: Product | null = null;
  error: string | null = null;

  // ✅ on passe la liste en flux, compatible zoneless
  reviews$: Observable<Review[]> = of([]);
  adding = false;
  reviewForm = this.fb.group({
    rating: [5, [Validators.required]],
    comment: ['']
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || Number.isNaN(id)) {
      this.error = 'Produit invalide.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.products.get(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (p) => {
          this.product = p; 
          this.error = null;
          // 👉 charge les avis en Observable (pas de subscribe manuel)
          this.reviews$ = this.reviewsApi.forProduct(p.id);
        },
        error: (e) => {
          this.error = typeof e?.error === 'string' ? e.error : 'Produit introuvable.';
          this.snack.open(this.error ?? 'Erreur inconnue', '', { duration: 2000 });
        }
      });
  }

  order() {
    if (!this.product) return;
    this.orders.create(this.product.id).subscribe({
      next: () => this.snack.open('Commande créée ✅', '', { duration: 1500 }),
      error: () => this.snack.open('Impossible de créer la commande', '', { duration: 2000 })
    });
  }

  addToCart() {
  if (!this.product) return;
  this.cart.add({
    productId: this.product.id,
    title: this.product.title,
    price: this.product.price
  }, 1);
  this.snack.open('Ajouté au panier 🛒', '', { duration: 1200 });
}

  canReview(): boolean {
    return this.auth.getRole() === 'Client';
  }

  submitReview() {
    if (!this.product || this.reviewForm.invalid) return;
    this.adding = true;
    const payload = {
      productId: this.product.id,
      rating: this.reviewForm.value.rating!,
      comment: this.reviewForm.value.comment?.trim() || undefined
    };
    this.reviewsApi.create(payload)
      .pipe(finalize(() => { this.adding = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.snack.open('Avis publié ✅', '', { duration: 1500 });
          this.reviewForm.reset({ rating: 5, comment: '' });
          // 👉 refresh simple: on relit le flux
          this.reviews$ = this.reviewsApi.forProduct(this.product!.id);
        },
        error: (e) => {
          const msg = typeof e?.error === 'string' ? e.error : 'Impossible d’ajouter l’avis';
          this.snack.open(msg, '', { duration: 2000 });
        }
      });
  }


canOrder(): boolean {
  return this.auth.getRole() === 'Client';
}


  back() { this.router.navigate(['/products']); }
}
