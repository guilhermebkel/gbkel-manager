<p align="center">
	<img src="https://static.guilherr.me/image/logo/logo-2-white.png" width="150" alt="logo" />
</p>	

<h3 align="center">
	🌈 A repo to manage my domain aliases, assets, etc.
</h3>

## 📌 Overview

This repository centralizes my domain aliases and static files (such as scripts, stylesheets, etc).

Domain aliases live in `domainAliases.json` and are served by a Cloudflare Worker. Adding an alias requires adding the entry to `domainAliases.json` and adding the custom domain route in `wrangler.jsonc` (enforced by automated tests). Deployment is automatic via Cloudflare Workers Builds (Git integration).

The static files can be reached at static.guilherr.me and the list of domain aliases can be found at redirects.guilherr.me.

## 🚀 First-time setup on Cloudflare

1. In the `guilherr.me` DNS zone, delete the existing CNAME records that point to `redirects.guilherr.me` / `gbkel-redirects.netlify.app` for every host in `domainAliases.json` (custom domains can't be attached while a record exists for the same name).
2. Workers & Pages → Create → Import a repository → `guilhermebkel/gbkel-redirects`, build command `npm run build`, deploy command `npx wrangler deploy`, production branch `main`.
3. The first deploy creates the custom domains and their DNS records and certificates.
