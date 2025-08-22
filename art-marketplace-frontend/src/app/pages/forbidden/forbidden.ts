import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  template: `
    <div class="p-6">
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits pour accéder à cette page.</p>
    </div>
  `
})
export class ForbiddenComponent {}
