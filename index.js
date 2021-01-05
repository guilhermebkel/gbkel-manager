const fs = require("fs")
const path = require("path")

const STATIC_FOLDER_NAME = "static"

const staticFolder = path.join(__dirname, STATIC_FOLDER_NAME)

const dirItems = [
	{
    type: "folder",
    main: {
			name: "static",
      path: staticFolder,
      relativePath: "/"
    },
    parent: {
			name: "",
			path: "",
			relativePath: ""
		}
  }
]

const getItemName = (path) => {
	return path.split("/").pop()
}

const getRelativePath = (path) => {
	return path.replace(staticFolder, "")
}

const searchDirectoryItemsData = async (directory) => {
	try {
		const files = await fs.promises.readdir(directory, { withFileTypes: true })

		await Promise.all(
			files.map(async file => {
				const isDirectory = file.isDirectory()

				const filePath = path.join(directory, file.name)

				const itemData = {
					main: {
						name: getItemName(filePath),
						path: filePath,
						relativePath: getRelativePath(filePath)
					},
					parent: {
						name: getItemName(directory),
						path: directory,
						relativePath: getRelativePath(directory)
					}
				}

				if (isDirectory) {
					dirItems.push({
						type: "folder",
						...itemData
					})

					return await searchDirectoryItemsData(filePath)
				} else {
					dirItems.push({
						type: "file",
						...itemData
					})
				}
			})
		)
	} catch (error) {
		console.log(error.message)
	}
}

const buildFolderHTML = (dirItems = dirItems) => {
	const folderHTML = `
		<!DOCTYPE html> 
		<html> 
			<body>
				${dirItems.map(item => (
					`<a href="${item.main.relativePath}" target="_blank">${item.main.name}</a>`
				)).join("<br></br>")}
			</body> 
		</html> 
	`

	return folderHTML
}

const folderToHTML = async () => {
	await searchDirectoryItemsData(staticFolder)

	const folders = dirItems.filter(item => item.type === "folder")

	await Promise.all(
		folders.map(async folder => {
			const folderItems = dirItems.filter(item => item.parent.path === folder.main.path)

			const folderHTML = buildFolderHTML(folderItems)

			const folderHTMLPath = path.join(folder.main.path, "/", "index.html")

			await fs.promises.writeFile(folderHTMLPath, folderHTML)
		})
	)
}

folderToHTML()
