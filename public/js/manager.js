let currentTab = 'assign';

document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Менеджер';
    const userRoleName = localStorage.getItem('userRoleName') || 'Менеджер';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    setupTabs();
    loadOrdersForAssignment(); // Загружаем заказы для назначения
    loadAllOrders(); // Загружаем все заказы
    loadManagerProducts(); // Загружаем товары
    loadCouriers(); // Загружаем курьеров
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            currentTab = tabId;
            
            // Обновляем активную кнопку
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Обновляем видимый контент
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Загружаем данные для выбранной вкладки
            if (tabId === 'assign') {
                loadOrdersForAssignment();
            } else if (tabId === 'orders') {
                loadAllOrders();
            } else if (tabId === 'products') {
                loadManagerProducts();
            } else if (tabId === 'couriers') {
                loadCouriers();
            }
        });
    });
}

// ==================== НАЗНАЧЕНИЕ КУРЬЕРОВ ====================
async function loadOrdersForAssignment() {
    const container = document.getElementById('assign-container');
    container.innerHTML = '<div class="loading">Загрузка заказов...</div>';
    
    try {
        const response = await fetch('/api/manager/orders-without-courier');
        const result = await response.json();
        
        if (result.success) {
            displayOrdersForAssignment(result.orders);
        } else {
            container.innerHTML = `<div class="error">${result.error}</div>`;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="error">Ошибка загрузки заказов: ${error.message}</div>`;
    }
}

function displayOrdersForAssignment(orders) {
    const container = document.getElementById('assign-container');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">Нет заказов, ожидающих назначения курьера</div>';
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
        
        const productsTotal = formatPrice(order.products_total);
        const totalAmount = formatPrice(order.total_amount);
        const deliveryPrice = formatPrice(order.delivery_price);
        const totalWeight = parseFloat(order.total_weight) || 0;
        const totalVolume = parseFloat(order.total_volume) || 0;
        
        return `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div>
                        <span class="order-id">Заказ №${order.id}</span>
                        <span class="order-date"> от ${orderDate}</span>
                    </div>
                    <span class="order-status status-new">Новый</span>
                </div>
                
                <div class="order-details">
                    <div class="order-info">
                        <p><strong>Клиент:</strong> ${order.client_name}</p>
                        <p><strong>Телефон:</strong> ${order.client_phone || 'Не указан'}</p>
                        <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                        <p><strong>Вес заказа:</strong> ${totalWeight.toFixed(2)} кг</p>
                        <p><strong>Объем заказа:</strong> ${totalVolume.toFixed(3)} м³</p>
                        <p><strong>Стоимость доставки:</strong> ${deliveryPrice} ₽</p>
                    </div>
                    
                    <table class="order-items">
                        <thead>
                            <tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>
                        </thead>
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
                        <p><strong>Итого с доставкой:</strong> ${totalAmount} ₽</p>
                    </div>
                    
                    <div class="card-actions">
                        <button class="assign-btn" onclick="showAssignModal(${order.id})">Назначить курьера</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== ВСЕ ЗАКАЗЫ ====================
async function loadAllOrders() {
    const container = document.getElementById('orders-container');
    container.innerHTML = '<div class="loading">Загрузка заказов...</div>';
    
    try {
        const response = await fetch('/api/manager/all-orders');
        const result = await response.json();
        
        if (result.success) {
            displayAllOrders(result.orders);
        } else {
            container.innerHTML = `<div class="error">${result.error}</div>`;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="error">Ошибка загрузки заказов: ${error.message}</div>`;
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
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const productsTotal = formatPrice(order.products_total);
        const totalAmount = formatPrice(order.total_amount);
        const statusClass = getStatusClass(order.status);
        const courierInfo = order.courier_name 
            ? `<p><strong>Курьер:</strong> ${order.courier_name}</p>`
            : '<p><strong>Курьер:</strong> <span style="color: #e74c3c;">Не назначен</span></p>';
        
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
                        <p><strong>Телефон:</strong> ${order.client_phone || 'Не указан'}</p>
                        <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                        ${courierInfo}
                        <p><strong>Стоимость доставки:</strong> ${formatPrice(order.delivery_price)} ₽</p>
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
                        <p><strong>Итого:</strong> ${totalAmount} ₽</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== ТОВАРЫ ====================
async function loadManagerProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    
    try {
        const response = await fetch('/api/products/client');
        const products = await response.json();
        displayManagerProducts(products);
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="error">Ошибка загрузки товаров: ${error.message}</div>`;
    }
}

function displayManagerProducts(products) {
    const container = document.getElementById('products-container');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-data">Товары не найдены</div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const basePriceFormatted = formatPrice(product.base_price);
        const discountedPriceFormatted = formatPrice(product.discounted_price);
        const productDiscount = product.discount_percent || 0;
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image_url || 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=300&fit=crop'}" alt="${escapeHtml(product.product_name)}">
                </div>
                <h3 class="product-name">${escapeHtml(product.product_name)}</h3>
                
                <div class="product-detail">
                    <span class="label">Категория:</span>
                    <span class="value">${escapeHtml(product.category || 'Не указана')}</span>
                </div>
                
                <div class="product-detail">
                    <span class="label">В наличии:</span>
                    <span class="value">${product.stock_quantity} ${product.unit || 'шт.'}</span>
                </div>
                
                <div class="price-section">
                    ${productDiscount > 0 ? `
                        <div>
                            <span class="original-price">${basePriceFormatted} ₽</span>
                            <span class="current-price">${discountedPriceFormatted} ₽</span>
                            <div style="color: #e74c3c;">Скидка: ${productDiscount}%</div>
                        </div>
                    ` : `
                        <div class="current-price">${basePriceFormatted} ₽</div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== КУРЬЕРЫ ====================
async function loadCouriers() {
    const container = document.getElementById('couriers-container');
    container.innerHTML = '<div class="loading">Загрузка курьеров...</div>';
    
    try {
        const response = await fetch('/api/manager/couriers');
        const couriers = await response.json();
        displayCouriers(couriers);
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="error">Ошибка загрузки курьеров: ${error.message}</div>`;
    }
}

function displayCouriers(couriers) {
    const container = document.getElementById('couriers-container');
    
    if (!couriers || couriers.length === 0) {
        container.innerHTML = '<div class="no-couriers">Курьеры не найдены</div>';
        return;
    }

    container.innerHTML = couriers.map(courier => {
        const fullName = `${courier.last_name} ${courier.first_name} ${courier.patronymic || ''}`.trim();
        const statusClass = courier.employment_status === 'свободен' ? 'status-free' : 'status-busy';
        const statusText = courier.employment_status === 'свободен' ? 'Свободен' : 'Занят';
        
        return `
            <div class="courier-card">
                <h3 class="courier-name">${escapeHtml(fullName)}</h3>
                
                <div class="employment-status ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="courier-detail">
                    <span class="courier-label">Телефон:</span>
                    <span class="courier-value">${courier.phone_number || '-'}</span>
                </div>
                
                <div class="courier-detail">
                    <span class="courier-label">Транспорт:</span>
                    <span class="courier-value">${courier.transport_type || 'Не указан'}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== МОДАЛЬНОЕ ОКНО НАЗНАЧЕНИЯ ====================
let currentOrderToAssign = null;
let currentOrderData = null;

async function showAssignModal(orderId) {
    currentOrderToAssign = orderId;
    
    try {
        // Получаем информацию о заказе
        const orderResponse = await fetch('/api/manager/orders-without-courier');
        const orderResult = await orderResponse.json();
        const order = orderResult.orders.find(o => o.id === orderId);
        currentOrderData = order;
        
        if (order) {
            const orderDate = new Date(order.order_date).toLocaleDateString('ru-RU');
            const productsTotal = formatPrice(order.products_total);
            const totalAmount = formatPrice(order.total_amount);
            const deliveryPrice = formatPrice(order.delivery_price);
            
            const totalWeight = parseFloat(order.total_weight) || 0;
            const totalVolume = parseFloat(order.total_volume) || 0;
            const productsCount = order.items ? order.items.length : 0;
            
            document.getElementById('order-info').innerHTML = `
                <div class="order-info">
                    <p><strong>Заказ №${order.id}</strong> от ${orderDate}</p>
                    <p><strong>Клиент:</strong> ${order.client_name}</p>
                    <p><strong>Телефон:</strong> ${order.client_phone || 'Не указан'}</p>
                    <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    <p><strong>Товары:</strong> ${productsTotal} ₽</p>
                    <p><strong>Текущая стоимость доставки:</strong> <span id="current-delivery-price">${deliveryPrice}</span> ₽</p>
                    <p><strong>Итого:</strong> ${totalAmount} ₽</p>
                </div>
            `;
            
            document.getElementById('total-weight').textContent = totalWeight.toFixed(2);
            document.getElementById('total-volume').textContent = totalVolume.toFixed(3);
            document.getElementById('products-count').textContent = productsCount;
            document.getElementById('delivery-price-input').value = order.delivery_price || 0;
        }
        
        // Получаем список свободных курьеров
        const couriersResponse = await fetch('/api/manager/available-couriers');
        const couriers = await couriersResponse.json();
        
        const select = document.getElementById('courier-select');
        select.innerHTML = '<option value="">-- Выберите курьера --</option>';
        
        if (couriers.length === 0) {
            select.innerHTML = '<option value="">Нет свободных курьеров</option>';
        } else {
            couriers.forEach(courier => {
                const fullName = `${courier.last_name} ${courier.first_name} ${courier.patronymic || ''}`.trim();
                select.innerHTML += `<option value="${courier.id}">${fullName} - ${courier.transport_type || 'транспорт не указан'}</option>`;
            });
        }
        
        document.getElementById('assign-modal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка загрузки данных: ' + error.message);
    }
}

async function calculateDelivery() {
    if (!currentOrderToAssign) return;
    
    try {
        const response = await fetch('/api/manager/calculate-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: currentOrderToAssign })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('delivery-price-input').value = result.delivery_price;
            document.getElementById('current-delivery-price').textContent = formatPrice(result.delivery_price);
            alert(result.message);
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка расчета: ' + error.message);
    }
}

async function saveDeliveryPrice() {
    if (!currentOrderToAssign) return;
    
    const deliveryPrice = parseFloat(document.getElementById('delivery-price-input').value);
    
    if (isNaN(deliveryPrice) || deliveryPrice < 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    try {
        const response = await fetch('/api/manager/update-delivery-price', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: currentOrderToAssign, delivery_price: deliveryPrice })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('current-delivery-price').textContent = formatPrice(deliveryPrice);
            alert('Стоимость доставки сохранена');
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
    }
}

async function confirmAssign() {
    const courierId = document.getElementById('courier-select').value;
    const deliveryPrice = parseFloat(document.getElementById('delivery-price-input').value);
    
    if (!courierId) {
        alert('Выберите курьера');
        return;
    }
    
    if (isNaN(deliveryPrice) || deliveryPrice < 0) {
        alert('Укажите стоимость доставки');
        return;
    }
    
    try {
        // Сначала сохраняем стоимость доставки
        await fetch('/api/manager/update-delivery-price', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: currentOrderToAssign, delivery_price: deliveryPrice })
        });
        
        // Затем назначаем курьера
        const response = await fetch('/api/manager/assign-courier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: currentOrderToAssign,
                courierId: parseInt(courierId)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Курьер успешно назначен на заказ!\nСтоимость доставки: ${formatPrice(deliveryPrice)} ₽`);
            closeAssignModal();
            loadOrdersForAssignment();
            loadAllOrders();
            loadCouriers();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка при назначении курьера: ' + error.message);
    }
}

function closeAssignModal() {
    document.getElementById('assign-modal').style.display = 'none';
    currentOrderToAssign = null;
    currentOrderData = null;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('принят') || statusLower.includes('новый')) return 'status-new';
    if (statusLower.includes('обработ')) return 'status-processing';
    if (statusLower.includes('в пути')) return 'status-delivering';
    if (statusLower.includes('доставлен')) return 'status-delivered';
    if (statusLower.includes('отмен')) return 'status-cancelled';
    return '';
}

function formatPrice(price) {
    if (!price && price !== 0) return '0,00';
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