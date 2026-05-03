const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'del_service'
});

async function restore() {
    await client.connect();
    const backup = JSON.parse(fs.readFileSync('./backups/backup_2026-05-03T17-23-01-214Z.json', 'utf8'));
    await client.query('BEGIN');
    try {
        // Очистка
        const tables = ['order_items', 'payments', 'orders', 'users', 'products', 'clients', 'couriers', 'employees', 'warehouses', 'status'];
        for (const t of tables) {
            await client.query(`TRUNCATE TABLE ${t} CASCADE`);
        }
        // Вставка
        const order = ['products', 'clients', 'couriers', 'employees', 'warehouses', 'status', 'orders', 'order_items', 'payments', 'users'];
        for (const t of order) {
            const rows = backup[t];
            if (rows && rows.length) {
                const columns = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [t])).rows.map(r => r.column_name);
                for (const row of rows) {
                    const cols = Object.keys(row).filter(c => columns.includes(c));
                    const vals = cols.map(c => row[c]);
                    const placeholders = vals.map((_, i) => `$${i+1}`).join(',');
                    if (cols.length) {
                        await client.query(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`, vals);
                    }
                }
            }
        }
        await client.query('COMMIT');
        console.log('Восстановление успешно');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
    }
    await client.end();
}
restore();