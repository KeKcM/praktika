let currentTab = 'products';
let currentEditId = null;
let currentEntityType = null;

document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Администратор';
    const userRoleName = localStorage.getItem('userRoleName') || 'Администратор';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    setupTabs();
    loadProducts();

    document.getElementById('edit-form').addEventListener('submit', handleFormSubmit);
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            currentTab = tabId;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            if (tabId === 'products') {
                loadProducts();
            } else if (tabId === 'orders') {
                loadOrders();
            } else if (tabId === 'clients') {
                loadClients();
            } else if (tabId === 'couriers') {
                loadCouriers();
            } else if (tabId === 'employees') {
                loadEmployees();
            } else if (tabId === 'warehouses') {
                loadWarehouses();
            } else if (tabId === 'statuses') {
                loadStatuses();
            } else if (tabId === 'users') {
                loadUsers();
            } else if (tabId === 'backup') {
                loadBackupInfo();
            }
        });
    });
}

async function loadProducts() {
    try {
        const response = await fetch('/api/admin/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        document.getElementById('products-container').innerHTML = 
            `<div class="error">Ошибка загрузки товаров</div>`;
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-container');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-data">Товары не найдены</div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const cardClasses = ['product-card'];
        
        const basePriceFormatted = formatPrice(product.base_price);
        
        return `
        <div class="${cardClasses.join(' ')}" data-id="${product.id}">
            <h3 class="product-name">${escapeHtml(product.product_name)}</h3>
            
            <div class="product-detail">
                <span class="label">Категория:</span>
                <span class="value">${escapeHtml(product.category || 'Не указана')}</span>
            </div>
            
            <div class="product-detail">
                <span class="label">Цена:</span>
                <span class="value">${basePriceFormatted} ₽</span>
            </div>
            
            <div class="product-detail">
                <span class="label">Скидка:</span>
                <span class="value">${product.discount_percent || 0}%</span>
            </div>
            
            <div class="product-detail">
                <span class="label">На складе:</span>
                <span class="value">${product.stock_quantity} ${product.unit || 'шт.'}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editProduct(${product.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Удалить</button>
            </div>
        </div>
    `;
    }).join('');
}

async function editProduct(id) {
    try {
        const response = await fetch(`/api/admin/products/${id}`);
        const product = await response.json();
        
        currentEditId = id;
        currentEntityType = 'products';
        
        const formHtml = `
            <div class="form-group">
                <label>Название товара:</label>
                <input type="text" name="product_name" value="${escapeHtml(product.product_name)}" required>
            </div>
            <div class="form-group">
                <label>Категория:</label>
                <input type="text" name="category" value="${escapeHtml(product.category || '')}">
            </div>
            <div class="form-group">
                <label>Описание:</label>
                <textarea name="description" rows="3">${escapeHtml(product.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Цена:</label>
                    <input type="number" step="0.01" name="base_price" value="${product.base_price}" required>
                </div>
                <div class="form-group">
                    <label>Скидка (%):</label>
                    <input type="number" step="0.01" name="discount_percent" value="${product.discount_percent || 0}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Количество:</label>
                    <input type="number" name="stock_quantity" value="${product.stock_quantity}" required>
                </div>
                <div class="form-group">
                    <label>Единица измерения:</label>
                    <input type="text" name="unit" value="${product.unit || 'шт.'}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Вес (кг):</label>
                    <input type="number" step="0.01" name="weight_kg" value="${product.weight_kg || 0}">
                </div>
                <div class="form-group">
                    <label>Объем (м³):</label>
                    <input type="number" step="0.01" name="volume_m3" value="${product.volume_m3 || 0}">
                </div>
            </div>
            <div class="form-group">
                <label>Производитель:</label>
                <input type="text" name="manufacturer" value="${escapeHtml(product.manufacturer || '')}">
            </div>
            <div class="form-group">
                <label>Поставщик:</label>
                <input type="text" name="supplier" value="${escapeHtml(product.supplier || '')}">
            </div>
            <div class="form-group">
                <label>URL изображения:</label>
                <input type="url" name="image_url" value="${product.image_url || ''}">
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование товара';
        document.getElementById('form-fields').innerHTML = formHtml;
        openModal(); 
    } catch (error) {
        alert('Ошибка загрузки данных товара');
    }
}

async function deleteProduct(id) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
    
    try {
        const response = await fetch(`/api/admin/products/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Товар удален');
            loadProducts();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении товара');
    }
}

