import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, AdminUser } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule
  ]
})
export class AdminComponent {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private api = inject(AdminService);
  private auth = inject(AuthService);

  users: AdminUser[] = [];
  loading = false;
  me = this.auth.getUsername(); 

  // Création
  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    role: ['Client', Validators.required]
  });

  // 🔎 Filtres
  filter = this.fb.group({
    q: [''],
    role: ['All' as 'All' | 'Client' | 'Artisan' | 'DeliveryPartner' | 'Admin']
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getUsers().subscribe({
      next: u => { this.users = u; this.loading = false; },
      error: _ => { this.loading = false; this.snack.open('Erreur chargement utilisateurs', '', { duration: 2000 }); }
    });
  }

  create() {
    if (this.form.invalid) return;
    this.loading = true;
    this.api.createUser(this.form.value as any).subscribe({
      next: _ => {
        this.snack.open('Utilisateur créé', '', { duration: 1500 });
        this.form.reset({ role: 'Client' });
        this.load();
      },
      error: e => {
        this.loading = false;
        this.snack.open(typeof e?.error === 'string' ? e.error : 'Création impossible', '', { duration: 2000 });
      }
    });
  }

  remove(u: AdminUser) {
    if (!confirm(`Supprimer l'utilisateur "${u.username}" ?`)) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => { this.snack.open('Utilisateur supprimé', '', { duration: 1500 }); this.load(); },
      error: e => {
        const msg = typeof e?.error === 'string' ? e.error : 'Suppression impossible';
        this.snack.open(msg, '', { duration: 2500 });
      }
    });
  }

  clearFilters() {
    this.filter.reset({ q: '', role: 'All' });
  }

  get filtered(): AdminUser[] {
    const q = (this.filter.value.q ?? '').toLowerCase().trim();
    const role = this.filter.value.role ?? 'All';
    return this.users.filter(u =>
      (role === 'All' || u.role === role) &&
      (!q || u.username.toLowerCase().includes(q))
    );
  }
}
