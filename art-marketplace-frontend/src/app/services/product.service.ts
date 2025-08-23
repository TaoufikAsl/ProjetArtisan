import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  artisanId: number;
}

export type SortKey = 'priceAsc' | 'priceDesc' | 'recent';
export interface ProductQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
  skip?: number;
  take?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = 'https://localhost:7136/api/product'; // tu gardes en dur

  constructor(private http: HttpClient) {}

  // Catalogue
  list(params: ProductQuery = {}): Observable<Product[]> {
    let hp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
    });
    return this.http.get<Product[]>(this.api, { params: hp }); }
  get(id: number) { return this.http.get<Product>(`${this.api}/${id}`); }

  // Artisan
  mine() { return this.http.get<Product[]>(`${this.api}/mine`); }
  create(p: Partial<Product>) { return this.http.post<Product>(this.api, p); }
  update(id: number, p: Partial<Product>) { return this.http.put<void>(`${this.api}/${id}`, p); }
  delete(id: number) { return this.http.delete<void>(`${this.api}/${id}`); }
  uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  return this.http.post<{ url: string }>('https://localhost:7136/api/upload/image', form);
}

}
