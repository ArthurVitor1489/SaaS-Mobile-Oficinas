import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSuperAdminEmail } from '../../common/utils/admin-security';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there is no user attached (e.g. public routes), bypass the guard
    if (!user || !user.tenantId) {
      return true;
    }

    // Leitura (GET) sempre liberada para visualização histórica e exportações
    if (request.method === 'GET') {
      return true;
    }

    if (user.role === 'SUPER_ADMIN' || isSuperAdminEmail(user.email)) {
      return true;
    }

    // Buscar assinatura do tenant correspondente
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Se a oficina foi criada antes da criação automática de trial, provisiona 7 dias de TRIAL automaticamente
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          tenantId: user.tenantId,
          plan: 'PRO',
          status: 'TRIAL',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paymentProvider: 'GOOGLE_PLAY',
        },
      });
    }

    const { status, dueDate, plan } = subscription;
    if (plan === 'LIFETIME') {
      return true;
    }

    const now = new Date();
    const dueDateObj = new Date(dueDate);

    // 1. Plano de Testes (TRIAL) expirado bloqueia imediatamente
    if (status === 'TRIAL') {
      if (now > dueDateObj) {
        throw new ForbiddenException(
          'Seu período de avaliação gratuita de 7 dias expirou. Assine o Plano Oficina Pro para liberar as funções de escrita.',
        );
      }
      return true;
    }

    // 2. Assinatura Ativa (ACTIVE) permite todas as ações
    if (status === 'ACTIVE') {
      return true;
    }

    // 3. Assinatura Expirada ou Cancelada (EXPIRED ou CANCELED)
    if (status === 'EXPIRED' || status === 'CANCELED') {
      if (now > dueDateObj) {
        throw new ForbiddenException(
          'Sua assinatura está inativa ou expirada. Reative o Plano Oficina Pro no Google Play para continuar.',
        );
      }
      return true;
    }

    // 4. Assinatura Atrasada ou Pendente (OVERDUE ou PENDING)
    if (status === 'OVERDUE' || status === 'PENDING') {
      // Calcular a diferença em dias
      const diffTime = now.getTime() - dueDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Se passou da carência de 7 dias, bloqueia a escrita
      if (diffDays > 7) {
        throw new ForbiddenException(
          'Assinatura vencida há mais de 7 dias. Funcionalidades de alteração bloqueadas. Por favor, regularize o pagamento.',
        );
      }
      return true;
    }

    return false;
  }
}
