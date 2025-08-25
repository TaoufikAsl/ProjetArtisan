import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, finalize } from 'rxjs/operators';

import { ReviewService, ReviewWithRefs, ArtisanResponseRequest } from '../../../services/review.service';

type ReviewRow = ReviewWithRefs & {
  productTitle?: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
};

@Component({
  selector: 'app-artisan-reviews',
  standalone: true,
  imports: [
    CommonModule, NgIf, NgFor, DatePipe, RouterLink, ReactiveFormsModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatExpansionModule
  ],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class ArtisanReviewsComponent {
  private reviewsApi = inject(ReviewService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  error: string | null = null;
  reviews$: Observable<ReviewRow[] | null>;

  // Formulaires pour les réponses
  responseForms = new Map<number, any>();

  constructor() {
    console.log('🔄 Chargement des avis artisan...');
    
    // ✅ Utiliser directement l'API artisan au lieu de products.mine()
    this.reviews$ = this.reviewsApi.artisan().pipe(
      map((reviews: ReviewWithRefs[]) => {
        console.log('📦 Avis reçus du backend:', reviews);
        
        if (!reviews || reviews.length === 0) {
          console.log('ℹ️ Aucun avis trouvé');
          return [];
        }

        const reviewRows: ReviewRow[] = reviews.map(r => ({
          ...r,
          productTitle: r.product?.title || `Produit #${r.productId}`,
          isEditing: false,
          isSubmitting: false
        }));

        console.log('✅ Reviews transformées:', reviewRows);
        this.initializeForms(reviewRows);
        return reviewRows;
      }),
      startWith(null),
      catchError(err => {
        console.error('❌ Erreur chargement avis:', err);
        this.error = (typeof err?.error === 'string' && err.error) || 'Impossible de charger vos avis.';
        return of([] as ReviewRow[]);
      })
    );
  }

  // Initialiser les formulaires pour chaque avis
  private initializeForms(reviews: ReviewRow[]) {
    console.log('🎨 Initialisation des formulaires pour', reviews.length, 'avis');
    
    reviews.forEach(review => {
      // Calculer hasResponse côté frontend
      review.hasResponse = !!(review.artisanResponse && review.artisanResponse.trim());
      console.log(`📝 Avis ${review.id}: hasResponse=${review.hasResponse}, response="${review.artisanResponse}"`);
      
      if (!this.responseForms.has(review.id)) {
        this.responseForms.set(review.id, this.fb.group({
          response: [review.artisanResponse || '', [Validators.required, Validators.minLength(2)]]
        }));
      }
    });
  }

  // Obtenir le formulaire de réponse
  getResponseForm(reviewId: number) {
    if (!this.responseForms.has(reviewId)) {
      this.responseForms.set(reviewId, this.fb.group({
        response: ['', [Validators.required, Validators.minLength(2)]]
      }));
    }
    return this.responseForms.get(reviewId)!;
  }
  
  isFormValid(reviewId: number): boolean {
    const form = this.responseForms.get(reviewId);
    return form ? form.valid : false;
  }

  isFormInvalid(reviewId: number): boolean {
    const form = this.responseForms.get(reviewId);
    return form ? form.invalid : true;
  }

  // Basculer le mode édition
  toggleEdit(review: ReviewRow) {
    console.log('✏️ Toggle edit pour avis', review.id);
    review.isEditing = !review.isEditing;
    
    if (review.isEditing) {
      const form = this.getResponseForm(review.id);
      form.patchValue({ response: review.artisanResponse || '' });
    }
    
    this.cdr.detectChanges();
  }

saveResponse(review: ReviewRow) {
  console.log('💾 Sauvegarde réponse pour avis', review.id);
  
  const form = this.getResponseForm(review.id);
  if (form.invalid) {
    console.log('❌ Formulaire invalide:', form.errors);
    this.snack.open('Veuillez saisir une réponse valide (min. 2 caractères)', '', { duration: 3000 });
    return;
  }

  console.log('✅ Formulaire valide, envoi requête...');
  review.isSubmitting = true;
  this.cdr.detectChanges();

  const data: ArtisanResponseRequest = {
    response: form.value.response.trim()
  };

  console.log('📤 Data à envoyer:', data);

  // ✅ SOLUTION TEMPORAIRE : Toujours utiliser upsert
  const request = this.reviewsApi.upsertResponse(review.id, data);

  // ✅ SOLUTION ALTERNATIVE : Logique intelligente
  // const request = review.hasResponse 
  //   ? this.reviewsApi.updateResponse(review.id, data)
  //   : this.reviewsApi.addResponse(review.id, data);

  request.pipe(
    finalize(() => {
      console.log('🔚 Requête terminée');
      review.isSubmitting = false;
      this.cdr.detectChanges();
    })
  ).subscribe({
    next: (updatedReview) => {
      console.log('✅ Réponse sauvegardée:', updatedReview);
      review.artisanResponse = updatedReview.artisanResponse;
      review.artisanResponseDate = updatedReview.artisanResponseDate;
      review.hasResponse = true;
      review.isEditing = false;
      
      this.snack.open('Réponse sauvegardée ✅', '', { duration: 2000 });
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('❌ Erreur sauvegarde:', err);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.status === 404) {
        errorMessage = 'Avis non trouvé';
      } else if (err.status === 400 && err.error?.includes('déjà répondu')) {
        errorMessage = 'Vous avez déjà répondu. Utilisez "Modifier" à la place.';
      }
      
      this.snack.open(errorMessage, '', { duration: 5000 });
    }
  });
}

  // Supprimer la réponse
  deleteResponse(review: ReviewRow) {
    if (!confirm('Supprimer votre réponse ?')) return;

    console.log('🗑️ Suppression réponse pour avis', review.id);
    review.isSubmitting = true;
    this.cdr.detectChanges();

    this.reviewsApi.deleteResponse(review.id).pipe(
      finalize(() => {
        review.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        console.log('✅ Réponse supprimée');
        review.artisanResponse = undefined;
        review.artisanResponseDate = undefined;
        review.hasResponse = false;
        review.isEditing = false;
        
        this.snack.open('Réponse supprimée', '', { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur suppression:', err);
        this.snack.open('Erreur lors de la suppression', '', { duration: 3000 });
      }
    });
  }

  // Annuler l'édition
  cancelEdit(review: ReviewRow) {
    review.isEditing = false;
    this.cdr.detectChanges();
  }
}