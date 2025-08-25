import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CartItem {
  productId: number;
  title: string;
  price: number;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly KEY = 'am_cart_v1';
  private readonly isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  private _items$ = new BehaviorSubject<CartItem[]>(this.load());

  readonly items$ = this._items$.asObservable();
  readonly count$ = this.items$.pipe(map(items => items.reduce((n, it) => n + it.qty, 0)));
  readonly total$ = this.items$.pipe(map(items => items.reduce((s, it) => s + it.price * it.qty, 0)));

  add(productId: number, title: string, price: number, qty = 1): void {
    const current = this._items$.value;
    const existing = current.find(it => it.productId === productId);
    
    if (existing) {
      existing.qty += qty;
    } else {
      current.push({ productId, title, price, qty });
    }
    
    this.commit(current);
  }

  updateQty(productId: number, qty: number): void {
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    
    const current = this._items$.value;
    const item = current.find(it => it.productId === productId);
    if (item) {
      item.qty = qty;
      this.commit(current);
    }
  }

  remove(productId: number): void {
    const current = this._items$.value.filter(it => it.productId !== productId);
    this.commit(current);
  }

  clear(): void {
    this.commit([]);
  }

  private commit(items: CartItem[]): void {
    this._items$.next(items);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Impossible de sauvegarder le panier', e);
    }
  }

  private load(): CartItem[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return [];
      const items = JSON.parse(raw) as CartItem[];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }
}