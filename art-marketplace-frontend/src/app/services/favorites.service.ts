import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly KEY = 'am_favorites_v1';

  private _ids = new BehaviorSubject<Set<number>>(this.load());
  /** flux des ids favoris */
  readonly ids$ = this._ids.asObservable();

  /** liste des favoris sous forme {id}[] (utile pour `map(p => p.id)`) */
  getMine(): Observable<Array<{ id: number }>> {
    return this.ids$.pipe(map(set => Array.from(set).map(id => ({ id }))));
  }

  /** true si l’id est en favoris */
  has(productId: number): Observable<boolean> {
    return this.ids$.pipe(map(set => set.has(productId)));
  }

  /** ajoute un favori (localStorage pour l’instant) */
  add(productId: number): Observable<void> {
    const next = new Set(this._ids.value);
    next.add(productId);
    this.commit(next);
    return of(void 0);
  }

  /** retire un favori */
  remove(productId: number): Observable<void> {
    const next = new Set(this._ids.value);
    next.delete(productId);
    this.commit(next);
    return of(void 0);
  }

  // --- internes ---
  private commit(set: Set<number>) {
    this._ids.next(set);
    try { localStorage.setItem(this.KEY, JSON.stringify(Array.from(set))); } catch {}
  }
  private load(): Set<number> {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as number[];
      return new Set(arr);
    } catch { return new Set(); }
  }
}
