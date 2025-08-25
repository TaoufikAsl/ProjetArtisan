import { Component, inject,OnInit } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminProductsService, AdminProduct } from '../../../services/admin-products.service';
import { MaterialModule } from "../../../material.module";
import { MatIconModule } from '@angular/material/icon';
@Component({
  standalone: true,
  selector: 'app-admin-products-moderation',
  templateUrl: './moderation.html',
  styleUrls: ['./moderation.scss'],
  imports: [NgIf, NgFor, CurrencyPipe, MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule, MaterialModule]
})
export class AdminProductsModerationComponent implements OnInit {
  private api   = inject(AdminProductsService);
  private snack = inject(MatSnackBar);

  loading = false;
  list: AdminProduct[] = [];
  isOfflineMode = false;

  ngOnInit() { this.load(); }

  load() {
    if (this.loading) return; 
    this.loading = true;
    this.api.getPending().subscribe({
      next: (res) => { 
        this.list = res ?? []; 
        this.loading = false;
        this.isOfflineMode = false; // Mode en ligne
        this.api.pendingCount$.next(this.list.length); 
        console.log('Produits en attente chargés:', this.list.length); // Debug
      },
      error: (error) => { 
        console.error('Erreur lors du chargement des produits en attente', error);
        this.loading = false;
        this.isOfflineMode = true; // Mode hors ligne détecté
        this.snack.open('⚠️ Mode hors ligne - Données locales utilisées', '', { duration: 3000 });
        // Les données mockées sont déjà gérées par le service
      }
    });
  }
  approve(p: AdminProduct) {
    
    const originalList = [...this.list]; 
    this.list = this.list.filter(x => x.id !== p.id);
    this.api.bumpPendingCount(-1);

    this.api.approve(p.id).subscribe({
      next: () => {
        // La suppression faite côté interface
        this.snack.open(
          this.isOfflineMode ? 
            'Produit approuvé localement ✅ (sera synchronisé)' : 
            'Produit approuvé ✅', 
          '', 
          { duration: 1200 }
        );
      },
      error: (error) => {
        //  Restaurer en cas d'erreur
        this.list = originalList;
        this.api.pendingCount$.next(this.list.length);
        this.snack.open('Échec approbation', '', { duration: 1500 });
      }
    });
  }

  remove(p: AdminProduct) {
    if (!confirm(`Supprimer « ${p.title} » ?`)) return;
    
    // supprimer de l'interface immédiatement
    const originalList = [...this.list]; 
    this.list = this.list.filter(x => x.id !== p.id);
    this.api.bumpPendingCount(-1);

    this.api.remove(p.id).subscribe({
      next: () => {
        // La suppression est déjà faite côté interface
        this.snack.open(
          this.isOfflineMode ? 
            'Produit supprimé localement ✅ (sera synchronisé)' : 
            'Produit supprimé ✅', 
          '', 
          { duration: 1200 }
        );
      },
      error: (error) => {
       
        this.list = originalList;
        this.api.pendingCount$.next(this.list.length);
        this.snack.open('Échec suppression', '', { duration: 1500 });
      }
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder.png'; 
  }

  refresh() {
    this.load();
    this.snack.open('Liste actualisée ✅', '', { duration: 1000 });
  }
trackById = (_: number, p: AdminProduct) => p.id;
}


