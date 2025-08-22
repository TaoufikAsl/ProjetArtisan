import { Component } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { ProductService, Product } from '../../../services/product.service';
import { ReviewService, Review } from '../../../services/review.service';

type ReviewRow = Review & {
  productTitle?: string;
};

@Component({
  selector: 'app-artisan-reviews',
  standalone: true,
  imports: [
    CommonModule, NgIf, NgFor, DatePipe, RouterLink,
    MatCardModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class ArtisanReviewsComponent {
  error: string | null = null;

  reviews$: Observable<ReviewRow[] | null>;

  constructor(
    private productsApi: ProductService,
    private reviewsApi: ReviewService
  ) {
    this.reviews$ = this.productsApi.mine().pipe(
      switchMap((products: Product[]) => {
        if (!products || products.length === 0) {
          return of([] as ReviewRow[]);
        }
        // forkJoin => requêtes parallèles sur chaque produit
        const calls = products.map(p =>
          this.reviewsApi.forProduct(p.id).pipe(
            map((rs: Review[]) =>
              rs.map(r => ({ ...r, productTitle: p.title })) 
            ),
            catchError(() => of([] as ReviewRow[])) 
          )
        );
        return forkJoin(calls).pipe(
          map(chunks => chunks.flat().sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        );
      }),
      // UI nice: spinner au 1er rendu, pas de spin infini
      startWith(null),
      catchError(err => {
        this.error = (typeof err?.error === 'string' && err.error) || 'Impossible de charger vos avis.';
        return of([] as ReviewRow[]);
      })
    );
  }
}
