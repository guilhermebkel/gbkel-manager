import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../src/worker.js';
import domainAliasesData from '../domainAliases.json' with { type: 'json' };
import { aliasHosts } from '../src/aliases.js';

test('worker: linkedin (301 host-only redirect)', async () => {
  const req = new Request('https://linkedin.guilherr.me/');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://linkedin.com/in/guilhermebkel');
});

test('worker: linkedin with path /x returns 404', async () => {
  const req = new Request('https://linkedin.guilherr.me/x');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 404);
  assert.equal(await res.text(), 'Not found');
});

test('worker: unknown host returns 404', async () => {
  const req = new Request('https://unknown.guilherr.me/');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 404);
  assert.equal(await res.text(), 'Not found');
});

test('worker: seo /:url/:device substitution redirect', async () => {
  const req = new Request('https://seo.guilherr.me/example.com/mobile');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 301);
  assert.equal(
    res.headers.get('location'),
    'https://googlechrome.github.io/lighthouse/viewer/?psiurl=https%3A%2F%2Fexample.com&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&utm_source=lh-chrome-ext'
  );
});

test('worker: notion /:pageId substitution redirect', async () => {
  const req = new Request('https://notion.guilherr.me/my-doc-123');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://notion.so/guilhermebkel/my-doc-123');
});

test('worker: correios /:code substitution redirect', async () => {
  const req = new Request('https://correios.guilherr.me/AA123456789BR');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 301);
  assert.equal(
    res.headers.get('location'),
    'https://rastreamento.correios.com.br/app/resultado.php?objeto=AA123456789BR&mqs=S'
  );
});

test('worker: delay /:delayInMilliseconds/:url proxy', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (req) => {
    return new Response('proxied-delay');
  });

  const req = new Request('https://delay.guilherr.me/500/example.com');
  const res = await worker.fetch(req, {});

  assert.equal(fetchMock.mock.callCount(), 1);
  const calledUrl = fetchMock.mock.calls[0].arguments[0].url;
  assert.equal(calledUrl, 'https://deelay.me/500/example.com');
  assert.equal(await res.text(), 'proxied-delay');
});

test('worker: blog / (proxy to https://guilherr.me/blog)', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (req) => {
    return new Response('blog-home');
  });

  const req = new Request('https://blog.guilherr.me/');
  const res = await worker.fetch(req, {});

  assert.equal(fetchMock.mock.callCount(), 1);
  const calledUrl = fetchMock.mock.calls[0].arguments[0].url;
  assert.equal(calledUrl, 'https://guilherr.me/blog');
  assert.equal(await res.text(), 'blog-home');
});

test('worker: blog /foo/bar (proxy to https://guilherr.me/foo/bar)', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (req) => {
    return new Response('blog-post');
  });

  const req = new Request('https://blog.guilherr.me/foo/bar');
  const res = await worker.fetch(req, {});

  assert.equal(fetchMock.mock.callCount(), 1);
  const calledUrl = fetchMock.mock.calls[0].arguments[0].url;
  assert.equal(calledUrl, 'https://guilherr.me/foo/bar');
  assert.equal(await res.text(), 'blog-post');
});

test('worker: static /js/default.js → asset /static/js/default.js', async (t) => {
  const assetFetchMock = t.mock.fn(async (req) => {
    return new Response('console.log("default.js")');
  });

  const req = new Request('https://static.guilherr.me/js/default.js');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(assetFetchMock.mock.callCount(), 1);
  const calledArg = assetFetchMock.mock.calls[0].arguments[0];
  const receivedUrl = typeof calledArg === 'string' ? calledArg : calledArg.url;
  assert.equal(new URL(receivedUrl).pathname, '/static/js/default.js');
  assert.equal(await res.text(), 'console.log("default.js")');
});

test('worker: static / → asset /static/', async (t) => {
  const assetFetchMock = t.mock.fn(async (req) => {
    return new Response('<html>index</html>');
  });

  const req = new Request('https://static.guilherr.me/');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(assetFetchMock.mock.callCount(), 1);
  const calledArg = assetFetchMock.mock.calls[0].arguments[0];
  const receivedUrl = typeof calledArg === 'string' ? calledArg : calledArg.url;
  assert.equal(new URL(receivedUrl).pathname, '/static/');
  assert.equal(await res.text(), '<html>index</html>');
});

test('worker: mail → /pages/mail.html', async (t) => {
  const assetFetchMock = t.mock.fn(async (req) => {
    return new Response('<html>mail</html>');
  });

  const req = new Request('https://mail.guilherr.me/');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(assetFetchMock.mock.callCount(), 1);
  const calledArg = assetFetchMock.mock.calls[0].arguments[0];
  const receivedUrl = typeof calledArg === 'string' ? calledArg : calledArg.url;
  assert.equal(new URL(receivedUrl).pathname, '/pages/mail.html');
  assert.equal(await res.text(), '<html>mail</html>');
});

test('worker: asset directory 307 with absolute Location is rewritten to public path', async () => {
  const assetFetchMock = async (req) => {
    return new Response(null, {
      status: 307,
      headers: { Location: 'http://static.guilherr.me/static/js/' },
    });
  };

  const req = new Request('https://static.guilherr.me/js');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(res.status, 307);
  assert.equal(res.headers.get('Location'), 'https://static.guilherr.me/js/');
});

test('worker: asset directory 307 with relative Location is rewritten to public path', async () => {
  const assetFetchMock = async (req) => {
    return new Response(null, {
      status: 307,
      headers: { Location: '/static/js/' },
    });
  };

  const req = new Request('https://static.guilherr.me/js');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(res.status, 307);
  assert.equal(res.headers.get('Location'), 'https://static.guilherr.me/js/');
});

test('worker: non-redirect asset response passes through unchanged', async () => {
  const assetFetchMock = async (req) => {
    return new Response('unchanged asset body', {
      status: 200,
      headers: { 'content-type': 'text/plain', 'custom-header': 'value123' },
    });
  };

  const req = new Request('https://static.guilherr.me/js/default.js');
  const res = await worker.fetch(req, { ASSETS: { fetch: assetFetchMock } });

  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'unchanged asset body');
  assert.equal(res.headers.get('content-type'), 'text/plain');
  assert.equal(res.headers.get('custom-header'), 'value123');
});

test('every host from domainAliases.json appears exactly once as a custom domain in wrangler.jsonc and vice versa', (t) => {
  const wranglerPath = path.join(import.meta.dirname, '..', 'wrangler.jsonc');
  if (!fs.existsSync(wranglerPath)) {
    t.skip('wrangler.jsonc does not exist yet (created in Phase 2)');
    return;
  }
  const raw = fs.readFileSync(wranglerPath, 'utf8');
  const stripped = raw.replace(/\/\/.*$/gm, '');
  const config = JSON.parse(stripped);
  const customDomains = (config.routes || [])
    .filter((r) => r.custom_domain === true)
    .map((r) => r.pattern);

  const expectedHosts = aliasHosts(domainAliasesData);

  assert.equal(new Set(customDomains).size, customDomains.length, 'No duplicate custom domains in wrangler.jsonc');
  assert.deepEqual([...customDomains].sort(), expectedHosts, 'Custom domains must match domainAliases.json exactly');
  assert.equal(customDomains.length, expectedHosts.length);
});
