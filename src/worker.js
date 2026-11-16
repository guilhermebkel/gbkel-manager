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
        const res = await env.ASSETS.fetch(new Request(assetUrl, request));

        if (res.status >= 300 && res.status < 400 && res.headers.has('Location')) {
          const entryTo = match.entry?.to || '';
          if (entryTo.includes(':splat')) {
            const assetPrefix = entryTo.split(':splat')[0];
            const slashIdx = (match.entry?.from || '').indexOf('/');
            const fromPath = slashIdx === -1 ? '/' : match.entry.from.slice(slashIdx);
            const publicPrefix = fromPath.split('*')[0];

            const locationHeader = res.headers.get('Location');
            const locUrl = new URL(locationHeader, request.url);
            if (locUrl.pathname.startsWith(assetPrefix)) {
              const rewrittenPathname = publicPrefix + locUrl.pathname.slice(assetPrefix.length);
              const newLoc = new URL(rewrittenPathname, request.url);
              newLoc.search = locUrl.search;
              newLoc.hash = locUrl.hash;
              const headers = new Headers(res.headers);
              headers.set('Location', newLoc.href);
              return new Response(res.body, {
                status: res.status,
                statusText: res.statusText,
                headers,
              });
            }
          }
        }

        return res;
      }

      return fetch(new Request(match.to, request));
    }

    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
