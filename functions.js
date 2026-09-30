// Abrir (o crear) la base de datos versión 1
let db;
let allProducts = []; // copia en memoria para búsqueda y estadísticas
const request = indexedDB.open('exampleProductDB', 1);

request.onerror = function(event) {
    console.error("Database error: ", event.target.error);
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadProductTable();
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    db.createObjectStore('products', { keyPath: 'id' });
};

// Evita inyección de HTML al mostrar nombres escritos por el usuario
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Leer productos de IndexedDB
function loadProductTable() {
    const store = db.transaction(['products'], 'readonly').objectStore('products');
    const req = store.getAll();

    req.onsuccess = function(event) {
        allProducts = event.target.result;
        renderTable();
    };
}

// Dibujar tabla (aplica el filtro del buscador) y actualizar estadísticas
function renderTable() {
    const term = document.getElementById('search').value.trim().toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
    const tableBody = document.querySelector('#productsTable tbody');
    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty">No hay productos para mostrar</td></tr>';
    }

    filtered.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${escapeHTML(product.name)}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td><button class="delete-btn" data-id="${product.id}">Eliminar</button></td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteProduct);
    });

    // Estadísticas sobre todos los productos
    const total = allProducts.reduce((sum, p) => sum + p.price, 0);
    document.getElementById('statCount').textContent = allProducts.length;
    document.getElementById('statTotal').textContent = '$' + total.toFixed(2);
}

// Agregar producto
function addProduct() {
    const name = document.getElementById('name').value.trim();
    const price = parseFloat(document.getElementById('price').value);

    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor ingresa un nombre y un precio válidos.");
        return;
    }

    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    store.getAll().onsuccess = function(event) {
        const products = event.target.result;
        const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
        store.add({ id: maxId + 1, name: name, price: price });
    };

    // Recargar solo cuando la escritura terminó
    transaction.oncomplete = function() {
        document.getElementById('name').value = '';
        document.getElementById('price').value = '';
        loadProductTable();
    };
}

// Eliminar producto
function deleteProduct(event) {
    const productId = parseInt(event.target.getAttribute('data-id'));
    const transaction = db.transaction(['products'], 'readwrite');
    transaction.objectStore('products').delete(productId);
    transaction.oncomplete = loadProductTable;
}

document.getElementById('addProduct').addEventListener('click', addProduct);
document.getElementById('search').addEventListener('input', renderTable);
