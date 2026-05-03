document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Курьер';
    const userRoleName = localStorage.getItem('userRoleName') || 'Курьер';
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    setupTabs();
    loadAvailableOrders();
    loadMyOrders();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
            if (tabId === 'available') loadAvailableOrders();
            else loadMyOrders();
        });
    });
}

async function loadAvailableOrders() {
    const container = document.getElementById('available-orders-container');
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    try {
        const response = await fetch('/api/courier/available-orders');
        const result = await response.json();
        if (result.success) displayAvailableOrders(result.orders);
        else container.innerHTML = `<div class="error">${result.error}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

function displayAvailableOrders(orders) {
    const container = document.getElementById('available-orders-container');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">Нет доступных заказов</div>';
        return;
    }
    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU');
        return `
            <div class="order-card">
                <div class="order-header">
                    <div><span class="order-id">Заказ №${order.id}</span> от ${orderDate}</div>
                    <span class="order-status status-ready">Готов к выдаче</span>
                </div>
                <div class="order-info">
                    <p><strong>Клиент:</strong> ${order.client_name}</p>
                    <p><strong>Телефон:</strong> ${order.client_phone}</p>
                    <p><strong>Адрес:</strong> ${order.delivery_address}</p>
                    <p><strong>Сумма заказа:</strong> ${formatPrice(order.total_amount)} ₽</p>
                    <details>
                        <summary>Товары</summary>
                        <table class="order-items">
                            <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th></tr></thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${formatPrice(item.unit_price)} ₽</td></tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </details>
                </div>
                <button class="take-order-btn" onclick="takeOrder(${order.id})">Взять заказ</button>
            </div>
        `;
    }).join('');
}

async function takeOrder(orderId) {
    if (!confirm('Взять этот заказ?')) return;
    try {
        const response = await fetch('/api/courier/take-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, courierLogin: localStorage.getItem('login') })
        });
        const result = await response.json();
        if (result.success) {
            alert('Заказ взят в работу');
            loadAvailableOrders();
            loadMyOrders();
        } else alert(result.error);
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

async function loadMyOrders() {
    const container = document.getElementById('my-orders-container');
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    try {
        const login = localStorage.getItem('login');
        const response = await fetch(`/api/courier/orders?login=${encodeURIComponent(login)}`);
        const result = await response.json();
        if (result.success) displayMyOrders(result.orders);
        else container.innerHTML = `<div class="error">${result.error}</div>`;
    } catch (err) {
        container.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

function displayMyOrders(orders) {
    const container = document.getElementById('my-orders-container');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">У вас нет активных заказов</div>';
        return;
    }
    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU');
        let statusButtons = '';
        if (order.status_id === 5) { // передан курьеру
            statusButtons = `<button class="status-btn btn-delivering" onclick="updateOrderStatus(${order.id}, 7)">Начать доставку</button>`;
        } else if (order.status_id === 7) { // в пути
    statusButtons = `<button class="status-btn btn-delivered" onclick="requestPaymentSelection(${order.id})">Доставлен</button>`;
        } else if (order.status_id === 6) {
            statusButtons = '<span style="color:#e74c3c;">Отменён</span>';
        } else if (order.status_id === 8) {
            statusButtons = '<span style="color:#27ae60;">Доставлен</span>';
        }
        return `
            <div class="order-card">
                <div class="order-header">
                    <div><span class="order-id">Заказ №${order.id}</span> от ${orderDate}</div>
                    <span class="order-status ${getStatusClass(order.status)}">${order.status}</span>
                </div>
                <div class="order-info">
                    <p><strong>Клиент:</strong> ${order.client_name}</p>
                    <p><strong>Телефон:</strong> ${order.client_phone}</p>
                    <p><strong>Адрес:</strong> ${order.delivery_address}</p>
                    <p><strong>Сумма:</strong> ${formatPrice(order.total_amount)} ₽</p>
                </div>
                <div class="status-controls">${statusButtons}</div>
            </div>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatusId) {
    try {
        const response = await fetch('/api/courier/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, newStatusId, courierLogin: localStorage.getItem('login') })
        });
        const result = await response.json();
        if (result.success) {
            alert('Статус обновлён');
            loadMyOrders();
            loadAvailableOrders();
        } else alert(result.error);
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('принят')) return 'status-new';
    if (s.includes('ожидает') || s.includes('собирается')) return 'status-processing';
    if (s.includes('готов к выдаче')) return 'status-ready';
    if (s.includes('передан')) return 'status-processing';
    if (s.includes('в пути')) return 'status-delivering';
    if (s.includes('доставлен')) return 'status-delivered';
    if (s.includes('отмен')) return 'status-cancelled';
    return '';
}

function formatPrice(price) {
    if (!price) return '0,00';
    return parseFloat(price).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let currentOrderForPayment = null;

// Вызывается вместо прямого updateOrderStatus(order.id, 8)
function requestPaymentSelection(orderId) {
    currentOrderForPayment = orderId;
    document.getElementById('payment_order_id').textContent = orderId;
    document.getElementById('payment-modal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    currentOrderForPayment = null;
}

async function confirmDeliveryWithPayment() {
    const paymentType = document.getElementById('payment_type').value;
    if (!currentOrderForPayment) return;
    
    try {
        const response = await fetch('/api/courier/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: currentOrderForPayment,
                newStatusId: 8,
                courierLogin: localStorage.getItem('login'),
                paymentType: paymentType
            })
        });
        const result = await response.json();
        if (result.success) {
            alert('Доставка завершена, платёж создан');
            closePaymentModal();
            loadMyOrders();
            loadAvailableOrders();
        } else {
            alert(result.error);
        }
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}