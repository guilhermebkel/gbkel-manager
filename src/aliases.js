function replacePlaceholders(toTemplate, params) {
  let result = toTemplate;
  const keys = Object.keys(params).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.replaceAll(`:${key}`, params[key]);
  }
  return result;
}

export function aliasHosts(aliases) {
  const list = Array.isArray(aliases) ? aliases : (aliases?.domainAliases ?? []);
  const hosts = new Set();
  for (const entry of list) {
    if (entry && entry.from) {
      const host = entry.from.split('/')[0].toLowerCase();
      hosts.add(host);
    }
  }
  return Array.from(hosts).sort();
}

export function matchAlias(aliases, hostname, pathname) {
  const list = Array.isArray(aliases) ? aliases : (aliases?.domainAliases ?? []);
  const reqHost = (hostname || '').toLowerCase();
  let reqPath = pathname || '/';
  if (!reqPath.startsWith('/')) {
    reqPath = '/' + reqPath;
  }

  for (const entry of list) {
    if (!entry || !entry.from) continue;
    const slashIdx = entry.from.indexOf('/');
    const entryHost = (slashIdx === -1 ? entry.from : entry.from.slice(0, slashIdx)).toLowerCase();

    if (entryHost !== reqHost) continue;

    if (slashIdx === -1) {
      if (reqPath === '/') {
        return {
          to: entry.to,
          statusCode: entry.statusCode,
          entry,
        };
      }
      continue;
    }

    const patternPath = entry.from.slice(slashIdx);

    if (patternPath.endsWith('/' + '*')) {
      const prefix = patternPath.slice(0, -1);
      if (prefix === '/') {
        const splat = reqPath.slice(1);
        const to = replacePlaceholders(entry.to, { splat });
        return {
          to,
          statusCode: entry.statusCode,
          entry,
        };
      } else {
        const prefixWithoutSlash = prefix.slice(0, -1);
        if (reqPath === prefixWithoutSlash || reqPath.startsWith(prefix)) {
          const splat = reqPath === prefixWithoutSlash ? '' : reqPath.slice(prefix.length);
          const to = replacePlaceholders(entry.to, { splat });
          return {
            to,
            statusCode: entry.statusCode,
            entry,
          };
        }
      }
      continue;
    }

    const normReq = reqPath.length > 1 && reqPath.endsWith('/') ? reqPath.slice(0, -1) : reqPath;
    const normPat = patternPath.length > 1 && patternPath.endsWith('/') ? patternPath.slice(0, -1) : patternPath;

    const reqSegs = normReq.slice(1).split('/');
    const patSegs = normPat.slice(1).split('/');

    if (reqSegs.length !== patSegs.length) {
      continue;
    }

    let matched = true;
    const params = {};
    for (let i = 0; i < patSegs.length; i++) {
      const p = patSegs[i];
      const r = reqSegs[i];
      if (p.startsWith(':')) {
        if (!r) {
          matched = false;
          break;
        }
        params[p.slice(1)] = r;
      } else if (p !== r) {
        matched = false;
        break;
      }
    }

    if (matched) {
      const to = replacePlaceholders(entry.to, params);
      return {
        to,
        statusCode: entry.statusCode,
        entry,
      };
    }
  }

  return null;
}
