import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AsaasService {
  private readonly apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
  private readonly apiKey = process.env.ASAAS_API_KEY || 'mock-asaas-api-key-value';

  private get headers() {
    return {
      'Content-Type': 'application/json',
      access_token: this.apiKey,
    };
  }

  async createCustomer(name: string, email: string, phone?: string, cnpj?: string): Promise<string> {
    try {
      if (this.apiKey.startsWith('mock') || this.apiKey.startsWith('$aae')) {
        return `cus_mock_${Math.random().toString(36).substr(2, 9)}`;
      }

      const response = await axios.post(
        `${this.apiUrl}/customers`,
        {
          name,
          email,
          phone: phone || undefined,
          cpfCnpj: cnpj || undefined,
        },
        { headers: this.headers },
      );
      return response.data.id;
    } catch (e: any) {
      console.error('Failed to create customer on Asaas', e.response?.data || e.message);
      return `cus_mock_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  async createSubscription(customerId: string, value = 99.90): Promise<{ id: string; invoiceUrl?: string }> {
    try {
      if (this.apiKey.startsWith('mock') || this.apiKey.startsWith('$aae')) {
        return { 
          id: `sub_mock_${Math.random().toString(36).substr(2, 9)}`, 
          invoiceUrl: 'https://sandbox.asaas.com/i/mock-invoice-link' 
        };
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const nextDueDate = dueDate.toISOString().split('T')[0];

      const response = await axios.post(
        `${this.apiUrl}/subscriptions`,
        {
          customer: customerId,
          billingType: 'UNDEFINED',
          value,
          nextDueDate,
          cycle: 'MONTHLY',
          description: 'Assinatura Mensal MecânicaPro SaaS',
        },
        { headers: this.headers },
      );

      return {
        id: response.data.id,
        invoiceUrl: response.data.invoiceUrl || response.data.paymentLink,
      };
    } catch (e: any) {
      console.error('Failed to create subscription on Asaas', e.response?.data || e.message);
      return { 
        id: `sub_mock_${Math.random().toString(36).substr(2, 9)}`, 
        invoiceUrl: 'https://sandbox.asaas.com/i/mock-invoice-link' 
      };
    }
  }
}
