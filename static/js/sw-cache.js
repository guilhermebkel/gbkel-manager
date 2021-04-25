window.ServiceWorkerCache = {
	logger: function (message) {
		const prefix = "[Service Worker Cache]";

		console.log(`${prefix} ${message}`);
	},
	clearAllServiceWorkerCache: async function () {
		const cacheNames = await caches.keys()

		try {
			Promise.all(
				cacheNames.map(cache => caches.delete(cache)),
			)
		} catch (error) {
			this.logger(error)
		}
	},
	setCache: function (key, version) {
		return localStorage.setItem(key, version)
	},
	getCache: function (key) {
		return localStorage.getItem(key)
	},
	refreshCacheIfNeeded: async function (key, version) {
		const currentCache = this.getCache(key)

		const isValidCache = currentCache === version

		if (!isValidCache) {
			this.setCache(key, version)
	
			await this.clearAllServiceWorkerCache()
		}
	}
}
