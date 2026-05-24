import { computeEscalationLevel, isTicketOnHold, isActiveQueueTicket, shouldReleaseHold } from './sla.engine';

describe('computeEscalationLevel', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('returns normal when more than 5 days remain', () => {
    const dueAt = new Date('2025-01-22T12:00:00Z');
    const result = computeEscalationLevel({ dueAt, currentPriority: 'normal' }, now);
    expect(result.priority).toBe('normal');
    expect(result.isOverdue).toBe(false);
  });

  it('returns elevated when 2-5 days remain', () => {
    const dueAt = new Date('2025-01-18T12:00:00Z');
    const result = computeEscalationLevel({ dueAt, currentPriority: 'normal' }, now);
    expect(result.priority).toBe('elevated');
    expect(result.level).toBe(2);
  });

  it('returns high when less than 48 hours remain', () => {
    const dueAt = new Date('2025-01-16T12:00:00Z');
    const result = computeEscalationLevel({ dueAt, currentPriority: 'normal' }, now);
    expect(result.priority).toBe('high');
    expect(result.level).toBe(3);
  });

  it('returns urgent when less than 24 hours remain', () => {
    const dueAt = new Date('2025-01-15T20:00:00Z');
    const result = computeEscalationLevel({ dueAt, currentPriority: 'normal' }, now);
    expect(result.priority).toBe('urgent');
    expect(result.level).toBe(4);
  });

  it('returns critical when overdue', () => {
    const dueAt = new Date('2025-01-14T12:00:00Z');
    const result = computeEscalationLevel({ dueAt, currentPriority: 'normal' }, now);
    expect(result.priority).toBe('critical');
    expect(result.isOverdue).toBe(true);
    expect(result.level).toBe(5);
  });

  it('returns current priority when no due date', () => {
    const result = computeEscalationLevel({ dueAt: null, currentPriority: 'high' }, now);
    expect(result.priority).toBe('high');
    expect(result.hoursRemaining).toBeNull();
  });
});

describe('hold logic', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('detects ticket on hold via holdUntil', () => {
    expect(
      isTicketOnHold({ holdUntil: new Date('2025-01-16T12:00:00Z'), status: 'open' }, now),
    ).toBe(true);
  });

  it('detects ticket on hold via status', () => {
    expect(isTicketOnHold({ holdUntil: null, status: 'waiting_for_user' }, now)).toBe(true);
  });

  it('excludes on-hold tickets from active queue', () => {
    expect(
      isActiveQueueTicket({
        holdUntil: new Date('2025-01-16T12:00:00Z'),
        status: 'open',
        deletedAt: null,
      }, now),
    ).toBe(false);
  });

  it('includes open tickets in active queue', () => {
    expect(
      isActiveQueueTicket({ holdUntil: null, status: 'open', deletedAt: null }, now),
    ).toBe(true);
  });

  it('should release hold when holdUntil passed', () => {
    expect(shouldReleaseHold({ holdUntil: new Date('2025-01-14T12:00:00Z') }, now)).toBe(true);
    expect(shouldReleaseHold({ holdUntil: new Date('2025-01-16T12:00:00Z') }, now)).toBe(false);
    expect(shouldReleaseHold({ holdUntil: null }, now)).toBe(false);
  });
});
