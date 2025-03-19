import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: exception.message || 'Internal server error',
            error: exception.name || 'Error',
          };

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : errorResponse['message'] || errorResponse;

    response.status(status).json({
      success: false, // Optionally include a success flag
      statusCode: status,
      message,
      error: errorResponse['error'] || exception.name || 'Unknown Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
