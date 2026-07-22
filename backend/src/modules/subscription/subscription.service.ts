import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (!sub) {
      throw new NotFoundException('Assinatura não encontrada para esta oficina.');
    }
    return sub;
  }

  async handleWebhook(body: any) {
    const { event, payment } = body;
    if (!payment || !payment.subscription) {
      console.log('Skipping webhook event without subscription reference:', event);
      return { received: true };
    }

    const subscriptionId = payment.subscription;

    // Localizar assinatura com base no paymentId (ID da assinatura no Asaas)
    const sub = await this.prisma.subscription.findFirst({
      where: { paymentId: subscriptionId },
    });

    if (!sub) {
      console.warn(`Subscription with paymentId ${subscriptionId} not found in database.`);
      return { received: true };
    }

    console.log(`Processing Asaas Webhook: Event: ${event}, Tenant: ${sub.tenantId}`);

    if (event === 'PAYMENT_RECEIVED') {
      // Recebimento confirmed: ativa a assinatura e atualiza o vencimento
      const newDueDate = payment.dueDate ? new Date(payment.dueDate) : new Date();
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          dueDate: newDueDate,
          invoiceUrl: payment.invoiceUrl || payment.paymentLink || undefined,
        },
      });
      console.log(`Tenant ${sub.tenantId} subscription updated to ACTIVE until ${newDueDate.toISOString()}`);
    } else if (event === 'PAYMENT_OVERDUE') {
      // Vencimento sem pagamento
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'OVERDUE',
        },
      });
      console.log(`Tenant ${sub.tenantId} subscription updated to OVERDUE.`);
    }

    return { received: true };
  }

  async handleRevenueCatWebhook(body: any, authHeader?: string) {
    // 1. Verificar token de autorização do webhook se configurado
    const expectedToken = process.env.REVENUECAT_WEBHOOK_TOKEN;
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      throw new UnauthorizedException('Token de webhook do RevenueCat inválido.');
    }

    const { event } = body;
    if (!event) {
      console.warn('RevenueCat webhook received without event data');
      return { received: true };
    }

    const { type, app_user_id, expiration_at_ms, original_transaction_id } = event;
    const tenantId = app_user_id;

    if (!tenantId) {
      console.warn('RevenueCat event missing app_user_id (tenantId)');
      return { received: true };
    }

    // Verificar se o workshop/tenant existe
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: tenantId },
    });

    if (!workshop) {
      console.warn(`Workshop with tenantId ${tenantId} not found.`);
      return { received: true };
    }

    console.log(`Processing RevenueCat Webhook: Event: ${type}, Tenant: ${tenantId}`);

    let status: SubscriptionStatus = 'ACTIVE';
    const dueDate = expiration_at_ms ? new Date(expiration_at_ms) : new Date();

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        status = 'ACTIVE';
        break;
      case 'EXPIRATION':
        status = 'EXPIRED';
        break;
      case 'CANCELLATION':
        // Se cancelou a renovação automática, mas a expiração ainda está no futuro,
        // mantém como ACTIVE até que a data de expiração expire.
        if (dueDate.getTime() < Date.now()) {
          status = 'CANCELED';
        } else {
          status = 'ACTIVE';
        }
        break;
      case 'BILLING_ISSUE':
        status = 'OVERDUE';
        break;
      case 'TRANSFER':
        status = 'ACTIVE';
        break;
      default:
        console.log(`Unhandled RevenueCat event type: ${type}`);
        return { received: true };
    }

    // Atualiza ou cria a assinatura do tenant
    await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'PRO',
        status,
        dueDate,
        paymentProvider: 'REVENUECAT',
        paymentId: original_transaction_id || null,
        invoiceUrl: null, // Faturas nativas não usam URL externa
      },
      update: {
        status,
        dueDate,
        paymentProvider: 'REVENUECAT',
        paymentId: original_transaction_id || undefined,
      },
    });

    console.log(`Tenant ${tenantId} subscription updated via RevenueCat webhook to ${status} until ${dueDate.toISOString()}`);
    return { received: true };
  }
}

