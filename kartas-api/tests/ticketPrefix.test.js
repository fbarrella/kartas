import { generateUniqueTicketPrefix, generateNextStoryId, generateNextEpicId } from '../src/utils/ticketPrefix.js';

// Mock the query function
jest.mock('../src/config/database.js', () => ({
    query: jest.fn()
}));

import { query } from '../src/config/database.js';

describe('Ticket Prefix Generation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateUniqueTicketPrefix', () => {
        it('should generate prefix from multi-word project name', async () => {
            query.mockResolvedValue({ rows: [] });

            const prefix = await generateUniqueTicketPrefix('Good Guys');
            expect(prefix).toBe('GGY');
        });

        it('should generate prefix from single-word project name', async () => {
            query.mockResolvedValue({ rows: [] });

            const prefix = await generateUniqueTicketPrefix('Phoenix');
            expect(prefix).toBe('PHO');
        });

        it('should append number if prefix already exists', async () => {
            query.mockResolvedValue({
                rows: [{ ticket_prefix: 'GGY' }]
            });

            const prefix = await generateUniqueTicketPrefix('Good Guys');
            expect(prefix).toBe('GGY-1');
        });

        it('should find next available number', async () => {
            query.mockResolvedValue({
                rows: [
                    { ticket_prefix: 'GGY' },
                    { ticket_prefix: 'GGY-1' },
                    { ticket_prefix: 'GGY-2' }
                ]
            });

            const prefix = await generateUniqueTicketPrefix('Good Guys');
            expect(prefix).toBe('GGY-3');
        });

        it('should handle special characters in project name', async () => {
            query.mockResolvedValue({ rows: [] });

            const prefix = await generateUniqueTicketPrefix('Project #1 - Team!');
            expect(prefix).toBe('PT');
        });
    });

    describe('generateNextStoryId', () => {
        it('should generate first story ID', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ ticket_prefix: 'GGY' }] })
                .mockResolvedValueOnce({ rows: [] });

            const storyId = await generateNextStoryId(1);
            expect(storyId).toBe('GGY-0001');
        });

        it('should generate next story ID', async () => {
            query
                .mockResolvedValueOnce({ rows: [{ ticket_prefix: 'GGY' }] })
                .mockResolvedValueOnce({ rows: [{ story_id: 'GGY-0042' }] });

            const storyId = await generateNextStoryId(1);
            expect(storyId).toBe('GGY-0043');
        });
    });

    describe('generateNextEpicId', () => {
        it('should generate first epic ID', async () => {
            query.mockResolvedValue({ rows: [] });

            const epicId = await generateNextEpicId();
            expect(epicId).toBe('EPIC-0001');
        });

        it('should generate next epic ID', async () => {
            query.mockResolvedValue({ rows: [{ epic_id: 'EPIC-0005' }] });

            const epicId = await generateNextEpicId();
            expect(epicId).toBe('EPIC-0006');
        });
    });
});
