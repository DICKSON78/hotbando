const { getRedisClient, isRedisReady } = require('../config/redis');

const memoryStore = new Map();
const MEMORY_TTL = 30000;

class Cache {
    constructor() {
        this.redisCache = null;
        if (isRedisReady()) {
            this.redisCache = getRedisClient();
        }
    }

    async get(key) {
        if (this.redisCache) {
            try {
                const val = await this.redisCache.get(key);
                return val ? JSON.parse(val) : null;
            } catch {
                return null;
            }
        }
        const item = memoryStore.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            memoryStore.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key, value, ttlMs = MEMORY_TTL) {
        if (this.redisCache) {
            try {
                await this.redisCache.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(value));
                return;
            } catch {
            }
        }
        memoryStore.set(key, { value, expiry: Date.now() + ttlMs });
    }

    async del(key) {
        if (this.redisCache) {
            try {
                await this.redisCache.del(key);
            } catch {
            }
        }
        memoryStore.delete(key);
    }

    async remember(key, ttlMs, fetchFn) {
        const cached = await this.get(key);
        if (cached !== null) return cached;
        const value = await fetchFn();
        await this.set(key, value, ttlMs);
        return value;
    }

    async clear(pattern) {
        if (this.redisCache && pattern) {
            try {
                const keys = await this.redisCache.keys(pattern);
                if (keys.length > 0) {
                    await this.redisCache.del(keys);
                }
            } catch {
            }
            return;
        }
        if (pattern) {
            for (const key of memoryStore.keys()) {
                if (key.includes(pattern.replace('*', ''))) {
                    memoryStore.delete(key);
                }
            }
        } else {
            memoryStore.clear();
        }
    }
}

const cache = new Cache();

module.exports = cache;
