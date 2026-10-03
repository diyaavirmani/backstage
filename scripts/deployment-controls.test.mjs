import test from 'node:test';
import assert from 'node:assert/strict';
import {readRequestTextBounded,RequestBodyTooLarge,validateMutationOrigin,discoveryQuotaLimits,discoveryRetryAfterSeconds,quotaSubjectHash} from './deployment-controls.mjs';

test('bounded request reader rejects declared oversize before reading',async()=>{
  const request=new Request('https://backstage.test/api',{method:'POST',headers:{'content-length':'999'}});
  await assert.rejects(()=>readRequestTextBounded(request,10),RequestBodyTooLarge);
});

test('bounded request reader counts streamed bytes rather than character length',async()=>{
  const body=new TextEncoder().encode('abcdefghij');
  const request=new Request('https://backstage.test/api',{method:'POST',body});
  assert.equal(await readRequestTextBounded(request,10),'abcdefghij');
  const tooLarge=new Request('https://backstage.test/api',{method:'POST',body:new TextEncoder().encode('abcdefghijk')});
  await assert.rejects(()=>readRequestTextBounded(tooLarge,10),RequestBodyTooLarge);
});

test('browser mutations require the configured exact origin and reject cross-site metadata',()=>{
  const same=new Request('https://backstage.test/api',{method:'POST',headers:{origin:'https://backstage.test'}});
  assert.deepEqual(validateMutationOrigin(same,{configuredOrigin:'https://backstage.test',production:true}),{ok:true});
  const wrong=new Request('https://backstage.test/api',{method:'POST',headers:{origin:'https://evil.test'}});
  assert.equal(validateMutationOrigin(wrong,{configuredOrigin:'https://backstage.test',production:true}).reason,'origin_mismatch');
  const missing=new Request('https://backstage.test/api',{method:'POST'});
  assert.equal(validateMutationOrigin(missing,{configuredOrigin:'https://backstage.test',production:true}).reason,'missing_origin');
  assert.equal(validateMutationOrigin(same,{production:true}).reason,'missing_configuration');
  const cross=new Request('https://backstage.test/api',{method:'POST',headers:{origin:'https://backstage.test','sec-fetch-site':'cross-site'}});
  assert.equal(validateMutationOrigin(cross,{configuredOrigin:'https://backstage.test',production:true}).reason,'cross_site');
});

test('quota configuration is bounded and retry delay reaches the next UTC day',()=>{
  assert.deepEqual(discoveryQuotaLimits({}),{perSession:5,global:50});
  assert.deepEqual(discoveryQuotaLimits({DEMO_DISCOVERY_DAILY_PER_SESSION:'2',DEMO_DISCOVERY_DAILY_GLOBAL:'25'}),{perSession:2,global:25});
  assert.throws(()=>discoveryQuotaLimits({DEMO_DISCOVERY_DAILY_GLOBAL:'0'}),/INVALID_DEMO_DISCOVERY_LIMIT/);
  assert.equal(discoveryRetryAfterSeconds(new Date('2026-10-03T23:59:59.000Z')),1);
  assert.equal(quotaSubjectHash('session-a').length,64);
  assert.notEqual(quotaSubjectHash('session-a'),quotaSubjectHash('session-b'));
});
