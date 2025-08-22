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

  from = ''; // 'yyyy-MM-dd'
  to = '';   // 'yyyy-MM-dd'
  data: Earnings | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = null;

    const fromIso = this.from ? this.startOfDayUtcIso(this.from) : undefined;
    const toIso   = this.to   ? this.endOfDayUtcIso(this.to)   : undefined;

    this.api.get(fromIso, toIso)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: d => { this.data = d; },
        error: () => { this.data = null; this.error = 'Impossible de charger les revenus.'; }
      });
  }

  // '2025-08-21' -> '2025-08-21T00:00:00Z'
  private startOfDayUtcIso(d: string) {
    const [y,m,day] = d.split('-').map(Number);
    return new Date(Date.UTC(y, (m-1), day, 0, 0, 0)).toISOString();
    // ex: '2025-08-21T00:00:00.000Z'
  }

  // '2025-08-21' -> '2025-08-21T23:59:59Z'
  private endOfDayUtcIso(d: string) {
    const [y,m,day] = d.split('-').map(Number);
    return new Date(Date.UTC(y, (m-1), day, 23, 59, 59)).toISOString();
  }
}
