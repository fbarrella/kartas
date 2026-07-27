import request from 'supertest';
import app from '../src/index.js';
import { query } from '../src/config/database.js';

describe('Epic Endpoints', () => {
    let adminToken;
    let testProjectId;
    let testEpicId;

    beforeAll(async () => {
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
                name: 'Test Epic Project',
                description: 'For testing epic progress'
            });

        testProjectId = projectRes.body.id;

        const epicRes = await request(app)
            .post(`/api/project/${testProjectId}/epics`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Test Epic' });

        testEpicId = epicRes.body.id;
    });

    afterAll(async () => {
        await query('DELETE FROM projects WHERE name = \'Test Epic Project\'');
    });

    describe('GET /api/project/:projectId/epics', () => {
        it('should return progress_percent 0 for an epic with no stories', async () => {
            const res = await request(app)
                .get(`/api/project/${testProjectId}/epics`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            const epic = res.body.find(e => e.id === testEpicId);
            expect(epic).toHaveProperty('progress_percent', 0);
            expect(typeof epic.story_count).toBe('number');
            expect(typeof epic.done_story_count).toBe('number');
        });

        it('should compute progress_percent as done/total stories', async () => {
            const story1Res = await request(app)
                .post('/api/stories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ projectId: testProjectId, epicId: testEpicId, title: 'Story 1', type: 'story' });

            const story2Res = await request(app)
                .post('/api/stories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ projectId: testProjectId, epicId: testEpicId, title: 'Story 2', type: 'story' });

            await request(app)
                .put(`/api/stories/${story1Res.body.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'done' });

            const res = await request(app)
                .get(`/api/epics/${testEpicId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.story_count).toBe(2);
            expect(res.body.done_story_count).toBe(1);
            expect(res.body.progress_percent).toBe(50);

            await request(app).delete(`/api/stories/${story1Res.body.id}`).set('Authorization', `Bearer ${adminToken}`);
            await request(app).delete(`/api/stories/${story2Res.body.id}`).set('Authorization', `Bearer ${adminToken}`);
        });
    });
});
