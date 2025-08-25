import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio'; // ✅ Ajouter MatRadioModule
import { PaymentService, PaymentDetails, PaymentResult, DeliveryOption } from '../services/payment.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, CurrencyPipe,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatRadioModule // ✅ Ajouter MatRadioModule
  ],
  templateUrl: './payment.html',
  styleUrls: ['./payment.scss'],
})


export class PaymentComponent implements OnInit {
  @Input() amount = 0;
  @Output() paymentSuccess = new EventEmitter<PaymentResult>();
  @Output() paymentCancel = new EventEmitter<void>();

  paymentService = inject(PaymentService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  paymentForm!: FormGroup;
  selectedMethod = '';
  selectedDeliveryId = '';
  selectedDeliveryOption?: DeliveryOption;
  processing = false;
  validationErrors: string[] = [];

  ngOnInit() {
    this.paymentForm = this.fb.group({
      deliveryOption: ['', Validators.required], // ✅ Ajouter l'option de livraison
      method: ['', Validators.required],
      cardNumber: [''],
      cardExpiry: [''],
      cardCvc: [''],
      cardName: [''],
      email: ['']
    });

    // ✅ Écouter les changements d'option de livraison
    this.paymentForm.get('deliveryOption')?.valueChanges.subscribe(deliveryId => {
      this.selectedDeliveryId = deliveryId;
      this.selectedDeliveryOption = this.paymentService.getDeliveryOption(deliveryId);
    });
  }

  // ✅ Calculer le montant total (produits + livraison)
  getTotalAmount(): number {
    const deliveryPrice = this.selectedDeliveryOption?.price || 0;
    return this.amount + deliveryPrice;
  }

  onMethodChange() {
    this.selectedMethod = this.paymentForm.get('method')?.value || '';
    this.validationErrors = [];
    
    const cardNumber = this.paymentForm.get('cardNumber')!;
    const cardExpiry = this.paymentForm.get('cardExpiry')!;
    const cardCvc = this.paymentForm.get('cardCvc')!;
    const cardName = this.paymentForm.get('cardName')!;
    const email = this.paymentForm.get('email')!;

    [cardNumber, cardExpiry, cardCvc, cardName, email].forEach(control => {
      control.clearValidators();
      control.updateValueAndValidity();
    });

    if (this.selectedMethod === 'card') {
      cardNumber.setValidators([Validators.required, Validators.minLength(19)]);
      cardExpiry.setValidators([Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]);
      cardCvc.setValidators([Validators.required, Validators.minLength(3)]);
      cardName.setValidators([Validators.required, Validators.minLength(2)]);
    } else if (this.selectedMethod === 'paypal') {
      email.setValidators([Validators.required, Validators.email]);
    }

    [cardNumber, cardExpiry, cardCvc, cardName, email].forEach(control => {
      control.updateValueAndValidity();
    });
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    this.paymentForm.patchValue({ cardNumber: formattedValue });
  }

  formatExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0,2) + '/' + value.substring(2,4);
    }
    this.paymentForm.patchValue({ cardExpiry: value });
  }

  generateReference(): string {
    return 'REF_' + Date.now().toString().slice(-8);
  }

  onSubmit() {
    if (!this.paymentForm.valid) {
      this.snack.open('Veuillez remplir tous les champs requis', '', { duration: 2000 });
      return;
    }

    const formValue = this.paymentForm.value;
    const deliveryPrice = this.selectedDeliveryOption?.price || 0;
    
    const paymentDetails: PaymentDetails = {
      method: formValue.method,
      amount: this.getTotalAmount(), // ✅ Montant total avec livraison
      currency: 'EUR',
      deliveryOption: formValue.deliveryOption, // ✅ Option de livraison
      deliveryPrice: deliveryPrice,             // ✅ Prix de livraison
      cardNumber: formValue.cardNumber?.replace(/\s/g, ''),
      cardExpiry: formValue.cardExpiry,
      cardCvc: formValue.cardCvc,
      cardName: formValue.cardName,
      email: formValue.email
    };

    const validation = this.paymentService.validatePayment(paymentDetails);
    if (!validation.valid) {
      this.validationErrors = validation.errors;
      return;
    }

    this.validationErrors = [];
    this.processing = true;

    this.paymentService.processPayment(paymentDetails).subscribe({
      next: (result) => {
        this.processing = false;
        this.snack.open('Paiement réussi ! 🎉', '', { duration: 2000 });
        this.paymentSuccess.emit(result);
      },
      error: (error) => {
        this.processing = false;
        this.snack.open(error.message || 'Erreur de paiement', '', { duration: 3000 });
      }
    });
  }

  onCancel() {
    this.paymentCancel.emit();
  }
}