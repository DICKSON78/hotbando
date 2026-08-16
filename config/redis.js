const Redis = require('ioredis');
const logger = require('../utils/logger');

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

let redisClient = null;

if (REDIS_ENABLED) {
    redisClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: 'hotbando:',
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
    });

    redisClient.on('connect', () => {
        logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
        logger.info('Redis ready');
    });

    redisClient.on('error', (err) => {
        logger.error('Redis error:', err.message);
    });

    redisClient.on('close', () => {
        logger.warn('Redis connection closed');
    });

    // Connect-redis v9 passes { expiration: { type, value } } as options to set().
    // ioredis expects (key, value, 'EX', ttl). Wraps set() to translate.
    const origSet = redisClient.set.bind(redisClient);
    redisClient.set = function setWrap(key, val, opts, cb) {
        if (opts && opts.expiration) {
            const { type, value } = opts.expiration;
            if (cb) return origSet(key, val, type, value, cb);
            return origSet(key, val, type, value);
        }
        if (cb) return origSet(key, val, opts, cb);
        return origSet(key, val, opts);
    };
}

async function connectRedis() {
    if (redisClient && REDIS_ENABLED) {
        try {
            await redisClient.connect();
            logger.info('Redis connected');
        } catch (err) {
            logger.warn('Redis connection failed (non-fatal):', err.message);
        }
    }
}

function getRedisClient() {
    return redisClient;
}

function isRedisReady() {
    return REDIS_ENABLED && redisClient && redisClient.status === 'ready';
}

module.exports = {
    redisClient,
    connectRedis,
    getRedisClient,
    isRedisReady,
    REDIS_ENABLED,
};
