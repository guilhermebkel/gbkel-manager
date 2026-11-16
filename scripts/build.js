import fs from 'node:fs/promises';
import path from 'node:path';
import { folderToHTML } from './folderToHTML.js';
import { redirectsToHTML } from './redirectsToHTML.js';

const root = path.join(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const staticSrc = path.join(root, 'static');
const pagesSrc = path.join(root, 'pages');
const staticDist = path.join(dist, 'static');

export async function build() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  // Copy static/ to dist/static/ and pages/ to dist/pages/ using Node built-in fs.cp
  await fs.cp(staticSrc, staticDist, { recursive: true });
  await fs.cp(pagesSrc, path.join(dist, 'pages'), { recursive: true });

  // Generate folder index HTML in dist/static/**
  await folderToHTML(staticDist);

  // Generate dist/redirects.html
  await redirectsToHTML(dist);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await build();
}
