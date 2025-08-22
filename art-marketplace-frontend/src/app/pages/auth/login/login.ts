import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../services/auth.service';

type LoginPayload = { username: string; password: string };

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  host: { ngSkipHydration: '' },
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink, NgIf,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDividerModule, MatSnackBarModule
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = false;

  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  onLogin() {
    if (this.loginForm.invalid) return;
    this.loading = true;

    const payload: LoginPayload = {
      username: this.u.value!,
      password: this.p.value!,
    };

    this.auth.login(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Connexion réussie ✅', '', { duration: 1500 });

        // Redirection intelligente selon le rôle (exigences “JWT-based authentication” + dashboards par rôle)
        const role = this.auth.getRole();
        if (role === 'Artisan')      this.router.navigate(['/artisan/products']);
        else if (role === 'Client')  this.router.navigate(['/products']);
        else if (role === 'DeliveryPartner') this.router.navigate(['/delivery/orders']);
        else if (role === 'Admin')   this.router.navigate(['/dashboard']);
        else                         this.router.navigate(['/dashboard']); // fallback
      },
      error: (err) => {
        this.loading = false;
        let msg = 'Échec de connexion.';
        if (err?.error && typeof err.error === 'string') msg += ' ' + err.error;
        this.snackBar.open(msg, '', { duration: 3000 });
      }
    });
  }

  // Helpers UI
  get u() { return this.loginForm.controls['username']; }
  get p() { return this.loginForm.controls['password']; }
}
