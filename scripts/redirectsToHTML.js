const fs = require("fs")
const path = require("path")
const { getDefaultHead } = require("../utils/html")

const getFilePath = (fileName) => {
	return path.join(__dirname, "..", fileName)
}

const buildRedirectsHTML = (redirects = []) => {
	const folderHTML = `
		<!DOCTYPE html> 
		<html>
			<head>
				${getDefaultHead({
					pageName: "Redirects"
				})}
			</head>
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
	const redirectsFilePath = getFilePath("_redirects")

	const redirectsFile = await fs.promises.readFile(redirectsFilePath)

	const redirects = redirectsFile.toString().split("\n\n")

	const httpsRedirects = redirects.map(redirect => redirect.split("\n")[1])

	const redirectsHTML = buildRedirectsHTML(httpsRedirects)

	const redirectsHTMLPath = getFilePath("redirects.html")

	await fs.promises.writeFile(redirectsHTMLPath, redirectsHTML)
}

redirectsToHTML()
