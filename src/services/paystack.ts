// src/services/paystack.ts

import { supabase } from '../config/supabase/client';

export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  merchantEmail: string;
  callbackUrl?: string;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'pending';
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: {
      email: string;
      first_name?: string;
      last_name?: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      account_name?: string;
    };
    transaction_date: string;
  };
}

export interface PaymentGateway {
  id: string;
  branch_id: string;
  gateway_name: string;
  is_active: boolean;
  paystack_public_key: string;
  paystack_secret_key: string;
  paystack_merchant_email: string;
  paystack_callback_url: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_sort_code: string;
  bank_currency: string;
  payment_instructions: string;
  support_email: string;
  support_phone: string;
  metadata?: any;
}

export class PaystackService {
  private static instance: PaystackService | null = null;
  private config: PaystackConfig | null = null;
  private branchId: string | null = null;
  private gateway: PaymentGateway | null = null;

  private constructor() {}

  static getInstance(): PaystackService {
    if (!PaystackService.instance) {
      PaystackService.instance = new PaystackService();
    }
    return PaystackService.instance;
  }

  /**
   * Initialize Paystack with branch configuration - Uses secret key from database
   */
  async initialize(branchId: string): Promise<PaystackConfig | null> {
    try {
      this.branchId = branchId;

      // Fetch config from database
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Paystack initialization error:', error);
        return null;
      }

      if (!data) {
        console.error('No payment gateway found for branch:', branchId);
        return null;
      }

      this.gateway = data;

      // Get public key from database
      const publicKey = data.paystack_public_key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
      
      // Get secret key from database (primary source)
      const secretKey = data.paystack_secret_key || '';

      if (!publicKey) {
        console.error('Paystack public key not configured');
        return null;
      }

      if (!secretKey) {
        console.error('Paystack secret key not configured in database');
        return null;
      }

      this.config = {
        publicKey: publicKey,
        secretKey: secretKey,
        merchantEmail: data.paystack_merchant_email || 'finance@ebenezer.edu.ng',
        callbackUrl: data.paystack_callback_url || `${window.location.origin}/payment/verify`,
      };

      console.log('✅ Paystack initialized successfully with keys from database for branch:', branchId);
      console.log('🔑 Public Key:', publicKey.substring(0, 20) + '...');
      console.log('🔒 Secret Key:', secretKey ? '***** (from database)' : '❌ Missing');
      
      return this.config;
    } catch (error) {
      console.error('Failed to initialize Paystack:', error);
      return null;
    }
  }

  /**
   * Get payment gateway configuration for a branch
   */
  async getPaymentGateway(branchId: string): Promise<PaymentGateway | null> {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching payment gateway:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching payment gateway:', error);
      return null;
    }
  }

  /**
   * Get bank details for a branch
   */
  async getBankDetails(branchId: string): Promise<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    sortCode: string;
    instructions: string;
  } | null> {
    try {
      const gateway = await this.getPaymentGateway(branchId);
      if (!gateway) return null;

      return {
        bankName: gateway.bank_name || 'Zenith Bank',
        accountNumber: gateway.bank_account_number || '1012345678',
        accountName: gateway.bank_account_name || 'ebenezer International School',
        sortCode: gateway.bank_sort_code || '057',
        instructions: gateway.payment_instructions || 'Please use your child\'s admission number as reference.',
      };
    } catch (error) {
      console.error('Error fetching bank details:', error);
      return null;
    }
  }

  /**
   * Initialize a payment transaction with Paystack using secret key from database
   */
  async initializePayment(params: {
    amount: number;
    email: string;
    reference: string;
    metadata?: any;
    callback_url?: string;
  }): Promise<InitializePaymentResponse | null> {
    if (!this.config) {
      throw new Error('Paystack not initialized. Call initialize() first.');
    }

    try {
      console.log('💳 Initializing Paystack payment with secret key from database:', {
        amount: params.amount,
        email: params.email,
        reference: params.reference,
      });

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Paystack uses kobo
          email: params.email,
          reference: params.reference,
          metadata: params.metadata,
          callback_url: params.callback_url || this.config.callbackUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Paystack initialization failed:', data);
        return null;
      }

      console.log('✅ Paystack payment initialized:', data.data.reference);
      return data;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      return null;
    }
  }

  /**
   * Verify a payment transaction with Paystack
   */
  async verifyPayment(reference: string): Promise<VerifyPaymentResponse | null> {
    if (!this.config) {
      throw new Error('Paystack not initialized. Call initialize() first.');
    }

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Paystack verification failed:', data);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Paystack verification error:', error);
      return null;
    }
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Format amount for Paystack (converts to kobo)
   */
  formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Open Paystack popup for payment
   */
  openPaystackPopup(
    authorizationUrl: string,
    onSuccess?: () => void,
    onClose?: () => void
  ): Window | null {
    const popup = window.open(
      authorizationUrl,
      'paystack_popup',
      'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,location=no'
    );

    if (!popup) {
      console.error('Failed to open Paystack popup. Please allow popups.');
      return null;
    }

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        if (onClose) onClose();
      }
    }, 1000);

    return popup;
  }

  /**
   * Get Paystack public key for frontend
   */
  getPublicKey(): string | null {
    return this.config?.publicKey || null;
  }

  /**
   * Check if Paystack is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config?.publicKey && this.config?.secretKey);
  }

  /**
   * Get the current gateway configuration
   */
  getGateway(): PaymentGateway | null {
    return this.gateway;
  }
}

// Export a singleton instance
export const paystackService = PaystackService.getInstance();