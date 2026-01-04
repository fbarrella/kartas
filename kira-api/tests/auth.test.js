import request from 'supertest';
import app from '../src/index.js';
import { query } from '../src/config/database.js';

describe('Authentication Endpoints', () => {
    let adminToken;
    let testUserId;

    beforeAll(async () => {
        // Clean up test data
        await query('DELETE FROM users WHERE email LIKE \'test%@test.com\'');
    });

    afterAll(async () => {
        // Clean up
        await query('DELETE FROM users WHERE email LIKE \'test%@test.com\'');
    });

    describe('POST /api/auth/setup', () => {
        it('should create first admin user', async () => {
            const res = await request(app)
                .post('/api/auth/setup')
                .send({
                    email: 'testadmin@test.com',
                    password: 'TestPassword123!',
                    firstName: 'Test',
                    lastName: 'Admin'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'testadmin@test.com');
            expect(res.body.user).toHaveProperty('role', 'admin');

            adminToken = res.body.token;
            testUserId = res.body.user.id;
        });

        it('should reject duplicate admin setup', async () => {
            const res = await request(app)
                .post('/api/auth/setup')
                .send({
                    email: 'testadmin2@test.com',
                    password: 'TestPassword123!',
                    firstName: 'Test',
                    lastName: 'Admin2'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'testadmin@test.com',
                    password: 'TestPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'testadmin@test.com');
        });

        it('should reject incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'testadmin@test.com',
                    password: 'WrongPassword'
                });

            expect(res.status).toBe(401);
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'TestPassword123!'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/check-admin', () => {
        it('should return true when admin exists', async () => {
            const res = await request(app)
                .get('/api/auth/check-admin');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('adminExists', true);
        });
    });
});
