import request from 'supertest';
import app from '../src/index.js';
import { query } from '../src/config/database.js';

describe('Story Endpoints', () => {
    let adminToken;
    let testProjectId;
    let testStoryId;

    beforeAll(async () => {
        // Login and create test project
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testadmin@test.com',
                password: 'TestPassword123!'
            });

        adminToken = loginRes.body.token;

        const projectRes = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Test Story Project',
                description: 'For testing stories'
            });

        testProjectId = projectRes.body.id;
    });

    afterAll(async () => {
        // Clean up
        await query('DELETE FROM projects WHERE name = \'Test Story Project\'');
    });

    describe('POST /api/stories', () => {
        it('should create a new story', async () => {
            const res = await request(app)
                .post('/api/stories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    projectId: testProjectId,
                    title: 'Test Story',
                    description: 'Test description',
                    type: 'story',
                    storyPoints: 5
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('title', 'Test Story');
            expect(res.body).toHaveProperty('storyId');
            expect(res.body.storyId).toMatch(/^[A-Z]+-\d+$/);

            testStoryId = res.body.id;
        });

        it('should reject story without title', async () => {
            const res = await request(app)
                .post('/api/stories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    projectId: testProjectId,
                    description: 'No title'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/stories/project/:projectId', () => {
        it('should get project stories', async () => {
            const res = await request(app)
                .get(`/api/stories/project/${testProjectId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('PUT /api/stories/:storyId', () => {
        it('should update story', async () => {
            const res = await request(app)
                .put(`/api/stories/${testStoryId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Updated Story Title',
                    status: 'in_development'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', 'Updated Story Title');
            expect(res.body).toHaveProperty('status', 'in_development');
        });
    });

    describe('DELETE /api/stories/:storyId', () => {
        it('should delete story', async () => {
            const res = await request(app)
                .delete(`/api/stories/${testStoryId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });
    });
});
