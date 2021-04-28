require("dotenv/config")
const Netlify = require("netlify")
const fs = require("fs")
const path = require("path")

const netlify = new Netlify(process.env.NETLIFY_ACCESS_TOKEN)

const getDomainAliases = async () => {
	const domainAliasesFilePath = path.join(__dirname, "..", "domainAliases.json")

	const rawDomainAliases = await fs.promises.readFile(domainAliasesFilePath)

	const { domainAliases } = JSON.parse(rawDomainAliases)

	return domainAliases
}

const syncDomainsOnNetlify = async (domains = []) => {
	const netlifySiteInfo = await getNetlifySiteInfo()

	await netlify.updateSite({
		site_id: netlifySiteInfo.siteId,
		body: {
			domain_aliases: domains
		}
	})
}

const syncNetlifyRedirectsFile = async (domainAliases) => {
	const redirectsFileContent = domainAliases.map(domainAlias => {
		const { from, to, statusCode } = domainAlias

		return `http://${from} ${to} ${statusCode}!\nhttps://${from} ${to} ${statusCode}!`
	}).join("\n\n")

	const redirectsFilePath = path.join(__dirname, "..", "_redirects")

	await fs.promises.writeFile(redirectsFilePath, redirectsFileContent)
}

const getNetlifySiteInfo = async () => {
	const sites = await netlify.listSites()

	const selectedSite = sites.find(({ name }) => name.includes("redirects"))

	if (!selectedSite) {
		return null
	}

	return {
		id: selectedSite.id,
		siteId: selectedSite.site_id,
		name: selectedSite.name,
		zoneId: selectedSite.dns_zone_id,
		customDomain: selectedSite.custom_domain,
		defaultDomain: selectedSite.default_domain,
		domainAliases: [
			...(selectedSite.domain_aliases || []),
			selectedSite.custom_domain
		]
	}
}

const serializeDomainAliasesHosts = (domainAliases) => {
	const serializedDomainAliasesHosts = domainAliases.map(({ from }) => from.split("/")[0])

	return serializedDomainAliasesHosts
}

const syncDomainAliases = async () => {
	try {
		const domainAliases = await getDomainAliases()

		const serializedDomainAliasesHosts = serializeDomainAliasesHosts(domainAliases)
	
		await syncDomainsOnNetlify(serializedDomainAliasesHosts)

		await syncNetlifyRedirectsFile(domainAliases)
	} catch (error) {
		console.log("[syncDomainAliases]: ", error)
	}
}

syncDomainAliases()