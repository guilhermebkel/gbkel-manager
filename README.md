<p align="center">
	<img src="https://static.guilherr.me/image/logo/logo-2-white.png" width="150" alt="logo" />
</p>	

<h3 align="center">
	🌈 A repo to manage my domain aliases, assets, etc.
</h3>

## 📌 Overview

That's the repository I use to centralize domain aliases and store my static files (such as scripts, stylesheets, etc).

The [domain aliases file](./domainAliases.json) is the single source of truth. A pure core validates it and matches requests, and an **adapter** makes a platform serve it:

| Adapter | What it does |
| --- | --- |
| `netlify` | sets the Netlify domain aliases and writes `_redirects`; Netlify redirects and rewrites by itself |
| `caprover` | runs as a Docker image that redirects and proxies by itself, and registers the app's custom domains on CapRover |
| `cloudflare` | a DNS step before CapRover: points each host an alias claims for `caprover` at it with a CNAME |

The static files can be reached by static.guilherr.me and the domain aliases can be found at redirects.guilherr.me.

## 🛠 Development

```bash
nvm use && pnpm install
pnpm check:aliases   # validates the file and what each adapter can serve, offline
pnpm check           # everything CI runs
```

- How an alias works and how to add a platform: [docs/adapters.md](./docs/adapters.md)
- Releasing the image and deploying to CapRover: [docs/deploying-with-caprover.md](./docs/deploying-with-caprover.md)
- Conventions, layers and the harness: [AGENTS.md](./AGENTS.md)
