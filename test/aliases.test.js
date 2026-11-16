import test from 'node:test';
import assert from 'node:assert/strict';
import domainAliasesData from '../domainAliases.json' with { type: 'json' };
import { matchAlias, aliasHosts } from '../src/aliases.js';

test('aliasHosts returns sorted unique hosts from aliases', () => {
  const hosts = aliasHosts(domainAliasesData);
  assert.equal(hosts.length, 36);
  // Ensure sorted
  const sorted = [...hosts].sort();
  assert.deepEqual(hosts, sorted);
  // Ensure unique
  assert.equal(new Set(hosts).size, 36);
  // Spot-check hosts
  assert.ok(hosts.includes('linkedin.guilherr.me'));
  assert.ok(hosts.includes('blog.guilherr.me'));
  assert.ok(hosts.includes('static.guilherr.me'));
});

test('matchAlias: linkedin (301 host-only)', () => {
  const match = matchAlias(domainAliasesData, 'linkedin.guilherr.me', '/');
  assert.deepEqual(match, {
    to: 'https://linkedin.com/in/guilhermebkel',
    statusCode: 301,
  });
});

test('matchAlias: linkedin with path /x returns null', () => {
  const match = matchAlias(domainAliasesData, 'linkedin.guilherr.me', '/x');
  assert.equal(match, null);

  const matchSlash = matchAlias(domainAliasesData, 'linkedin.guilherr.me', '/x/');
  assert.equal(matchSlash, null);
});

test('matchAlias: seo /:url/:device substitution', () => {
  const match = matchAlias(domainAliasesData, 'seo.guilherr.me', '/example.com/mobile');
  assert.deepEqual(match, {
    to: 'https://googlechrome.github.io/lighthouse/viewer/?psiurl=https%3A%2F%2Fexample.com&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&utm_source=lh-chrome-ext',
    statusCode: 301,
  });

  // Also verify trailing slash ignored on segments
  const matchTrailing = matchAlias(domainAliasesData, 'seo.guilherr.me', '/example.com/mobile/');
  assert.equal(matchTrailing?.to, match?.to);
});

test('matchAlias: notion /:pageId substitution', () => {
  const match = matchAlias(domainAliasesData, 'notion.guilherr.me', '/abc123xyz');
  assert.deepEqual(match, {
    to: 'https://notion.so/guilhermebkel/abc123xyz',
    statusCode: 301,
  });
});

test('matchAlias: correios /:code substitution', () => {
  const match = matchAlias(domainAliasesData, 'correios.guilherr.me', '/AA123456789BR');
  assert.deepEqual(match, {
    to: 'https://rastreamento.correios.com.br/app/resultado.php?objeto=AA123456789BR&mqs=S',
    statusCode: 301,
  });
});

test('matchAlias: delay /:delayInMilliseconds/:url proxy', () => {
  const match = matchAlias(domainAliasesData, 'delay.guilherr.me', '/1000/example.com');
  assert.deepEqual(match, {
    to: 'https://deelay.me/1000/example.com',
    statusCode: 200,
  });
});

test('matchAlias: blog / (proxy to https://guilherr.me/blog)', () => {
  const match = matchAlias(domainAliasesData, 'blog.guilherr.me', '/');
  assert.deepEqual(match, {
    to: 'https://guilherr.me/blog',
    statusCode: 200,
  });
});

test('matchAlias: blog /foo/bar (proxy to https://guilherr.me/foo/bar)', () => {
  const match = matchAlias(domainAliasesData, 'blog.guilherr.me', '/foo/bar');
  assert.deepEqual(match, {
    to: 'https://guilherr.me/foo/bar',
    statusCode: 200,
  });
});

test('matchAlias: static /js/default.js → asset /static/js/default.js', () => {
  const match = matchAlias(domainAliasesData, 'static.guilherr.me', '/js/default.js');
  assert.deepEqual(match, {
    to: '/static/js/default.js',
    statusCode: 200,
  });
});

test('matchAlias: static / → asset /static/', () => {
  const match = matchAlias(domainAliasesData, 'static.guilherr.me', '/');
  assert.deepEqual(match, {
    to: '/static/',
    statusCode: 200,
  });
});

test('matchAlias: mail → /pages/mail.html', () => {
  const match = matchAlias(domainAliasesData, 'mail.guilherr.me', '/');
  assert.deepEqual(match, {
    to: '/pages/mail.html',
    statusCode: 200,
  });
});

test('matchAlias: redirects → /redirects.html', () => {
  const match = matchAlias(domainAliasesData, 'redirects.guilherr.me', '/');
  assert.deepEqual(match, {
    to: '/redirects.html',
    statusCode: 200,
  });
});

test('matchAlias: unknown host returns null', () => {
  const match = matchAlias(domainAliasesData, 'unknown.guilherr.me', '/');
  assert.equal(match, null);
});
