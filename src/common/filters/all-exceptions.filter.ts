import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorShape } from '../dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const { message, details } = this.normalizeExceptionResponse(
      exceptionResponse,
      exception,
    );

    const body: ApiErrorShape = {
      success: false,
      error: {
        code: this.toErrorCode(status),
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json({
      ...body,
      path: request.url,
    });
  }

  private normalizeExceptionResponse(
    exceptionResponse: string | object | undefined,
    exception: unknown,
  ) {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const responseBody = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };

      return {
        message: Array.isArray(responseBody.message)
          ? responseBody.message.join(', ')
          : (responseBody.message ?? responseBody.error ?? 'Request failed'),
        details: responseBody.message,
      };
    }

    return {
      message:
        exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
    };
  }

  private toErrorCode(status: number) {
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
