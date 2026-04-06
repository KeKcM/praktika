require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./bd/database');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Основные роуты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/guest', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'guest.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/manager.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'manager.html'));
});

app.get('/operator.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'operator.html'));
});

app.get('/client.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'client.html'));
});

app.get('/courier.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'courier.html'));
});

// API для клиента
app.get('/api/client/orders', async (req, res) => {
    try {
        const { login } = req.query;
        
        if (!login) {
            return res.json({ success: false, error: 'Логин не указан' });
        }

        const userResult = await db.query(`
            SELECT client_id FROM users WHERE login = $1
        `, [login]);

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Клиент не найден' });
        }

        const clientId = userResult.rows[0].client_id;
        
        const ordersResult = await db.query(`
            SELECT 
                o.id,
                o.order_date,
                o.delivery_address,
                o.status_id,
                s.status,
                o.delivery_price,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) as products_total,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) + COALESCE(o.delivery_price, 0) as total_amount,
                c.first_name || ' ' || c.last_name as client_name,
                CASE 
                    WHEN cr.last_name IS NOT NULL AND cr.first_name IS NOT NULL THEN
                        cr.last_name || ' ' || cr.first_name || COALESCE(' ' || cr.patronymic, '')
                    ELSE NULL
                END as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            WHERE o.client_id = $1
            ORDER BY o.order_date DESC
        `, [clientId]);

        const orders = ordersResult.rows;
        
        for (let order of orders) {
            const itemsResult = await db.query(`
                SELECT 
                    oi.id,
                    oi.product_id,
                    p.product_name,
                    oi.quantity,
                    oi.price as unit_price_at_order,
                    (oi.quantity * oi.price) as total_price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            
            order.items = itemsResult.rows;
        }

        res.json({ success: true, orders: orders });
    } catch (err) {
        console.error('Ошибка получения заказов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// API для гостя
app.get('/api/products/guest', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для клиента (товары со скидками)
app.get('/api/products/client', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                *,
                CASE 
                    WHEN discount_percent > 0 THEN 
                        base_price * (1 - discount_percent / 100)
                    ELSE base_price
                END as discounted_price
            FROM products 
            ORDER BY id
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для оператора (все заказы)
app.get('/api/orders/all', async (req, res) => {
    try {
        const ordersResult = await db.query(`
            SELECT 
                o.id,
                o.order_date,
                o.delivery_address,
                o.status_id,
                s.status,
                o.delivery_price,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) as products_total,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) + COALESCE(o.delivery_price, 0) as total_amount,
                c.id as client_id,
                c.first_name || ' ' || c.last_name as client_name,
                c.phone as client_phone,
                CASE 
                    WHEN cr.last_name IS NOT NULL AND cr.first_name IS NOT NULL THEN
                        cr.last_name || ' ' || cr.first_name || COALESCE(' ' || cr.patronymic, '')
                    ELSE NULL
                END as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            ORDER BY o.order_date DESC
        `);

        const orders = ordersResult.rows;
        
        for (let order of orders) {
            const itemsResult = await db.query(`
                SELECT 
                    oi.id,
                    oi.product_id,
                    p.product_name,
                    p.base_price as current_price,
                    p.discount_percent as current_discount,
                    oi.quantity,
                    oi.price as unit_price_at_order,
                    (oi.quantity * oi.price) as total_price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            
            order.items = itemsResult.rows;
        }

        res.json({ success: true, orders: orders });
    } catch (err) {
        console.error('Ошибка получения всех заказов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// API для оператора (клиенты)
app.get('/api/clients/operator', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM clients ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для менеджера (курьеры)
app.get('/api/manager/couriers', async (req, res) => {
    try {
        console.log('Запрос списка курьеров');
        
        const result = await db.query(`
            SELECT 
                c.id,
                c.last_name,
                c.first_name,
                c.patronymic,
                c.transport_type,
                c.employment_status,
                cp.phone_number
            FROM couriers c
            LEFT JOIN courier_phones cp ON c.id = cp.courier_id
            ORDER BY c.id
        `);
        
        console.log('Найдено курьеров:', result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения курьеров:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для курьера (заказы курьера)
app.get('/api/courier/orders', async (req, res) => {
    try {
        const { login } = req.query;
        
        if (!login) {
            return res.json({ success: false, error: 'Логин не указан' });
        }

        const userResult = await db.query(`
            SELECT courier_id FROM users WHERE login = $1
        `, [login]);

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Курьер не найден' });
        }

        const courierId = userResult.rows[0].courier_id;
        
        const ordersResult = await db.query(`
            SELECT 
                o.id,
                o.order_date,
                o.delivery_date,
                o.delivery_address,
                o.status_id,
                s.status,
                o.delivery_price,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) as products_total,
                (
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) + COALESCE(o.delivery_price, 0) as total_amount,
                c.first_name || ' ' || c.last_name as client_name,
                c.phone as client_phone
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.courier_id = $1
            ORDER BY 
                CASE 
                    WHEN o.status_id = 3 THEN 1
                    WHEN o.status_id = 2 THEN 2
                    WHEN o.status_id = 1 THEN 3
                    ELSE 4
                END,
                o.order_date DESC
        `, [courierId]);

        const orders = ordersResult.rows;
        
        for (let order of orders) {
            const itemsResult = await db.query(`
                SELECT 
                    oi.id,
                    oi.product_id,
                    p.product_name,
                    oi.quantity,
                    oi.price as unit_price_at_order,
                    (oi.quantity * oi.price) as total_price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            
            order.items = itemsResult.rows;
        }

        res.json({ success: true, orders: orders });
    } catch (err) {
        console.error('Ошибка получения заказов курьера:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// API для курьера (обновление статуса заказа)
app.post('/api/courier/update-status', async (req, res) => {
    try {
        const { orderId, newStatusId, courierLogin } = req.body;
        
        if (!orderId || !newStatusId || !courierLogin) {
            return res.json({ success: false, error: 'Недостаточно данных' });
        }

        const userResult = await db.query(`
            SELECT courier_id FROM users WHERE login = $1
        `, [courierLogin]);

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Курьер не найден' });
        }

        const courierId = userResult.rows[0].courier_id;
        
        const orderCheck = await db.query(`
            SELECT id, status_id FROM orders WHERE id = $1 AND courier_id = $2
        `, [orderId, courierId]);

        if (orderCheck.rows.length === 0) {
            return res.json({ success: false, error: 'Заказ не найден или не назначен вам' });
        }

        const oldStatusId = orderCheck.rows[0].status_id;
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            let updateQuery = `
                UPDATE orders 
                SET status_id = $1
                WHERE id = $2
            `;
            
            const params = [newStatusId, orderId];
            
            if (newStatusId === 4) { // Доставлен
                updateQuery = `
                    UPDATE orders 
                    SET status_id = $1, delivery_date = CURRENT_TIMESTAMP
                    WHERE id = $2
                `;
                
                // Освобождаем курьера (меняем статус на "свободен")
                await db.query(`
                    UPDATE couriers 
                    SET employment_status = 'свободен'
                    WHERE id = $1
                `, [courierId]);
                
                console.log(`Курьер ${courierId} освобожден после доставки заказа ${orderId}`);
            }
            
            // Если заказ отменяется, тоже освобождаем курьера
            if (newStatusId === 5) { // Отменен
                await db.query(`
                    UPDATE couriers 
                    SET employment_status = 'свободен'
                    WHERE id = $1
                `, [courierId]);
                
                console.log(`Курьер ${courierId} освобожден после отмены заказа ${orderId}`);
            }
            
            await db.query(updateQuery, params);
            await db.query('COMMIT');
            
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Авторизация
app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        
        const userResult = await db.query(`
            SELECT u.*,
                   c.first_name as c_first_name,
                   c.last_name as c_last_name,
                   c.patronymic as c_patronymic
            FROM users u
            LEFT JOIN clients c ON u.client_id = c.id
            WHERE u.login = $1 AND u.is_active = true
        `, [login]);

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Неверный логин или пароль' });
        }

        const user = userResult.rows[0];
        
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.json({ success: false, error: 'Неверный логин или пароль' });
        }

        let redirectPage, fullName, role, roleName;
        
        if (user.client_id) {
            role = 'client';
            roleName = 'Клиент';
            redirectPage = '/client.html';
            
            const lastName = user.c_last_name || '';
            const firstName = user.c_first_name || '';
            const patronymic = user.c_patronymic || '';
            
            if (lastName && firstName) {
                fullName = `${lastName} ${firstName} ${patronymic}`.trim();
            } else {
                fullName = `Клиент ${user.login}`;
            }
            
        } else if (user.employee_id) {
            role = 'employee';
            
            const employeeResult = await db.query(`
                SELECT first_name, last_name, patronymic, position 
                FROM employees 
                WHERE id = $1
            `, [user.employee_id]);
            
            const employee = employeeResult.rows[0];
            if (employee) {
                roleName = employee.position === 'администратор' ? 'Администратор' : 
                          employee.position === 'менеджер' ? 'Менеджер' : 'Оператор';
                
                if (employee.position === 'администратор') {
                    redirectPage = '/admin.html';
                } else if (employee.position === 'менеджер') {
                    redirectPage = '/manager.html';
                } else {
                    redirectPage = '/operator.html';
                }
                
                fullName = `${employee.last_name} ${employee.first_name} ${employee.patronymic || ''}`.trim();
            } else {
                redirectPage = '/';
                fullName = 'Сотрудник';
                roleName = 'Сотрудник';
            }
            
        } else if (user.courier_id) {
            role = 'courier';
            roleName = 'Курьер';
            redirectPage = '/courier.html';
            
            const courierResult = await db.query(`
                SELECT first_name, last_name, patronymic 
                FROM couriers 
                WHERE id = $1
            `, [user.courier_id]);
            
            const courier = courierResult.rows[0];
            if (courier) {
                fullName = `${courier.last_name} ${courier.first_name} ${courier.patronymic || ''}`.trim();
            } else {
                fullName = 'Курьер';
            }
            
        } else {
            role = 'unknown';
            roleName = 'Пользователь';
            redirectPage = '/';
            fullName = 'Пользователь';
        }

        res.json({
            success: true,
            redirect: redirectPage,
            fullName: fullName,
            role: role,
            roleName: roleName
        });

    } catch (err) {
        console.error('Ошибка авторизации:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/other-entities', async (req, res) => {
    try {
        // Получаем сотрудников
        const employeesResult = await db.query('SELECT id, first_name, last_name, patronymic, position FROM employees ORDER BY id');
        
        // Получаем склады
        const warehousesResult = await db.query('SELECT id, name, address FROM warehouses ORDER BY id');
        
        // Получаем статусы
        const statusesResult = await db.query('SELECT id, status FROM status ORDER BY id');
        
        // Получаем пользователей (кратко)
        const usersResult = await db.query('SELECT id, login FROM users ORDER BY id');
        
        res.json({
            'Сотрудники': employeesResult.rows,
            'Склады': warehousesResult.rows,
            'Статусы заказов': statusesResult.rows,
            'Пользователи системы': usersResult.rows
        });
    } catch (err) {
        console.error('Ошибка получения других сущностей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для администратора - сотрудники
app.get('/api/admin/employees', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения сотрудников:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для администратора - склады
app.get('/api/admin/warehouses', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM warehouses ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения складов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для администратора - статусы
app.get('/api/admin/statuses', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM status ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения статусов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для администратора - пользователи
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения пользователей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== API ДЛЯ АДМИНИСТРАТОРА (CRUD) ====================

// ---------- ТОВАРЫ ----------
app.get('/api/admin/products', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения товаров:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения товара:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/products', async (req, res) => {
    try {
        const { product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url } = req.body;
        
        const result = await db.query(
            `INSERT INTO products (product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [product_name, category, description, base_price, discount_percent || 0, stock_quantity || 0, unit || 'шт.', weight_kg || 0, volume_m3 || 0, manufacturer, supplier, image_url]
        );
        
        res.json({ success: true, product: result.rows[0] });
    } catch (err) {
        console.error('Ошибка создания товара:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, category, description, base_price, discount_percent, stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url } = req.body;
        
        await db.query(
            `UPDATE products SET 
                product_name = $1, category = $2, description = $3, base_price = $4, 
                discount_percent = $5, stock_quantity = $6, unit = $7, weight_kg = $8, 
                volume_m3 = $9, manufacturer = $10, supplier = $11, image_url = $12
             WHERE id = $13`,
            [product_name, category, description, base_price, discount_percent || 0, stock_quantity || 0, unit || 'шт.', weight_kg || 0, volume_m3 || 0, manufacturer, supplier, image_url, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления товара:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Сначала удаляем связанные записи из order_items
        await db.query('DELETE FROM order_items WHERE product_id = $1', [id]);
        
        // Затем удаляем сам товар
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления товара:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- КЛИЕНТЫ ----------
app.get('/api/admin/clients', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM clients ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения клиентов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Клиент не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/clients', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone, email, address, login, password } = req.body;
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const clientResult = await db.query(
            `INSERT INTO clients (last_name, first_name, patronymic, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [last_name, first_name, patronymic, phone, email, address]
        );
        
        const clientId = clientResult.rows[0].id;
        
        await db.query(
            `INSERT INTO users (login, password_hash, client_id, is_active)
             VALUES ($1, $2, $3, true)`,
            [login, hashedPassword, clientId]
        );
        
        res.json({ success: true, clientId });
    } catch (err) {
        console.error('Ошибка создания клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { last_name, first_name, patronymic, phone, email, address } = req.body;
        
        await db.query(
            `UPDATE clients SET 
                last_name = $1, first_name = $2, patronymic = $3, phone = $4, email = $5, address = $6
             WHERE id = $7`,
            [last_name, first_name, patronymic, phone, email, address, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Сначала получаем все заказы клиента
        const ordersResult = await db.query('SELECT id FROM orders WHERE client_id = $1', [id]);
        
        // Удаляем позиции заказов для каждого заказа
        for (const order of ordersResult.rows) {
            await db.query('DELETE FROM order_items WHERE order_id = $1', [order.id]);
        }
        
        // Удаляем заказы клиента
        await db.query('DELETE FROM orders WHERE client_id = $1', [id]);
        
        // Удаляем пользователя
        await db.query('DELETE FROM users WHERE client_id = $1', [id]);
        
        // Удаляем клиента
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- КУРЬЕРЫ ----------
app.get('/api/admin/couriers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, cp.phone_number 
            FROM couriers c
            LEFT JOIN courier_phones cp ON c.id = cp.courier_id
            ORDER BY c.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения курьеров:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/couriers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT c.*, cp.phone_number 
            FROM couriers c
            LEFT JOIN courier_phones cp ON c.id = cp.courier_id
            WHERE c.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Курьер не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения курьера:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/couriers', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone_number, transport_type, employment_status, login, password } = req.body;
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const courierResult = await db.query(
            `INSERT INTO couriers (last_name, first_name, patronymic, transport_type, employment_status)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [last_name, first_name, patronymic, transport_type, employment_status || 'свободен']
        );
        
        const courierId = courierResult.rows[0].id;
        
        if (phone_number) {
            await db.query(
                `INSERT INTO courier_phones (courier_id, phone_number)
                 VALUES ($1, $2)`,
                [courierId, phone_number]
            );
        }
        
        await db.query(
            `INSERT INTO users (login, password_hash, courier_id, is_active)
             VALUES ($1, $2, $3, true)`,
            [login, hashedPassword, courierId]
        );
        
        res.json({ success: true, courierId });
    } catch (err) {
        console.error('Ошибка создания курьера:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/couriers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { last_name, first_name, patronymic, phone_number, transport_type, employment_status } = req.body;
        
        await db.query(
            `UPDATE couriers SET 
                last_name = $1, first_name = $2, patronymic = $3, transport_type = $4, employment_status = $5
             WHERE id = $6`,
            [last_name, first_name, patronymic, transport_type, employment_status, id]
        );
        
        if (phone_number) {
            await db.query(
                `UPDATE courier_phones SET phone_number = $1 WHERE courier_id = $2`,
                [phone_number, id]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления курьера:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/couriers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Сначала обновляем заказы, где этот курьер был назначен (убираем ссылку)
        await db.query('UPDATE orders SET courier_id = NULL WHERE courier_id = $1', [id]);
        
        // Удаляем телефоны курьера
        await db.query('DELETE FROM courier_phones WHERE courier_id = $1', [id]);
        
        // Удаляем пользователя
        await db.query('DELETE FROM users WHERE courier_id = $1', [id]);
        
        // Удаляем курьера
        await db.query('DELETE FROM couriers WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления курьера:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- СОТРУДНИКИ ----------
app.get('/api/admin/employees', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения сотрудников:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения сотрудника:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/employees', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, position, phone, email, is_active, login, password } = req.body;
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const employeeResult = await db.query(
            `INSERT INTO employees (last_name, first_name, patronymic, position, phone, email, is_active, hire_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE) RETURNING id`,
            [last_name, first_name, patronymic, position, phone, email, is_active === 'true' || is_active === true]
        );
        
        const employeeId = employeeResult.rows[0].id;
        
        await db.query(
            `INSERT INTO users (login, password_hash, employee_id, is_active)
             VALUES ($1, $2, $3, $4)`,
            [login, hashedPassword, employeeId, is_active === 'true' || is_active === true]
        );
        
        res.json({ success: true, employeeId });
    } catch (err) {
        console.error('Ошибка создания сотрудника:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { last_name, first_name, patronymic, position, phone, email, is_active } = req.body;
        
        await db.query(
            `UPDATE employees SET 
                last_name = $1, first_name = $2, patronymic = $3, position = $4, phone = $5, email = $6, is_active = $7
             WHERE id = $8`,
            [last_name, first_name, patronymic, position, phone, email, is_active === 'true' || is_active === true, id]
        );
        
        await db.query(
            `UPDATE users SET is_active = $1 WHERE employee_id = $2`,
            [is_active === 'true' || is_active === true, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления сотрудника:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Удаляем пользователя
        await db.query('DELETE FROM users WHERE employee_id = $1', [id]);
        
        // Удаляем сотрудника
        await db.query('DELETE FROM employees WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления сотрудника:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- ЗАКАЗЫ ----------
app.delete('/api/admin/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Сначала удаляем позиции заказа
        await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
        
        // Удаляем платежи, связанные с заказом (если есть таблица payments)
        try {
            await db.query('DELETE FROM payments WHERE order_id = $1', [id]);
        } catch (err) {
            // Если таблицы payments нет, игнорируем ошибку
            console.log('Таблица payments не существует или нет связанных записей');
        }
        
        // Затем удаляем сам заказ
        await db.query('DELETE FROM orders WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления заказа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- СКЛАДЫ ----------
app.get('/api/admin/warehouses', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM warehouses ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения складов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM warehouses WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Склад не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения склада:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/warehouses', async (req, res) => {
    try {
        const { name, address, is_active } = req.body;
        
        const result = await db.query(
            `INSERT INTO warehouses (name, address, is_active)
             VALUES ($1, $2, $3) RETURNING *`,
            [name, address, is_active === 'true' || is_active === true]
        );
        
        res.json({ success: true, warehouse: result.rows[0] });
    } catch (err) {
        console.error('Ошибка создания склада:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, is_active } = req.body;
        
        await db.query(
            `UPDATE warehouses SET name = $1, address = $2, is_active = $3 WHERE id = $4`,
            [name, address, is_active === 'true' || is_active === true, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления склада:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/warehouses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM warehouses WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления склада:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/statuses', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM status ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения статусов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/statuses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM status WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Статус не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения статуса:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/statuses', async (req, res) => {
    try {
        const { status } = req.body;
        
        const result = await db.query(
            `INSERT INTO status (status) VALUES ($1) RETURNING *`,
            [status]
        );
        
        res.json({ success: true, status: result.rows[0] });
    } catch (err) {
        console.error('Ошибка создания статуса:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/statuses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await db.query(`UPDATE status SET status = $1 WHERE id = $2`, [status, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/statuses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, есть ли заказы с этим статусом
        const checkResult = await db.query('SELECT COUNT(*) FROM orders WHERE status_id = $1', [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Нельзя удалить статус, так как есть заказы с этим статусом. Сначала измените статус заказов.' 
            });
        }
        
        await db.query('DELETE FROM status WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления статуса:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, login, client_id, employee_id, courier_id, is_active, created_at FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения пользователей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT id, login, client_id, employee_id, courier_id, is_active FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка получения пользователя:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/users', async (req, res) => {
    try {
        const { login, password, user_type, entity_id } = req.body;
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let client_id = null, employee_id = null, courier_id = null;
        
        if (user_type === 'client') client_id = entity_id;
        else if (user_type === 'employee') employee_id = entity_id;
        else if (user_type === 'courier') courier_id = entity_id;
        
        await db.query(
            `INSERT INTO users (login, password_hash, client_id, employee_id, courier_id, is_active)
             VALUES ($1, $2, $3, $4, $5, true)`,
            [login, hashedPassword, client_id, employee_id, courier_id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка создания пользователя:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { login, password, is_active } = req.body;
        
        if (password) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE users SET login = $1, password_hash = $2, is_active = $3 WHERE id = $4`,
                [login, hashedPassword, is_active === 'true' || is_active === true, id]
            );
        } else {
            await db.query(
                `UPDATE users SET login = $1, is_active = $2 WHERE id = $3`,
                [login, is_active === 'true' || is_active === true, id]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления пользователя:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления пользователя:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ---------- РЕЗЕРВНОЕ КОПИРОВАНИЕ ----------
// ---------- РЕЗЕРВНОЕ КОПИРОВАНИЕ ----------
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

const BACKUP_DIR = path.join(__dirname, 'backups');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, BACKUP_DIR)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

// Создаем директорию для бэкапов если её нет
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// Получение списка резервных копий
app.get('/api/admin/backups', async (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(f => f.endsWith('.sql') || f.endsWith('.json'))
            .map(filename => {
                const stats = fs.statSync(path.join(BACKUP_DIR, filename));
                return { filename, created_at: stats.birthtime };
            })
            .sort((a, b) => b.created_at - a.created_at);
        
        res.json(backups);
    } catch (err) {
        console.error('Ошибка получения списка бэкапов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание резервной копии (простой JSON вариант, не требует pg_dump)
app.post('/api/admin/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.json`;
        const filepath = path.join(BACKUP_DIR, filename);
        
        // Получаем все данные из всех таблиц (включая payments)
        const tables = ['products', 'clients', 'couriers', 'employees', 'status', 'warehouses', 'orders', 'order_items', 'payments', 'users'];
        const backupData = {};
        
        for (const table of tables) {
            try {
                // Проверяем существует ли таблица
                const checkTable = await db.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);
                
                if (checkTable.rows[0].exists) {
                    const result = await db.query(`SELECT * FROM ${table}`);
                    backupData[table] = result.rows;
                } else {
                    backupData[table] = [];
                }
            } catch (err) {
                console.error(`Ошибка чтения таблицы ${table}:`, err);
                backupData[table] = [];
            }
        }
        
        // Добавляем метаинформацию
        backupData._metadata = {
            created_at: new Date().toISOString(),
            version: '1.0'
        };
        
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
        res.json({ success: true, filename });
    } catch (err) {
        console.error('Ошибка создания бэкапа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Восстановление из резервной копии (загрузка файла)
app.post('/api/admin/restore', upload.single('backup'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Файл не загружен' });
        }
        
        const filepath = req.file.path;
        const fileContent = fs.readFileSync(filepath, 'utf8');
        const backupData = JSON.parse(fileContent);
        
        // Начинаем транзакцию
        await db.query('BEGIN');
                try {
            // Определяем порядок очистки таблиц (сначала зависимые)
            const tablesInOrder = [
                'order_items', 'payments', 'orders', 'users',
                'products', 'clients', 'couriers', 'employees', 'warehouses', 'status'
            ];
            
            // Очищаем таблицы
            for (const table of tablesInOrder) {
                try {
                    await db.query(`DELETE FROM ${table}`);
                    // Сбрасываем sequence для таблицы
                    await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
                } catch (err) {
                    console.log(`Таблица ${table} не существует:`, err.message);
                }
            }
            
            // Восстанавливаем данные в правильном порядке
            const restoreOrder = [
                'products', 'clients', 'couriers', 'employees', 'warehouses', 'status',
                'orders', 'order_items', 'payments', 'users'
            ];
            
            for (const table of restoreOrder) {
                const rows = backupData[table];
                if (rows && rows.length > 0) {
                    // Получаем колонки таблицы
                    const columnsQuery = await db.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        ORDER BY ordinal_position
                    `, [table]);
                    
                    const existingColumns = columnsQuery.rows.map(c => c.column_name);
                    
                    for (const row of rows) {
                        // Фильтруем только существующие колонки
                        const filteredColumns = Object.keys(row).filter(col => existingColumns.includes(col));
                        const filteredValues = filteredColumns.map(col => row[col]);
                        const placeholders = filteredValues.map((_, i) => `$${i + 1}`).join(', ');
                        const columnNames = filteredColumns.join(', ');
                        
                        if (filteredColumns.length > 0) {
                            const query = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`;
                            await db.query(query, filteredValues);
                        }
                    }
                    
                    // После вставки данных обновляем sequence на максимальный ID
                    const maxIdResult = await db.query(`SELECT MAX(id) FROM ${table}`);
                    const maxId = maxIdResult.rows[0].max || 0;
                    if (maxId > 0) {
                        await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${maxId + 1}`);
                    }
                }
            }
            
            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка восстановления из бэкапа:', err);
        res.status(500).json({ success: false, error: 'Ошибка восстановления из резервной копии: ' + err.message });
    }
});

// Восстановление из файла по имени (для кнопки "Восстановить" в списке)
app.post('/api/admin/restore-file', async (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ success: false, error: 'Не указан файл для восстановления' });
        }
        
        const filepath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }
        
        const fileContent = fs.readFileSync(filepath, 'utf8');
        const backupData = JSON.parse(fileContent);
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Определяем порядок очистки таблиц
            const tablesInOrder = [
                'order_items', 'payments', 'orders', 'users',
                'products', 'clients', 'couriers', 'employees', 'warehouses', 'status'
            ];
            
            // Очищаем таблицы и сбрасываем sequences
            for (const table of tablesInOrder) {
                try {
                    await db.query(`DELETE FROM ${table}`);
                    await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
                } catch (err) {
                    console.log(`Таблица ${table} не существует:`, err.message);
                }
            }
            
            // Восстанавливаем данные
            const restoreOrder = [
                'products', 'clients', 'couriers', 'employees', 'warehouses', 'status',
                'orders', 'order_items', 'payments', 'users'
            ];
            
            for (const table of restoreOrder) {
                const rows = backupData[table];
                if (rows && rows.length > 0) {
                    const columnsQuery = await db.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        ORDER BY ordinal_position
                    `, [table]);
                    
                    const existingColumns = columnsQuery.rows.map(c => c.column_name);
                    
                    for (const row of rows) {
                        const filteredColumns = Object.keys(row).filter(col => existingColumns.includes(col));
                        const filteredValues = filteredColumns.map(col => row[col]);
                        const placeholders = filteredValues.map((_, i) => `$${i + 1}`).join(', ');
                        const columnNames = filteredColumns.join(', ');
                        
                        if (filteredColumns.length > 0) {
                            const query = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`;
                            await db.query(query, filteredValues);
                        }
                    }
                    
                    // Обновляем sequence
                    const maxIdResult = await db.query(`SELECT MAX(id) FROM ${table}`);
                    const maxId = maxIdResult.rows[0].max || 0;
                    if (maxId > 0) {
                        await db.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH ${maxId + 1}`);
                    }
                }
            }
            
            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка восстановления из бэкапа:', err);
        res.status(500).json({ success: false, error: 'Ошибка восстановления из резервной копии: ' + err.message });
    }
});

// ==================== API ДЛЯ МЕНЕДЖЕРА ====================

// Получение списка свободных курьеров
app.get('/api/manager/available-couriers', async (req, res) => {
    try {
        console.log('Запрос свободных курьеров');
        
        const result = await db.query(`
            SELECT 
                c.id,
                c.last_name,
                c.first_name,
                c.patronymic,
                c.transport_type,
                c.employment_status,
                cp.phone_number
            FROM couriers c
            LEFT JOIN courier_phones cp ON c.id = cp.courier_id
            WHERE c.employment_status = 'свободен'
            ORDER BY c.last_name, c.first_name
        `);
        
        console.log('Найдено свободных курьеров:', result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения свободных курьеров:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка заказов без назначенного курьера
app.get('/api/manager/orders-without-courier', async (req, res) => {
    try {
        console.log('Запрос заказов без курьера');
        
        const result = await db.query(`
            SELECT 
                o.id,
                o.order_date,
                o.delivery_address,
                o.status_id,
                s.status,
                COALESCE(o.delivery_price, 0) as delivery_price,
                c.first_name || ' ' || c.last_name as client_name,
                c.phone as client_phone,
                COALESCE((
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ), 0) as products_total,
                COALESCE((
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ), 0) + COALESCE(o.delivery_price, 0) as total_amount,
                COALESCE((
                    SELECT SUM(oi.quantity * p.weight_kg)
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ), 0)::float as total_weight,
                COALESCE((
                    SELECT SUM(oi.quantity * p.volume_m3)
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ), 0)::float as total_volume
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.courier_id IS NULL AND o.status_id = 1
            ORDER BY o.order_date ASC
        `);
        
        console.log('Найдено заказов:', result.rows.length);
        
        const orders = result.rows;
        
        // Добавляем товары для каждого заказа
        for (let order of orders) {
            const itemsResult = await db.query(`
                SELECT 
                    oi.id,
                    oi.product_id,
                    p.product_name,
                    oi.quantity,
                    oi.price as unit_price_at_order,
                    (oi.quantity * oi.price) as total_price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            
            order.items = itemsResult.rows;
        }
        
        res.json({ success: true, orders: orders });
    } catch (err) {
        console.error('Ошибка получения заказов без курьера:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + err.message });
    }
});

// Назначение курьера на заказ (с проверкой, что курьер свободен)
app.post('/api/manager/assign-courier', async (req, res) => {
    try {
        const { orderId, courierId } = req.body;
        
        if (!orderId || !courierId) {
            return res.json({ success: false, error: 'Недостаточно данных' });
        }
        
        // Проверяем, что курьер существует и свободен
        const courierCheck = await db.query(`
            SELECT id, employment_status FROM couriers 
            WHERE id = $1
        `, [courierId]);
        
        if (courierCheck.rows.length === 0) {
            return res.json({ success: false, error: 'Курьер не найден' });
        }
        
        if (courierCheck.rows[0].employment_status !== 'свободен') {
            return res.json({ success: false, error: 'Курьер в данный момент занят' });
        }
        
        // Проверяем, что заказ существует
        const orderCheck = await db.query(`
            SELECT id, courier_id FROM orders 
            WHERE id = $1
        `, [orderId]);
        
        if (orderCheck.rows.length === 0) {
            return res.json({ success: false, error: 'Заказ не найден' });
        }
        
        if (orderCheck.rows[0].courier_id !== null) {
            return res.json({ success: false, error: 'На заказ уже назначен курьер' });
        }
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Назначаем курьера и меняем статус заказа на "в обработке" (status_id = 2)
            await db.query(`
                UPDATE orders 
                SET courier_id = $1, status_id = 2
                WHERE id = $2
            `, [courierId, orderId]);
            
            // Меняем статус курьера на "занят"
            await db.query(`
                UPDATE couriers 
                SET employment_status = 'занят'
                WHERE id = $1
            `, [courierId]);
            
            await db.query('COMMIT');
            
            console.log(`Курьер ${courierId} назначен на заказ ${orderId} и стал занят`);
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка назначения курьера:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получение всех заказов с информацией о курьерах для менеджера
app.get('/api/manager/all-orders', async (req, res) => {
    try {
        console.log('Запрос всех заказов');
        
        const result = await db.query(`
            SELECT 
                o.id,
                o.order_date,
                o.delivery_address,
                o.status_id,
                s.status,
                COALESCE(o.delivery_price, 0) as delivery_price,
                COALESCE((
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ), 0) as products_total,
                COALESCE((
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ), 0) + COALESCE(o.delivery_price, 0) as total_amount,
                c.id as client_id,
                c.first_name || ' ' || c.last_name as client_name,
                c.phone as client_phone,
                cr.id as courier_id,
                cr.last_name || ' ' || cr.first_name as courier_name
            FROM orders o
            LEFT JOIN status s ON o.status_id = s.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN couriers cr ON o.courier_id = cr.id
            ORDER BY o.order_date DESC
        `);
        
        console.log('Найдено заказов:', result.rows.length);
        
        const orders = result.rows;
        
        for (let order of orders) {
            const itemsResult = await db.query(`
                SELECT 
                    oi.id,
                    oi.product_id,
                    p.product_name,
                    oi.quantity,
                    oi.price as unit_price_at_order,
                    (oi.quantity * oi.price) as total_price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            
            order.items = itemsResult.rows;
        }
        
        res.json({ success: true, orders: orders });
    } catch (err) {
        console.error('Ошибка получения всех заказов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});


// ==================== API ДЛЯ ОПЕРАТОРА ====================
// Получение списка товаров для оформления заказа
app.get('/api/operator/products', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id, product_name, base_price, discount_percent, 
                stock_quantity, unit,
                CASE 
                    WHEN discount_percent > 0 THEN 
                        base_price * (1 - discount_percent / 100)
                    ELSE base_price
                END as current_price
            FROM products 
            WHERE stock_quantity > 0
            ORDER BY product_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения товаров:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание нового заказа
app.post('/api/operator/orders', async (req, res) => {
    try {
        const { client_id, delivery_address, delivery_price, items } = req.body;
        
        if (!client_id || !delivery_address || !items || items.length === 0) {
            return res.json({ success: false, error: 'Недостаточно данных' });
        }
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Получаем первый доступный склад
            const warehouseResult = await db.query(`
                SELECT id FROM warehouses WHERE is_active = true LIMIT 1
            `);
            
            let warehouseId = null;
            if (warehouseResult.rows.length > 0) {
                warehouseId = warehouseResult.rows[0].id;
            } else {
                const newWarehouse = await db.query(`
                    INSERT INTO warehouses (name, address, is_active)
                    VALUES ('Основной склад', 'г. Москва, ул. Примерная, д. 1', true)
                    RETURNING id
                `);
                warehouseId = newWarehouse.rows[0].id;
            }
            
            // Создаем заказ
            const orderResult = await db.query(`
                INSERT INTO orders (client_id, order_date, delivery_address, status_id, delivery_price, warehouse_id)
                VALUES ($1, CURRENT_TIMESTAMP, $2, 1, $3, $4)
                RETURNING id
            `, [client_id, delivery_address, delivery_price || 0, warehouseId]);
            
            const orderId = orderResult.rows[0].id;
            
            // Добавляем товары в заказ
            for (const item of items) {
                // Получаем актуальную цену товара из базы данных (со скидкой)
                const productResult = await db.query(`
                    SELECT 
                        id,
                        product_name,
                        stock_quantity,
                        CASE 
                            WHEN discount_percent > 0 THEN 
                                base_price * (1 - discount_percent / 100)
                            ELSE base_price
                        END as current_price
                    FROM products 
                    WHERE id = $1
                `, [item.product_id]);
                
                if (productResult.rows.length === 0) {
                    await db.query('ROLLBACK');
                    return res.json({ success: false, error: `Товар с ID ${item.product_id} не найден` });
                }
                
                const product = productResult.rows[0];
                const currentPrice = parseFloat(product.current_price);
                
                // Проверяем наличие на складе
                if (product.stock_quantity < item.quantity) {
                    await db.query('ROLLBACK');
                    return res.json({ success: false, error: `Недостаточно товара "${product.product_name}" на складе. Доступно: ${product.stock_quantity}` });
                }
                
                // Добавляем позицию заказа
                await db.query(`
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES ($1, $2, $3, $4)
                `, [orderId, item.product_id, item.quantity, currentPrice]);
                
                // Уменьшаем количество товара на складе
                await db.query(`
                    UPDATE products 
                    SET stock_quantity = stock_quantity - $1 
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }
            
            await db.query('COMMIT');
            res.json({ success: true, orderId: orderId });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка создания заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + err.message });
    }
});

// Получение заказа для редактирования
app.get('/api/operator/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Получаем информацию о заказе
        const orderResult = await db.query(`
            SELECT 
                o.id, o.client_id, o.delivery_address, o.delivery_price, o.status_id,
                c.first_name || ' ' || c.last_name as client_name
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            WHERE o.id = $1
        `, [id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        // Получаем товары в заказе
        const itemsResult = await db.query(`
            SELECT 
                oi.id, oi.product_id, oi.quantity, oi.price,
                p.product_name
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [id]);
        
        const order = orderResult.rows[0];
        order.items = itemsResult.rows;
        
        res.json(order);
    } catch (err) {
        console.error('Ошибка получения заказа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление заказа
app.put('/api/operator/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_address, delivery_price, items } = req.body;
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Обновляем основные данные заказа
            await db.query(`
                UPDATE orders 
                SET delivery_address = $1, delivery_price = $2
                WHERE id = $3
            `, [delivery_address, delivery_price || 0, id]);
            
            // Возвращаем товары на склад (восстанавливаем количество)
            const oldItems = await db.query(`
                SELECT product_id, quantity FROM order_items WHERE order_id = $1
            `, [id]);
            
            for (const item of oldItems.rows) {
                await db.query(`
                    UPDATE products 
                    SET stock_quantity = stock_quantity + $1 
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }
            
            // Удаляем старые позиции
            await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
            
            // Добавляем новые позиции
            for (const item of items) {
                await db.query(`
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES ($1, $2, $3, $4)
                `, [id, item.product_id, item.quantity, item.price]);
                
                // Уменьшаем количество товара на складе
                await db.query(`
                    UPDATE products 
                    SET stock_quantity = stock_quantity - $1 
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }
            
            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка обновления заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удаление заказа (отмена)
app.delete('/api/operator/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('BEGIN');
        
        try {
            // Возвращаем товары на склад
            const items = await db.query(`
                SELECT product_id, quantity FROM order_items WHERE order_id = $1
            `, [id]);
            
            for (const item of items.rows) {
                await db.query(`
                    UPDATE products 
                    SET stock_quantity = stock_quantity + $1 
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }
            
            // Удаляем позиции заказа
            await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
            
            // Удаляем заказ
            await db.query('DELETE FROM orders WHERE id = $1', [id]);
            
            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка удаления заказа:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Регистрация нового клиента (оператором)
app.post('/api/operator/clients', async (req, res) => {
    try {
        const { last_name, first_name, patronymic, phone, email, address, login, password } = req.body;
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const clientResult = await db.query(`
            INSERT INTO clients (last_name, first_name, patronymic, phone, email, address)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [last_name, first_name, patronymic, phone, email, address]);
        
        const clientId = clientResult.rows[0].id;
        
        await db.query(`
            INSERT INTO users (login, password_hash, client_id, is_active)
            VALUES ($1, $2, $3, true)
        `, [login, hashedPassword, clientId]);
        
        res.json({ success: true, clientId });
    } catch (err) {
        console.error('Ошибка создания клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== API ДЛЯ КЛИЕНТА (оформление заказов) ====================

// Получение товаров для клиента (со скидками и остатками)
app.get('/api/client/products', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id, product_name, category, description, base_price, discount_percent,
                stock_quantity, unit, weight_kg, volume_m3, manufacturer, supplier, image_url,
                CASE 
                    WHEN discount_percent > 0 THEN 
                        base_price * (1 - discount_percent / 100)
                    ELSE base_price
                END as current_price
            FROM products 
            WHERE stock_quantity > 0
            ORDER BY product_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения товаров для клиента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание заказа клиентом (без стоимости доставки)
// Создание заказа клиентом
app.post('/api/client/orders', async (req, res) => {
    try {
        const { login, delivery_address, items } = req.body;
        
        console.log('Получен запрос на создание заказа:', { login, delivery_address, items });
        
        if (!login || !delivery_address || !items || items.length === 0) {
            return res.json({ success: false, error: 'Недостаточно данных' });
        }
        
        // Находим клиента по логину
        const userResult = await db.query(`
            SELECT client_id FROM users WHERE login = $1
        `, [login]);
        
        console.log('Результат поиска пользователя:', userResult.rows);
        
        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Клиент не найден' });
        }
        
        const client_id = userResult.rows[0].client_id;
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Получаем первый доступный склад
            const warehouseResult = await db.query(`
                SELECT id FROM warehouses WHERE is_active = true LIMIT 1
            `);
            
            let warehouseId = null;
            if (warehouseResult.rows.length > 0) {
                warehouseId = warehouseResult.rows[0].id;
            } else {
                const newWarehouse = await db.query(`
                    INSERT INTO warehouses (name, address, is_active)
                    VALUES ('Основной склад', 'г. Москва, ул. Примерная, д. 1', true)
                    RETURNING id
                `);
                warehouseId = newWarehouse.rows[0].id;
            }
            
            // Создаем заказ
            const orderResult = await db.query(`
                INSERT INTO orders (client_id, order_date, delivery_address, status_id, delivery_price, warehouse_id)
                VALUES ($1, CURRENT_TIMESTAMP, $2, 1, 0, $3)
                RETURNING id
            `, [client_id, delivery_address, warehouseId]);
            
            const orderId = orderResult.rows[0].id;
            console.log('Создан заказ ID:', orderId);
            
            // Добавляем товары в заказ
            for (const item of items) {
                // Получаем актуальную цену товара
                const productResult = await db.query(`
                    SELECT 
                        CASE 
                            WHEN discount_percent > 0 THEN 
                                base_price * (1 - discount_percent / 100)
                            ELSE base_price
                        END as current_price,
                        stock_quantity,
                        product_name
                    FROM products 
                    WHERE id = $1
                `, [item.product_id]);
                
                if (productResult.rows.length === 0) {
                    await db.query('ROLLBACK');
                    return res.json({ success: false, error: `Товар не найден` });
                }
                
                const product = productResult.rows[0];
                const currentPrice = parseFloat(product.current_price);
                
                // Проверяем наличие на складе
                if (product.stock_quantity < item.quantity) {
                    await db.query('ROLLBACK');
                    return res.json({ success: false, error: `Недостаточно товара "${product.product_name}" на складе. Доступно: ${product.stock_quantity}` });
                }
                
                await db.query(`
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES ($1, $2, $3, $4)
                `, [orderId, item.product_id, item.quantity, currentPrice]);
                
                // Уменьшаем количество товара на складе
                await db.query(`
                    UPDATE products 
                    SET stock_quantity = stock_quantity - $1 
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }
            
            await db.query('COMMIT');
            res.json({ success: true, orderId: orderId });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка создания заказа клиентом:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + err.message });
    }
});

// Обновление стоимости доставки (для менеджера)
app.put('/api/manager/update-delivery-price', async (req, res) => {
    try {
        const { orderId, delivery_price } = req.body;
        console.log('Обновление стоимости доставки:', { orderId, delivery_price });
        
        if (!orderId || delivery_price === undefined) {
            return res.json({ success: false, error: 'Недостаточно данных' });
        }
        
        await db.query(`
            UPDATE orders 
            SET delivery_price = $1 
            WHERE id = $2
        `, [delivery_price, orderId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления стоимости доставки:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// ==================== РАСЧЕТ СТОИМОСТИ ДОСТАВКИ ====================

// Функция расчета стоимости доставки
async function calculateDeliveryPrice(orderId) {
    try {
        // Получаем информацию о заказе
        const orderResult = await db.query(`
            SELECT o.id, o.delivery_address, o.delivery_price,
                   SUM(oi.quantity * p.weight_kg) as total_weight,
                   SUM(oi.quantity * p.volume_m3) as total_volume,
                   COUNT(DISTINCT oi.product_id) as unique_products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id
        `, [orderId]);
        
        if (orderResult.rows.length === 0) return 0;
        
        const order = orderResult.rows[0];
        
        // Базовая стоимость доставки
        let basePrice = 200; // минимальная стоимость доставки
        
        // Надбавка за вес (каждые 5 кг +50 руб)
        const weight = parseFloat(order.total_weight) || 0;
        basePrice += Math.floor(weight / 5) * 50;
        
        // Надбавка за объем (каждые 0.1 м³ +30 руб)
        const volume = parseFloat(order.total_volume) || 0;
        basePrice += Math.floor(volume / 0.1) * 30;
        
        // Надбавка за количество уникальных товаров
        const uniqueCount = parseInt(order.unique_products) || 0;
        basePrice += uniqueCount * 20;
        
        // Максимальная стоимость доставки - 1000 руб
        const finalPrice = Math.min(basePrice, 1000);
        
        // Обновляем стоимость доставки в заказе
        await db.query(`
            UPDATE orders SET delivery_price = $1 WHERE id = $2
        `, [finalPrice, orderId]);
        
        return finalPrice;
    } catch (err) {
        console.error('Ошибка расчета стоимости доставки:', err);
        return 0;
    }
}

// API для расчета стоимости доставки (вызывается менеджером)
app.post('/api/manager/calculate-delivery', async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log('Расчет стоимости доставки для заказа:', orderId);
        
        if (!orderId) {
            return res.json({ success: false, error: 'Не указан ID заказа' });
        }
        
        // Получаем информацию о заказе
        const orderResult = await db.query(`
            SELECT o.id, 
                   SUM(oi.quantity * COALESCE(p.weight_kg, 0)) as total_weight,
                   SUM(oi.quantity * COALESCE(p.volume_m3, 0)) as total_volume,
                   COUNT(DISTINCT oi.product_id) as unique_products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id
        `, [orderId]);
        
        if (orderResult.rows.length === 0) {
            return res.json({ success: false, error: 'Заказ не найден' });
        }
        
        const order = orderResult.rows[0];
        
        // Базовая стоимость доставки
        let basePrice = 200;
        
        // Надбавка за вес (каждые 5 кг +50 руб)
        const weight = parseFloat(order.total_weight) || 0;
        basePrice += Math.floor(weight / 5) * 50;
        
        // Надбавка за объем (каждые 0.1 м³ +30 руб)
        const volume = parseFloat(order.total_volume) || 0;
        basePrice += Math.floor(volume / 0.1) * 30;
        
        // Надбавка за количество уникальных товаров
        const uniqueCount = parseInt(order.unique_products) || 0;
        basePrice += uniqueCount * 20;
        
        // Максимальная стоимость доставки - 1000 руб
        const finalPrice = Math.min(basePrice, 1000);
        
        // Обновляем стоимость доставки в заказе
        await db.query(`
            UPDATE orders SET delivery_price = $1 WHERE id = $2
        `, [finalPrice, orderId]);
        
        console.log('Рассчитанная стоимость:', finalPrice);
        
        res.json({ 
            success: true, 
            delivery_price: finalPrice,
            message: `Стоимость доставки рассчитана: ${finalPrice} руб.`
        });
    } catch (err) {
        console.error('Ошибка расчета доставки:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + err.message });
    }
});

// Массовое завершение всех заказов и освобождение курьеров (только для администратора)
app.post('/api/admin/finish-all-orders', async (req, res) => {
    try {
        console.log('=== МАССОВОЕ ЗАВЕРШЕНИЕ ЗАКАЗОВ ===');
        
        // Начинаем транзакцию
        await db.query('BEGIN');
        
        try {
            // Получаем количество заказов до обновления
            const beforeOrders = await db.query(`
                SELECT COUNT(*) FROM orders WHERE status_id IN (1, 2, 3)
            `);
            
            const beforeCouriers = await db.query(`
                SELECT COUNT(*) FROM couriers WHERE employment_status = 'занят'
            `);
            
            console.log(`Активных заказов до: ${beforeOrders.rows[0].count}`);
            console.log(`Занятых курьеров до: ${beforeCouriers.rows[0].count}`);
            
            // Завершаем все активные заказы
            const ordersResult = await db.query(`
                UPDATE orders 
                SET status_id = 4, delivery_date = CURRENT_TIMESTAMP
                WHERE status_id IN (1, 2, 3)
                RETURNING id
            `);
            
            // Освобождаем всех курьеров
            const couriersResult = await db.query(`
                UPDATE couriers 
                SET employment_status = 'свободен'
                WHERE employment_status = 'занят'
                RETURNING id
            `);
            
            await db.query('COMMIT');
            
            res.json({ 
                success: true, 
                message: `Завершено заказов: ${ordersResult.rowCount}, освобождено курьеров: ${couriersResult.rowCount}`,
                orders_completed: ordersResult.rowCount,
                couriers_freed: couriersResult.rowCount
            });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Ошибка массового завершения заказов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + err.message });
    }
});

app.post('/api/calculate-delivery', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || items.length === 0) {
            return res.json({ success: false, error: 'Нет товаров для расчета' });
        }
        
        // Получаем информацию о товарах
        let totalWeight = 0;
        let totalVolume = 0;
        let uniqueProducts = items.length;
        
        for (const item of items) {
            const productResult = await db.query(`
                SELECT weight_kg, volume_m3 FROM products WHERE id = $1
            `, [item.product_id]);
            
            if (productResult.rows.length > 0) {
                totalWeight += (productResult.rows[0].weight_kg || 0) * item.quantity;
                totalVolume += (productResult.rows[0].volume_m3 || 0) * item.quantity;
            }
        }
        
        // Базовая стоимость доставки
        let basePrice = 200;
        
        // Надбавка за вес (каждые 5 кг +50 руб)
        basePrice += Math.floor(totalWeight / 5) * 50;
        
        // Надбавка за объем (каждые 0.1 м³ +30 руб)
        basePrice += Math.floor(totalVolume / 0.1) * 30;
        
        // Надбавка за количество уникальных товаров
        basePrice += uniqueProducts * 20;
        
        // Максимальная стоимость доставки - 1000 руб
        const finalPrice = Math.min(basePrice, 1000);
        
        res.json({ 
            success: true, 
            delivery_price: finalPrice,
            weight: totalWeight.toFixed(2),
            volume: totalVolume.toFixed(3),
            message: `Рассчитано: вес ${totalWeight.toFixed(2)} кг, объем ${totalVolume.toFixed(3)} м³, стоимость доставки ${finalPrice} руб.`
        });
    } catch (err) {
        console.error('Ошибка расчета доставки:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});