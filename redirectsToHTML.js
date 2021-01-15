const fs = require("fs")
const path = require("path")

const STATIC_FOLDER_NAME = "static"



const buildRedirectsHTML = (redirects) => {
	const folderHTML = `
		<!DOCTYPE html> 
		<html> 
			<body>
				<p>
					${redirects}
				</p>
			</body> 
		</html> 
	`

	return folderHTML
}

const redirectsToHTML = async () => {
	const redirectsFilePath = path.join(__dirname, "_redirects")

	const redirectsFile = await fs.promises.readFile(redirectsFilePath)

	const redirectsHTML = buildRedirectsHTML(redirectsFile)

	const redirectsHTMLPath = path.join(__dirname, "redirects.html")

	await fs.promises.writeFile(redirectsHTMLPath, redirectsHTML)
}

redirectsToHTML()
