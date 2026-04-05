let currentTab = 'orders';
let productsList = [];

document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Оператор';
    const userRoleName = localStorage.getItem('userRoleName') || 'Оператор';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    setupTabs();
    loadAllOrders();
    loadProductsForSelect();
    loadClientsForSelect();
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
            
            if (tabId === 'orders') {
                loadAllOrders();
            } else if (tabId === 'clients') {
                loadClients();
            } else if (tabId === 'new-order') {
                loadProductsForSelect();
                loadClientsForSelect();
            }
        });
    });
}

// ==================== ЗАГРУЗКА ДАННЫХ ДЛЯ ФОРМ ====================
async function loadProductsForSelect() {
    try {
        const response = await fetch('/api/operator/products');
        productsList = await response.json();
        
        // Обновляем все выпадающие списки товаров
        updateAllProductSelects();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

function updateAllProductSelects() {
    const selects = document.querySelectorAll('.product-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Выберите товар --</option>';
        
        productsList.forEach(product => {
            select.innerHTML += `<option value="${product.id}" data-stock="${product.stock_quantity}">
                ${product.product_name} - ${formatPrice(product.current_price)} ₽ (в наличии: ${product.stock_quantity} ${product.unit})
            </option>`;
        });
        
        if (currentValue) select.value = currentValue;
    });
}

async function loadClientsForSelect() {
    try {
        const response = await fetch('/api/clients/operator');
        const clients = await response.json();
        
        const select = document.getElementById('client_id');
        select.innerHTML = '<option value="">-- Выберите клиента --</option>';
        
        clients.forEach(client => {
            const fullName = `${client.last_name} ${client.first_name} ${client.patronymic || ''}`.trim();
            select.innerHTML += `<option value="${client.id}">${fullName} (${client.phone || 'без телефона'})</option>`;
        });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error);
    }
}

// ==================== УПРАВЛЕНИЕ ТОВАРАМИ В ЗАКАЗЕ ====================
function addOrderItem() {
    const container = document.getElementById('order-items-container');
    const newRow = document.createElement('div');
    newRow.className = 'order-item-row';
    newRow.innerHTML = `
        <select class="product-select" style="width: 60%;" required>
            <option value="">-- Выберите товар --</option>
        </select>
        <input type="number" class="quantity-input" placeholder="Кол-во" style="width: 25%;" min="1" value="1">
        <button type="button" class="remove-item-btn" onclick="removeOrderItem(this)">×</button>
    `;
    container.appendChild(newRow);
    updateAllProductSelects();
}


function addEditOrderItem() {
    const container = document.getElementById('edit-order-items-container');
    const newRow = document.createElement('div');
    newRow.className = 'order-item-row';
    newRow.innerHTML = `
        <select class="product-select" style="width: 60%;" required>
            <option value="">-- Выберите товар --</option>
        </select>
        <input type="number" class="quantity-input" placeholder="Кол-во" style="width: 25%;" min="1" value="1">
        <button type="button" class="remove-item-btn" onclick="removeEditOrderItem(this)">×</button>
    `;
    container.appendChild(newRow);
    updateEditProductSelects();
}

function updatePrice(select) {
    const row = select.closest('.order-item-row');
    const priceInput = row.querySelector('.price-input');
    const selectedOption = select.options[select.selectedIndex];
    const price = selectedOption.getAttribute('data-price');
    
    if (price && price !== '') {
        priceInput.value = parseFloat(price).toFixed(2);
    } else {
        priceInput.value = '';
    }
    
    // Также вызываем валидацию количества при выборе товара
    const quantityInput = row.querySelector('.quantity-input');
    if (quantityInput) {
        validateQuantity(quantityInput);
    }
}

function updateEditPrice(select) {
    const row = select.closest('.order-item-row');
    const priceInput = row.querySelector('.price-input');
    const selectedOption = select.options[select.selectedIndex];
    const price = selectedOption.getAttribute('data-price');
    priceInput.value = price ? parseFloat(price).toFixed(2) : '';
}

function validateQuantity(input) {
    const row = input.closest('.order-item-row');
    const select = row.querySelector('.product-select');
    const selectedOption = select.options[select.selectedIndex];
    const maxStock = parseInt(selectedOption.getAttribute('data-stock')) || 0;
    let quantity = parseInt(input.value) || 0;
    
    if (quantity <= 0) {
        quantity = 1;
        input.value = 1;
    }
    
    if (maxStock > 0 && quantity > maxStock) {
        alert(`Недостаточно товара на складе. Доступно: ${maxStock} шт.`);
        input.value = maxStock;
        quantity = maxStock;
    }
}

function removeOrderItem(btn) {
    const container = document.getElementById('order-items-container');
    if (container.children.length > 1) {
        btn.closest('.order-item-row').remove();
    } else {
        alert('Должен быть хотя бы один товар в заказе');
    }
}

