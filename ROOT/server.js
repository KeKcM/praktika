require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./bd/database');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ========== СТАТИЧЕСКИЕ СТРАНИЦЫ ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/guest', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'guest.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));
app.get('/manager.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'manager.html')));
app.get('/operator.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'operator.html')));
app.get('/client.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'client.html')));
app.get('/courier.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'courier.html')));

// ========== АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ==========
app.post('/api/register', async (req, res) => {
    try {
        const { login, password, last_name, first_name, patronymic, phone, email, address } = req.body;
        const existingUser = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (existingUser.rows.length) return res.json({ success: false, error: 'Логин уже занят' });
        const existingPhone = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
        if (existingPhone.rows.length) return res.json({ success: false, error: 'Телефон уже зарегистрирован' });
        if (email) {
            const existingEmail = await db.query('SELECT id FROM clients WHERE email = $1', [email]);
            if (existingEmail.rows.length) return res.json({ success: false, error: 'Email уже используется' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('BEGIN');
        const clientRes = await db.query(
            `INSERT INTO clients (last_name, first_name, patronymic, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [last_name, first_name, patronymic || null, phone, email || null, address || '']
        );
        await db.query(
            `INSERT INTO users (login, password_hash, client_id, is_active, created_at)
             VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)`,
            [login, hashedPassword, clientRes.rows[0].id]
        );
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Ошибка регистрации:', err);
        res.json({ success: false, error: 'Внутренняя ошибка' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        const userResult = await db.query(`
            SELECT u.*,
                   c.first_name as c_first_name, c.last_name as c_last_name, c.patronymic as c_patronymic
            FROM users u
            LEFT JOIN clients c ON u.client_id = c.id
            WHERE u.login = $1 AND u.is_active = true
        `, [login]);
        if (userResult.rows.length === 0) return res.json({ success: false, error: 'Неверный логин или пароль' });
        const user = userResult.rows[0];
        if (!(await bcrypt.compare(password, user.password_hash))) {
            return res.json({ success: false, error: 'Неверный логин или пароль' });
        }
        let redirectPage, fullName, role, roleName;
        if (user.client_id) {
            role = 'client'; roleName = 'Клиент'; redirectPage = '/client.html';
            fullName = `${user.c_last_name || ''} ${user.c_first_name || ''} ${user.c_patronymic || ''}`.trim() || `Клиент ${user.login}`;
        } else if (user.employee_id) {
            role = 'employee';
            const employee = (await db.query(`SELECT first_name, last_name, patronymic, position FROM employees WHERE id = $1`, [user.employee_id])).rows[0];
            if (employee) {
                roleName = employee.position === 'администратор' ? 'Администратор' : (employee.position === 'менеджер' ? 'Менеджер' : 'Оператор');
                redirectPage = employee.position === 'администратор' ? '/admin.html' : (employee.position === 'менеджер' ? '/manager.html' : '/operator.html');
                fullName = `${employee.last_name} ${employee.first_name} ${employee.patronymic || ''}`.trim();
            } else { redirectPage = '/'; fullName = 'Сотрудник'; roleName = 'Сотрудник'; }
        } else if (user.courier_id) {
            role = 'courier'; roleName = 'Курьер'; redirectPage = '/courier.html';
            const courier = (await db.query(`SELECT first_name, last_name, patronymic FROM couriers WHERE id = $1`, [user.courier_id])).rows[0];
            fullName = courier ? `${courier.last_name} ${courier.first_name} ${courier.patronymic || ''}`.trim() : 'Курьер';
        } else {
            role = 'unknown'; roleName = 'Пользователь'; redirectPage = '/'; fullName = 'Пользователь';
        }
        res.json({ success: true, redirect: redirectPage, fullName, role, roleName });
    } catch (err) {
        console.error('Ошибка авторизации:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// ========== ОБЩИЕ API ==========
app.get('/api/products/guest', async (req, res) => {
    try { res.json((await db.query('SELECT * FROM products ORDER BY id')).rows); }
    catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/products/client', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT *, CASE WHEN discount_percent > 0 THEN base_price * (1 - discount_percent/100) ELSE base_price END as discounted_price
            FROM products ORDER BY id
        `);
        res.json(result.rows);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/operator/products', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, product_name, base_price, discount_percent, stock_quantity, unit,
                   CASE WHEN discount_percent > 0 THEN base_price * (1 - discount_percent/100) ELSE base_price END as current_price
            FROM products WHERE stock_quantity > 0 ORDER BY product_name
        `);
        res.json(result.rows);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/client/products', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, product_name, category, description, base_price, discount_percent,
                   stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url,
                   CASE WHEN discount_percent > 0 THEN base_price * (1 - discount_percent/100) ELSE base_price END as current_price
            FROM products WHERE stock_quantity > 0 ORDER BY product_name
        `);
        res.json(result.rows);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ========== КЛИЕНТ ==========
app.get('/api/client/orders', async (req, res) => {
    try {
        const { login } = req.query;
        if (!login) return res.json({ success: false, error: 'Логин не указан' });
        const userRes = await db.query('SELECT client_id FROM users WHERE login = $1', [login]);
        if (!userRes.rows.length) return res.json({ success: false, error: 'Клиент не найден' });
        const clientId = userRes.rows[0].client_id;
        const orders = (await db.query(`
            SELECT o.id, o.order_date, o.delivery_address, o.status_id, s.status, o.delivery_price,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) as products_total,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) + COALESCE(o.delivery_price,0) as total_amount,
                c.first_name || ' ' || c.last_name as client_name,
                CASE WHEN cr.last_name IS NOT NULL THEN cr.last_name || ' ' || cr.first_name || COALESCE(' ' || cr.patronymic,'') END as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            WHERE o.client_id = $1
            ORDER BY o.order_date DESC
        `, [clientId])).rows;
        for (let order of orders) {
            order.items = (await db.query(`
                SELECT oi.id, oi.product_id, p.product_name, oi.quantity, oi.price as unit_price_at_order, (oi.quantity * oi.price) as total_price
                FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
            `, [order.id])).rows;
        }
        res.json({ success: true, orders });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/client/orders', async (req, res) => {
    try {
        const { login, delivery_address, items } = req.body;
        if (!login || !delivery_address || !items.length) return res.json({ success: false, error: 'Недостаточно данных' });
        const userRes = await db.query('SELECT client_id FROM users WHERE login = $1', [login]);
        if (!userRes.rows.length) return res.json({ success: false, error: 'Клиент не найден' });
        const client_id = userRes.rows[0].client_id;
        await db.query('BEGIN');
        const warehouseRes = await db.query('SELECT id FROM warehouses WHERE is_active = true LIMIT 1');
        let warehouseId = warehouseRes.rows[0]?.id;
        if (!warehouseId) {
            const newWh = await db.query(`INSERT INTO warehouses (name, address, is_active) VALUES ('Основной склад', 'г. Москва, ул. Примерная, д. 1', true) RETURNING id`);
            warehouseId = newWh.rows[0].id;
        }
        const orderRes = await db.query(`
            INSERT INTO orders (client_id, order_date, delivery_address, status_id, delivery_price, warehouse_id)
            VALUES ($1, CURRENT_TIMESTAMP, $2, 1, 0, $3) RETURNING id
        `, [client_id, delivery_address, warehouseId]);
        const orderId = orderRes.rows[0].id;
        for (let item of items) {
            const prod = (await db.query(`SELECT CASE WHEN discount_percent > 0 THEN base_price * (1 - discount_percent/100) ELSE base_price END as current_price, stock_quantity, product_name FROM products WHERE id = $1`, [item.product_id])).rows[0];
            if (!prod) { await db.query('ROLLBACK'); return res.json({ success: false, error: `Товар не найден` }); }
            if (prod.stock_quantity < item.quantity) { await db.query('ROLLBACK'); return res.json({ success: false, error: `Недостаточно товара "${prod.product_name}"` }); }
            await db.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`, [orderId, item.product_id, item.quantity, prod.current_price]);
            await db.query(`UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`, [item.quantity, item.product_id]);
        }
        const warehouseAddr = (await db.query('SELECT address FROM warehouses WHERE id = $1', [warehouseId])).rows[0]?.address || 'Склад';
        await db.query(`
            INSERT INTO routes (order_id, start_point, end_point, sending_time, delivery_time)
            VALUES ($1, $2, $3, NULL, NULL)
        `, [orderId, warehouseAddr, delivery_address]);
        await db.query('COMMIT');
        res.json({ success: true, orderId });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

// ========== ОПЕРАТОР ==========
app.get('/api/orders/all', async (req, res) => {
    try {
        const orders = (await db.query(`
            SELECT o.id, o.order_date, o.delivery_address, o.status_id, s.status, o.delivery_price,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) as products_total,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) + COALESCE(o.delivery_price,0) as total_amount,
                c.id as client_id, c.first_name || ' ' || c.last_name as client_name, c.phone as client_phone,
                CASE WHEN cr.last_name IS NOT NULL THEN cr.last_name || ' ' || cr.first_name || COALESCE(' ' || cr.patronymic,'') END as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            ORDER BY o.order_date DESC
        `)).rows;
        for (let order of orders) {
            order.items = (await db.query(`
                SELECT oi.id, oi.product_id, p.product_name, p.base_price as current_price, p.discount_percent as current_discount,
                       oi.quantity, oi.price as unit_price_at_order, (oi.quantity * oi.price) as total_price
                FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
            `, [order.id])).rows;
        }
        res.json({ success: true, orders });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.put('/api/operator/start-order/:id', async (req, res) => {
    const orderId = req.params.id;
    const { operatorLogin } = req.body;
    try {
        const check = await db.query(`SELECT status_id FROM orders WHERE id = $1`, [orderId]);
        if (check.rows.length === 0) return res.json({ success: false, error: 'Заказ не найден' });
        if (check.rows[0].status_id !== 1) return res.json({ success: false, error: 'Невозможно начать сборку' });

        const userRes = await db.query(`SELECT employee_id FROM users WHERE login = $1`, [operatorLogin]);
        if (userRes.rows.length === 0) return res.json({ success: false, error: 'Оператор не найден' });
        const operatorId = userRes.rows[0].employee_id;

        await db.query(`UPDATE orders SET status_id = 2 WHERE id = $1`, [orderId]);
        await db.query(`INSERT INTO order_picking (order_id, operator_id, started_at, completed) VALUES ($1, $2, NOW(), false)`, [orderId, operatorId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.put('/api/operator/order-ready/:id', async (req, res) => {
    const orderId = req.params.id;
    try {
        const check = await db.query(`SELECT status_id FROM orders WHERE id = $1`, [orderId]);
        if (check.rows.length === 0) return res.json({ success: false, error: 'Заказ не найден' });
        const cur = check.rows[0].status_id;
        if (cur !== 2 && cur !== 3) return res.json({ success: false, error: 'Невозможно перевести в готовность' });

        await db.query(`UPDATE orders SET status_id = 4 WHERE id = $1`, [orderId]);
        await db.query(`UPDATE order_picking SET finished_at = NOW(), completed = true WHERE order_id = $1 AND completed = false`, [orderId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/clients/operator', async (req, res) => {
    try { res.json((await db.query('SELECT * FROM clients ORDER BY id')).rows); }
    catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/operator/orders', async (req, res) => {
    try {
        const { client_id, delivery_address, delivery_price, items } = req.body;
        if (!client_id || !delivery_address || !items.length) return res.json({ success: false, error: 'Недостаточно данных' });
        await db.query('BEGIN');
        const warehouseRes = await db.query('SELECT id FROM warehouses WHERE is_active = true LIMIT 1');
        let warehouseId = warehouseRes.rows[0]?.id;
        if (!warehouseId) {
            const newWh = await db.query(`INSERT INTO warehouses (name, address, is_active) VALUES ('Основной склад', 'г. Москва, ул. Примерная, д. 1', true) RETURNING id`);
            warehouseId = newWh.rows[0].id;
        }
        const orderRes = await db.query(`
            INSERT INTO orders (client_id, order_date, delivery_address, status_id, delivery_price, warehouse_id)
            VALUES ($1, CURRENT_TIMESTAMP, $2, 1, $3, $4) RETURNING id
        `, [client_id, delivery_address, delivery_price || 0, warehouseId]);
        const orderId = orderRes.rows[0].id;
        for (let item of items) {
            const prod = (await db.query(`SELECT id, product_name, stock_quantity,
                CASE WHEN discount_percent > 0 THEN base_price * (1 - discount_percent/100) ELSE base_price END as current_price
                FROM products WHERE id = $1`, [item.product_id])).rows[0];
            if (!prod) { await db.query('ROLLBACK'); return res.json({ success: false, error: `Товар не найден` }); }
            if (prod.stock_quantity < item.quantity) { await db.query('ROLLBACK'); return res.json({ success: false, error: `Недостаточно товара "${prod.product_name}"` }); }
            await db.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`, [orderId, item.product_id, item.quantity, prod.current_price]);
            await db.query(`UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`, [item.quantity, item.product_id]);
        }
        await db.query('COMMIT');
        res.json({ success: true, orderId });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/operator/orders/:id', async (req, res) => {
    try {
        const order = (await db.query(`
            SELECT o.id, o.client_id, o.delivery_address, o.delivery_price, o.status_id,
                   c.first_name || ' ' || c.last_name as client_name
            FROM orders o LEFT JOIN clients c ON o.client_id = c.id WHERE o.id = $1
        `, [req.params.id])).rows[0];
        if (!order) return res.status(404).json({ error: 'Заказ не найден' });
        order.items = (await db.query(`
            SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.product_name
            FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
        `, [order.id])).rows;
        res.json(order);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.put('/api/operator/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { delivery_address, delivery_price, items } = req.body;
    await db.query('BEGIN');
    try {
        await db.query(`UPDATE orders SET delivery_address = $1, delivery_price = $2 WHERE id = $3`, [delivery_address, delivery_price || 0, id]);
        const oldItems = await db.query(`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, [id]);
        for (let item of oldItems.rows) await db.query(`UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`, [item.quantity, item.product_id]);
        await db.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
        for (let item of items) {
            await db.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`, [id, item.product_id, item.quantity, item.price]);
            await db.query(`UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`, [item.quantity, item.product_id]);
        }
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.delete('/api/operator/orders/:id', async (req, res) => {
    const { id } = req.params;
    await db.query('BEGIN');
    try {
        const items = await db.query(`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, [id]);
        for (let item of items.rows) await db.query(`UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`, [item.quantity, item.product_id]);
        await db.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
        await db.query(`DELETE FROM orders WHERE id = $1`, [id]);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/operator/clients', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone, email, address, login, password } = req.body;
        const existingPhone = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
        if (existingPhone.rows.length) return res.status(400).json({ error: 'Клиент с таким номером телефона уже существует' });
        if (email) {
            const existingEmail = await db.query('SELECT id FROM clients WHERE email = $1', [email]);
            if (existingEmail.rows.length) return res.status(400).json({ error: 'Клиент с таким email уже существует' });
        }
        const existingLogin = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (existingLogin.rows.length) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const clientRes = await db.query(`
            INSERT INTO clients (last_name, first_name, patronymic, phone, email, address)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [last_name, first_name, patronymic, phone, email, address]);
        const clientId = clientRes.rows[0].id;
        await db.query(`INSERT INTO users (login, password_hash, client_id, is_active) VALUES ($1, $2, $3, true)`, [login, hashedPassword, clientId]);
        res.json({ success: true, clientId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ========== МЕНЕДЖЕР ==========
app.get('/api/manager/couriers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.id, c.last_name, c.first_name, c.patronymic, c.transport_type, c.employment_status, cp.phone_number
            FROM couriers c LEFT JOIN courier_phones cp ON c.id = cp.courier_id ORDER BY c.id
        `);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/manager/all-orders', async (req, res) => {
    try {
        const orders = (await db.query(`
            SELECT o.id, o.order_date, o.delivery_address, o.status_id, s.status, COALESCE(o.delivery_price,0) as delivery_price,
                COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) as products_total,
                COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) + COALESCE(o.delivery_price,0) as total_amount,
                c.id as client_id, c.first_name || ' ' || c.last_name as client_name, c.phone as client_phone,
                cr.id as courier_id, cr.last_name || ' ' || cr.first_name as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            ORDER BY o.order_date DESC
        `)).rows;
        for (let order of orders) {
            order.items = (await db.query(`
                SELECT oi.id, oi.product_id, p.product_name, oi.quantity, oi.price as unit_price_at_order, (oi.quantity * oi.price) as total_price
                FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
            `, [order.id])).rows;
        }
        res.json({ success: true, orders });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/manager/report/orders', async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        const rows = (await db.query(`
            SELECT o.id, o.order_date, c.last_name || ' ' || c.first_name AS client_name, o.delivery_address, s.status, o.delivery_price,
                COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) AS products_total,
                COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) + COALESCE(o.delivery_price,0) AS total_amount
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN status s ON o.status_id = s.id
            WHERE ($1::date IS NULL OR o.order_date::date >= $1::date)
              AND ($2::date IS NULL OR o.order_date::date <= $2::date)
            ORDER BY o.order_date DESC
        `, [date_from || null, date_to || null])).rows;
        res.json({ success: true, data: rows });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/manager/report/couriers', async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        const rows = (await db.query(`
            SELECT cr.id, cr.last_name || ' ' || cr.first_name AS courier_name,
                COUNT(o.id) AS total_orders,
                SUM(CASE WHEN o.status_id = 8 THEN 1 ELSE 0 END) AS delivered_orders,
                SUM(CASE WHEN o.status_id = 6 THEN 1 ELSE 0 END) AS cancelled_orders,
                SUM(CASE WHEN o.status_id = 8 THEN COALESCE(o.delivery_price,0) ELSE 0 END) AS total_earnings,
                AVG(CASE WHEN o.status_id = 8 AND o.delivery_date IS NOT NULL AND o.order_date IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (o.delivery_date - o.order_date)) / 3600 
                    ELSE NULL END) AS avg_delivery_hours
            FROM couriers cr
            LEFT JOIN orders o ON cr.id = o.courier_id
            WHERE ($1::date IS NULL OR o.order_date::date >= $1::date)
              AND ($2::date IS NULL OR o.order_date::date <= $2::date)
            GROUP BY cr.id, courier_name
            ORDER BY delivered_orders DESC
        `, [date_from || null, date_to || null])).rows;
        res.json({ success: true, data: rows.map(r => ({ ...r, avg_delivery_hours: r.avg_delivery_hours ? parseFloat(r.avg_delivery_hours).toFixed(2) : null })) });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/manager/report/finance', async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        const data = (await db.query(`
            SELECT payment_type, COUNT(*) AS count, SUM(total_amount) AS total_sum
            FROM payments
            WHERE ($1::date IS NULL OR payment_date::date >= $1::date)
              AND ($2::date IS NULL OR payment_date::date <= $2::date)
            GROUP BY payment_type
            ORDER BY total_sum DESC
        `, [date_from || null, date_to || null])).rows;
        const summary = (await db.query(`
            SELECT COUNT(*) AS total_payments, SUM(total_amount) AS grand_total
            FROM payments
            WHERE ($1::date IS NULL OR payment_date::date >= $1::date)
              AND ($2::date IS NULL OR payment_date::date <= $2::date)
        `, [date_from || null, date_to || null])).rows[0];
        res.json({ success: true, data, summary });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.put('/api/manager/update-delivery-price', async (req, res) => {
    try {
        const { orderId, delivery_price } = req.body;
        if (!orderId || delivery_price === undefined) return res.json({ success: false, error: 'Недостаточно данных' });
        await db.query(`UPDATE orders SET delivery_price = $1 WHERE id = $2`, [delivery_price, orderId]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

// ========== КУРЬЕР ==========
app.get('/api/courier/available-orders', async (req, res) => {
    try {
        const rows = (await db.query(`
            SELECT o.id, o.order_date, o.delivery_address, o.delivery_price, o.status_id, s.status,
                   c.last_name || ' ' || c.first_name as client_name, c.phone as client_phone,
                   COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) as products_total,
                   COALESCE((SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id),0) + COALESCE(o.delivery_price,0) as total_amount
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN status s ON o.status_id = s.id
            WHERE o.status_id = 4 AND o.courier_id IS NULL
            ORDER BY o.order_date ASC
        `)).rows;
        for (let order of rows) {
            order.items = (await db.query(`
                SELECT oi.id, oi.product_id, p.product_name, oi.quantity, oi.price as unit_price
                FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
            `, [order.id])).rows;
        }
        res.json({ success: true, orders: rows });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/courier/take-order', async (req, res) => {
    const { orderId, courierLogin } = req.body;
    if (!orderId || !courierLogin) return res.json({ success: false, error: 'Недостаточно данных' });
    try {
        const userRes = await db.query(`SELECT courier_id FROM users WHERE login = $1`, [courierLogin]);
        if (!userRes.rows.length || !userRes.rows[0].courier_id) return res.json({ success: false, error: 'Курьер не найден' });
        const courierId = userRes.rows[0].courier_id;
        const order = (await db.query(`SELECT id, status_id, courier_id FROM orders WHERE id = $1`, [orderId])).rows[0];
        if (!order) return res.json({ success: false, error: 'Заказ не найден' });
        if (order.courier_id !== null) return res.json({ success: false, error: 'Заказ уже назначен' });
        if (order.status_id !== 4) return res.json({ success: false, error: 'Заказ не готов к выдаче' });
        await db.query('BEGIN');
        await db.query(`UPDATE orders SET courier_id = $1, status_id = 5 WHERE id = $2`, [courierId, orderId]);
        await db.query(`UPDATE couriers SET employment_status = 'занят' WHERE id = $1`, [courierId]);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/courier/orders', async (req, res) => {
    try {
        const { login } = req.query;
        if (!login) return res.json({ success: false, error: 'Логин не указан' });
        const userRes = await db.query(`SELECT courier_id FROM users WHERE login = $1`, [login]);
        if (!userRes.rows.length) return res.json({ success: false, error: 'Курьер не найден' });
        const courierId = userRes.rows[0].courier_id;
        const orders = (await db.query(`
            SELECT o.id, o.order_date, o.delivery_date, o.delivery_address, o.status_id, s.status, o.delivery_price,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) as products_total,
                (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = o.id) + COALESCE(o.delivery_price,0) as total_amount,
                c.first_name || ' ' || c.last_name as client_name, c.phone as client_phone
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.courier_id = $1
            ORDER BY CASE WHEN o.status_id = 3 THEN 1 WHEN o.status_id = 2 THEN 2 WHEN o.status_id = 1 THEN 3 ELSE 4 END, o.order_date DESC
        `, [courierId])).rows;
        for (let order of orders) {
            order.items = (await db.query(`
                SELECT oi.id, oi.product_id, p.product_name, oi.quantity, oi.price as unit_price_at_order, (oi.quantity * oi.price) as total_price
                FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1
            `, [order.id])).rows;
        }
        res.json({ success: true, orders });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/courier/update-status', async (req, res) => {
    const { orderId, newStatusId, courierLogin, paymentType } = req.body;
    try {
        const userRes = await db.query(`SELECT courier_id FROM users WHERE login = $1`, [courierLogin]);
        if (!userRes.rows.length) return res.json({ success: false, error: 'Курьер не найден' });
        const courierId = userRes.rows[0].courier_id;
        const check = await db.query(`SELECT status_id FROM orders WHERE id = $1 AND courier_id = $2`, [orderId, courierId]);
        if (!check.rows.length) return res.json({ success: false, error: 'Заказ не принадлежит вам' });
        await db.query('BEGIN');
        let updateQuery = `UPDATE orders SET status_id = $1 WHERE id = $2`;
        let params = [newStatusId, orderId];
        if (newStatusId === 7) { // В пути
            await db.query(`UPDATE routes SET sending_time = NOW() WHERE order_id = $1`, [orderId]);
        } else if (newStatusId === 8) { // Доставлен
            await db.query(`UPDATE routes SET delivery_time = NOW() WHERE order_id = $1`, [orderId]);
        } else if (newStatusId === 6) {
            await db.query(`UPDATE couriers SET employment_status = 'свободен' WHERE id = $1`, [courierId]);
        }
        await db.query(updateQuery, params);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

// ========== АДМИНИСТРАТОР (CRUD) ==========
app.get('/api/admin/products', async (req, res) => { try { res.json((await db.query('SELECT * FROM products ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/products/:id', async (req, res) => {
    const result = (await db.query('SELECT * FROM products WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Товар не найден' });
    res.json(result);
});
app.post('/api/admin/products', async (req, res) => {
    try {
        const { product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url } = req.body;
        const result = await db.query(`
            INSERT INTO products (product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
        `, [product_name, category, description, base_price, discount_percent || 0, stock_quantity || 0, unit || 'шт.', weight_kg || 0, volume_m3 || 0, manufacturer, supplier, image_url]);
        res.json({ success: true, product: result.rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/products/:id', async (req, res) => {
    const { id } = req.params;
    const { product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url } = req.body;
    try {
        await db.query(`
            UPDATE products SET product_name=$1, category=$2, description=$3, base_price=$4, discount_percent=$5, stock_quantity=$6, unit=$7, weight_kg=$8, volume_m3=$9, manufacturer=$10, supplier=$11, image_url=$12 WHERE id=$13
        `, [product_name, category, description, base_price, discount_percent || 0, stock_quantity || 0, unit || 'шт.', weight_kg || 0, volume_m3 || 0, manufacturer, supplier, image_url, id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM order_items WHERE product_id = $1', [req.params.id]);
        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/clients', async (req, res) => { try { res.json((await db.query('SELECT * FROM clients ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/clients/:id', async (req, res) => {
    const result = (await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(result);
});
app.post('/api/admin/clients', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone, email, address, login, password } = req.body;
        const existingPhone = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
        if (existingPhone.rows.length) return res.status(400).json({ error: 'Клиент с таким номером телефона уже существует' });
        if (email) {
            const existingEmail = await db.query('SELECT id FROM clients WHERE email = $1', [email]);
            if (existingEmail.rows.length) return res.status(400).json({ error: 'Клиент с таким email уже существует' });
        }
        const existingLogin = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (existingLogin.rows.length) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const clientRes = await db.query(`
            INSERT INTO clients (last_name, first_name, patronymic, phone, email, address)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [last_name, first_name, patronymic, phone, email, address]);
        const clientId = clientRes.rows[0].id;
        await db.query(`INSERT INTO users (login, password_hash, client_id, is_active) VALUES ($1, $2, $3, true)`, [login, hashedPassword, clientId]);
        res.json({ success: true, clientId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { last_name, first_name, patronymic, phone, email, address } = req.body;
    try {
        await db.query(`UPDATE clients SET last_name=$1, first_name=$2, patronymic=$3, phone=$4, email=$5, address=$6 WHERE id=$7`, [last_name, first_name, patronymic, phone, email, address, id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const orders = (await db.query('SELECT id FROM orders WHERE client_id = $1', [id])).rows;
        for (let order of orders) await db.query('DELETE FROM order_items WHERE order_id = $1', [order.id]);
        await db.query('DELETE FROM orders WHERE client_id = $1', [id]);
        await db.query('DELETE FROM users WHERE client_id = $1', [id]);
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/couriers', async (req, res) => { try { res.json((await db.query(`SELECT c.*, cp.phone_number FROM couriers c LEFT JOIN courier_phones cp ON c.id = cp.courier_id ORDER BY c.id`)).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/couriers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const courier = (await db.query(`SELECT * FROM couriers WHERE id = $1`, [id])).rows[0];
        if (!courier) return res.status(404).json({ error: 'Курьер не найден' });
        const phones = (await db.query(`SELECT phone_number FROM courier_phones WHERE courier_id = $1`, [id])).rows.map(p => p.phone_number);
        courier.phone_numbers = phones;
        res.json(courier);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.post('/api/admin/couriers', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone_numbers, transport_type, employment_status, login, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const courierRes = await db.query(
            `INSERT INTO couriers (last_name, first_name, patronymic, transport_type, employment_status)
             VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [last_name, first_name, patronymic, transport_type, employment_status || 'свободен']
        );
        const courierId = courierRes.rows[0].id;
        // Вставка телефонов
        if (phone_numbers && Array.isArray(phone_numbers)) {
            for (const phone of phone_numbers) {
                if (phone && phone.trim()) {
                    await db.query(`INSERT INTO courier_phones (courier_id, phone_number) VALUES ($1, $2)`, [courierId, phone]);
                }
            }
        }
        await db.query(`INSERT INTO users (login, password_hash, courier_id, is_active) VALUES ($1,$2,$3,true)`, [login, hashedPassword, courierId]);
        res.json({ success: true, courierId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/couriers/:id', async (req, res) => {
    const { id } = req.params;
    const { last_name, first_name, patronymic, phone_numbers, transport_type, employment_status } = req.body;
    try {
        await db.query(
            `UPDATE couriers SET last_name=$1, first_name=$2, patronymic=$3, transport_type=$4, employment_status=$5 WHERE id=$6`,
            [last_name, first_name, patronymic, transport_type, employment_status, id]
        );
        // Обновляем телефоны: удаляем старые, вставляем новые
        await db.query(`DELETE FROM courier_phones WHERE courier_id = $1`, [id]);
        if (phone_numbers && Array.isArray(phone_numbers)) {
            for (const phone of phone_numbers) {
                if (phone && phone.trim()) {
                    await db.query(`INSERT INTO courier_phones (courier_id, phone_number) VALUES ($1, $2)`, [id, phone]);
                }
            }
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/couriers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE orders SET courier_id = NULL WHERE courier_id = $1', [id]);
        await db.query('DELETE FROM courier_phones WHERE courier_id = $1', [id]);
        await db.query('DELETE FROM users WHERE courier_id = $1', [id]);
        await db.query('DELETE FROM couriers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/employees', async (req, res) => { try { res.json((await db.query('SELECT * FROM employees ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/employees/:id', async (req, res) => {
    const result = (await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(result);
});
app.post('/api/admin/employees', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, position, phone, email, is_active, login, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const empRes = await db.query(`INSERT INTO employees (last_name, first_name, patronymic, position, phone, email, is_active, hire_date) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE) RETURNING id`, [last_name, first_name, patronymic, position, phone, email, is_active === 'true' || is_active === true]);
        const employeeId = empRes.rows[0].id;
        await db.query(`INSERT INTO users (login, password_hash, employee_id, is_active) VALUES ($1,$2,$3,$4)`, [login, hashedPassword, employeeId, is_active === 'true' || is_active === true]);
        res.json({ success: true, employeeId });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/employees/:id', async (req, res) => {
    const { id } = req.params;
    const { last_name, first_name, patronymic, position, phone, email, is_active } = req.body;
    try {
        await db.query(`UPDATE employees SET last_name=$1, first_name=$2, patronymic=$3, position=$4, phone=$5, email=$6, is_active=$7 WHERE id=$8`, [last_name, first_name, patronymic, position, phone, email, is_active === 'true' || is_active === true, id]);
        await db.query(`UPDATE users SET is_active=$1 WHERE employee_id=$2`, [is_active === 'true' || is_active === true, id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/employees/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE employee_id = $1', [req.params.id]);
        await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/warehouses', async (req, res) => { try { res.json((await db.query('SELECT * FROM warehouses ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/warehouses/:id', async (req, res) => {
    const result = (await db.query('SELECT * FROM warehouses WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Склад не найден' });
    res.json(result);
});
app.post('/api/admin/warehouses', async (req, res) => {
    try {
        const { name, address, is_active } = req.body;
        const result = await db.query(`INSERT INTO warehouses (name, address, is_active) VALUES ($1,$2,$3) RETURNING *`, [name, address, is_active === 'true' || is_active === true]);
        res.json({ success: true, warehouse: result.rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/warehouses/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, is_active } = req.body;
    try {
        await db.query(`UPDATE warehouses SET name=$1, address=$2, is_active=$3 WHERE id=$4`, [name, address, is_active === 'true' || is_active === true, id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/warehouses/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM warehouses WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/statuses', async (req, res) => { try { res.json((await db.query('SELECT * FROM status ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/statuses/:id', async (req, res) => {
    const result = (await db.query('SELECT * FROM status WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Статус не найден' });
    res.json(result);
});
app.post('/api/admin/statuses', async (req, res) => {
    try {
        const { status } = req.body;
        const result = await db.query(`INSERT INTO status (status) VALUES ($1) RETURNING *`, [status]);
        res.json({ success: true, status: result.rows[0] });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/statuses/:id', async (req, res) => {
    try {
        await db.query(`UPDATE status SET status = $1 WHERE id = $2`, [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/statuses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const check = await db.query('SELECT COUNT(*) FROM orders WHERE status_id = $1', [id]);
        if (parseInt(check.rows[0].count) > 0) return res.status(400).json({ success: false, error: 'Нельзя удалить статус, так как есть заказы с этим статусом' });
        await db.query('DELETE FROM status WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/users', async (req, res) => { try { res.json((await db.query('SELECT id, login, client_id, employee_id, courier_id, is_active, created_at FROM users ORDER BY id')).rows); } catch { res.status(500).json({ error: 'Ошибка сервера' }); } });
app.get('/api/admin/users/:id', async (req, res) => {
    const result = (await db.query('SELECT id, login, client_id, employee_id, courier_id, is_active FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!result) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result);
});
app.post('/api/admin/users', async (req, res) => {
    try {
        const { login, password, user_type, entity_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        let client_id = null, employee_id = null, courier_id = null;
        if (user_type === 'client') client_id = entity_id;
        else if (user_type === 'employee') employee_id = entity_id;
        else if (user_type === 'courier') courier_id = entity_id;
        await db.query(`INSERT INTO users (login, password_hash, client_id, employee_id, courier_id, is_active) VALUES ($1,$2,$3,$4,$5,true)`, [login, hashedPassword, client_id, employee_id, courier_id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { login, password, is_active } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(`UPDATE users SET login=$1, password_hash=$2, is_active=$3 WHERE id=$4`, [login, hashedPassword, is_active === 'true' || is_active === true, id]);
        } else {
            await db.query(`UPDATE users SET login=$1, is_active=$2 WHERE id=$3`, [login, is_active === 'true' || is_active === true, id]);
        }
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
        await db.query('DELETE FROM payments WHERE order_id = $1', [id]);
        await db.query('DELETE FROM orders WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ========== РЕЗЕРВНОЕ КОПИРОВАНИЕ ==========
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
const uploadBackup = multer({ storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, BACKUP_DIR), filename: (req, file, cb) => cb(null, file.originalname) }) });

app.get('/api/admin/backups', async (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files.filter(f => f.endsWith('.sql') || f.endsWith('.json')).map(filename => ({ filename, created_at: fs.statSync(path.join(BACKUP_DIR, filename)).birthtime })).sort((a,b) => b.created_at - a.created_at);
        res.json(backups);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/admin/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.json`;
        const filepath = path.join(BACKUP_DIR, filename);
        const tables = ['products', 'clients', 'couriers', 'employees', 'status', 'warehouses', 'orders', 'order_items', 'payments', 'users'];
        const backupData = { _metadata: { created_at: new Date().toISOString(), version: '1.0' } };
        for (const table of tables) {
            try {
                const exists = (await db.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table])).rows[0].exists;
                backupData[table] = exists ? (await db.query(`SELECT * FROM ${table}`)).rows : [];
            } catch { backupData[table] = []; }
        }
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
        res.json({ success: true, filename });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/admin/restore', uploadBackup.single('backup'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не загружен' });
    try {
        const backupData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
        await db.query('BEGIN');
        const tablesInOrder = ['order_items', 'payments', 'orders', 'users', 'products', 'clients', 'couriers', 'employees', 'warehouses', 'status'];
        for (const table of tablesInOrder) { try { await db.query(`TRUNCATE TABLE ${table} CASCADE`); } catch (e) {} }
        const restoreOrder = ['products', 'clients', 'couriers', 'employees', 'warehouses', 'status', 'orders', 'order_items', 'payments', 'users'];
        for (const table of restoreOrder) {
            const rows = backupData[table];
            if (rows && rows.length) {
                const columns = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [table])).rows.map(c => c.column_name);
                for (const row of rows) {
                    const filteredCols = Object.keys(row).filter(col => columns.includes(col));
                    const values = filteredCols.map(col => row[col]);
                    const placeholders = values.map((_, i) => `$${i+1}`).join(',');
                    if (filteredCols.length) await db.query(`INSERT INTO ${table} (${filteredCols.join(',')}) VALUES (${placeholders})`, values);
                }
                const maxId = (await db.query(`SELECT MAX(id) FROM ${table}`)).rows[0].max;
                if (maxId) {
                    try {
                        const seqExists = await db.query(`SELECT to_regclass('${table}_id_seq') as exists`);
                        if (seqExists.rows[0].exists) {
                            await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${maxId+1}`);
                        }
                    } catch (err) {
                        console.log(`Не удалось сбросить sequence для ${table}:`, err.message);
                    }
                }
            }
        }
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка восстановления' }); }
});

app.post('/api/admin/restore-file', async (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ success: false, error: 'Не указан файл' });
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, error: 'Файл не найден' });
    try {
        const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        await db.query('BEGIN');
        const tablesInOrder = ['order_items', 'payments', 'orders', 'users', 'products', 'clients', 'couriers', 'employees', 'warehouses', 'status'];
        for (const table of tablesInOrder) { try { await db.query(`TRUNCATE TABLE ${table} CASCADE`); } catch (e) {} }
        const restoreOrder = ['products', 'clients', 'couriers', 'employees', 'warehouses', 'status', 'orders', 'order_items', 'payments', 'users'];
        for (const table of restoreOrder) {
            const rows = backupData[table];
            if (rows && rows.length) {
                const columns = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [table])).rows.map(c => c.column_name);
                for (const row of rows) {
                    const filteredCols = Object.keys(row).filter(col => columns.includes(col));
                    const values = filteredCols.map(col => row[col]);
                    const placeholders = values.map((_, i) => `$${i+1}`).join(',');
                    if (filteredCols.length) await db.query(`INSERT INTO ${table} (${filteredCols.join(',')}) VALUES (${placeholders})`, values);
                }
                const maxId = (await db.query(`SELECT MAX(id) FROM ${table}`)).rows[0].max;
                if (maxId) {
                    try {
                        const seqExists = await db.query(`SELECT to_regclass('${table}_id_seq') as exists`);
                        if (seqExists.rows[0].exists) {
                            await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${maxId+1}`);
                        }
                    } catch (err) {
                        console.log(`Не удалось сбросить sequence для ${table}:`, err.message);
                    }
                }
            }
        }
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка восстановления' }); }
});

// ========== ПРОЧИЕ ВСПОМОГАТЕЛЬНЫЕ ==========
app.post('/api/admin/finish-all-orders', async (req, res) => {
    try {
        await db.query('BEGIN');
        await db.query(`UPDATE orders SET status_id = 4, delivery_date = CURRENT_TIMESTAMP WHERE status_id IN (1,2,3)`);
        await db.query(`UPDATE couriers SET employment_status = 'свободен' WHERE employment_status = 'занят'`);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) { await db.query('ROLLBACK'); console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.post('/api/calculate-delivery', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !items.length) return res.json({ success: false, error: 'Нет товаров для расчета' });
        let totalWeight = 0, totalVolume = 0;
        for (const item of items) {
            const prod = (await db.query('SELECT weight_kg, volume_m3 FROM products WHERE id = $1', [item.product_id])).rows[0];
            if (prod) {
                totalWeight += (prod.weight_kg || 0) * item.quantity;
                totalVolume += (prod.volume_m3 || 0) * item.quantity;
            }
        }
        let basePrice = 200;
        basePrice += Math.floor(totalWeight / 5) * 50;
        basePrice += Math.floor(totalVolume / 0.1) * 30;
        basePrice += items.length * 20;
        const finalPrice = Math.min(basePrice, 1000);
        res.json({ success: true, delivery_price: finalPrice, weight: totalWeight.toFixed(2), volume: totalVolume.toFixed(3), message: `Рассчитано: вес ${totalWeight.toFixed(2)} кг, объем ${totalVolume.toFixed(3)} м³, стоимость доставки ${finalPrice} руб.` });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Ошибка сервера' }); }
});

app.get('/api/admin/other-entities', async (req, res) => {
    try {
        const employees = (await db.query('SELECT id, first_name, last_name, patronymic, position FROM employees ORDER BY id')).rows;
        const warehouses = (await db.query('SELECT id, name, address FROM warehouses ORDER BY id')).rows;
        const statuses = (await db.query('SELECT id, status FROM status ORDER BY id')).rows;
        const users = (await db.query('SELECT id, login FROM users ORDER BY id')).rows;
        res.json({ Сотрудники: employees, Склады: warehouses, 'Статусы заказов': statuses, 'Пользователи системы': users });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/manager/available-couriers', async (req, res) => {
    try {
        const result = await db.query(`SELECT c.id, c.last_name, c.first_name, c.patronymic, c.transport_type, c.employment_status, cp.phone_number FROM couriers c LEFT JOIN courier_phones cp ON c.id = cp.courier_id WHERE c.employment_status = 'свободен' ORDER BY c.last_name, c.first_name`);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ========== СИНХРОНИЗАЦИЯ SEQUENCES ПРИ СТАРТЕ ==========
(async () => {
    const tables = ['clients', 'orders', 'products', 'users', 'couriers', 'employees', 'warehouses', 'status'];
    for (const table of tables) {
        try {
            const maxId = (await db.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${table}`)).rows[0].max_id;
            if (maxId > 0) await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${maxId + 1}`);
        } catch (e) {}
    }
})();

// ========== КОРЗИНА (КАРТОЧКИ ТОВАРОВ) ==========
// Получить корзину клиента
app.get('/api/client/cart', async (req, res) => {
    const { login } = req.query;
    if (!login) return res.json({ success: false, error: 'Login required' });
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
    if (!userRes.rows.length) return res.json({ success: false, error: 'Пользователь не найден' });
    const userId = userRes.rows[0].id;
    const items = await db.query(`
        SELECT ci.id, ci.product_id, p.product_name, ci.quantity, 
               CASE WHEN p.discount_percent > 0 THEN p.base_price * (1 - p.discount_percent/100) ELSE p.base_price END as price,
               p.stock_quantity, p.unit, p.base_price as original_price, p.discount_percent
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.client_id = $1
        ORDER BY ci.added_at
    `, [userId]);
    res.json({ success: true, cart: items.rows });
});

// Добавить товар в корзину (или обновить количество)
app.post('/api/client/cart', async (req, res) => {
    const { login, product_id, quantity } = req.body;
    if (!login || !product_id) return res.json({ success: false, error: 'Недостаточно данных' });
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
    if (!userRes.rows.length) return res.json({ success: false, error: 'Пользователь не найден' });
    const userId = userRes.rows[0].id;
    
    // Проверка остатка
    const prod = await db.query('SELECT stock_quantity FROM products WHERE id = $1', [product_id]);
    if (prod.rows[0].stock_quantity < quantity) {
        return res.json({ success: false, error: 'Недостаточно товара на складе' });
    }
    
    const existing = await db.query(
        'SELECT id, quantity FROM cart_items WHERE client_id = $1 AND product_id = $2',
        [userId, product_id]
    );
    if (existing.rows.length) {
        await db.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, existing.rows[0].id]);
    } else {
        await db.query(
            'INSERT INTO cart_items (client_id, product_id, quantity, added_at) VALUES ($1, $2, $3, NOW())',
            [userId, product_id, quantity]
        );
    }
    res.json({ success: true });
});

// Обновить количество товара в корзине
app.put('/api/client/cart', async (req, res) => {
    const { login, product_id, quantity } = req.body;
    if (!login || !product_id) return res.json({ success: false, error: 'Недостаточно данных' });
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
    if (!userRes.rows.length) return res.json({ success: false, error: 'Пользователь не найден' });
    const userId = userRes.rows[0].id;
    if (quantity <= 0) {
        await db.query('DELETE FROM cart_items WHERE client_id = $1 AND product_id = $2', [userId, product_id]);
    } else {
        // Проверка остатка
        const prod = await db.query('SELECT stock_quantity FROM products WHERE id = $1', [product_id]);
        if (prod.rows[0].stock_quantity < quantity) {
            return res.json({ success: false, error: 'Недостаточно товара на складе' });
        }
        await db.query(`UPDATE cart_items SET quantity = $1 WHERE client_id = $2 AND product_id = $3`, [quantity, userId, product_id]);
    }
    res.json({ success: true });
});

// Удалить товар из корзины
app.delete('/api/client/cart', async (req, res) => {
    const { login, product_id } = req.body;
    if (!login || !product_id) return res.json({ success: false, error: 'Недостаточно данных' });
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
    if (!userRes.rows.length) return res.json({ success: false, error: 'Пользователь не найден' });
    const userId = userRes.rows[0].id;
    await db.query('DELETE FROM cart_items WHERE client_id = $1 AND product_id = $2', [userId, product_id]);
    res.json({ success: true });
});

// Очистить корзину (после оформления заказа)
app.delete('/api/client/cart/clear', async (req, res) => {
    const { login } = req.body;
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
    if (!userRes.rows.length) return res.json({ success: false, error: 'Пользователь не найден' });
    const userId = userRes.rows[0].id;
    await db.query('DELETE FROM cart_items WHERE client_id = $1', [userId]);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));