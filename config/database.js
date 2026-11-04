const mysql = require('mysql2');
const logger = require('../utils/logger');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotbando',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
    queueLimit: 0,
    charset: 'utf8mb4',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// The app writes dates in its own clock (TZ=Africa/Dar_es_Salaam). Keep each
// connection's session clock on the same offset so NOW() in SQL matches them.
const DB_SESSION_TIMEZONE = process.env.DB_SESSION_TIMEZONE || '+03:00';
pool.on('connection', (connection) => {
    connection.query(`SET time_zone = '${DB_SESSION_TIMEZONE}'`);
});

const promisePool = pool.promise();

promisePool.getConnection()
    .then(connection => {
        logger.info('Database connected successfully');
        connection.release();
    })
    .catch(error => {
        logger.error('Database connection failed', { message: error.message });
    });

module.exports = promisePool;
