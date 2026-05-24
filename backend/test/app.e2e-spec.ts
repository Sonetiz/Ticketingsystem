import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tickets API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionCookie: string;
  let csrfToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent@ticketsystem.local', password: 'password123' });

    if (loginRes.status === 200) {
      sessionCookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
      csrfToken = loginRes.body.csrfToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login - authenticates agent', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent@ticketsystem.local', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
  });

  it('GET /api/tickets - lists tickets for authenticated user', async () => {
    if (!sessionCookie) return;

    const res = await request(app.getHttpServer())
      .get('/api/tickets?view=active')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/tickets - creates a ticket', async () => {
    if (!sessionCookie || !csrfToken) return;

    const res = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Cookie', sessionCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'E2E Test Ticket',
        description: 'Created by integration test',
        priority: 'normal',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('E2E Test Ticket');
  });

  it('GET /api/tickets/dashboard - returns stats', async () => {
    if (!sessionCookie) return;

    const res = await request(app.getHttpServer())
      .get('/api/tickets/dashboard')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.openTickets).toBeDefined();
  });
});

describe('Public ticket access (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid magic link token', async () => {
    const res = await request(app.getHttpServer()).get('/api/public/tickets/invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('Management portal permissions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies management access to agent role', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent@ticketsystem.local', password: 'password123' });

    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';

    const res = await request(app.getHttpServer())
      .get('/api/manage/users')
      .set('Cookie', cookie);

    expect(res.status).toBe(401);
  });

  it('allows management access to admin role', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@ticketsystem.local', password: 'password123' });

    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';

    const res = await request(app.getHttpServer())
      .get('/api/manage/users')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
