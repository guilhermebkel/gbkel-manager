const fs = require("fs")
const path = require("path")

const buildRedirectsHTML = (redirects = []) => {
	const folderHTML = `
		<!DOCTYPE html> 
		<html> 
			<body>
				${redirects.map(redirect => (
					`
					<p>
						${redirect}
					</p>
					`
				)).join("")}
			</body> 
		</html> 
	`

	return folderHTML
}

const redirectsToHTML = async () => {
	const redirectsFilePath = path.join(__dirname, "_redirects")

	const redirectsFile = await fs.promises.readFile(redirectsFilePath)

	const redirects = redirectsFile.toString().split("\n\n")

	const httpsRedirects = redirects.map(redirect => redirect.split("\n")[1])

	const redirectsHTML = buildRedirectsHTML(httpsRedirects)

	const redirectsHTMLPath = path.join(__dirname, "redirects.html")

	await fs.promises.writeFile(redirectsHTMLPath, redirectsHTML)
}

redirectsToHTML()
