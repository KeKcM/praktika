document.addEventListener('DOMContentLoaded', loadProducts);

async function loadProducts() {
    try {
        const response = await fetch('/api/products/guest');

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        document.getElementById('products-container').innerHTML =
            '<div class="error">Ошибка загрузки товаров</div>';
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-container');

    if (!products || products.length === 0) {
        container.innerHTML = '<div class="error">Товары не найдены</div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const cardClasses = ['product-card'];

        if (product.stock_quantity === 0) {
            cardClasses.push('out-of-stock');
        }

        const basePrice = parseFloat(product.base_price);
        const basePriceFormatted = formatPrice(basePrice);

        const priceHtml = `
            <div class="price-section">
                <div><strong>Цена:</strong></div>
                <div class="current-price">${basePriceFormatted} ₽</div>
            </div>
        `;

        const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=300&fit=crop';

        return `
        <div class="${cardClasses.join(' ')}">
            <div class="stock-badge ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock-badge'}">
                ${product.stock_quantity > 0 
                    ? `${product.stock_quantity} ${product.unit || 'шт.'}` 
                    : 'Нет на складе'}
            </div>
            
            <div class="product-image">
                <img src="${imageUrl}" alt="${escapeHtml(product.product_name)}">
            </div>
            
            <h3 class="product-name">${escapeHtml(product.product_name)}</h3>
            
            <div class="product-detail">
                <span class="label">Категория:</span>
                <span class="value">${escapeHtml(product.category || 'Не указана')}</span>
            </div>
            
            <div class="product-detail">
                <span class="label">Описание:</span>
                <span class="value">${escapeHtml(product.description || 'Нет описания')}</span>
            </div>
            
            <div class="product-detail">
                <span class="label">Вес:</span>
                <span class="value">${product.weight_kg} кг</span>
            </div>
            
            <div class="product-detail">
                <span class="label">Объем:</span>
                <span class="value">${product.volume_m3} м³</span>
            </div>
            
            ${product.manufacturer ? `
            <div class="product-detail">
                <span class="label">Производитель:</span>
                <span class="value">${escapeHtml(product.manufacturer)}</span>
            </div>
            ` : ''}
            
            ${product.supplier ? `
            <div class="product-detail">
                <span class="label">Поставщик:</span>
                <span class="value">${escapeHtml(product.supplier)}</span>
            </div>
            ` : ''}
            
            ${priceHtml}
        </div>
    `;
    }).join('');
}

function formatPrice(price) {
    if (!price) return '0,00';
    return parseFloat(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}