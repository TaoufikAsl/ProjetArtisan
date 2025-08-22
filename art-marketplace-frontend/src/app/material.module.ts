import { NgModule } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  exports: [
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatListModule,
    MatDialogModule
  ]
})
export class MaterialModule {}
