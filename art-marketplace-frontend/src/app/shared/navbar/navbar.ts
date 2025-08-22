import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AsyncPipe } from '@angular/common';
// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    NgIf,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    AsyncPipe
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class NavbarComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  public cart = inject(CartService);



  isLoggedIn = false;
  role: string | null = null;

  ngOnInit(): void {
    // Lis l’état au chargement
    this.refreshState();
    this.auth.state$.subscribe(() => this.refreshState());
  }

  private refreshState() {
    this.isLoggedIn = this.auth.isAuthenticated();
    this.role = this.auth.getRole();
  }

  logout() {
    this.auth.logout();
    this.refreshState();
    this.router.navigate(['/login']);
  }
}
