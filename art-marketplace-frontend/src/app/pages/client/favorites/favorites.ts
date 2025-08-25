import { CommonModule } from '@angular/common';
import { Component, Injectable, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { MatCardActions } from "@angular/material/card";
import { MaterialModule } from "../../../material.module";
import { ProductService, Product } from '../../../services/product.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"; // ✅ Ajouter ProductService

@Component({ 
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardActions, MaterialModule, MatProgressSpinnerModule],
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.scss']
})
export class FavoritesComponent implements OnInit {
  private readonly KEY = 'am_favorites_v1';
  private readonly isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  private productService = inject(ProductService); //  Injecter ProductService
  
  trackByPid = (_: number, product: Product) => product.id; // changer le trackBy

  private _ids$ = new BehaviorSubject<Set<number>>(this.load());
  readonly ids$ = this._ids$.asObservable();
  
  loading = false;
  favoriteProducts: Product[] = []; // Stocker les produits complets
  error: string | null = null;

  ngOnInit() {
    this.loadFavoriteProducts();
  }

  // Charger les détails des produits favoris
  loadFavoriteProducts() {
    this.loading = true;
    this.error = null;
    
    this.getMine().pipe(
      switchMap(ids => {
        if (ids.length === 0) {
          return of([]);
        }
        
        // Charger tous les produits favoris en parallèle
        const requests = ids.map(id => 
          this.productService.get(id).pipe(
            catchError(err => {
              console.warn(`Produit ${id} non trouvé:`, err);
              return of(null); // Retourner null si le produit n'existe plus
            })
          )
        );
        
        return forkJoin(requests);
      })
    ).subscribe({
      next: (products) => {
        // Filtrer les produits null (supprimés/introuvables)
        this.favoriteProducts = products.filter(p => p !== null) as Product[];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des favoris';
        this.loading = false;
        console.error('Erreur favoris:', err);
      }
    });
  }

  getMine(): Observable<number[]> {
    return this.ids$.pipe(map(set => Array.from(set)));
  }

  has(productId: number): Observable<boolean> {
    return this.ids$.pipe(map(set => set.has(productId)));
  }

  add(productId: number): Observable<void> {
    const next = new Set(this._ids$.value);
    next.add(productId);
    this.commit(next);
    this.loadFavoriteProducts(); //  Recharger après ajout
    return of(void 0);
  }

  remove(productId: number): Observable<void> {
    const next = new Set(this._ids$.value);
    next.delete(productId);
    this.commit(next);
    
    //  Mise à jour immédiate de la liste
    this.favoriteProducts = this.favoriteProducts.filter(p => p.id !== productId);
    
    return of(void 0);
  }

  toggle(productId: number): Observable<boolean> {
    const next = new Set(this._ids$.value);
    let added: boolean;
    if (next.has(productId)) {
      next.delete(productId);
      added = false;
    } else {
      next.add(productId);
      added = true;
    }
    this.commit(next);
    this.loadFavoriteProducts(); // ✅ Recharger après toggle
    return of(added);
  }

  //  Méthode pour gérer les erreurs d'image
  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  
  private commit(set: Set<number>) {
    this._ids$.next(set);
    if (!this.isBrowser) return;
    try { localStorage.setItem(this.KEY, JSON.stringify([...set])); } catch {}
  }

  private load(): Set<number> {
    if (!this.isBrowser) return new Set();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as number[];
      return new Set(arr.filter(n => Number.isFinite(n)));
    } catch {
      return new Set();
    }
  }
}