document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Курьер';
    const userRoleName = localStorage.getItem('userRoleName') || 'Курьер';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    loadCourierOrders();
});

async function loadCourierOrders() {
    try {
        const courierLogin = localStorage.getItem('login');
        
        const response = await fetch(`/api/courier/orders?login=${encodeURIComponent(courierLogin)}`);
        const result = await response.json();
        
        if (result.success) {
            displayCourierOrders(result.orders);
        } else {
            document.getElementById('orders-container').innerHTML = 
                `<div class="error">${result.error}</div>`;
        }
    } catch (error) {
        document.getElementById('orders-container').innerHTML = 
            `<div class="error">Ошибка загрузки заказов</div>`;
    }
}

function displayCourierOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">Нет назначенных заказов</div>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Не доставлен';
        
        const productsTotal = formatPrice(order.products_total);
        const deliveryPrice = formatPrice(order.delivery_price);
        const totalAmount = formatPrice(order.total_amount);
        
        const statusClass = getStatusClass(order.status);
        const statusId = order.status_id;
        
        let statusButtons = '';
        
        if (statusId === 1) { // принят
            statusButtons = `
                <button class="status-btn btn-processing" onclick="updateOrderStatus(${order.id}, 2)">
                    Взять в обработку
                </button>
                <button class="status-btn btn-cancelled" onclick="updateOrderStatus(${order.id}, 5)">
                    Отменить
                </button>
            `;
        } else if (statusId === 2) { // обработка
            statusButtons = `
                <button class="status-btn btn-delivering" onclick="updateOrderStatus(${order.id}, 3)">
                    Начать доставку
                </button>
                <button class="status-btn btn-cancelled" onclick="updateOrderStatus(${order.id}, 5)">
                    Отменить
                </button>
            `;
        } else if (statusId === 3) { // в пути
            statusButtons = `
                <button class="status-btn btn-delivered" onclick="updateOrderStatus(${order.id}, 4)">
                    Доставлен
                </button>
                <button class="status-btn btn-cancelled" onclick="updateOrderStatus(${order.id}, 5)">
                    Отменить
                </button>
            `;
        } else if (statusId === 4) { // доставлен
            statusButtons = '<p style="color: #27ae60; font-weight: bold;">Заказ доставлен</p>';
        } else if (statusId === 5) { // отменен
            statusButtons = '<p style="color: #e74c3c; font-weight: bold;">Заказ отменен</p>';
        }
        
        return `
            <div class="order-card" id="order-${order.id}">
                <div class="order-header">
                    <div>
                        <span class="order-id">Заказ №${order.id}</span>
                        <span class="order-date"> от ${orderDate}</span>
                    </div>
                    <span class="order-status ${statusClass}">${order.status}</span>
                </div>
                
                <div class="order-details">
                    <div class="order-info">
                        <p><strong>Клиент:</strong> ${order.client_name}</p>
                        <p><strong>Телефон:</strong> ${order.client_phone}</p>
                        <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                        <p><strong>Дата доставки:</strong> ${deliveryDate}</p>
                    </div>
                    
                    <table class="order-items">
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Количество</th>
                                <th>Цена</th>
                                <th>Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items ? order.items.map(item => {
                                const priceAtOrder = formatPrice(item.unit_price_at_order);
                                const totalPrice = formatPrice(item.total_price);
                                
                                return `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.quantity} шт.</td>
                                    <td>${priceAtOrder} ₽</td>
                                    <td>${totalPrice} ₽</td>
                                </tr>
                                `;
                            }).join('') : ''}
                        </tbody>
                    </table>
                    
                    <div class="order-total">
                        <p><strong>Товары:</strong> ${productsTotal} ₽</p>
                        <p><strong>Доставка:</strong> ${deliveryPrice} ₽</p>
                        <p><strong>Итого:</strong> ${totalAmount} ₽</p>
                    </div>
                    
                    <div class="status-controls">
                        ${statusButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatusId) {
    try {
        const courierLogin = localStorage.getItem('login');
        
        const response = await fetch('/api/courier/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: orderId,
                newStatusId: newStatusId,
                courierLogin: courierLogin
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Статус заказа обновлен');
            loadCourierOrders();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка обновления статуса');
    }
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

async function updateOrderStatus(orderId, newStatusId) {
    try {
        const courierLogin = localStorage.getItem('login');
        
        const response = await fetch('/api/courier/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: orderId,
                newStatusId: newStatusId,
                courierLogin: courierLogin
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (newStatusId === 4) {
                alert('Заказ доставлен! Курьер освобожден для новых заказов.');
            } else if (newStatusId === 5) {
                alert('Заказ отменен. Курьер освобожден для новых заказов.');
            } else {
                alert('Статус заказа обновлен');
            }
            loadCourierOrders(); // Перезагружаем список заказов
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка обновления статуса');
    }
}