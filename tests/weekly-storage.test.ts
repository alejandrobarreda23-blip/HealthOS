import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), upsert: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
import { followWeeklyQuestion, saveWeeklyReview } from '../src/repositories/weekly-learning';
import { buildWeeklyLearning } from '../src/health/weekly-learning';
import { saveEvent } from '../src/repositories/events';
import { saveDailyCheckIn } from '../src/repositories/subjective';
const report = buildWeeklyLearning({ points: [], sleeps: [], events: [], checkIns: [] }, '2026-09-06');
beforeEach(() => {
  vi.clearAllMocks(); mocks.from.mockReturnValue({ upsert: mocks.upsert }); mocks.upsert.mockResolvedValue({ error: null });
});
describe('Weekly write boundaries', () => {
  it('blocks a different profile before any write, even for an authenticated admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null });
    await expect(saveWeeklyReview('other-person', report)).rejects.toThrow('propio perfil');
    await expect(followWeeklyQuestion('other-person', report.questions[0], true)).rejects.toThrow('propio perfil');
    await expect(saveEvent('other-person', { eventType: 'travel', startedAt: '2026-09-06T12:00:00Z', physiologicalDate: '2026-09-06' })).rejects.toThrow('propio perfil');
    await expect(saveDailyCheckIn('other-person', '2026-09-06', { stress_score: 2 })).rejects.toThrow('propio perfil');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('requires a verified current session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    await expect(saveWeeklyReview('owner', report)).rejects.toThrow(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('inserts versioned evidence without overwriting duplicate snapshots', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    await saveWeeklyReview('owner', report);
    expect(mocks.from).toHaveBeenCalledWith('associations');
    const [rows, options] = mocks.upsert.mock.calls[0];
    expect(rows.every((row: any) => row.user_id === 'owner' && row.confidence === null)).toBe(true);
    expect(options).toEqual({ onConflict: 'id', ignoreDuplicates: true });
  });
  it('keeps following a question separate from declaring it supported', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    await followWeeklyQuestion('owner', report.questions[0], true);
    expect(mocks.upsert.mock.calls[0][0].status).toBe('testing');
    await followWeeklyQuestion('owner', report.questions[0], false);
    expect(mocks.upsert.mock.calls[1][0].status).toBe('retired');
  });
  it('propagates persistence failures rather than claiming the review is saved', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    mocks.upsert.mockResolvedValue({ error: new Error('storage unavailable') });
    await expect(saveWeeklyReview('owner', report)).rejects.toThrow('storage unavailable');
  });
});