async function loadClients() {
    try {
        const response = await fetch('/api/admin/clients');
        const clients = await response.json();
        displayClients(clients);
    } catch (error) {
        document.getElementById('clients-container').innerHTML = 
            `<div class="error">Ошибка загрузки клиентов</div>`;
    }
}

function displayClients(clients) {
    const container = document.getElementById('clients-container');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<div class="no-data">Клиенты не найдены</div>';
        return;
    }

    container.innerHTML = clients.map(client => {
        const fullName = `${client.last_name} ${client.first_name} ${client.patronymic || ''}`.trim();
        
        return `
        <div class="client-card" data-id="${client.id}">
            <h3 class="client-name">${escapeHtml(fullName)}</h3>
            
            <div class="client-detail">
                <span class="label">Телефон:</span>
                <span class="value">${client.phone || '-'}</span>
            </div>
            
            <div class="client-detail">
                <span class="label">Email:</span>
                <span class="value">${client.email || '-'}</span>
            </div>
            
            <div class="client-detail">
                <span class="label">Адрес:</span>
                <span class="value">${escapeHtml(client.address || '-')}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editClient(${client.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteClient(${client.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editClient(id) {
    try {
        const response = await fetch(`/api/admin/clients/${id}`);
        const client = await response.json();
        
        currentEditId = id;
        currentEntityType = 'clients';
        
        const formHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>Фамилия:</label>
                    <input type="text" name="last_name" value="${escapeHtml(client.last_name)}" required>
                </div>
                <div class="form-group">
                    <label>Имя:</label>
                    <input type="text" name="first_name" value="${escapeHtml(client.first_name)}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Отчество:</label>
                <input type="text" name="patronymic" value="${escapeHtml(client.patronymic || '')}">
            </div>
            <div class="form-group">
                <label>Телефон:</label>
                <input type="tel" name="phone" value="${client.phone || ''}">
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" value="${client.email || ''}">
            </div>
            <div class="form-group">
                <label>Адрес:</label>
                <textarea name="address" rows="2">${escapeHtml(client.address || '')}</textarea>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование клиента';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных клиента');
    }
}

async function deleteClient(id) {
    if (!confirm('Вы уверены, что хотите удалить этого клиента? Все связанные заказы также будут удалены.')) return;
    
    try {
        const response = await fetch(`/api/admin/clients/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Клиент удален');
            loadClients();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении клиента');
    }
}

async function loadCouriers() {
    try {
        const response = await fetch('/api/admin/couriers');
        const couriers = await response.json();
        displayCouriers(couriers);
    } catch (error) {
        document.getElementById('couriers-container').innerHTML = 
            `<div class="error">Ошибка загрузки курьеров</div>`;
    }
}

