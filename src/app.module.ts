import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
        PORT: Joi.number().port().default(3000),
      }),
    }),
    PrismaModule,
    HealthModule,
    ProductsModule,
  ],
})
export class AppModule {}
