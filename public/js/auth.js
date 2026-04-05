document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                errorMessage.textContent = result.error;
                errorMessage.style.display = 'block';
                errorMessage.style.color = 'red';
                errorMessage.style.textAlign = 'center';
                errorMessage.style.marginBottom = '15px';
            }
        } catch (error) {
            errorMessage.textContent = 'Ошибка подключения к серверу';
            errorMessage.style.display = 'block';
            errorMessage.style.color = 'red';
            errorMessage.style.textAlign = 'center';
            errorMessage.style.marginBottom = '15px';
        }
    });
});