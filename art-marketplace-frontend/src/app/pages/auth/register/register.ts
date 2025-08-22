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
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
   host: { 'ngSkipHydration': '' },
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink, NgIf,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDividerModule, MatSnackBarModule, MatSelectModule
  ]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = false;

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    role: ['Client', [Validators.required]] // valeur par défaut
  });

  onRegister() {
    if (this.registerForm.invalid) return;
    this.loading = true;

    this.auth.register(this.registerForm.value as any).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Inscription réussie 🎉 Vous pouvez vous connecter.', '', { duration: 2500 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        let msg = 'Erreur à l’inscription.';
        if (err?.error && typeof err.error === 'string') msg += ' ' + err.error;
        this.snackBar.open(msg, '', { duration: 3000 });
      }
    });
  }

  get u() { return this.registerForm.controls['username']; }
  get p() { return this.registerForm.controls['password']; }
  get r() { return this.registerForm.controls['role']; }
}
