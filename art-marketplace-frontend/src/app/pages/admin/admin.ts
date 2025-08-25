import { Component, inject, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService, AdminUser, AdminCreateUserDto } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
  imports: [
    NgIf, NgFor, NgClass, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule, MatIconModule, MatDividerModule,
    MatTooltipModule
  ]
})
export class AdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private api = inject(AdminService);
  private auth = inject(AuthService);
  private lastLoadTime = 0;

  users: AdminUser[] = [];
  loading = false;
  me = this.auth.getUsername();
  isOfflineMode = false;

  // Création
  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    role: ['Client', Validators.required]
  });

  // Filtres avec recherche en temps réel + statut
  filter = this.fb.group({
    q: [''],
    role: ['All' as 'All' | 'Client' | 'Artisan' | 'DeliveryPartner' | 'Admin'],
    status: ['All' as 'All' | 'Active' | 'Inactive'] 
  });

  ngOnInit() { 
    this.load();
    this.setupFilterWatchers();
    this.checkCurrentUserStatus();
  }

  private checkCurrentUserStatus() {
    setTimeout(() => {
      const currentUser = this.users.find(u => u.username === this.me);
      if (currentUser && !currentUser.isActive) {
        console.error('🚨 ADMIN INACTIF DÉTECTÉ !');
        this.snack.open('⚠️ Attention: Votre compte apparaît comme inactif. Cliquez sur "Debug" pour plus d\'infos.', '', { 
          duration: 5000 
        });
      }
    }, 500);
  }

  private setupFilterWatchers() {
    this.filter.get('q')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        // Le getter `filtered` se met à jour automatiquement
      });

    this.filter.get('role')?.valueChanges.subscribe(() => {
      // Le getter `filtered` se met à jour automatiquement
    });

    this.filter.get('status')?.valueChanges.subscribe(() => {
      // Le getter `filtered` se met à jour automatiquement
    });
  }

  load() {
    // 
    const now = Date.now();
    if (now - this.lastLoadTime < 2000) { // Minimum 2 secondes entre les chargements
      console.log('⏰ Rechargement ignoré (trop récent)');
      return;
    }
    this.lastLoadTime = now;

    this.loading = true;
    console.log('🔄 Chargement des utilisateurs...');
    
    this.api.getUsers().subscribe({
      next: u => { 
        this.users = u || []; 
        this.loading = false;
        this.isOfflineMode = false;
        console.log('✅ Utilisateurs chargés:', u?.length);
        
      },
      error: _ => { 
        this.loading = false; 
        this.isOfflineMode = true;
        this.snack.open('⚠️ Mode hors ligne - Données locales utilisées', '', { duration: 3000 }); 
      }
    });
  }

  create() {
    if (this.form.invalid) return;
    this.loading = true;
    
    const userData: AdminCreateUserDto = {
      username: this.form.value.username!,
      password: this.form.value.password!,
      role: this.form.value.role as AdminCreateUserDto['role']
    };
    
    this.api.createUser(userData).subscribe({
      next: (newUser) => {
        // Ajouter à la liste existante au lieu de recréer
        this.users = [newUser, ...this.users];
        this.loading = false;
        this.snack.open(
          this.isOfflineMode ? 
            'Utilisateur créé localement ✅ (sera synchronisé)' : 
            'Utilisateur créé ✅', 
          '', 
          { duration: 1500 }
        );
        this.form.reset({ role: 'Client' });
      },
      error: e => {
        this.loading = false;
        this.snack.open(typeof e?.error === 'string' ? e.error : 'Création impossible', '', { duration: 2000 });
      }
    });
  }

  forceRefresh() {
    this.load();
    this.snack.open('Liste rechargée ✅', '', { duration: 1000 });
  }

 toggleUserStatus(u: AdminUser) {
    if (u.username === this.me) {
      this.snack.open('Vous ne pouvez pas modifier votre propre statut !', '', { duration: 2000 });
      return;
    }

    if (u.role === 'Admin' && u.isActive) {
      const activeAdmins = this.users.filter(user => user.role === 'Admin' && user.isActive).length;
      if (activeAdmins <= 1) {
        this.snack.open('⚠️ Impossible de désactiver le dernier administrateur actif !', '', { duration: 3000 });
        return;
      }
    }

    const action = u.isActive ? 'désactiver' : 'activer';
    const actionCapitalized = u.isActive ? 'Désactiver' : 'Activer';
    
    if (!confirm(`${actionCapitalized} l'utilisateur "${u.username}" ?`)) return;
    
    console.log(`🎯 ${actionCapitalized} utilisateur ${u.username} (ID: ${u.id})`);
    
    // Mise à jour optimiste plus robuste
    const newStatus = !u.isActive;
    const userIndex = this.users.findIndex(user => user.id === u.id);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...u, isActive: newStatus };
      
      this.api.forceLocalUserStatus(u.id, newStatus);
    }
    
    const operation$ = u.isActive 
      ? this.api.deactivateUser(u.id)
      : this.api.activateUser(u.id);

    operation$.subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.id === u.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        
        console.log(`✅ ${action} réussi pour ${u.username}`);
        this.snack.open(
          this.isOfflineMode ? 
            `Utilisateur ${action}é localement ✅ (sera synchronisé)` :
            `Utilisateur ${action}é ✅`, 
          '', 
          { duration: 1500 }
        );
      },
      error: e => {
        console.error(`❌ Erreur ${action}:`, e);
        // Restaurer l'état original
        const index = this.users.findIndex(user => user.id === u.id);
        if (index !== -1) {
          this.users[index] = u;
        }
        
        const msg = typeof e?.error === 'string' ? e.error : `Impossible de ${action} l'utilisateur`;
        this.snack.open(msg, '', { duration: 2500 });
      }
    });
  }


  remove(u: AdminUser) {
    if (u.username === this.me) {
      this.snack.open('Vous ne pouvez pas vous supprimer !', '', { duration: 2000 });
      return;
    }

    if (!confirm(`Supprimer définitivement l'utilisateur "${u.username}" ?\n\nCette action est irréversible.\n\nConsidérez plutôt de le désactiver.`)) return;
    
    //   supprimer de l'interface immédiatement
    const originalUsers = [...this.users]; // Sauvegarder pour rollback
    this.users = this.users.filter(user => user.id !== u.id);
    
    this.api.deleteUser(u.id).subscribe({
      next: () => { 
        //   suppression déjà faite côté interface
        this.snack.open(
          this.isOfflineMode ? 
            'Utilisateur supprimé localement ✅ (sera synchronisé)' :
            'Utilisateur supprimé ✅', 
          '', 
          { duration: 1500 }
        ); 
      },
      error: e => {
        //  Restaurer liste en cas d'erreur
        this.users = originalUsers;
        
        const msg = typeof e?.error === 'string' ? e.error : 'Suppression impossible';
        this.snack.open(msg, '', { duration: 2500 });
      }
    });
  }

  clearFilters() {
    this.filter.reset({ q: '', role: 'All', status: 'All' });
    this.snack.open('Filtres effacés', '', { duration: 1000 });
  }

  clearCache() {
    if (confirm('Nettoyer le cache local ? Cela supprimera toutes les données hors ligne.')) {
      this.api.clearCache();
      this.snack.open('Cache nettoyé ✅', '', { duration: 1500 });
      this.load();
    }
  }

  trackByUserId(index: number, user: AdminUser): number {
    return user.id;
  }

  get filtered(): AdminUser[] {
    const q = (this.filter.value.q ?? '').toLowerCase().trim();
    const role = this.filter.value.role ?? 'All';
    const status = this.filter.value.status ?? 'All';
    
    return this.users.filter(u => {
      const matchesSearch = !q || u.username.toLowerCase().includes(q);
      const matchesRole = role === 'All' || u.role === role;
      const matchesStatus = status === 'All' || 
        (status === 'Active' && u.isActive) || 
        (status === 'Inactive' && !u.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }
}