import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { ProductSkuConflictError } from '../products/application/errors/product-sku-conflict.error';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function capture(exception: unknown) {
    let statusCode = 0;
    let body: Record<string, unknown> = {};
    const response: { status: jest.Mock; json: jest.Mock } = {
      status: jest.fn((status: number) => {
        statusCode = status;
        return response;
      }),
      json: jest.fn((value: Record<string, unknown>) => {
        body = value;
      }),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/products' }),
      }),
    } as ArgumentsHost;

    filter.catch(exception, host);
    return { statusCode, body };
  }

  it('maps validation errors to VALIDATION_ERROR', () => {
    const result = capture(new BadRequestException(['price is invalid']));
    expect(result).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      body: { code: 'VALIDATION_ERROR', message: ['price is invalid'] },
    });
  });

  it('maps duplicated SKU errors to PRODUCT_SKU_CONFLICT', () => {
    const result = capture(new ProductSkuConflictError('SKU-001'));
    expect(result).toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      body: { code: 'PRODUCT_SKU_CONFLICT' },
    });
  });

  it('sanitizes unexpected errors', () => {
    const result = capture(
      new Error(
        'password=secret postgresql://user:secret@localhost/db SELECT * stack',
      ),
    );
    expect(result).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno' },
    });
    const serialized = JSON.stringify(result.body);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('SELECT');
    expect(serialized).not.toContain('stack');
  });
});
