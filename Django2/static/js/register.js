        const API_BASE_URL = 'http://localhost:8000/api';
        
        // Получаем элементы формы
        const registerForm = document.getElementById('registerForm');
        const loginInput = document.getElementById('login');
        const passwordInput = document.getElementById('password');
        const registerButton = document.getElementById('registerButton');
        const errorMessageDiv = document.getElementById('errorMessage');
        const successMessageDiv = document.getElementById('successMessage');
        
        // Скрыть все сообщения
        function hideMessages() {
            errorMessageDiv.style.display = 'none';
            successMessageDiv.style.display = 'none';
            errorMessageDiv.textContent = '';
            successMessageDiv.textContent = '';
        }
        
        // Показать ошибку
        function showError(message) {
            hideMessages();
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
        }
        
        // Показать успех
        function showSuccess(message) {
            hideMessages();
            successMessageDiv.textContent = message;
            successMessageDiv.style.display = 'block';
        }
        
        // Проверка валидности данных
        function validateForm() {
            const login = loginInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!login) {
                showError('Введите логин');
                loginInput.focus();
                return false;
            }
            
            if (login.length < 3) {
                showError('Логин должен содержать не менее 3 символов');
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
            
            return true;
        }
        
        // Установка состояния загрузки
        function setLoading(isLoading) {
            if (isLoading) {
                registerButton.disabled = true;
                registerButton.textContent = 'Регистрация...';
            } else {
                registerButton.disabled = false;
                registerButton.textContent = 'Зарегистрироваться';
            }
        }
        
        // Сохранение сессии после регистрации
        function saveSession(userData) {
            localStorage.setItem('authToken', userData.token);
            localStorage.setItem('userId', userData.id);
        }
        
        // Отправка данных на бэкенд
        async function registerUser(login, password) {
            try {
                const response = await fetch(`${API_BASE_URL}/register/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        username: login,
                        password: password
                    })
                });
                
                if (!response.ok) {
                    let errorMessage = 'Ошибка регистрации';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || `Ошибка ${response.status}`;
                    } catch (e) {
                        errorMessage = `Ошибка сервера: ${response.status}`;
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                return { success: true, data: data };
                
            } catch (error) {
                console.error('Ошибка:', error);
                return { success: false, error: error.message };
            }
        }
        
        // Обработка отправки формы
        async function handleRegisterSubmit(event) {
            event.preventDefault();
            hideMessages();
            
            if (!validateForm()) {
                return;
            }
            
            const login = loginInput.value.trim();
            const password = passwordInput.value.trim();
            
            setLoading(true);
            const result = await registerUser(login, password);
            
            if (result.success) {
                showSuccess('Регистрация прошла успешно! Перенаправление...');
                saveSession(result.data);
                
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1500);
            } else {
                showError(result.error || 'Ошибка при регистрации. Возможно, такой логин уже существует.');
                setLoading(false);
            }
        }
        
        // Инициализация
        document.addEventListener('DOMContentLoaded', () => {
            registerForm.addEventListener('submit', handleRegisterSubmit);
            
            
            [loginInput, passwordInput].forEach(input => {
                input.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        handleRegisterSubmit(event);
                    }
                });
            });
        });