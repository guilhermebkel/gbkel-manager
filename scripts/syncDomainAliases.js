require("dotenv/config")
const Netlify = require("netlify")
const fs = require("fs")
const path = require("path")

const netlify = new Netlify(process.env.NETLIFY_ACCESS_TOKEN)

const getDomainAliases = async () => {
	const domainAliasesFilePath = path.join(__dirname, "..", "domainAliases.json")

	const rawDomainAliases = await fs.promises.readFile(domainAliasesFilePath)

	const domainAliases = JSON.parse(rawDomainAliases)

	return domainAliases
}

const addDomainOnNetlify = async (domain) => {
	const netlifySiteInfo = await getNetlifySiteInfo()

	await netlify.createDnsRecord({
		zone_id: netlifySiteInfo.zoneId,
		body: {
			hostname: domain,
			value: netlifySiteInfo.defaultDomain,
			type: "CNAME"
		}
	})
}

const removeDomainFromNetlify = async (domain) => {
	const netlifySiteInfo = await getNetlifySiteInfo()

	const dnsRecords = await netlify.getDnsRecords({
		zone_id: netlifySiteInfo.zoneId
	})
	
	const selectedRecords = dnsRecords.find(({ hostname }) => hostname === domain)

	if (selectedRecords.length) {
		return null
	}

	await Promise.all(
		selectedRecords.map(record => (
			netlify.deleteDnsRecord({
				dns_record_id: record.id,
				zone_id: zoneId
			})
		))
	)
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
		const [netlifySiteInfo, { domainAliases }] = await Promise.all([
			await getNetlifySiteInfo(),
			await getDomainAliases()
		])

		const serializedDomainAliasesHosts = serializeDomainAliasesHosts(domainAliases)
	
		const domainsToAddOnNetlify = serializedDomainAliasesHosts.filter((from) => !netlifySiteInfo.domainAliases.includes(from))
		const domainsToRemoveFromNetlify = netlifySiteInfo.domainAliases.filter((domainAlias) => !serializedDomainAliasesHosts.includes(domainAlias))
		
		await Promise.all(domainsToAddOnNetlify.map(addDomainOnNetlify))
		await Promise.all(domainsToRemoveFromNetlify.map(removeDomainFromNetlify))

		await syncNetlifyRedirectsFile(domainAliases)
	} catch (error) {
		console.log("[syncDomainAliases]: ", error)
	}
}

syncDomainAliases()