function removeEditOrderItem(btn) {
    const container = document.getElementById('edit-order-items-container');
    if (container.children.length > 1) {
        btn.closest('.order-item-row').remove();
    } else {
        alert('Должен быть хотя бы один товар в заказе');
    }
}

function updateEditProductSelects() {
    const selects = document.querySelectorAll('#edit-order-items-container .product-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Выберите товар --</option>';
        
        productsList.forEach(product => {
            select.innerHTML += `<option value="${product.id}" data-price="${product.current_price}" data-stock="${product.stock_quantity}">
                ${product.product_name} - ${formatPrice(product.current_price)} ₽ (в наличии: ${product.stock_quantity} ${product.unit})
            </option>`;
        });
        
        if (currentValue) select.value = currentValue;
    });
}

// ==================== СОЗДАНИЕ ЗАКАЗА ====================
document.getElementById('order-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const client_id = document.getElementById('client_id').value;
    const delivery_address = document.getElementById('delivery_address').value;
    const delivery_price = parseFloat(document.getElementById('delivery_price').value) || 0;
    
    if (!client_id) {
        alert('Выберите клиента');
        return;
    }
    
    if (!delivery_address) {
        alert('Введите адрес доставки');
        return;
    }
    
    const items = [];
    const rows = document.querySelectorAll('#order-items-container .order-item-row');
    let hasError = false;
    
    for (const row of rows) {
        const productSelect = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        
        const productId = productSelect.value;
        const quantity = parseInt(quantityInput.value);
        
        if (!productId) {
            alert('Выберите товар для всех позиций');
            hasError = true;
            break;
        }
        
        if (!quantity || quantity <= 0) {
            alert('Введите корректное количество товара');
            hasError = true;
            break;
        }
        
        items.push({
            product_id: parseInt(productId),
            quantity: quantity
            // price не передаем - сервер сам получит из БД
        });
    }
    
    if (hasError) return;
    
    if (items.length === 0) {
        alert('Добавьте хотя бы один товар в заказ');
        return;
    }
    
    try {
        const response = await fetch('/api/operator/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                client_id: parseInt(client_id), 
                delivery_address, 
                delivery_price, 
                items 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Заказ №${result.orderId} успешно создан`);
            resetOrderForm();
            loadAllOrders();
            document.querySelector('[data-tab="orders"]').click();
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при создании заказа: ' + error.message);
    }
});

function resetOrderForm() {
    document.getElementById('client_id').value = '';
    document.getElementById('delivery_address').value = '';
    document.getElementById('delivery_price').value = '0';
    
    const container = document.getElementById('order-items-container');
    container.innerHTML = `
        <div class="order-item-row">
            <select class="product-select" style="width: 60%;" required>
                <option value="">-- Выберите товар --</option>
            </select>
            <input type="number" class="quantity-input" placeholder="Кол-во" style="width: 25%;" min="1" value="1">
            <button type="button" class="remove-item-btn" onclick="removeOrderItem(this)">×</button>
        </div>
    `;
    updateAllProductSelects();
}

// ==================== РЕДАКТИРОВАНИЕ ЗАКАЗА ====================
async function editOrder(orderId) {
    try {
        const response = await fetch(`/api/operator/orders/${orderId}`);
        const order = await response.json();
        
        document.getElementById('edit_order_id').value = order.id;
        document.getElementById('edit_delivery_address').value = order.delivery_address;
        document.getElementById('edit_delivery_price').value = order.delivery_price;
        
        const container = document.getElementById('edit-order-items-container');
        container.innerHTML = '';
        
        for (const item of order.items) {
            const row = document.createElement('div');
            row.className = 'order-item-row';
            row.innerHTML = `
                <select class="product-select" style="width: 40%;" onchange="updateEditPrice(this)">
                    <option value="">-- Выберите товар --</option>
                </select>
                <input type="number" class="quantity-input" placeholder="Кол-во" style="width: 20%;" min="1" value="${item.quantity}">
                <input type="number" class="price-input" placeholder="Цена" style="width: 25%;" readonly value="${item.price}">
                <button type="button" class="remove-item-btn" onclick="removeEditOrderItem(this)">×</button>
            `;
            container.appendChild(row);
        }
        
        updateEditProductSelects();
        
        // Устанавливаем выбранные товары
        const selects = document.querySelectorAll('#edit-order-items-container .product-select');
        for (let i = 0; i < selects.length; i++) {
            selects[i].value = order.items[i].product_id;
            updateEditPrice(selects[i]);
        }
        
        document.getElementById('edit-order-modal').style.display = 'block';
    } catch (error) {
        alert('Ошибка загрузки данных заказа');
    }
}

document.getElementById('edit-order-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('edit_order_id').value;
    const delivery_address = document.getElementById('edit_delivery_address').value;
    const delivery_price = parseFloat(document.getElementById('edit_delivery_price').value) || 0;
    
    const items = [];
    const rows = document.querySelectorAll('#edit-order-items-container .order-item-row');
    
    for (const row of rows) {
        const productSelect = row.querySelector('.product-select');
        const quantity = parseInt(row.querySelector('.quantity-input').value);
        const price = parseFloat(row.querySelector('.price-input').value);
        
        items.push({
            product_id: parseInt(productSelect.value),
            quantity: quantity,
            price: price
        });
    }
    
    try {
        const response = await fetch(`/api/operator/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_address, delivery_price, items })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Заказ успешно обновлен');
            closeEditOrderModal();
            loadAllOrders();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при обновлении заказа');
    }
});

