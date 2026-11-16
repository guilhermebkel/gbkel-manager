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

  await fs.cp(staticSrc, staticDist, { recursive: true });
  await fs.cp(pagesSrc, path.join(dist, 'pages'), { recursive: true });

  await folderToHTML(staticDist);

  await redirectsToHTML(dist);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await build();
}
