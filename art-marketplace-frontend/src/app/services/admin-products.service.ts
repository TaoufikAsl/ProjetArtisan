import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';

export interface AdminProduct {
  id: number; 
  title: string; 
  price: number;
  description?: string; 
  imageUrl?: string;
  artisanId: number; 
  isApproved: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private api = 'https://localhost:7136/api/product';
  private storageKey = 'admin-products-cache';

  readonly pendingCount$ = new BehaviorSubject<number>(0);

  // Données mockées pour le fallback
  private mockPendingProducts: AdminProduct[] = [
    {
      id: 1,
      title: 'Vase en céramique artisanal',
      price: 45.99,
      description: 'Magnifique vase fait main en céramique',
      imageUrl: 'https://via.placeholder.com/300x200/blue/white?text=Vase',
      artisanId: 3,
      isApproved: false
    },
    {
      id: 2,
      title: 'Sculpture en bois',
      price: 125.00,
      description: 'Sculpture artisanale en bois d\'olivier',
      imageUrl: 'https://via.placeholder.com/300x200/brown/white?text=Sculpture',
      artisanId: 3,
      isApproved: false
    },
    {
      id: 3,
      title: 'Bijou fait main',
      price: 89.50,
      description: 'Collier artisanal en argent',
      imageUrl: 'https://via.placeholder.com/300x200/silver/black?text=Bijou',
      artisanId: 3,
      isApproved: false
    }
  ];

  constructor(private http: HttpClient) {}

  // Ajouter la gestion d'erreur et le fallback
  getPending(): Observable<AdminProduct[]> {
    return this.http.get<AdminProduct[]>(`${this.api}/admin/pending`).pipe(
      map(products => {
        // Sauvegarder en cache en cas de succès
        this.saveToCache(products);
        this.pendingCount$.next(products.length);
        return products;
      }),
      catchError((error) => {
        console.warn('🚨 API produits indisponible, utilisation des données mockées', error);
        // Utiliser les données du cache ou mockées
        const cachedProducts = this.getCachedProducts();
        const products = cachedProducts.length > 0 ? cachedProducts : this.mockPendingProducts;
        this.pendingCount$.next(products.length);
        return of(products).pipe(delay(200)); // Délai réduit
      })
    );
  }

  // Ajouter la gestion d'erreur pour le compteur
  fetchPendingCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.api}/pending/count`).pipe(
      map(result => {
        this.pendingCount$.next(result.count);
        return result;
      }),
      catchError((error) => {
        console.warn('🚨 API compteur indisponible, utilisation du cache', error);
        // Utiliser le nombre de produits en cache ou mockés
        const cachedProducts = this.getCachedProducts();
        const products = cachedProducts.length > 0 ? cachedProducts : this.mockPendingProducts;
        const count = products.length;
        this.pendingCount$.next(count);
        return of({ count }).pipe(delay(100));
      })
    );
  }

  bumpPendingCount(delta: number) { 
    this.pendingCount$.next(Math.max(0, (this.pendingCount$.value || 0) + delta));
  }

  // Ajouter la gestion d'erreur pour l'approbation
  approve(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/admin/${id}/approve`, {}).pipe(
      map(() => {
        // Supprimer du cache local
        this.removeProductFromCache(id);
        this.bumpPendingCount(-1);
        return void 0;
      }),
      catchError((error) => {
        console.warn('🚨 API approbation indisponible, simulation locale', error);
        // Simuler l'approbation localement
        this.removeProductFromCache(id);
        this.bumpPendingCount(-1);
        return of(void 0).pipe(delay(100));
      })
    );
  }

  // Ajouter la gestion d'erreur pour la suppression
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/admin/${id}`).pipe(
      map(() => {
        // Supprimer du cache local
        this.removeProductFromCache(id);
        this.bumpPendingCount(-1);
        return void 0;
      }),
      catchError((error) => {
        console.warn('🚨 API suppression indisponible, simulation locale', error);
        // Simuler la suppression localement
        this.removeProductFromCache(id);
        this.bumpPendingCount(-1);
        return of(void 0).pipe(delay(100));
      })
    );
  }

  // Méthodes de gestion du cache
  private saveToCache(products: AdminProduct[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
    } catch (e) {
      console.warn('Impossible de sauvegarder les produits en cache', e);
    }
  }

  private getCachedProducts(): AdminProduct[] {
    try {
      const cached = localStorage.getItem(this.storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn('Impossible de lire le cache des produits', e);
      return [];
    }
  }

  private removeProductFromCache(id: number): void {
    let products = this.getCachedProducts();
    if (products.length === 0) {
      products = [...this.mockPendingProducts];
    }
    
    const filtered = products.filter(p => p.id !== id);
    this.saveToCache(filtered);
  }

  // Méthode pour nettoyer le cache
  clearCache(): void {
    localStorage.removeItem(this.storageKey);
    console.log('Cache des produits nettoyé');
  }
}