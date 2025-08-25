import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgFor, DatePipe } from '@angular/common'; 
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';

import { FavoritesService } from '../../../../services/favorites.service';
import { ProductService, Product } from '../../../../services/product.service';
import { OrderService } from '../../../../services/order.service';
import { ReviewService, Review } from '../../../../services/review.service';
import { AuthService } from '../../../../services/auth.service';
import { CartService } from '../../../../services/cart.service'; 

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, NgIf, 
    MatCardModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
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
  private fav = inject(FavoritesService);
  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

  }
  

  loading = true;
  product: Product | null = null;
  error: string | null = null;

  // Avis
  reviews$: Observable<Review[]> = of([]);
  adding = false;
  reviewForm = this.fb.group({
    rating: [5, [Validators.required]],
    comment: ['']
  });

  // Favori
  isFavorite = false;
  get isClient() { return this.auth.getRole() === 'Client'; }

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
          this.reviews$ = this.reviewsApi.forProduct(p.id);

          if (this.isClient) {
            this.fav.has(p.id).subscribe(isFav => {
              this.isFavorite = isFav;
              this.cdr.markForCheck();
            });
          }
        },
        error: (e) => {
          this.error = typeof e?.error === 'string' ? e.error : 'Produit introuvable.';
          this.snack.open(this.error ?? 'Erreur inconnue', '', { duration: 2000 });
        }
      });
  }

  // Commande
  order() {
    if (!this.product) return;
    this.orders.create(this.product.id).subscribe({
      next: () => this.snack.open('Commande créée ✅', '', { duration: 1500 }),
      error: () => this.snack.open('Impossible de créer la commande', '', { duration: 2000 })
    });
  }

  // Panier
  addToCart() {
    if (!this.product) return;
    
    // Utiliser la signature correcte : add(productId, title, price, qty?)
    this.cart.add(
      this.product.id,
      this.product.title,
      this.product.price,
      1
    );
    
    this.snack.open('Ajouté au panier 🛒', '', { duration: 1200 });
  }

  // Avis
  canReview(): boolean { return this.isClient; }

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
          this.reviews$ = this.reviewsApi.forProduct(this.product!.id);
        },
        error: (e) => {
          const msg = typeof e?.error === 'string' ? e.error : "Impossible d'ajouter l'avis";
          this.snack.open(msg, '', { duration: 2000 });
        }
      });
  }

  // Favori
  toggleFavorite() {
    if (!this.product || !this.isClient) return;

    const prodId = this.product.id;
    const req = this.isFavorite ? this.fav.remove(prodId) : this.fav.add(prodId);

    req.subscribe({
      next: () => {
        this.isFavorite = !this.isFavorite;
        this.snack.open(this.isFavorite ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris', '', { duration: 1200 });
        this.cdr.markForCheck();
      },
      error: () => {
        this.snack.open('Action favoris impossible', '', { duration: 1500 });
      }
    });
  }

  canOrder(): boolean { return this.isClient; }

  back() { 
    this.router.navigate(['/products']); 
  }
}