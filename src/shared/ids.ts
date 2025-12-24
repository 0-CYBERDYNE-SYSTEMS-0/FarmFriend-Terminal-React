export function newId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now().toString(16)}_${rand}`;
}

export function isValidSessionId(sessionId: string): boolean {
  // Validate format: session_<hex timestamp>_<hex random>
  // Timestamp is 8-10 hex digits (covers years 1970-2288), random is 8-32 hex digits
  return /^session_[a-f0-9]{8,10}_[a-f0-9]{8,32}$/i.test(sessionId);
}
