import fs from 'node:fs/promises';
import path from 'node:path';
import domainAliasesData from '../domainAliases.json' with { type: 'json' };

const buildRedirectsHTML = (redirects = []) => {
  const folderHTML = `
		<!DOCTYPE html> 
		<html>
			<head>
				<style>
					p {
						color: var(--gray-color-15) !important;
					}
				</style>
				<script src="https://static.guilherr.me/js/default.js"></script>
			</head>
			<body>
				${redirects
          .map(
            (redirect) => `
					<p>
						${redirect}
					</p>
					`
          )
          .join('')}
			</body>
			<script>
				renderDefaultHead({ pageName: "Redirects" })
				renderDefaultBackground({ selector: "body" })
			</script>
		</html>
	`;

  return folderHTML;
};

export async function redirectsToHTML(distDir) {
  const targetDist = distDir || path.join(import.meta.dirname, '..', 'dist');
  await fs.mkdir(targetDist, { recursive: true });

  const lines = domainAliasesData.domainAliases.map(
    ({ from, to, statusCode }) => `https://${from} → ${to} ${statusCode}`
  );

  const html = buildRedirectsHTML(lines);
  const outPath = path.join(targetDist, 'redirects.html');
  await fs.writeFile(outPath, html);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await redirectsToHTML();
}