function displayCouriers(couriers) {
    const container = document.getElementById('couriers-container');
    
    if (!couriers || couriers.length === 0) {
        container.innerHTML = '<div class="no-data">Курьеры не найдены</div>';
        return;
    }

    container.innerHTML = couriers.map(courier => {
        const fullName = `${courier.last_name} ${courier.first_name} ${courier.patronymic || ''}`.trim();
        const statusClass = courier.employment_status === 'свободен' ? 'status-free' : 'status-busy';
        
        return `
        <div class="courier-card" data-id="${courier.id}">
            <h3 class="courier-name">${escapeHtml(fullName)}</h3>
            
            <div class="employment-status ${statusClass}">
                ${courier.employment_status === 'свободен' ? 'Свободен' : 'Занят'}
            </div>
            
            <div class="courier-detail">
                <span class="courier-label">Телефон:</span>
                <span class="courier-value">${courier.phone_number || '-'}</span>
            </div>
            
            <div class="courier-detail">
                <span class="courier-label">Транспорт:</span>
                <span class="courier-value">${courier.transport_type || '-'}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editCourier(${courier.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteCourier(${courier.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editCourier(id) {
    try {
        const response = await fetch(`/api/admin/couriers/${id}`);
        const courier = await response.json();
        
        currentEditId = id;
        currentEntityType = 'couriers';
        
        const formHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>Фамилия:</label>
                    <input type="text" name="last_name" value="${escapeHtml(courier.last_name)}" required>
                </div>
                <div class="form-group">
                    <label>Имя:</label>
                    <input type="text" name="first_name" value="${escapeHtml(courier.first_name)}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Отчество:</label>
                <input type="text" name="patronymic" value="${escapeHtml(courier.patronymic || '')}">
            </div>
            <div class="form-group">
                <label>Телефон:</label>
                <input type="tel" name="phone_number" value="${courier.phone_number || ''}">
            </div>
            <div class="form-group">
                <label>Тип транспорта:</label>
                <input type="text" name="transport_type" value="${courier.transport_type || ''}">
            </div>
            <div class="form-group">
                <label>Статус занятости:</label>
                <select name="employment_status">
                    <option value="свободен" ${courier.employment_status === 'свободен' ? 'selected' : ''}>Свободен</option>
                    <option value="занят" ${courier.employment_status === 'занят' ? 'selected' : ''}>Занят</option>
                </select>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование курьера';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных курьера');
    }
}

async function deleteCourier(id) {
    if (!confirm('Вы уверены, что хотите удалить этого курьера?')) return;
    
    try {
        const response = await fetch(`/api/admin/couriers/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Курьер удален');
            loadCouriers();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении курьера');
    }
}

async function loadEmployees() {
    try {
        const response = await fetch('/api/admin/employees');
        const employees = await response.json();
        displayEmployees(employees);
    } catch (error) {
        document.getElementById('employees-container').innerHTML = 
            `<div class="error">Ошибка загрузки сотрудников</div>`;
    }
}

function displayEmployees(employees) {
    const container = document.getElementById('employees-container');
    
    if (!employees || employees.length === 0) {
        container.innerHTML = '<div class="no-data">Сотрудники не найдены</div>';
        return;
    }

    container.innerHTML = employees.map(employee => {
        const fullName = `${employee.last_name} ${employee.first_name} ${employee.patronymic || ''}`.trim();
        
        return `
        <div class="employee-card" data-id="${employee.id}">
            <h3 class="employee-name">${escapeHtml(fullName)}</h3>
            
            <div class="employee-detail">
                <span class="employee-label">Должность:</span>
                <span class="employee-value">${escapeHtml(employee.position)}</span>
            </div>
            
            <div class="employee-detail">
                <span class="employee-label">Телефон:</span>
                <span class="employee-value">${employee.phone || '-'}</span>
            </div>
            
            <div class="employee-detail">
                <span class="employee-label">Email:</span>
                <span class="employee-value">${employee.email || '-'}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editEmployee(${employee.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteEmployee(${employee.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editEmployee(id) {
    try {
        const response = await fetch(`/api/admin/employees/${id}`);
        const employee = await response.json();
        
        currentEditId = id;
        currentEntityType = 'employees';
        
        const formHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>Фамилия:</label>
                    <input type="text" name="last_name" value="${escapeHtml(employee.last_name)}" required>
                </div>
                <div class="form-group">
                    <label>Имя:</label>
                    <input type="text" name="first_name" value="${escapeHtml(employee.first_name)}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Отчество:</label>
                <input type="text" name="patronymic" value="${escapeHtml(employee.patronymic || '')}">
            </div>
            <div class="form-group">
                <label>Должность:</label>
                <select name="position" required>
                    <option value="администратор" ${employee.position === 'администратор' ? 'selected' : ''}>Администратор</option>
                    <option value="менеджер" ${employee.position === 'менеджер' ? 'selected' : ''}>Менеджер</option>
                    <option value="оператор" ${employee.position === 'оператор' ? 'selected' : ''}>Оператор</option>
                </select>
            </div>
            <div class="form-group">
                <label>Телефон:</label>
                <input type="tel" name="phone" value="${employee.phone || ''}">
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" value="${employee.email || ''}">
            </div>
            <div class="form-group">
                <label>Активен:</label>
                <select name="is_active">
                    <option value="true" ${employee.is_active ? 'selected' : ''}>Да</option>
                    <option value="false" ${!employee.is_active ? 'selected' : ''}>Нет</option>
                </select>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование сотрудника';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных сотрудника');
    }
}

async function deleteEmployee(id) {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
        const response = await fetch(`/api/admin/employees/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Сотрудник удален');
            loadEmployees();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении сотрудника');
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/orders/all');
        const result = await response.json();
        displayOrders(result.orders);
    } catch (error) {
        document.getElementById('orders-container').innerHTML = 
            `<div class="error">Ошибка загрузки заказов</div>`;
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-data">Заказы не найдены</div>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU');
        const productsTotal = formatPrice(order.products_total);
        const totalAmount = formatPrice(order.total_amount);
        const statusClass = getStatusClass(order.status);
        
        return `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div>
                        <span class="order-id">Заказ №${order.id}</span>
                        <span class="order-date"> от ${orderDate}</span>
                    </div>
                    <span class="order-status ${statusClass}">${order.status || 'Неизвестно'}</span>
                </div>
                
                <div class="order-details">
                    <p><strong>Клиент:</strong> ${order.client_name}</p>
                    <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    <p><strong>Сумма:</strong> ${totalAmount} ₽</p>
                    
                    <div class="card-actions">
                        <button class="delete-btn" onclick="deleteOrder(${order.id})">Удалить заказ</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteOrder(id) {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) return;
    
    try {
        const response = await fetch(`/api/admin/orders/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Заказ удален');
            loadOrders();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении заказа');
    }
}

async function loadWarehouses() {
    try {
        const response = await fetch('/api/admin/warehouses');
        const warehouses = await response.json();
        displayWarehouses(warehouses);
    } catch (error) {
        document.getElementById('warehouses-container').innerHTML = 
            `<div class="error">Ошибка загрузки складов</div>`;
    }
}

function displayWarehouses(warehouses) {
    const container = document.getElementById('warehouses-container');
    
    if (!warehouses || warehouses.length === 0) {
        container.innerHTML = '<div class="no-data">Склады не найдены</div>';
        return;
    }

    container.innerHTML = warehouses.map(warehouse => {
        return `
        <div class="warehouse-card" data-id="${warehouse.id}">
            <h3 class="warehouse-name">${escapeHtml(warehouse.name)}</h3>
            
            <div class="warehouse-detail">
                <span class="warehouse-label">Адрес:</span>
                <span class="warehouse-value">${escapeHtml(warehouse.address)}</span>
            </div>
            
            <div class="warehouse-detail">
                <span class="warehouse-label">Статус:</span>
                <span class="warehouse-value">${warehouse.is_active ? 'Активен' : 'Неактивен'}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editWarehouse(${warehouse.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteWarehouse(${warehouse.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editWarehouse(id) {
    try {
        const response = await fetch(`/api/admin/warehouses/${id}`);
        const warehouse = await response.json();
        
        currentEditId = id;
        currentEntityType = 'warehouses';
        
        const formHtml = `
            <div class="form-group">
                <label>Название склада:</label>
                <input type="text" name="name" value="${escapeHtml(warehouse.name)}" required>
            </div>
            <div class="form-group">
                <label>Адрес:</label>
                <textarea name="address" rows="2" required>${escapeHtml(warehouse.address)}</textarea>
            </div>
            <div class="form-group">
                <label>Активен:</label>
                <select name="is_active">
                    <option value="true" ${warehouse.is_active ? 'selected' : ''}>Да</option>
                    <option value="false" ${!warehouse.is_active ? 'selected' : ''}>Нет</option>
                </select>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование склада';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных склада');
    }
}

async function deleteWarehouse(id) {
    if (!confirm('Вы уверены, что хотите удалить этот склад?')) return;
    
    try {
        const response = await fetch(`/api/admin/warehouses/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Склад удален');
            loadWarehouses();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении склада');
    }
}

async function loadStatuses() {
    try {
        const response = await fetch('/api/admin/statuses');
        const statuses = await response.json();
        displayStatuses(statuses);
    } catch (error) {
        document.getElementById('statuses-container').innerHTML = 
            `<div class="error">Ошибка загрузки статусов</div>`;
    }
}

function displayStatuses(statuses) {
    const container = document.getElementById('statuses-container');
    
    if (!statuses || statuses.length === 0) {
        container.innerHTML = '<div class="no-data">Статусы не найдены</div>';
        return;
    }

    container.innerHTML = statuses.map(status => {
        return `
        <div class="status-card" data-id="${status.id}">
            <div class="status-detail">
                <span class="status-label">Статус:</span>
                <span class="status-value">${escapeHtml(status.status)}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editStatus(${status.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteStatus(${status.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editStatus(id) {
    try {
        const response = await fetch(`/api/admin/statuses/${id}`);
        const status = await response.json();
        
        currentEditId = id;
        currentEntityType = 'statuses';
        
        const formHtml = `
            <div class="form-group">
                <label>Название статуса:</label>
                <input type="text" name="status" value="${escapeHtml(status.status)}" required>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование статуса';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных статуса');
    }
}

async function deleteStatus(id) {
    if (!confirm('Вы уверены, что хотите удалить этот статус?')) return;
    
    try {
        const response = await fetch(`/api/admin/statuses/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Статус удален');
            loadStatuses();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении статуса');
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        document.getElementById('users-container').innerHTML = 
            `<div class="error">Ошибка загрузки пользователей</div>`;
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-container');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="no-data">Пользователи не найдены</div>';
        return;
    }

    container.innerHTML = users.map(user => {
        let role = '';
        if (user.client_id) role = 'Клиент';
        else if (user.employee_id) role = 'Сотрудник';
        else if (user.courier_id) role = 'Курьер';
        
        return `
        <div class="user-card" data-id="${user.id}">
            <div class="user-detail">
                <span class="user-label">Логин:</span>
                <span class="user-value">${escapeHtml(user.login)}</span>
            </div>
            
            <div class="user-detail">
                <span class="user-label">Роль:</span>
                <span class="user-value">${role}</span>
            </div>
            
            <div class="user-detail">
                <span class="user-label">Статус:</span>
                <span class="user-value">${user.is_active ? 'Активен' : 'Неактивен'}</span>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" onclick="editUser(${user.id})">Редактировать</button>
                <button class="delete-btn" onclick="deleteUser(${user.id})">Удалить</button>
            </div>
        </div>
        `;
    }).join('');
}

async function editUser(id) {
    try {
        const response = await fetch(`/api/admin/users/${id}`);
        const user = await response.json();
        
        currentEditId = id;
        currentEntityType = 'users';
        
        const formHtml = `
            <div class="form-group">
                <label>Логин:</label>
                <input type="text" name="login" value="${escapeHtml(user.login)}" required>
            </div>
            <div class="form-group">
                <label>Новый пароль (оставьте пустым, если не менять):</label>
                <input type="password" name="password">
            </div>
            <div class="form-group">
                <label>Активен:</label>
                <select name="is_active">
                    <option value="true" ${user.is_active ? 'selected' : ''}>Да</option>
                    <option value="false" ${!user.is_active ? 'selected' : ''}>Нет</option>
                </select>
            </div>
        `;
        
        document.getElementById('modal-title').textContent = 'Редактирование пользователя';
        document.getElementById('form-fields').innerHTML = formHtml;
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных пользователя');
    }
}

async function deleteUser(id) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Пользователь удален');
            loadUsers();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при удалении пользователя');
    }
}

function showAddModal(entityType) {
    currentEditId = null;
    currentEntityType = entityType;
    
    let formHtml = '';
    let title = '';
    
    switch(entityType) {
        case 'products':
            title = 'Добавление товара';
            formHtml = `
                <div class="form-group">
                    <label>Название товара:</label>
                    <input type="text" name="product_name" required>
                </div>
                <div class="form-group">
                    <label>Категория:</label>
                    <input type="text" name="category">
                </div>
                <div class="form-group">
                    <label>Описание:</label>
                    <textarea name="description" rows="3"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Цена:</label>
                        <input type="number" step="0.01" name="base_price" required>
                    </div>
                    <div class="form-group">
                        <label>Скидка (%):</label>
                        <input type="number" step="0.01" name="discount_percent" value="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Количество:</label>
                        <input type="number" name="stock_quantity" value="0">
                    </div>
                    <div class="form-group">
                        <label>Единица измерения:</label>
                        <input type="text" name="unit" value="шт.">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Вес (кг):</label>
                        <input type="number" step="0.01" name="weight_kg" value="0">
                    </div>
                    <div class="form-group">
                        <label>Объем (м³):</label>
                        <input type="number" step="0.01" name="volume_m3" value="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Производитель:</label>
                    <input type="text" name="manufacturer">
                </div>
                <div class="form-group">
                    <label>Поставщик:</label>
                    <input type="text" name="supplier">
                </div>
                <div class="form-group">
                    <label>URL изображения:</label>
                    <input type="url" name="image_url">
                </div>
            `;
            break;
            
        case 'clients':
            title = 'Добавление клиента';
            formHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Фамилия:</label>
                        <input type="text" name="last_name" required>
                    </div>
                    <div class="form-group">
                        <label>Имя:</label>
                        <input type="text" name="first_name" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Отчество:</label>
                    <input type="text" name="patronymic">
                </div>
                <div class="form-group">
                    <label>Телефон:</label>
                    <input type="tel" name="phone">
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Адрес:</label>
                    <textarea name="address" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Логин для входа:</label>
                    <input type="text" name="login" required>
                </div>
                <div class="form-group">
                    <label>Пароль:</label>
                    <input type="password" name="password" required>
                </div>
            `;
            break;
            
        case 'couriers':
            title = 'Добавление курьера';
            formHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Фамилия:</label>
                        <input type="text" name="last_name" required>
                    </div>
                    <div class="form-group">
                        <label>Имя:</label>
                        <input type="text" name="first_name" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Отчество:</label>
                    <input type="text" name="patronymic">
                </div>
                <div class="form-group">
                    <label>Телефон:</label>
                    <input type="tel" name="phone_number">
                </div>
                <div class="form-group">
                    <label>Тип транспорта:</label>
                    <input type="text" name="transport_type">
                </div>
                <div class="form-group">
                    <label>Статус занятости:</label>
                    <select name="employment_status">
                        <option value="свободен">Свободен</option>
                        <option value="занят">Занят</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Логин для входа:</label>
                    <input type="text" name="login" required>
                </div>
                <div class="form-group">
                    <label>Пароль:</label>
                    <input type="password" name="password" required>
                </div>
            `;
            break;
            
        case 'employees':
            title = 'Добавление сотрудника';
            formHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Фамилия:</label>
                        <input type="text" name="last_name" required>
                    </div>
                    <div class="form-group">
                        <label>Имя:</label>
                        <input type="text" name="first_name" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Отчество:</label>
                    <input type="text" name="patronymic">
                </div>
                <div class="form-group">
                    <label>Должность:</label>
                    <select name="position" required>
                        <option value="администратор">Администратор</option>
                        <option value="менеджер">Менеджер</option>
                        <option value="оператор">Оператор</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Телефон:</label>
                    <input type="tel" name="phone">
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Активен:</label>
                    <select name="is_active">
                        <option value="true">Да</option>
                        <option value="false">Нет</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Логин для входа:</label>
                    <input type="text" name="login" required>
                </div>
                <div class="form-group">
                    <label>Пароль:</label>
                    <input type="password" name="password" required>
                </div>
            `;
            break;
            
        case 'warehouses':
            title = 'Добавление склада';
            formHtml = `
                <div class="form-group">
                    <label>Название склада:</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>Адрес:</label>
                    <textarea name="address" rows="2" required></textarea>
                </div>
                <div class="form-group">
                    <label>Активен:</label>
                    <select name="is_active">
                        <option value="true">Да</option>
                        <option value="false">Нет</option>
                    </select>
                </div>
            `;
            break;
            
        case 'statuses':
            title = 'Добавление статуса';
            formHtml = `
                <div class="form-group">
                    <label>Название статуса:</label>
                    <input type="text" name="status" required>
                </div>
            `;
            break;
            
        case 'users':
            title = 'Добавление пользователя';
            formHtml = `
                <div class="form-group">
                    <label>Логин:</label>
                    <input type="text" name="login" required>
                </div>
                <div class="form-group">
                    <label>Пароль:</label>
                    <input type="password" name="password" required>
                </div>
                <div class="form-group">
                    <label>Тип пользователя:</label>
                    <select name="user_type" id="user_type" required>
                        <option value="client">Клиент</option>
                        <option value="employee">Сотрудник</option>
                        <option value="courier">Курьер</option>
                    </select>
                </div>
                <div class="form-group" id="entity_id_group">
                    <label>ID связанной записи:</label>
                    <input type="number" name="entity_id" placeholder="ID клиента/сотрудника/курьера" required>
                </div>
            `;
            break;
    }
    
    document.getElementById('modal-title').textContent = title;
    document.getElementById('form-fields').innerHTML = formHtml;
    document.getElementById('modal').style.display = 'block';
    
    if (entityType === 'users') {
        document.getElementById('user_type').addEventListener('change', function() {
            const label = document.querySelector('#entity_id_group label');
            if (this.value === 'client') label.textContent = 'ID клиента:';
            else if (this.value === 'employee') label.textContent = 'ID сотрудника:';
            else label.textContent = 'ID курьера:';
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
        if (value === 'true') data[key] = true;
        else if (value === 'false') data[key] = false;
        else data[key] = value;
    });
    
    try {
        let url = `/api/admin/${currentEntityType}`;
        let method = 'POST';
        
        if (currentEditId) {
            url += `/${currentEditId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(currentEditId ? 'Данные обновлены' : 'Запись добавлена');
            closeModal();
            
            // Перезагружаем текущую вкладку
            if (currentTab === 'products') loadProducts();
            else if (currentTab === 'clients') loadClients();
            else if (currentTab === 'couriers') loadCouriers();
            else if (currentTab === 'employees') loadEmployees();
            else if (currentTab === 'warehouses') loadWarehouses();
            else if (currentTab === 'statuses') loadStatuses();
            else if (currentTab === 'users') loadUsers();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при сохранении данных');
    }
}

function loadBackupInfo() {
    const container = document.getElementById('backup-container');
    container.innerHTML = `
        <div class="backup-container">
            <button class="backup-btn" onclick="createBackup()">Создать резервную копию</button>
            <button class="backup-btn" onclick="restoreBackup()" style="background-color: #f39c12;">Восстановить из файла</button>
            <div id="backup-list" class="backup-list">
                <div class="loading">Загрузка списка резервных копий...</div>
            </div>
        </div>
    `;
    loadBackupList();
}

async function loadBackupList() {
    try {
        const response = await fetch('/api/admin/backups');
        const backups = await response.json();
        
        const container = document.getElementById('backup-list');
        if (!backups || backups.length === 0) {
            container.innerHTML = '<div class="no-backups">Резервные копии отсутствуют</div>';
        } else {
            container.innerHTML = `
                <h3>Доступные резервные копии:</h3>
                <ul style="list-style: none; padding: 0;">
                    ${backups.map(backup => `
                        <li style="padding: 10px; margin: 5px 0; background: #f5f5f5; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${backup.filename} (${new Date(backup.created_at).toLocaleString('ru-RU')})</span>
                            <button onclick="restoreFromFile('${backup.filename}')" class="action-btn" style="padding: 5px 15px; background-color: #27ae60;">Восстановить</button>
                        </li>
                    `).join('')}
                </ul>
            `;
        }
    } catch (error) {
        document.getElementById('backup-list').innerHTML = '<div class="error">Ошибка загрузки списка резервных копий</div>';
    }
}

async function createBackup() {
    try {
        const response = await fetch('/api/admin/backup', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            alert('Резервная копия создана успешно');
            loadBackupList();
        } else {
            alert(result.error || 'Ошибка при создании резервной копии');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при создании резервной копии');
    }
}

async function restoreBackup() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('backup', file);
        
        if (!confirm(`Восстановить базу данных из файла ${file.name}? Все текущие данные будут заменены.`)) return;
        
        try {
            const response = await fetch('/api/admin/restore', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                alert('База данных восстановлена успешно! Страница будет перезагружена.');
                setTimeout(() => location.reload(), 2000);
            } else {
                alert(result.error || 'Ошибка при восстановлении');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка при восстановлении');
        }
    };
    fileInput.click();
}

async function restoreFromFile(filename) {
    if (!confirm(`Восстановить базу данных из файла ${filename}? Все текущие данные будут заменены.`)) return;
    
    try {
        const response = await fetch('/api/admin/restore-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const result = await response.json();
        
        if (result.success) {
            alert('База данных восстановлена успешно! Страница будет перезагружена.');
            setTimeout(() => location.reload(), 2000);
        } else {
            alert(result.error || 'Ошибка при восстановлении');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при восстановлении');
    }
}

function openModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open'); // Блокируем прокрутку страницы
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open'); // Восстанавливаем прокрутку
    currentEditId = null;
    currentEntityType = null;
}

function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('принят')) return 'status-new';
    if (statusLower.includes('обработ')) return 'status-processing';
    if (statusLower.includes('в пути')) return 'status-delivering';
    if (statusLower.includes('доставлен')) return 'status-delivered';
    if (statusLower.includes('отмен')) return 'status-cancelled';
    
    return '';
}

function formatPrice(price) {
    if (!price) return '0,00';
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Массовое завершение заказов
async function finishAllOrders() {
    if (!confirm('ВНИМАНИЕ! Это действие завершит ВСЕ активные заказы и освободит ВСЕХ курьеров.\n\nВы уверены, что хотите продолжить?')) {
        return;
    }
    
    if (!confirm('ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ! Это действие НЕЛЬЗЯ будет отменить.\n\nЗавершить все заказы?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/finish-all-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`${result.message}`);
            loadOrders();
            if (typeof loadCouriers === 'function') loadCouriers();
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при завершении заказов');
    }
}

