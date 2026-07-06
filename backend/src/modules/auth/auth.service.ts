import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AsaasService } from '../subscription/asaas.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly asaasService: AsaasService,
  ) {}

  async signUp(dto: SignUpDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new BadRequestException('E-mail já cadastrado.');
    }

    // Call Asaas API outside database transaction to prevent pool blocking
    const asaasCustomerId = await this.asaasService.createCustomer(
      dto.workshopName,
      dto.email,
      dto.phone,
      dto.cnpj,
    );

    const asaasSub = await this.asaasService.createSubscription(asaasCustomerId);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          name: dto.workshopName,
          cnpj: dto.cnpj || null,
          phone: dto.phone || null,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: workshop.id,
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: 'ADMIN',
        },
      });

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      await tx.subscription.create({
        data: {
          tenantId: workshop.id,
          plan: 'BASIC',
          status: 'TRIAL',
          dueDate: trialEndDate,
          paymentProvider: 'ASAAS',
          paymentId: asaasSub.id,
        },
      });

      return {
        success: true,
        message: 'Oficina cadastrada com sucesso!',
        userId: user.id,
        tenantId: workshop.id,
        invoiceUrl: asaasSub.invoiceUrl,
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { workshop: { include: { subscription: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    // Generate tokens
    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    
    // Simple mock refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'voltruck-saas-super-secret-refresh-key-2026',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    // Hash and save refresh token in db
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        workshop: {
          id: user.workshop.id,
          name: user.workshop.name,
          subscription: user.workshop.subscription,
        },
      },
    };
  }

  async refreshToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Acesso negado.');
    }

    const isTokenValid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Acesso negado.');
    }

    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }
}
