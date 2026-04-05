let cart = [];
let productsList = [];

document.addEventListener('DOMContentLoaded', function() {
    const userFullName = localStorage.getItem('userFullName') || 'Клиент';
    const userRoleName = localStorage.getItem('userRoleName') || 'Клиент';
    
    document.getElementById('user-fullname').textContent = userFullName;
    document.getElementById('user-role').textContent = userRoleName;
    
    loadCart();
    setupTabs();
    loadClientProducts();
    loadClientOrders();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            if (tabId === 'cart') {
                displayCart();
            }
        });
    });
}

// ==================== ЗАГРУЗКА ТОВАРОВ ====================
async function loadClientProducts() {
    try {
        const response = await fetch('/api/client/products');
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const products = await response.json();
        productsList = products;
        displayClientProducts(products);
    } catch (error) {
        document.getElementById('products-container').innerHTML = 
            `<div class="error">Ошибка загрузки товаров: ${error.message}</div>`;
    }
}

function displayClientProducts(products) {
    const container = document.getElementById('products-container');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="error">Товары не найдены</div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const basePrice = parseFloat(product.base_price);
        const currentPrice = parseFloat(product.current_price);
        const productDiscount = parseFloat(product.discount_percent) || 0;
        
        const inCart = cart.find(item => item.id === product.id);
        const cartQuantity = inCart ? inCart.quantity : 0;
        
        return `
        <div class="product-card ${productDiscount > 15 ? 'high-discount' : ''}">
            ${productDiscount > 0 ? `<div class="discount-badge">-${productDiscount}%</div>` : ''}
            
            <div class="stock-badge ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock-badge'}">
                ${product.stock_quantity > 0 ? `В наличии: ${product.stock_quantity} ${product.unit || 'шт.'}` : 'Нет на складе'}
            </div>
            
            <div class="product-image">
                <img src="${product.image_url || 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=300&fit=crop'}" alt="${escapeHtml(product.product_name)}">
            </div>
            
            <h3 class="product-name">${escapeHtml(product.product_name)}</h3>
            
            <div class="product-detail">
                <span class="label">Категория:</span>
                <span class="value">${escapeHtml(product.category || 'Не указана')}</span>
            </div>
            
            <div class="price-section">
                ${productDiscount > 0 ? `
                    <div>
                        <span class="original-price">${formatPrice(basePrice)} ₽</span>
                        <span class="current-price">${formatPrice(currentPrice)} ₽</span>
                    </div>
                ` : `
                    <div class="current-price">${formatPrice(currentPrice)} ₽</div>
                `}
            </div>
            
            <div class="cart-controls">
                ${product.stock_quantity > 0 ? `
                    <button class="cart-btn" onclick="addToCart(${product.id})">В корзину</button>
                    ${cartQuantity > 0 ? `<span class="cart-quantity">В корзине: ${cartQuantity}</span>` : ''}
                ` : '<button class="cart-btn disabled" disabled>Нет в наличии</button>'}
            </div>
        </div>
    `;
    }).join('');
}

// ==================== УПРАВЛЕНИЕ КОРЗИНОЙ ====================
function loadCart() {
    const savedCart = localStorage.getItem('clientCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    } else {
        cart = [];
    }
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('clientCart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function addToCart(productId) {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + 1 <= product.stock_quantity) {
            existingItem.quantity++;
        } else {
            alert(`Недостаточно товара на складе. Доступно: ${product.stock_quantity} ${product.unit}`);
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.product_name,
            price: parseFloat(product.current_price),
            quantity: 1,
            maxStock: product.stock_quantity,
            unit: product.unit || 'шт.'
        });
    }
    
    saveCart();
    displayClientProducts(productsList);
    alert('Товар добавлен в корзину');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    displayCart();
}

function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (newQuantity <= item.maxStock) {
            item.quantity = newQuantity;
            saveCart();
            displayCart();
        } else {
            alert(`Недостаточно товара на складе. Доступно: ${item.maxStock} ${item.unit}`);
        }
    }
}

