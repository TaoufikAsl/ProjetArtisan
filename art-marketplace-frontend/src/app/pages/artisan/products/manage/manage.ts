import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { ProductService, Product }from '../../../../services/product.service';

@Component({
  selector: 'app-artisan-products',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './manage.html',
  styleUrls: ['./manage.scss'],
})
export class ArtisanProductsComponent implements OnInit {
  private api = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);
  private snack = inject(MatSnackBar);

  loading = true;
  products: Product[] = [];
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.mine()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: data => this.products = data,
        error: () => this.error = 'Impossible de charger vos produits.'
      });
  }

  remove(p: Product) {
    if (!confirm(`Supprimer "${p.title}" ?`)) return;
    this.api.delete(p.id).subscribe({
      next: () => { this.snack.open('Supprimé ✅', '', { duration: 1500 }); this.load(); },
      error: () => this.snack.open('Suppression impossible', '', { duration: 2000 })
    });
  }
}import { from } from 'rxjs';

