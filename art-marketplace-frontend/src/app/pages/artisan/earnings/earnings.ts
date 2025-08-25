import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { EarningsService, Earnings } from '../../../services/earnings.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-artisan-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, MatCardModule, MatButtonModule],
  templateUrl: './earnings.html',
  styleUrls: ['./earnings.scss']
})
export class ArtisanEarningsPage {
  private api = inject(EarningsService);
  private cdr = inject(ChangeDetectorRef);

  from = this.toInputDate(this.shiftDays(new Date(), -30));
  to   = this.toInputDate(new Date());

  data: Earnings | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = null;

    const fromParam = this.from || undefined;                 // yyyy-MM-dd
    const toParam   = this.to ? `${this.to}T23:59:59` : undefined; // inclusivité jour de fin

    this.api.get(fromParam, toParam)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: d => { this.data = d; },
        error: () => { this.data = null; this.error = 'Impossible de charger les revenus.'; }
      });
  }

  private toInputDate(d: Date) { return d.toISOString().slice(0, 10); }
  private shiftDays(d: Date, delta: number) { const x = new Date(d); x.setDate(x.getDate() + delta); return x; }
}
