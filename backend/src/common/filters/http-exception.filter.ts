import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from '../interfaces/problem-details.interface';

const HTTP_TITLES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição Inválida',
  [HttpStatus.UNAUTHORIZED]: 'Não Autorizado',
  [HttpStatus.FORBIDDEN]: 'Acesso Proibido',
  [HttpStatus.NOT_FOUND]: 'Recurso Não Encontrado',
  [HttpStatus.CONFLICT]: 'Conflito de Regra de Negócio',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Entidade Improcessável',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro Interno do Servidor',
};

const HTTP_TYPES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'https://sgms.gepf.local/errors/bad-request',
  [HttpStatus.UNAUTHORIZED]: 'https://sgms.gepf.local/errors/unauthorized',
  [HttpStatus.FORBIDDEN]: 'https://sgms.gepf.local/errors/forbidden',
  [HttpStatus.NOT_FOUND]: 'https://sgms.gepf.local/errors/not-found',
  [HttpStatus.CONFLICT]: 'https://sgms.gepf.local/errors/conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'https://sgms.gepf.local/errors/unprocessable-entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'https://sgms.gepf.local/errors/internal-server-error',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = HTTP_TITLES[HttpStatus.INTERNAL_SERVER_ERROR];
    let type = HTTP_TYPES[HttpStatus.INTERNAL_SERVER_ERROR];
    let detail = 'Ocorreu um erro interno inesperado no servidor local.';
    let code: string | undefined;
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = HTTP_TITLES[status] ?? `Erro HTTP ${status}`;
      type = HTTP_TYPES[status] ?? `https://sgms.gepf.local/errors/http-${status}`;

      const res = exception.getResponse();

      if (typeof res === 'string') {
        detail = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        if (typeof resObj.title === 'string') {
          title = resObj.title;
        }

        if (typeof resObj.type === 'string') {
          type = resObj.type;
        }

        if (typeof resObj.code === 'string') {
          code = resObj.code;
        }

        if (Array.isArray(resObj.message)) {
          detail = 'Falha na validação dos dados de entrada da requisição.';
          errors = {
            validation: resObj.message.map((msg) => String(msg)),
          };
        } else if (typeof resObj.message === 'string') {
          detail = resObj.message;
        }

        if (
          typeof resObj.errors === 'object' &&
          resObj.errors !== null &&
          !Array.isArray(resObj.errors)
        ) {
          errors = resObj.errors as Record<string, string[]>;
        }
      }
    } else {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Erro não tratado capturado em [${request.method} ${request.url}]: ${err.message}`,
        err.stack,
      );
    }

    const problem: ProblemDetails = {
      type,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
      ...(errors ? { errors } : {}),
    };

    response
      .status(status)
      .contentType('application/problem+json')
      .json(problem);
  }
}
