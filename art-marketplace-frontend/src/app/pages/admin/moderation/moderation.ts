import { Component, inject } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminProductsService, AdminProduct } from '../../../services/admin-products.service';

@Component({
  standalone: true,
  selector: 'app-admin-products-moderation',
  templateUrl: './moderation.html',
  styleUrls: ['./moderation.scss'],
  imports: [NgIf, NgFor, CurrencyPipe, MatCardModule, MatButtonModule, MatSnackBarModule]
})
export class AdminProductsModerationComponent {
  private api   = inject(AdminProductsService);
  private snack = inject(MatSnackBar);

  loading = true;
  list: AdminProduct[] = [];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getPending().subscribe({
      next: (res) => { this.list = res ?? []; this.loading = false; this.api.pendingCount$.next(this.list.length);//badge synchronisation
      },
      error: ()     => { this.loading = false; this.snack.open('Erreur de chargement', '', { duration: 1800 }); }
    });
  }

  approve(p: AdminProduct) {
    this.api.approve(p.id).subscribe({
      next: () => {
        this.list = this.list.filter(x => x.id !== p.id);
        this.api.bumpPendingCount(-1);
        this.snack.open('Produit approuvé', '', { duration: 1200 });
        
      },
      error: () => this.snack.open('Échec approbation', '', { duration: 1500 })
    });
  }

  remove(p: AdminProduct) {
    if (!confirm(`Supprimer « ${p.title} » ?`)) return;
    this.api.remove(p.id).subscribe({
      next: () => {
        this.list = this.list.filter(x => x.id !== p.id);
         this.api.bumpPendingCount(-1); 
        this.snack.open('Produit supprimé', '', { duration: 1200 });
      },
      error: () => this.snack.open('Échec suppression', '', { duration: 1500 })
    });
  }

  trackById = (_: number, p: AdminProduct) => p.id;
}
