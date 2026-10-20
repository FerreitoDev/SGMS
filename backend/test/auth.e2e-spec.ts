import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testManagerUsername = 'e2e.manager';
  const testInactiveUsername = 'e2e.inactive';
  const rawPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Preparar usuários de teste no banco
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.deleteMany({
      where: {
        username: { in: [testManagerUsername, testInactiveUsername] },
      },
    });

    await prisma.user.create({
      data: {
        name: 'Gerente E2E',
        username: testManagerUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        name: 'Inativo E2E',
        username: testInactiveUsername,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: { in: [testManagerUsername, testInactiveUsername] },
      },
    });
    await app.close();
  });

  it('POST /api/auth/login - deve autenticar credenciais válidas e retornar 200 OK com JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: testManagerUsername,
        password: rawPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user).toEqual({
      id: expect.any(String),
      name: 'Gerente E2E',
      username: testManagerUsername,
      role: UserRole.GERENTE,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/login - deve retornar 401 Unauthorized em RFC 7807 para senha incorreta', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: testManagerUsername,
        password: 'senha_completamente_errada',
      })
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/unauthorized',
        title: 'Não Autorizado',
        status: 401,
        detail: 'Credenciais inválidas.',
        instance: '/api/auth/login',
        timestamp: expect.any(String),
      }),
    );
  });

  it('POST /api/auth/login - deve retornar 403 Forbidden para tentativa de login de usuário inativo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: testInactiveUsername,
        password: rawPassword,
      })
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/forbidden',
        title: 'Acesso Proibido',
        status: 403,
        detail: 'Usuário inativo. Contate o Gerente de Produção.',
        code: 'USER_INACTIVE',
        instance: '/api/auth/login',
        timestamp: expect.any(String),
      }),
    );
  });

  it('GET /api/auth/me - deve retornar dados cadastrais quando autenticado com Bearer token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: testManagerUsername,
        password: rawPassword,
      });

    const token = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body).toEqual({
      id: expect.any(String),
      name: 'Gerente E2E',
      username: testManagerUsername,
      role: UserRole.GERENTE,
      isActive: true,
    });
  });

  it('GET /api/auth/me - deve retornar 401 Unauthorized em RFC 7807 quando chamada sem token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/unauthorized',
        title: 'Não Autorizado',
        status: 401,
        instance: '/api/auth/me',
      }),
    );
  });
});
