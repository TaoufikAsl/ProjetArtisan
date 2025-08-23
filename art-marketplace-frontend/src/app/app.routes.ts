import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { roleGuard } from './role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Publiques mais interdites si déjà connecté
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then(m => m.RegisterComponent)
  },

  // Page d’atterrissage après connexion
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
  },

    // ADMIN 
  {
  path: 'admin',
  canActivate: [roleGuard],
  data: { role: 'Admin' },
  loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent)
},

{
  path: 'admin/products',
  canActivate: [roleGuard],
  data: { role: 'Admin' },
  loadComponent: () => import('./pages/admin/moderation/moderation').then(m => m.AdminProductsModerationComponent)
},




  //  Catalogue public 
  {
    path: 'products',
    loadComponent: () => import('./pages/products/list/list').then(m => m.ProductsListComponent)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./pages/products/detail/detail/detail').then(m => m.ProductDetailComponent)
  },

  //  Espace CLIENT 
  {
    path: 'cart',
    canActivate: [roleGuard],
    data: { role: 'Client' },
    loadComponent: () => import('./pages/cart/cart').then(m => m.CartPage)
  },
  {
    path: 'orders',
    canActivate: [roleGuard],
    data: { role: 'Client' },
    loadComponent: () => import('./pages/client/orders/orders').then(m => m.ClientOrdersComponent)
  },

  {
  path: 'order/confirmation',
  canActivate: [roleGuard],            // restreindre aux Clients
  data: { role: 'Client' },
  loadComponent: () => import('./pages/client/confirmation/confirmation').then(m => m.OrderConfirmationComponent)

  },

  //  Espace ARTISAN 
  {
    path: 'artisan/earnings',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/earnings/earnings').then(m => m.ArtisanEarningsPage)
  },
  {
    path: 'artisan/orders',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/orders/orders').then(m => m.ArtisanOrdersComponent)
  },
  {
    path: 'artisan/reviews',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/reviews/reviews').then(m => m.ArtisanReviewsComponent)
  },
  {
    path: 'artisan/products',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/products/manage/manage').then(m => m.ArtisanProductsComponent)
  },
  {
    path: 'artisan/products/new',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/products/form/form').then(m => m.ArtisanProductFormComponent)
  },
  {
    path: 'artisan/products/:id/edit',
    canActivate: [roleGuard],
    data: { role: 'Artisan' },
    loadComponent: () => import('./pages/artisan/products/form/form').then(m => m.ArtisanProductFormComponent)
  },

  //  Espace DELIVERY PARTNER 
  {
    path: 'delivery/orders',
    canActivate: [roleGuard],
    data: { role: 'DeliveryPartner' },
    loadComponent: () => import('./pages/delivery/orders/orders').then(m => m.DeliveryOrdersComponent)
  },

  //  Erreurs 
  {
    path: 'forbidden',
    loadComponent: () => import('./pages/forbidden/forbidden').then(m => m.ForbiddenComponent)
  },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
