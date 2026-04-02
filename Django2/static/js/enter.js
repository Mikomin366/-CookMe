        const API_BASE_URL = 'http://localhost:8000/api';
                
        // Получаем элементы
        const loginForm = document.getElementById('loginForm');
        const loginInput = document.getElementById('login');
        const passwordInput = document.getElementById('password');
        const loginButton = document.getElementById('loginButton');
        const errorMessageDiv = document.getElementById('errorMessage');
        const successMessageDiv = document.getElementById('successMessage');
                
        // Функция для скрытия всех сообщений
        function hideAllMessages() {
            errorMessageDiv.style.display = 'none';
            successMessageDiv.style.display = 'none';
            errorMessageDiv.textContent = '';
            successMessageDiv.textContent = '';
        }
                
        // Функция для отображения ошибки
        function showError(message) {
            hideAllMessages();
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            
            setTimeout(() => {
                errorMessageDiv.style.display = 'none';
            }, 5000);
        }
                
        // Функция для отображения успеха
        function showSuccess(message) {
            hideAllMessages();
            successMessageDiv.textContent = message;
            successMessageDiv.style.display = 'block';
        }
                
        // Функция для сохранения сессии
        function saveSession(userData) {
            localStorage.setItem('authToken', userData.token);
            localStorage.setItem('userId', userData.id);
        }
                
        // Функция для проверки авторизации при загрузке страницы
        function checkExistingSession() {
            // Если уже авторизован, перенаправляем на главную
            const token = localStorage.getItem('authToken');
            if (token) {
                window.location.href = '/main.html';
            }
        }
                
        async function loginUser(login, password) {
            try {
                const response = await fetch(`${API_BASE_URL}/login/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        username: login,
                        password: password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Сохраняем токен и ID пользователя
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userId', data.id);
                    
                    console.log('Login successful, session saved');
                    return { success: true, user: data };
                } else {
                    return { success: false, error: data.error };
                }
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }
        }
                
        // Функция для проверки валидности данных
        function validateForm() {
            const login = loginInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!login) {
                showError('Введите логин');
                loginInput.focus();
                return false;
            }
            
            if (login.length > 50) {
                showError('Логин не может превышать 50 символов');
                loginInput.focus();
                return false;
            }
            
            if (!password) {
                showError('Введите пароль');
                passwordInput.focus();
                return false;
            }
            
            if (password.length < 4) {
                showError('Пароль должен содержать не менее 4 символов');
                passwordInput.focus();
                return false;
            }
            
            if (password.length > 30) {
                showError('Пароль не может превышать 30 символов');
                passwordInput.focus();
                return false;
            }
            
            return true;
        }
                
        // Функция для установки состояния загрузки
        function setLoading(isLoading) {
            if (isLoading) {
                loginButton.disabled = true;
                loginButton.classList.add('loading');
                loginButton.textContent = 'Вход...';
            } else {
                loginButton.disabled = false;
                loginButton.classList.remove('loading');
                loginButton.textContent = 'Войти';
            }
        }
                
        // Основная функция обработки формы
        async function handleLoginSubmit(event) {
            event.preventDefault();
            hideAllMessages();
            
            if (!validateForm()) {
                return;
            }
            
            const login = loginInput.value.trim();
            const password = passwordInput.value.trim();
            
            setLoading(true);
            const result = await loginUser(login, password);
            
            if (result.success) {
                showSuccess('Вход выполнен успешно! Перенаправление...');
                
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = '/main.html';
                }, 1000);
            } else {
                showError(result.error || 'Неверный логин или пароль');
                setLoading(false);
            }
        }
                
        // Инициализация обработчиков событий
        document.addEventListener('DOMContentLoaded', () => {
            checkExistingSession();
            
            loginForm.addEventListener('submit', handleLoginSubmit);
            
            // Добавляем обработчик для клавиши Enter
            const inputs = [loginInput, passwordInput];
            inputs.forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleLoginSubmit(event);
                        }
                    });
                }
            });
        });