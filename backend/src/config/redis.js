const redis = require('redis');

const connectRedis = async () => {
  try {
    // If no Redis URL, return null
    if (!process.env.REDIS_URL) {
      console.log('⚠️ No Redis URL provided - running without cache');
      return null;
    }

    const redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 5000
      }
    });

    redisClient.on('error', (err) => {
      console.log('⚠️ Redis error (non-critical):', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected');
    });

    // Try to connect with timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    
    // Test connection
    await redisClient.set('test', 'OK');
    const test = await redisClient.get('test');
    if (test === 'OK') {
      console.log('✅ Redis working');
    }
    
    return redisClient;
  } catch (error) {
    console.log('⚠️ Redis not available - app continues without cache');
    return null;
  }
};

module.exports = connectRedis;