async function deleteOrder() {
    const orderId = document.getElementById('edit_order_id').value;
    
    if (!confirm('Вы уверены, что хотите отменить этот заказ?')) return;
    
    try {
        const response = await fetch(`/api/operator/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Заказ отменен');
            closeEditOrderModal();
            loadAllOrders();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при отмене заказа');
    }
}

function closeEditOrderModal() {
    document.getElementById('edit-order-modal').style.display = 'none';
}

// ==================== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ЗАКАЗОВ ====================
async function loadAllOrders() {
    try {
        const response = await fetch('/api/orders/all');
        const result = await response.json();
        
        if (result.success) {
            displayAllOrders(result.orders);
        } else {
            document.getElementById('orders-container').innerHTML = 
                `<div class="error">${result.error}</div>`;
        }
    } catch (error) {
        document.getElementById('orders-container').innerHTML = 
            '<div class="error">Ошибка загрузки заказов</div>';
    }
}

function displayAllOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">Заказы не найдены</div>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        const productsTotal = formatPrice(order.products_total);
        const totalAmount = formatPrice(order.total_amount);
        const statusClass = getStatusClass(order.status);
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <span class="order-id">Заказ №${order.id}</span>
                        <span class="order-date"> от ${orderDate}</span>
                    </div>
                    <span class="order-status ${statusClass}">${order.status || 'Неизвестно'}</span>
                </div>
                
                <div class="order-details">
                    <div class="order-info">
                        <p><strong>Клиент:</strong> ${order.client_name}</p>
                        <p><strong>Телефон:</strong> ${order.client_phone || '-'}</p>
                        <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                        <p><strong>Курьер:</strong> ${order.courier_name || 'не назначен'}</p>
                    </div>
                    
                    <table class="order-items">
                        <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
                        <tbody>
                            ${order.items ? order.items.map(item => `
                                <tr>
                                    <td>${item.product_name || 'Товар'}</td>
                                    <td>${item.quantity} шт.</td>
                                    <td>${formatPrice(item.unit_price_at_order)} ₽</td>
                                    <td>${formatPrice(item.total_price)} ₽</td>
                                </tr>
                            `).join('') : ''}
                        </tbody>
                    </table>
                    
                    <div class="order-total">
                        <p><strong>Товары:</strong> ${productsTotal} ₽</p>
                        <p><strong>Доставка:</strong> ${formatPrice(order.delivery_price)} ₽</p>
                        <p><strong>Итого:</strong> ${totalAmount} ₽</p>
                    </div>
                    
                    <div class="card-actions">
                        <button class="edit-btn" onclick="editOrder(${order.id})">Редактировать</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== УПРАВЛЕНИЕ КЛИЕНТАМИ ====================
async function loadClients() {
    try {
        const response = await fetch('/api/clients/operator');
        const clients = await response.json();
        displayClients(clients);
    } catch (error) {
        document.getElementById('clients-container').innerHTML = 
            '<div class="error">Ошибка загрузки клиентов</div>';
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
            <div class="client-card">
                <h3 class="client-name">${escapeHtml(fullName)}</h3>
                <div class="client-detail"><span class="label">Телефон:</span> ${client.phone || '-'}</div>
                <div class="client-detail"><span class="label">Email:</span> ${client.email || '-'}</div>
                <div class="client-detail"><span class="label">Адрес:</span> ${escapeHtml(client.address || '-')}</div>
            </div>
        `;
    }).join('');
}

// ==================== РЕГИСТРАЦИЯ НОВОГО КЛИЕНТА ====================
document.getElementById('client-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const clientData = {
        last_name: document.getElementById('last_name').value,
        first_name: document.getElementById('first_name').value,
        patronymic: document.getElementById('patronymic').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        login: document.getElementById('login').value,
        password: document.getElementById('password').value
    };
    
    if (!clientData.last_name || !clientData.first_name || !clientData.login || !clientData.password) {
        alert('Заполните все обязательные поля');
        return;
    }
    
    try {
        const response = await fetch('/api/operator/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Клиент успешно зарегистрирован!`);
            resetClientForm();
            loadClients();
            loadClientsForSelect();
            document.querySelector('[data-tab="clients"]').click();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при регистрации клиента');
    }
});

function resetClientForm() {
    document.getElementById('last_name').value = '';
    document.getElementById('first_name').value = '';
    document.getElementById('patronymic').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('address').value = '';
    document.getElementById('login').value = '';
    document.getElementById('password').value = '';
}

function showNewClientModal() {
    document.querySelector('[data-tab="new-client"]').click();
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
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