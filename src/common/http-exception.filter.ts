import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProductSkuConflictError } from '../products/application/errors/product-sku-conflict.error';
import { InventoryError } from './domain/inventory.error';

interface HttpRequest {
  url: string;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: ErrorBody): void;
}

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();

    const body = this.mapException(exception, request.url);
    response.status(body.statusCode).json(body);
  }

  private mapException(exception: unknown, path: string): ErrorBody {
    if (exception instanceof InventoryError) {
      const status = {
        invalid: HttpStatus.BAD_REQUEST,
        'not-found': HttpStatus.NOT_FOUND,
        conflict: HttpStatus.CONFLICT,
      }[exception.kind];
      return this.body(status, exception.code, exception.message, path);
    }
    if (exception instanceof ProductSkuConflictError) {
      return this.body(
        HttpStatus.CONFLICT,
        'PRODUCT_SKU_CONFLICT',
        exception.message,
        path,
      );
    }

    if (exception instanceof BadRequestException) {
      const errorResponse = exception.getResponse();
      const message =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'message' in errorResponse
          ? (errorResponse.message as string | string[])
          : 'Datos inválidos';
      return this.body(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        message,
        path,
      );
    }

    if (exception instanceof HttpException) {
      return this.body(
        exception.getStatus(),
        'HTTP_ERROR',
        exception.message,
        path,
      );
    }

    return this.body(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Ocurrió un error interno',
      path,
    );
  }

  private body(
    statusCode: number,
    code: string,
    message: string | string[],
    path: string,
  ): ErrorBody {
    return {
      statusCode,
      code,
      message,
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
