import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { AdminProductsService } from '../../services/admin-products.service';
import { FavoritesService } from '../../services/favorites.service';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatDividerModule, MatBadgeModule
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class NavbarComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private adminProducts = inject(AdminProductsService);
  public cart = inject(CartService);
  private fav = inject(FavoritesService);


  isLoggedIn = false;
  role: string | null = null;
  pendingCount = 0;
   favoritesCount = 0;

  ngOnInit(): void {
    this.auth.state$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.role = this.auth.getRole();

      if (this.role === 'Admin') {
        this.adminProducts.pendingCount$.subscribe(n => this.pendingCount = n);
        this.adminProducts.fetchPendingCount().subscribe({
          next: r => this.adminProducts.pendingCount$.next(r.count ?? 0),
          error: () => this.adminProducts.pendingCount$.next(0)
        });
      } 
      else if (this.role === 'Client') {
         this.fav.ids$.subscribe(set => {
      this.favoritesCount = set.size;
    });
      } else {
        this.pendingCount = 0;
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
