import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

    // Buscar assinatura do tenant correspondente
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Se por algum motivo não houver assinatura cadastrada, bloqueia a escrita por precaução
    if (!subscription) {
      throw new ForbiddenException('Assinatura não encontrada para este tenant.');
    }

    const { status, dueDate } = subscription;
    const now = new Date();
    const dueDateObj = new Date(dueDate);

    // 1. Plano de Testes (TRIAL) expirado bloqueia imediatamente (sem carência)
    if (status === 'TRIAL') {
      if (now > dueDateObj) {
        throw new ForbiddenException(
          'Seu período de avaliação gratuita de 30 dias expirou. Efetue o pagamento para liberar as funções de escrita.',
        );
      }
      return true;
    }

    // 2. Assinatura Ativa (ACTIVE) permite todas as ações
    if (status === 'ACTIVE') {
      return true;
    }

    // 3. Assinatura Atrasada ou Pendente (OVERDUE ou PENDING)
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
    }

    return true;
  }
}
