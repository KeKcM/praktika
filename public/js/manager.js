let currentTab = 'assign';

document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Менеджер';
    const userRoleName = localStorage.getItem('userRoleName') || 'Менеджер';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    setupTabs();
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
             if (tabId === 'orders') {
                loadAllOrders();
            } else if (tabId === 'products') {
                loadManagerProducts();
            } else if (tabId === 'couriers') {
                loadCouriers();
            }
        });
    });
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
                        <p><strong>Доставка:</strong> ${formatPrice(order.delivery_price)} ₽</p>
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

async function generateReport(type) {
    const dateFrom = document.getElementById('report_date_from')?.value || '';
    const dateTo = document.getElementById('report_date_to')?.value || '';
    const container = document.getElementById('report_result');
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        let url = `/api/manager/report/${type}?`;
        if (dateFrom) url += `date_from=${dateFrom}&`;
        if (dateTo) url += `date_to=${dateTo}&`;
        
        const response = await fetch(url);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Ошибка загрузки');
        
        if (type === 'orders') displayOrdersReport(result.data);
        else if (type === 'couriers') displayCouriersReport(result.data);
        else if (type === 'finance') displayFinanceReport(result.data, result.summary);
    } catch (err) {
        container.innerHTML = `<div class="error">${err.message}</div>`;
    }
}

function displayOrdersReport(orders) {
    const container = document.getElementById('report_result');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-data">Нет заказов за выбранный период</div>';
        return;
    }
    let totalProducts = 0, totalDelivery = 0, totalSum = 0;
    const rows = orders.map(order => {
        totalProducts += parseFloat(order.products_total);
        totalDelivery += parseFloat(order.delivery_price);
        totalSum += parseFloat(order.total_amount);
        return `
            <tr>
                <td>${order.id}</td>
                <td>${new Date(order.order_date).toLocaleDateString('ru-RU')}</td>
                <td>${escapeHtml(order.client_name)}</td>
                <td>${escapeHtml(order.delivery_address)}</td>
                <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
                <td>${formatPrice(order.delivery_price)} ₽</td>
                <td>${formatPrice(order.products_total)} ₽</td>
                <td><strong>${formatPrice(order.total_amount)} ₽</strong></td>
            </tr>
        `;
    }).join('');
    container.innerHTML = `
        <div class="report-summary">
            <p><strong>Итого за период:</strong></p>
            <p>Сумма товаров: ${formatPrice(totalProducts)} ₽</p>
            <p>Стоимость доставки: ${formatPrice(totalDelivery)} ₽</p>
            <p>Общая выручка: ${formatPrice(totalSum)} ₽</p>
        </div>
        <table class="report-table">
            <thead>
                <tr><th>№ заказа</th><th>Дата</th><th>Клиент</th><th>Адрес</th><th>Статус</th><th>Доставка</th><th>Товары</th><th>Итого</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function displayCouriersReport(couriers) {
    const container = document.getElementById('report_result');
    if (!couriers || couriers.length === 0) {
        container.innerHTML = '<div class="no-data">Нет данных по курьерам за выбранный период</div>';
        return;
    }
    const rows = couriers.map(c => `
        <tr>
            <td>${escapeHtml(c.courier_name)}</td>
            <td>${c.total_orders}</td>
            <td>${c.delivered_orders}</td>
            <td>${c.cancelled_orders}</td>
            <td>${formatPrice(c.total_earnings)} ₽</td>
            <td>${c.avg_delivery_hours ? c.avg_delivery_hours + ' ч' : '-'}</td>
        </tr>
    `).join('');
    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr><th>Курьер</th><th>Всего заказов</th><th>Доставлено</th><th>Отменено</th><th>Заработок</th><th>Среднее время доставки</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function displayFinanceReport(data, summary) {
    const container = document.getElementById('report_result');
    let html = `<div class="finance-summary">
        <p><strong>Всего платежей:</strong> ${summary.total_payments || 0}</p>
        <p><strong>Общая сумма:</strong> ${formatPrice(summary.grand_total || 0)} ₽</p>
    </div>`;
    if (data && data.length) {
        html += `<table class="report-table">
            <thead><tr><th>Способ оплаты</th><th>Количество</th><th>Сумма</th></tr></thead>
            <tbody>`;
        data.forEach(row => {
            let typeName = row.payment_type;
            if (typeName === 'наличными') typeName = 'Наличные';
            else if (typeName === 'картой') typeName = 'Банковская карта';
            else if (typeName === 'онлайн') typeName = 'Онлайн';
            html += `<tr><td>${typeName}</td><td>${row.count}</td><td>${formatPrice(row.total_sum)} ₽</td></tr>`;
        });
        html += `</tbody></table>`;
    } else {
        html += `<div class="no-data">Нет платежей за выбранный период</div>`;
    }
    container.innerHTML = html;
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