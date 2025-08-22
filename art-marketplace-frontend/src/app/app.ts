import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { MaterialModule } from './material.module';
import { HttpClientModule } from '@angular/common/http';
import { H } from '@angular/cdk/keycodes';
import { NavbarComponent } from "./shared/navbar/navbar";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MaterialModule, HttpClientModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('art-marketplace-frontend');
}
