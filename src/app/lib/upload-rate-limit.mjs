const windowMs = 15 * 60 * 1000;
const maxAttempts = 5;
const attemptsByAccount = new Map();

export function canConsumeUploadAttempt(accountId, now = Date.now()) {
  const recent = (attemptsByAccount.get(accountId) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= maxAttempts) {
    attemptsByAccount.set(accountId, recent);
    return false;
  }
  recent.push(now);
  attemptsByAccount.set(accountId, recent);
  return true;
}

export function resetUploadRateLimitForTests() {
  attemptsByAccount.clear();
}
