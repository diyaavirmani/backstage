import {createHash} from 'node:crypto';

export class RequestBodyTooLarge extends Error {
  constructor() {
    super('REQUEST_BODY_TOO_LARGE');
    this.name = 'RequestBodyTooLarge';
  }
}

export async function readRequestTextBounded(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLarge();
  if (!request.body) throw new Error('REQUEST_BODY_EMPTY');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLarge();
      }
      text += decoder.decode(chunk.value, {stream: true});
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export function validateMutationOrigin(request, {configuredOrigin = process.env.APP_ORIGIN, production = process.env.NODE_ENV === 'production'} = {}) {
  let expected;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return {ok: false, reason: 'invalid_configuration'};
      expected = url.origin;
    } catch {
      return {ok: false, reason: 'invalid_configuration'};
    }
  } else if (!production) {
    try { expected = new URL(request.url).origin; }
    catch { return {ok: false, reason: 'invalid_request_origin'}; }
  } else {
    return {ok: false, reason: 'missing_configuration'};
  }
  const supplied = request.headers.get('origin');
  if (!supplied) return {ok: false, reason: 'missing_origin'};
  let actual;
  try { actual = new URL(supplied).origin; }
  catch { return {ok: false, reason: 'invalid_origin'}; }
  if (actual !== supplied || actual !== expected) return {ok: false, reason: 'origin_mismatch'};
  if (request.headers.get('sec-fetch-site') === 'cross-site') return {ok: false, reason: 'cross_site'};
  return {ok: true};
}

export function safeLimit(value, fallback, max = 100_000) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new Error('INVALID_DEMO_DISCOVERY_LIMIT');
  return number;
}

export function discoveryQuotaLimits(env = process.env) {
  return {
    perSession: safeLimit(env.DEMO_DISCOVERY_DAILY_PER_SESSION, 5, 100),
    global: safeLimit(env.DEMO_DISCOVERY_DAILY_GLOBAL, 50, 100_000),
  };
}

export function discoveryRetryAfterSeconds(now = new Date()) {
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextDay - now.getTime()) / 1000));
}

export function quotaSubjectHash(value) {
  return createHash('sha256').update(String(value || 'anonymous')).digest('hex');
}
