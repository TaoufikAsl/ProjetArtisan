import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  artisanId: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = 'https://localhost:7136/api/product'; // tu gardes en dur

  constructor(private http: HttpClient) {}

  // Catalogue
  list() { return this.http.get<Product[]>(this.api); }
  get(id: number) { return this.http.get<Product>(`${this.api}/${id}`); }

  // Artisan
  mine() { return this.http.get<Product[]>(`${this.api}/mine`); }
  create(p: Partial<Product>) { return this.http.post<Product>(this.api, p); }
  update(id: number, p: Partial<Product>) { return this.http.put<void>(`${this.api}/${id}`, p); }
  delete(id: number) { return this.http.delete<void>(`${this.api}/${id}`); }
}
