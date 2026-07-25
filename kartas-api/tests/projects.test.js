import request from 'supertest';
import app from '../src/index.js';
import { query } from '../src/config/database.js';

describe('Project Endpoints', () => {
    let adminToken;
    let testProjectId;

    beforeAll(async () => {
        // Login as admin to get token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testadmin@test.com',
                password: 'TestPassword123!'
            });

        adminToken = loginRes.body.token;

        // Clean up test projects
        await query('DELETE FROM projects WHERE name LIKE \'Test Project%\'');
    });

    afterAll(async () => {
        // Clean up
        await query('DELETE FROM projects WHERE name LIKE \'Test Project%\'');
    });

    describe('POST /api/projects', () => {
        it('should create a new project', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Test Project 1',
                    description: 'A test project'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name', 'Test Project 1');
            expect(res.body).toHaveProperty('ticketPrefix');
            expect(res.body.ticketPrefix).toMatch(/^[A-Z]+$/);

            testProjectId = res.body.id;
        });

        it('should reject project creation without auth', async () => {
            const res = await request(app)
                .post('/api/projects')
                .send({
                    name: 'Test Project 2',
                    description: 'Another test project'
                });

            expect(res.status).toBe(401);
        });

        it('should reject project with invalid name', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'T', // Too short
                    description: 'Test'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/projects', () => {
        it('should get user projects', async () => {
            const res = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .get('/api/projects');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/projects/:projectId', () => {
        it('should get project details', async () => {
            const res = await request(app)
                .get(`/api/projects/${testProjectId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', testProjectId);
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('members');
            expect(Array.isArray(res.body.members)).toBe(true);
        });

        it('should return 404 for non-existent project', async () => {
            const res = await request(app)
                .get('/api/projects/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/projects/:projectId', () => {
        it('should update project', async () => {
            const res = await request(app)
                .put(`/api/projects/${testProjectId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated Test Project',
                    description: 'Updated description'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Test Project');
            expect(res.body).toHaveProperty('description', 'Updated description');
        });
    });

    describe('DELETE /api/projects/:projectId', () => {
        it('should delete project', async () => {
            const res = await request(app)
                .delete(`/api/projects/${testProjectId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });
    });
});
