describe('email reply matching', () => {
  it('extracts ticket number from subject', () => {
    const subject = 'Re: [#TICKET-42] VPN issue';
    const match = subject.match(/\[#TICKET-(\d+)\]/i);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBe(42);
  });

  it('matches In-Reply-To header chain', () => {
    const inReplyTo = '<original-msg-id@mail.local>';
    const references = ['<original-msg-id@mail.local>', '<other@mail.local>'];
    expect(references.includes(inReplyTo)).toBe(true);
  });

  it('deduplicates by messageId', () => {
    const seen = new Set<string>();
    const messageId = '<unique-123@local>';
    expect(seen.has(messageId)).toBe(false);
    seen.add(messageId);
    expect(seen.has(messageId)).toBe(true);
  });
});
