import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  label: string;
  icon: string;
}

// interface pour  livraison
export interface DeliveryOption {
  id: string;
  label: string;
  description: string;
  price: number;
  estimatedDays: string;
  icon: string;
}

export interface PaymentDetails {
  method: string;
  amount: number;
  currency: string;
  deliveryOption: string; 
  deliveryPrice: number; 
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  cardName?: string;
  email?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
  amount: number;
  deliveryOption: string; 
  deliveryPrice: number;  
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  
  readonly methods: PaymentMethod[] = [
    { id: 'card', type: 'card', label: 'Carte bancaire', icon: 'credit_card' },
    { id: 'paypal', type: 'paypal', label: 'PayPal', icon: 'account_balance_wallet' },
    { id: 'bank', type: 'bank', label: 'Virement bancaire', icon: 'account_balance' }
  ];

  // Options de livraison
  readonly deliveryOptions: DeliveryOption[] = [
    {
      id: 'standard',
      label: 'Livraison standard',
      description: 'Livraison par transporteur',
      price: 4.99,
      estimatedDays: '3-5 jours ouvrés',
      icon: 'local_shipping'
    },
    {
      id: 'express',
      label: 'Livraison express',
      description: 'Livraison rapide prioritaire',
      price: 9.99,
      estimatedDays: '1-2 jours ouvrés',
      icon: 'rocket_launch'
    }
  ];

  constructor() {}

  processPayment(details: PaymentDetails): Observable<PaymentResult> {
    console.log('💳 Traitement du paiement:', details);
    
    const shouldFail = Math.random() < 0.1;
    
    if (shouldFail) {
      return throwError(() => new Error('Paiement refusé par la banque')).pipe(delay(2000));
    }

    return of({
      success: true,
      transactionId: this.generateTransactionId(),
      message: 'Paiement accepté avec succès',
      amount: details.amount,
      deliveryOption: details.deliveryOption, 
      deliveryPrice: details.deliveryPrice    
    }).pipe(delay(2500));
  }

  validatePayment(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!details.method) {
      errors.push('Méthode de paiement requise');
    }

    if (!details.deliveryOption) { //  Valider l'option de livraison
      errors.push('Option de livraison requise');
    }

    if (details.amount <= 0) {
      errors.push('Montant invalide');
    }

    if (details.method === 'card') {
      if (!details.cardNumber || details.cardNumber.length < 16) {
        errors.push('Numéro de carte invalide');
      }
      if (!details.cardExpiry || !/^\d{2}\/\d{2}$/.test(details.cardExpiry)) {
        errors.push('Date d\'expiration invalide (MM/YY)');
      }
      if (!details.cardCvc || details.cardCvc.length < 3) {
        errors.push('Code CVC invalide');
      }
      if (!details.cardName || details.cardName.trim().length < 2) {
        errors.push('Nom sur la carte requis');
      }
    }

    if (details.method === 'paypal') {
      if (!details.email || !this.isValidEmail(details.email)) {
        errors.push('Email PayPal invalide');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // option de livraison
  getDeliveryOption(id: string): DeliveryOption | undefined {
    return this.deliveryOptions.find(option => option.id === id);
  }

  private generateTransactionId(): string {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}