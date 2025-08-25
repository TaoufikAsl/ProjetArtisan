import { Component, inject, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Router, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

import { FavoritesService } from '../../../services/favorites.service';
import { ProductService, Product, Artisan } from '../../../services/product.service';
import { CartService } from '../../../services/cart.service';

import { debounceTime, startWith, switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatProgressSpinnerModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatIconModule, MatChipsModule, RouterModule
  ],
  templateUrl: './list.html',
  styleUrls: ['./list.scss'],
})
export class ProductsListComponent implements OnInit {
  private api = inject(ProductService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private fav = inject(FavoritesService);
  cart = inject(CartService);

  loading = false;
  products: Product[] = [];
  error: string | null = null;
  favorites = new Set<number>();
  artisans: Artisan[] = [];

  form = this.fb.group({
    q: [''],
    minPrice: [''],
    maxPrice: [''],
    category: [''],
    artisanId: [''],
    sort: ['recent' as 'recent' | 'priceAsc' | 'priceDesc']
  });

  get categories(): string[] {
    return this.api.categories;
  }

  ngOnInit(): void {
    console.log('🎯 ProductsListComponent - ngOnInit START');
    
    // harger les artisans  
    this.loadArtisans();
    
    //  Charger  favoris
    this.loadFavorites();
    
    // Configurer la réactivité du formulaire
    this.setupFormReactivity();
    
    console.log('🎯 ProductsListComponent - ngOnInit END');
  }

  private loadArtisans(): void {
    console.log('👥 Chargement des artisans...');
    this.api.getArtisans().subscribe({
      next: (artisans) => {
        this.artisans = artisans || [];
        console.log('👥 Artisans chargés:', this.artisans.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur artisans:', err);
        this.artisans = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadFavorites(): void {
    this.fav.getMine().subscribe({
      next: list => {
        this.favorites = new Set(list.map(p => p.id));
        console.log('❤️ Favoris chargés:', this.favorites.size);
      },
      error: (err) => {
        console.log('⚠️ Pas de favoris (normal si pas connecté)');
      }
    });
  }

  private setupFormReactivity(): void {
    console.log('🔄 Configuration de la réactivité du formulaire');
    
    this.form.valueChanges.pipe(
      
      startWith(this.form.value),
      tap((values) => {
        console.log('📝 Changement formulaire:', values);
        this.loading = true;
        this.error = null;
        this.cdr.detectChanges();
      }),
      debounceTime(300),
      switchMap(v => {
       
        const query: any = {};
        
        if (v.q && v.q.trim()) query.q = v.q.trim();
        if (v.minPrice && Number(v.minPrice) > 0) query.minPrice = Number(v.minPrice);
        if (v.maxPrice && Number(v.maxPrice) > 0) query.maxPrice = Number(v.maxPrice);
        if (v.category && v.category.trim()) query.category = v.category.trim();
        if (v.artisanId && Number(v.artisanId) > 0) query.artisanId = Number(v.artisanId);
        if (v.sort) query.sort = v.sort;

        console.log('🚀 Query finale envoyée au backend:', query);

        return this.api.list(query).pipe(
          catchError(err => {
            console.error('❌ Erreur API:', err);
            this.error = 'Erreur lors du chargement des produits';
            return of<Product[]>([]);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        console.log('✅ Produits reçus:', data?.length || 0);
        this.products = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur subscription:', err);
        this.loading = false;
        this.error = 'Erreur lors du chargement';
        this.products = [];
        this.cdr.detectChanges();
      }
    });
  }

  clearFilters() {
    console.log('🧹 Effacement des filtres');
    this.form.reset({
      q: '',
      minPrice: '',
      maxPrice: '',
      category: '',
      artisanId: '',
      sort: 'recent'
    });
  }

  onCategoryChange(category: string) {
    console.log('🏷️ Changement catégorie:', category);
    this.form.patchValue({ category });
  }

  onArtisanChange(artisanId: number | string) {
    console.log('👥 Changement artisan:', artisanId);
    this.form.patchValue({ artisanId: artisanId.toString() });
  }

  //  debug temporaire
  forceReload() {
    console.log('🔄 Force reload');
    this.loading = true;
    this.api.list({}).subscribe({
      next: (data) => {
        this.products = data || [];
        this.loading = false;
        this.cdr.detectChanges();
        console.log('✅ Force reload terminé:', this.products.length);
      },
      error: (err) => {
        console.error('❌ Force reload erreur:', err);
        this.loading = false;
        this.error = 'Erreur de chargement';
        this.cdr.detectChanges();
      }
    });
  }

  // UI Methods
  open(p: Product) {
    this.router.navigate(['/products', p.id]);
  }

  addToCart(p: Product) {
    this.cart.add(p.id, p.title, p.price, 1);
    this.snack.open('Ajouté au panier 🛒', '', { duration: 1200 });
  }

  isFav(p: Product) { 
    return this.favorites.has(p.id); 
  }

  toggleFav(p: Product) {
    const optimistic = !this.isFav(p);
    optimistic ? this.favorites.add(p.id) : this.favorites.delete(p.id);
    this.cdr.markForCheck();

    const req = optimistic ? this.fav.add(p.id) : this.fav.remove(p.id);
    req.subscribe({
      next: () => {
        this.snack.open(optimistic ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris', '', { duration: 1200 });
      },
      error: () => {
        optimistic ? this.favorites.delete(p.id) : this.favorites.add(p.id);
        this.cdr.markForCheck();
        this.snack.open('Action favoris impossible', '', { duration: 1500 });
      }
    });
  }

  onImageError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.visibility = 'hidden';
  }

  trackById = (_: number, p: Product) => p.id;
}