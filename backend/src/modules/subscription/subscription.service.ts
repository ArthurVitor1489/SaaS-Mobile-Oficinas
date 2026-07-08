import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      // Recebimento confirmado: ativa a assinatura e atualiza o vencimento
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
}
