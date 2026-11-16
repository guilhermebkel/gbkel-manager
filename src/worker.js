import domainAliasesData from '../domainAliases.json' with { type: 'json' };
import { matchAlias } from './aliases.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = matchAlias(domainAliasesData, url.hostname, url.pathname);

    if (!match) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (match.statusCode === 301) {
      return Response.redirect(match.to, 301);
    }

    if (match.statusCode === 200) {
      if (match.to.startsWith('/')) {
        const assetUrl = new URL(match.to, request.url);
        return env.ASSETS.fetch(new Request(assetUrl, request));
      }

      return fetch(new Request(match.to, request));
    }

    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
