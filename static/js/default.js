function getDefaultHead({ pageName }) {
	const defaultHead = `
		<meta name="viewport" content="width=device-width, initial-scale=1" />

		<link rel="icon" href="https://static.guilherr.me/image/logo/logo-2-black.png" />
		<link rel="stylesheet" href="https://static.guilherr.me/css/stylesheet.css"></link>
		<link rel="stylesheet" href="https://static.guilherr.me/css/font.css"></link>

		<script src="https://static.guilherr.me/js/gtm.js"></script>

		<title>${pageName} | Guilherme Mota</title>
	`;

	return defaultHead;
};

function getDefaultBackground() {
	const defaultBackground = `
		background-color: var(--black-color-1);

		background-image: 
			radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), 
			radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%);

		background-size: 100px 100px;
	`;

	return defaultBackground;
};

function renderCSS({ selector, value }) {
	const style = document.createElement("style");

	const cssCode = `${selector} {${value}}`;

	const textNode = document.createTextNode(cssCode);
	style.appendChild(textNode);

	document.head.appendChild(style);
};

function renderDefaultHead({ pageName }) {
	const defaultHead = getDefaultHead({ pageName });

	document.head.innerHTML += defaultHead;
};

function renderDefaultBackground({ selector }) {
	const defaultBackground = getDefaultBackground();

	renderCSS({
		selector,
		value: defaultBackground
	});
};