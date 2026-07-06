import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PassportModule,
    SubscriptionModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'voltruck-saas-super-secret-access-key-2026',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
