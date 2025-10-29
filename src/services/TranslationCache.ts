type CacheKey = string;

type CacheEntry = {
	key: CacheKey;
	value: string;
	at: number;
};

const MAX_SIZE = 100;

export class TranslationCache {
	private map = new Map<CacheKey, CacheEntry>();

	get(key: CacheKey) {
		const row = this.map.get(key);
		if (!row) {
			return null;
		}
		row.at = Date.now();
		return row.value;
	}

	set(key: CacheKey, value: string) {
		if (this.map.size >= MAX_SIZE && !this.map.has(key)) {
			let oldest: CacheEntry | null = null;
			for (const item of this.map.values()) {
				if (!oldest || item.at < oldest.at) {
					oldest = item;
				}
			}
			if (oldest) {
				this.map.delete(oldest.key);
			}
		}
		this.map.set(key, { key, value, at: Date.now() });
	}

	clear() {
		this.map.clear();
	}
}