function displayCart() {
    const container = document.getElementById('cart-container');
    
    if (!cart || cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        return;
    }
    
    let productsTotal = 0;
    
    const itemsHtml = cart.map(item => {
        const total = item.price * item.quantity;
        productsTotal += total;
        
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${formatPrice(item.price)} ₽ / ${item.unit}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    <span class="cart-item-total">${formatPrice(total)} ₽</span>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">×</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="cart-items">${itemsHtml}</div>
        <div class="cart-footer">
            <div class="cart-total">
                <strong>Итого товаров:</strong> ${formatPrice(productsTotal)} ₽
            </div>
            <button class="checkout-btn" onclick="showCheckoutModal()">Оформить заказ</button>
        </div>
    `;
}

// Отправка заказа
document.getElementById('checkout-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log('Форма отправлена');
    
    const delivery_address = document.getElementById('delivery_address').value;
    console.log('Адрес доставки:', delivery_address);
    
    if (!delivery_address) {
        alert('Введите адрес доставки');
        return;
    }
    
    const userLogin = localStorage.getItem('login');
    console.log('Логин пользователя:', userLogin);
    
    if (!userLogin) {
        alert('Ошибка: не удалось определить пользователя');
        return;
    }
    
    const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity
    }));
    
    console.log('Товары в заказе:', items);
    
    if (items.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    try {
        const response = await fetch('/api/client/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login: userLogin,
                delivery_address: delivery_address,
                items: items
            })
        });
        
        console.log('Ответ сервера статус:', response.status);
        
        const result = await response.json();
        console.log('Результат:', result);
        
        if (result.success) {
            alert(`Заказ №${result.orderId} успешно оформлен! Стоимость доставки будет рассчитана менеджером.`);
            cart = [];
            saveCart();
            closeCheckoutModal();
            loadClientOrders();
            displayCart();
            displayClientProducts(productsList);
            // Переключаемся на вкладку заказов
            document.querySelector('[data-tab="orders"]').click();
        } else {
            alert(result.error || 'Ошибка при оформлении заказа');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при оформлении заказа: ' + error.message);
    }
});

// Показ модального окна оформления заказа
function showCheckoutModal() {
    console.log('showCheckoutModal вызвана');
    console.log('Корзина:', cart);
    
    if (!cart || cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    const productsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('Сумма товаров:', productsTotal);
    
    // Отображаем товары в модальном окне
    const itemsHtml = cart.map(item => {
        const total = item.price * item.quantity;
        return `
            <div class="checkout-item">
                <span>${escapeHtml(item.name)} x ${item.quantity} ${item.unit}</span>
                <span>${formatPrice(total)} ₽</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('cart-items-summary').innerHTML = itemsHtml;
    document.getElementById('cart-products-total').textContent = formatPrice(productsTotal);
    document.getElementById('cart-total-summary').textContent = formatPrice(productsTotal);
    
    // Очищаем поле адреса
    document.getElementById('delivery_address').value = '';
    
    // Показываем модальное окно
    document.getElementById('checkout-modal').style.display = 'block';
    console.log('Модальное окно открыто');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

// Обновление итогов при изменении стоимости доставки
document.getElementById('delivery_price')?.addEventListener('input', function() {
    const productsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryPrice = parseFloat(this.value) || 0;
    const total = productsTotal + deliveryPrice;
    
    document.getElementById('cart-delivery-summary').textContent = formatPrice(deliveryPrice);
    document.getElementById('cart-total-summary').textContent = formatPrice(total);
});


// ==================== ЗАГРУЗКА ЗАКАЗОВ КЛИЕНТА ====================
async function loadClientOrders() {
    try {
        const userLogin = localStorage.getItem('login');
        
        if (!userLogin) {
            document.getElementById('orders-container').innerHTML = 
                `<div class="error">Ошибка: не удалось определить логин пользователя</div>`;
            return;
        }
        
        const response = await fetch(`/api/client/orders?login=${encodeURIComponent(userLogin)}`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayOrders(result.orders);
        } else {
            document.getElementById('orders-container').innerHTML = 
                `<div class="error">${result.error}</div>`;
        }
    } catch (error) {
        document.getElementById('orders-container').innerHTML = 
            `<div class="error">Ошибка загрузки заказов: ${error.message}</div>`;
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="no-orders">У вас пока нет заказов</div>';
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
        const deliveryPrice = formatPrice(order.delivery_price);
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
                    <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    ${order.courier_name ? `<p><strong>Курьер:</strong> ${order.courier_name}</p>` : '<p><strong>Курьер:</strong> ожидает назначения</p>'}
                    
                    <table class="order-items">
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Количество</th>
                                <th>Цена за шт.</th>
                                <th>Сумма</th>
                            </tr>
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
                        <p><strong>Доставка:</strong> ${deliveryPrice} ₽</p>
                        <p><strong>Итого:</strong> ${totalAmount} ₽</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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