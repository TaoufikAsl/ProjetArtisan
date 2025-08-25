import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, of, tap } from 'rxjs';

export interface Review {
  id: number;
  productId: number;
  clientId: number;
  rating: number;       
  comment?: string;
  createdAt: string;
  artisanResponse?: string;
  artisanResponseDate?: string;
  hasResponse?: boolean;
}

export interface ReviewWithRefs extends Review {
  product?: { id: number; title?: string };
  client?: { id: number; username?: string };
}

export interface ArtisanResponseRequest {
  response: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private api = 'https://localhost:7136/api/review';

  constructor(private http: HttpClient) {}

  forProduct(productId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.api}/product/${productId}`);
  }

  create(data: { productId: number; rating: number; comment?: string }): Observable<Review> {
    return this.http.post<Review>(this.api, data);
  }

  // logs
  artisan(): Observable<ReviewWithRefs[]> {
    console.log('🌐 GET /api/review/artisan');
    
    return this.http.get<ReviewWithRefs[]>(`${this.api}/artisan`).pipe(
      tap(response => {
        console.log('🌐 Response /api/review/artisan:', response);
        console.log('🌐 Nombre d\'avis:', response?.length || 0);
      }),
      catchError(error => {
        console.error('🌐 Erreur /api/review/artisan:', error);
        console.error('🌐 Status:', error.status);
        console.error('🌐 Message:', error.message);
        return of([] as ReviewWithRefs[]);
      })
    );
  }

  addResponse(reviewId: number, data: ArtisanResponseRequest): Observable<Review> {
    const url = `${this.api}/${reviewId}/response`;
    console.log('🌐 POST:', url, data);
    
    return this.http.post<Review>(url, data).pipe(
      tap(response => console.log('🌐 POST Response:', response)),
      catchError(error => {
        console.error('🌐 POST Error:', error);
        throw error;
      })
    );
  }

  updateResponse(reviewId: number, data: ArtisanResponseRequest): Observable<Review> {
    const url = `${this.api}/${reviewId}/response`;
    console.log('🌐 PUT:', url, data);
    
    return this.http.put<Review>(url, data).pipe(
      tap(response => console.log('🌐 PUT Response:', response)),
      catchError(error => {
        console.error('🌐 PUT Error:', error);
        throw error;
      })
    );
  }

  upsertResponse(reviewId: number, data: ArtisanResponseRequest): Observable<Review> {
  const url = `${this.api}/${reviewId}/response/upsert`;
  console.log('🌐 PUT UPSERT:', url, data);
  
  return this.http.put<Review>(url, data).pipe(
    tap(response => console.log('🌐 PUT UPSERT Response:', response)),
    catchError(error => {
      console.error('🌐 PUT UPSERT Error:', error);
      throw error;
    })
  );
}
  deleteResponse(reviewId: number): Observable<void> {
    const url = `${this.api}/${reviewId}/response`;
    console.log('🌐 DELETE:', url);
    
    return this.http.delete<void>(url).pipe(
      tap(() => console.log('🌐 DELETE Success')),
      catchError(error => {
        console.error('🌐 DELETE Error:', error);
        throw error;
      })
    );
  }
}