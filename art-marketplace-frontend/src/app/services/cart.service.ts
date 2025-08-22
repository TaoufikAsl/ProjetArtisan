import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface CartItem {
  productId: number;
  title: string;
  price: number;
  qty: number;
  imageUrl?: string | null; // optionnel
}

const STORAGE_KEY = 'cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = new BehaviorSubject<CartItem[]>(this.load());
  readonly items$ = this._items.asObservable();

  readonly total$ = this.items$.pipe(
    map(items => items.reduce((sum, it) => sum + it.price * it.qty, 0))
  );
  readonly count$ = this.items$.pipe(
    map(items => items.reduce((sum, it) => sum + it.qty, 0))
  );

  add(item: Omit<CartItem, 'qty'>, qty = 1) {
    const items = [...this._items.value];
    const i = items.findIndex(x => x.productId === item.productId);
    if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + Math.max(1, qty) };
    else items.push({ ...item, qty: Math.max(1, qty) });
    this.commit(items);
  }

  updateQty(productId: number, qty: number) {
    const q = Math.max(1, Number(qty) || 1);                // ⬅️ clamp
    const items = this._items.value.map(it =>
      it.productId === productId ? { ...it, qty: q } : it
    );
    this.commit(items);
  }

  remove(productId: number) {
    const items = this._items.value.filter(it => it.productId !== productId);
    this.commit(items);
  }

  clear() { this.commit([]); }

  private commit(items: CartItem[]) {
    this._items.next(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }
  private load(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
}
