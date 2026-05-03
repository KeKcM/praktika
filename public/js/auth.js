document.addEventListener('DOMContentLoaded', function() {
    // Переключение вкладок
    const tabBtns = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            forms.forEach(form => form.classList.remove('active'));
            document.getElementById(`${tab}-form`).classList.add('active');
        });
    });

    const errorDiv = document.getElementById('error-message');
    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    }

    // Вход
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        errorDiv.style.display = 'none';
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            const result = await response.json();
            if (result.success) {
                localStorage.setItem('userFullName', result.fullName);
                localStorage.setItem('userRole', result.role);
                localStorage.setItem('userRoleName', result.roleName);
                localStorage.setItem('login', login);
                window.location.href = result.redirect;
            } else {
                showError(result.error);
            }
        } catch (err) {
            showError('Ошибка подключения к серверу');
        }
    });

    // Регистрация
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            login: document.getElementById('reg_login').value,
            password: document.getElementById('reg_password').value,
            last_name: document.getElementById('reg_last_name').value,
            first_name: document.getElementById('reg_first_name').value,
            patronymic: document.getElementById('reg_patronymic').value,
            phone: document.getElementById('reg_phone').value,
            email: document.getElementById('reg_email').value,
            address: document.getElementById('reg_address').value
        };
        if (!userData.login || !userData.password || !userData.last_name || !userData.first_name || !userData.phone) {
            showError('Заполните все обязательные поля');
            return;
        }
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (result.success) {
                alert('Регистрация успешна! Теперь вы можете войти.');
                document.querySelector('.tab-btn[data-tab="login"]').click();
                registerForm.reset();
            } else {
                showError(result.error);
            }
        } catch (err) {
            showError('Ошибка сервера при регистрации');
        }
    });
});