const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
});

pool.on('error', (err) => {
    console.error('Ошибка БД:', err);
});

module.exports = pool;