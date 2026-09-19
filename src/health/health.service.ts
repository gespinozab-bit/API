import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
  database: 'connected';
}

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.prismaService.checkConnection();
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }
  }
}
