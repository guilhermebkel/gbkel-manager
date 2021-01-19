const getDefaultHead = ({ pageName }) => {
	const defaultHead = `
		<link rel="icon" href="https://static.guilherr.me/image/logo/logo-2-black.png" />
		<link rel="stylesheet" href="https://static.guilherr.me/css/stylesheet.css"></link>
		<link rel="stylesheet" href="https://static.guilherr.me/css/font.css"></link>
		<title>${pageName} | Guilherme Mota</title>
	`

	return defaultHead
}

const renderDefaultHead = ({ pageName }) => {
	document.head.innerHTML += getDefaultHead({ pageName })
}

module.exports = {
	getDefaultHead,
	renderDefaultHead
}
