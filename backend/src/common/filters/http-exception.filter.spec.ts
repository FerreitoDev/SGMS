import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter (RFC 7807)', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      contentType: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test-endpoint',
      method: 'POST',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('deve formatar NotFoundException no padrão canônico RFC 7807 com Content-Type application/problem+json', () => {
    const exception = new NotFoundException('Usuário não encontrado.');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.contentType).toHaveBeenCalledWith('application/problem+json');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/not-found',
        title: 'Recurso Não Encontrado',
        status: 404,
        detail: 'Usuário não encontrado.',
        instance: '/api/test-endpoint',
        timestamp: expect.any(String),
      }),
    );
  });

  it('deve formatar BadRequestException com mensagens de validação agrupadas em errors.validation', () => {
    const validationErrors = [
      'username não deve ser vazio',
      'password deve ter no mínimo 6 caracteres',
    ];
    const exception = new BadRequestException(validationErrors);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.contentType).toHaveBeenCalledWith('application/problem+json');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/bad-request',
        title: 'Requisição Inválida',
        status: 400,
        detail: 'Falha na validação dos dados de entrada da requisição.',
        instance: '/api/test-endpoint',
        errors: {
          validation: validationErrors,
        },
      }),
    );
  });

  it('deve preservar o código de erro negocial (code) quando presente na exceção', () => {
    const exception = new ConflictException({
      message: 'Máquina já possui alocação ativa neste turno.',
      code: 'MACHINE_ALREADY_ALLOCATED',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/conflict',
        title: 'Conflito de Regra de Negócio',
        status: 409,
        detail: 'Máquina já possui alocação ativa neste turno.',
        code: 'MACHINE_ALREADY_ALLOCATED',
        instance: '/api/test-endpoint',
      }),
    );
  });

  it('deve formatar erros não tratados como 500 RFC 7807 sem expor stacktrace', () => {
    const error = new Error('Falha de conexão com driver de socket');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.contentType).toHaveBeenCalledWith('application/problem+json');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/internal-server-error',
        title: 'Erro Interno do Servidor',
        status: 500,
        detail: 'Ocorreu um erro interno inesperado no servidor local.',
        instance: '/api/test-endpoint',
      }),
    );
    expect(mockResponse.json).not.toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.anything(),
      }),
    );
  });
});
