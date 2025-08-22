import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { ProductService, Product } from '../../../../services/product.service';

@Component({
  selector: 'app-artisan-product-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule
  ],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
})
export class ArtisanProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ProductService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  id: number | null = null;
  loading = false;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    imageUrl: ['']
  });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    this.id = rawId ? Number(rawId) : null;

    if (this.id) {
      this.loading = true;
      this.api.get(this.id)
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: (p: Product) => this.form.patchValue({
            title: p.title,
            description: p.description || '',
            price: p.price,
            imageUrl: p.imageUrl || ''
          }),
          error: () => this.snack.open('Produit introuvable', '', { duration: 2000 })
        });
    }
  }

   save() {
    if (this.form.invalid) return;
    this.loading = true;

    // Correction 1: Typage explicite du payload
    const payload: Partial<Product> = {
      title: this.form.value.title || '',
      description: this.form.value.description || '',
      price: this.form.value.price || 0,
      imageUrl: this.form.value.imageUrl || ''
    };

    // Correction 2: Gestion séparée des cas create/update
    if (this.id) {
      // Mode édition
      this.api.update(this.id, payload)
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: () => {
            this.snack.open('Modifié ✅', '', { duration: 1500 });
            this.router.navigate(['/artisan/products']);
          },
          error: () => this.snack.open('Échec de sauvegarde', '', { duration: 2000 })
        });
    } else {
      // Mode création
      this.api.create(payload)
        .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: () => {
            this.snack.open('Créé ✅', '', { duration: 1500 });
            this.router.navigate(['/artisan/products']);
          },
          error: () => this.snack.open('Échec de sauvegarde', '', { duration: 2000 })
        });
    }
  }
}
