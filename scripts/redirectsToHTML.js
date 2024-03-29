const fs = require("fs")
const path = require("path")

const getFilePath = (fileName) => {
	return path.join(__dirname, "..", fileName)
}

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
				${redirects.map(redirect => (
					`
					<p>
						${redirect}
					</p>
					`
				)).join("")}
			</body>
			<script>
				renderDefaultHead({ pageName: "Redirects" })
				renderDefaultBackground({ selector: "body" })
			</script>
		</html>
	`

	return folderHTML
}

const redirectsToHTML = async () => {
	try {
		const redirectsFilePath = getFilePath("_redirects")

		const redirectsFile = await fs.promises.readFile(redirectsFilePath)

		const redirects = redirectsFile.toString().split("\n\n")

		const httpsRedirects = redirects.map(redirect => redirect.split("\n")[1])

		const redirectsHTML = buildRedirectsHTML(httpsRedirects)

		const redirectsHTMLPath = getFilePath("redirects.html")

		await fs.promises.writeFile(redirectsHTMLPath, redirectsHTML)
	} catch (error) {
		console.log("[redirectsToHTML]: ", error)
	}
}

redirectsToHTML()
