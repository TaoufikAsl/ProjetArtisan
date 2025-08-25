import { Injectable, inject } from '@angular/core'; 
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, finalize, tap } from 'rxjs/operators'; 

export interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  artisanId: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  artisan?: { id: number; username: string };
}

export type SortKey = 'priceAsc' | 'priceDesc' | 'recent';

export interface ProductQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
  skip?: number;
  take?: number;
  category?: string;
  artisanId?: number;
}

export interface Artisan {
  id: number;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient); 
  private api = 'https://localhost:7136/api/product'; 
  
  readonly categories: string[] = [
    'Céramique', 'Bijoux', 'Textile', 'Bois', 'Métal', 'Verre', 'Cuir', 'Papier',
    'Pierre', 'Peinture', 'Sculpture', 'Poterie', 'Maroquinerie', 'Ébénisterie',
    'Ferronnerie', 'Verrerie', 'Broderie', 'Tricot', 'Crochet', 'Origami', 'Autre'
  ];

  list(params: ProductQuery = {}): Observable<Product[]> {
    console.log('🚀 ProductService.list appelé avec:', params);
    
   
    let hp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        hp = hp.set(k, String(v));
      }
    });
    
    console.log('📡 Paramètres HTTP envoyés:', hp.toString());
    
    return this.http.get<Product[]>(this.api, { params: hp }).pipe(
      tap(products => {
        console.log('📦 Réponse brute du backend:', products);
        console.log('📊 Nombre de produits reçus:', products?.length || 0);
      }),
      map(products => {
        
        const result = (products || []).map((p, index) => ({
          ...p,
          category: p.category || this.categories[index % this.categories.length]
        }));
        
        console.log('✅ Produits finaux après mapping:', result);
        return result;
      }),
      finalize(() => {
        console.log('🔚 Requête ProductService terminée');
      })
    );
  }

  getArtisans(): Observable<Artisan[]> {
    console.log('👥 Chargement des artisans...');
    return this.http.get<Artisan[]>(`${this.api}/artisans`).pipe(
      tap(artisans => console.log('👥 Artisans reçus:', artisans))
    );
  }
  
  get(id: number): Observable<Product> { 
    return this.http.get<Product>(`${this.api}/${id}`); 
  }

  mine(): Observable<Product[]> { 
    return this.http.get<Product[]>(`${this.api}/mine`); 
  }

  create(p: Partial<Product>): Observable<Product> { 
    return this.http.post<Product>(this.api, p); 
  }

  update(id: number, p: Partial<Product>): Observable<Product> { 
    return this.http.put<Product>(`${this.api}/${id}`, p); 
  }

  delete(id: number): Observable<void> { 
    return this.http.delete<void>(`${this.api}/${id}`); 
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>('https://localhost:7136/api/upload/image', form);
  }

  getCategories(): string[] {
    return [...this.categories];
  }

  isCategoryValid(category: string): boolean {
    return this.categories.includes(category);
  }
}