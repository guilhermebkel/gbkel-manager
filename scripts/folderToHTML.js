import fs from 'node:fs/promises';
import path from 'node:path';

const getItemName = (p) => p.split('/').pop();

const searchDirectoryItemsData = async (directory, staticFolder, dirItems) => {
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });

    for (const file of files) {
      if (file.name === 'index.html') continue;
      const filePath = path.join(directory, file.name);
      const isDirectory = file.isDirectory();

      let relPath = filePath.replace(staticFolder, '') || '/';
      if (isDirectory && !relPath.endsWith('/')) {
        relPath += '/';
      }

      const itemData = {
        main: {
          name: getItemName(filePath),
          path: filePath,
          relativePath: relPath,
        },
        parent: {
          name: getItemName(directory),
          path: directory,
          relativePath: directory.replace(staticFolder, '') || '/',
        },
      };

      if (isDirectory) {
        dirItems.push({
          type: 'folder',
          ...itemData,
        });
        await searchDirectoryItemsData(filePath, staticFolder, dirItems);
      } else {
        dirItems.push({
          type: 'file',
          ...itemData,
        });
      }
    }
  } catch (error) {
    console.error('[folderToHTML search]:', error.message);
  }
};

const buildFolderHTML = (dirItems) => {
  const folderHTML = `
		<!DOCTYPE html> 
		<html>
			<head>
				<script src="https://static.guilherr.me/js/default.js"></script>
			</head>
			<body>
				${dirItems
          .map((item) => {
            const isFolder = item.type === 'folder';
            const href =
              isFolder && !item.main.relativePath.endsWith('/')
                ? item.main.relativePath + '/'
                : item.main.relativePath;

            return `
							<a
								href="${href}"
								target="${isFolder ? '_self' : '_blank'}"
							>
								${
                  isFolder
                    ? `<br>/${item.main.name}</br>`
                    : item.main.name
                }
							</a>
						`;
          })
          .join('<br></br>')}

				<script>
					renderDefaultHead({ pageName: "Static" })
					renderDefaultBackground({ selector: "body" })
				</script>
			</body> 
		</html> 
	`;

  return folderHTML;
};

export async function folderToHTML(targetFolder) {
  const root = path.join(import.meta.dirname, '..');
  const staticSrc = path.join(root, 'static');
  const staticFolder = targetFolder || path.join(root, 'dist', 'static');

  try {
    await fs.access(staticFolder);
  } catch {
    await fs.mkdir(path.dirname(staticFolder), { recursive: true });
    await fs.cp(staticSrc, staticFolder, { recursive: true });
  }

  const dirItems = [
    {
      type: 'folder',
      main: {
        name: 'static',
        path: staticFolder,
        relativePath: '/',
      },
      parent: {
        name: '',
        path: '',
        relativePath: '',
      },
    },
  ];

  await searchDirectoryItemsData(staticFolder, staticFolder, dirItems);

  const folders = dirItems.filter((item) => item.type === 'folder');

  for (const folder of folders) {
    const folderItems = dirItems.filter(
      (item) => item.parent.path === folder.main.path
    );
    const folderHTML = buildFolderHTML(folderItems);
    const folderHTMLPath = path.join(folder.main.path, 'index.html');
    await fs.writeFile(folderHTMLPath, folderHTML);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await folderToHTML();
}
