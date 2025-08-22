import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface Review {
  id: number;
  productId: number;
  clientId: number;
  rating: number;       // 1 --> 5
  comment?: string;
  createdAt: string;
}

export interface ReviewWithRefs extends Review {
  product?: { id: number; title?: string };
  client?: { id: number; username?: string };
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private api = 'https://localhost:7136/api/review';

  constructor(private http: HttpClient) {}

  forProduct(productId: number) {
    return this.http.get<Review[]>(`${this.api}/product/${productId}`);
  }

  create(data: { productId: number; rating: number; comment?: string }) {
    return this.http.post<Review>(this.api, data);
  }

  artisan() {
  return this.http.get<ReviewWithRefs[]>(`${this.api}/artisan`).pipe(
    
    catchError(() => of([] as ReviewWithRefs[]))
  );

}
}
