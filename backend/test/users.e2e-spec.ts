import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

describe('UsersModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let operatorToken: string;

  const managerUsername = 'e2e.user.mgr';
  const operatorUsername = 'e2e.user.op';
  const newOperatorUsername = 'e2e.user.created';
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

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername, newOperatorUsername] },
      },
    });

    await prisma.user.create({
      data: {
        name: 'Gerente Users E2E',
        username: managerUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        name: 'Operador Users E2E',
        username: operatorUsername,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });

    // Obter tokens JWT
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: managerUsername, password: rawPassword });
    managerToken = mgrLogin.body.accessToken;

    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: operatorUsername, password: rawPassword });
    operatorToken = opLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername, newOperatorUsername] },
      },
    });
    await app.close();
  });

  it('POST /api/users - Gerente cadastra operador e recebe 201 Created sem passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Novo Operador E2E',
        username: newOperatorUsername,
        password: rawPassword,
      })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Novo Operador E2E',
      username: newOperatorUsername,
      role: UserRole.OPERADOR,
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('POST /api/users - Tentativa de criar operador com login duplicado retorna 409 Conflict em RFC 7807', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Operador Duplicado',
        username: newOperatorUsername,
        password: rawPassword,
      })
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/conflict',
        title: 'Conflito de Regra de Negócio',
        status: 409,
        code: 'USERNAME_ALREADY_EXISTS',
        instance: '/api/users',
      }),
    );
  });

  it('POST /api/users - Operador tentando acessar rota de Gerente recebe 403 Forbidden em RFC 7807', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'Tentativa Invalida',
        username: 'invalido',
        password: rawPassword,
      })
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        type: 'https://sgms.gepf.local/errors/forbidden',
        title: 'Acesso Proibido',
        status: 403,
        code: 'FORBIDDEN_ROLE',
        instance: '/api/users',
      }),
    );
  });

  it('GET /api/users - Gerente lista operadores cadastrados ordenados por nome', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).toHaveProperty('username');
    expect(response.body[0].passwordHash).toBeUndefined();
  });

  it('GET /api/users - Operador tentando listar operadores recebe 403 Forbidden', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 403,
        code: 'FORBIDDEN_ROLE',
      }),
    );
  });

  it('PATCH /api/users/:id/status - Gerente atualiza status do operador', async () => {
    const userToUpdate = await prisma.user.findUnique({
      where: { username: newOperatorUsername },
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/users/${userToUpdate!.id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(response.body.id).toBe(userToUpdate!.id);
    expect(response.body.isActive).toBe(false);
  });
});
