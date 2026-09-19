import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let checkConnection: jest.Mock;

  beforeEach(async () => {
    checkConnection = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { checkConnection } },
      ],
    }).compile();
    service = module.get(HealthService);
  });

  it('reports a connected database', async () => {
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
    expect(checkConnection).toHaveBeenCalledTimes(1);
  });

  it('returns a safe service-unavailable error when the query fails', async () => {
    checkConnection.mockRejectedValue(new Error('sensitive connection detail'));
    await expect(service.check()).rejects.toEqual(
      new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      }),
    );
  });
});
