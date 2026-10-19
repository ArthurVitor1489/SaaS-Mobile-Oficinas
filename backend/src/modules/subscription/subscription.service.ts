import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSuperAdminEmail, isValidMasterKey } from '../../common/utils/admin-security';

export type SubscriptionStatus = 'ACTIVE' | 'OVERDUE' | 'EXPIRED' | 'TRIAL' | 'CANCELED';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  private verifyAdminAccess(userEmail?: string, masterKey?: string) {
    const isEmailAllowed = isSuperAdminEmail(userEmail);
    const isKeyAllowed = isValidMasterKey(masterKey);

    if (!isEmailAllowed && !isKeyAllowed) {
      throw new UnauthorizedException('Acesso restrito ao Administrador Master.');
    }
  }

  async getSubscription(tenantId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: {
          tenantId,
          plan: 'PRO',
          status: 'TRIAL',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paymentProvider: 'GOOGLE_PLAY',
        },
      });
    }
    return sub;
  }

  async getAdminWorkshops(userEmail?: string, masterKey?: string) {
    this.verifyAdminAccess(userEmail, masterKey);

    const workshops = await this.prisma.workshop.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        subscription: true,
        _count: {
          select: { clients: true, workOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workshops.map((w) => {
      const owner = w.users[0] || null;
      return {
        tenantId: w.id,
        workshopName: w.name,
        phone: w.phone || w.whatsapp || '',
        cnpj: w.cnpj || '',
        createdAt: w.createdAt,
        ownerName: owner?.name || 'Sem usuário',
        ownerEmail: owner?.email || w.email || '',
        clientsCount: w._count.clients,
        ordersCount: w._count.workOrders,
        subscription: w.subscription || {
          plan: 'PRO',
          status: 'TRIAL',
          dueDate: new Date(new Date(w.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      };
    });
  }

  async adminManageSubscription(
    userEmail: string | undefined,
    masterKey: string | undefined,
    body: {
      tenantId?: string;
      email?: string;
      action: 'LIFETIME' | 'ACTIVE_30D' | 'TRIAL_7D' | 'BLOCK';
    },
  ) {
    this.verifyAdminAccess(userEmail, masterKey);

    let targetTenantId = body.tenantId;

    if (!targetTenantId && body.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      });
      if (!user) {
        throw new NotFoundException(`Nenhuma oficina encontrada com o e-mail ${body.email}`);
      }
      targetTenantId = user.tenantId;
    }

    if (!targetTenantId) {
      throw new BadRequestException('Informe o tenantId ou o e-mail da oficina.');
    }

    const workshop = await this.prisma.workshop.findUnique({
      where: { id: targetTenantId },
    });
    if (!workshop) {
      throw new NotFoundException('Oficina não encontrada.');
    }

    let plan = 'PRO';
    let status: SubscriptionStatus = 'ACTIVE';
    let dueDate = new Date();

    switch (body.action) {
      case 'LIFETIME':
        plan = 'LIFETIME';
        status = 'ACTIVE';
        dueDate = new Date('2099-12-31T23:59:59.000Z');
        break;
      case 'ACTIVE_30D':
        plan = 'PRO';
        status = 'ACTIVE';
        dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'TRIAL_7D':
        plan = 'PRO';
        status = 'TRIAL';
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'BLOCK':
        plan = 'PRO';
        status = 'EXPIRED';
        dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      default:
        throw new BadRequestException('Ação inválida.');
    }

    const updatedSub = await this.prisma.subscription.upsert({
      where: { tenantId: targetTenantId },
      create: {
        tenantId: targetTenantId,
        plan,
        status,
        dueDate,
        paymentProvider: 'ADMIN_MANUAL',
      },
      update: {
        plan,
        status,
        dueDate,
        paymentProvider: 'ADMIN_MANUAL',
      },
    });

    return {
      success: true,
      workshopName: workshop.name,
      subscription: updatedSub,
    };
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
        invoiceUrl: null,
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

