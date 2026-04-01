        const API_BASE_URL = 'http://localhost:8000/api';
                
        // Глобальные переменные
        let ingredients = [];
        let nextIngredientId = 1;
        let steps = [];
        let nextStepId = 1;
        let imageFile = null;
        let currentAvatarUrl = '/static/images/Ellipse 21.png';
        let tempAvatarFile = null;

        // Вспомогательные функции
        function getToken() {
            return localStorage.getItem('authToken');
        }

        function getUserId() {
            return localStorage.getItem('userId');
        }

        function isAuthenticated() {
            return !!getToken();
        }

        function showNotification(message, isError = false) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            if (isError) {
                notification.classList.add('notification-error');
            }
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        async function apiCall(url, options = {}) {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
                throw new Error(error.message || 'Ошибка сервера');
            }
            
            return response.json();
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function updateContainerHeight() {
            const container = document.querySelector('.information-container');
            if (container) {
                container.style.height = 'auto';
            }
        }

        // Защита от отрицательных чисел и ограничение длины 5 символов
        function protectNumberField(field) {
            if (!field) return;
            
            // Ограничение длины ввода до 5 символов
            field.addEventListener('input', function() {
                if (this.value.length > 5) {
                    this.value = this.value.slice(0, 5);
                }
            });
            
            const sanitizeValue = () => {
                let value = parseFloat(field.value);
                if (isNaN(value)) value = 0;
                if (value < 0) value = 0;
                field.value = value;
            };
            
            field.addEventListener('change', sanitizeValue);
            field.addEventListener('blur', sanitizeValue);
            sanitizeValue();
        }

        // Установка ограничений на поля
        function setMaxLengths() {
            const recipeName = document.getElementById('recipeName');
            const category1 = document.getElementById('category1');
            const category2 = document.getElementById('category2');
            
            if (recipeName) recipeName.maxLength = 50;
            if (category1) category1.maxLength = 30;
            if (category2) category2.maxLength = 30;
        }

        // Валидация формы
        function validateFormData() {
            const recipeName = document.getElementById('recipeName').value.trim();
            
            if (recipeName.length === 0) {
                showNotification('Введите название рецепта', true);
                return false;
            }
            
            // Проверка ингредиентов
            let hasValidIngredient = false;
            for (let ing of ingredients) {
                if (ing.name && ing.name.trim()) {
                    hasValidIngredient = true;
                }
            }
            
            if (!hasValidIngredient) {
                showNotification('Добавьте хотя бы один ингредиент', true);
                return false;
            }
            
            // Проверка шагов
            let hasValidStep = false;
            for (let step of steps) {
                if (step.text && step.text.trim()) {
                    hasValidStep = true;
                }
            }
            
            if (!hasValidStep) {
                showNotification('Добавьте хотя бы один шаг приготовления', true);
                return false;
            }
            
            return true;
        }

        // Отображение ингредиентов
        function renderIngredients() {
            const container = document.getElementById('ingredientsList');
            if (!container) return;
            
            if (ingredients.length === 0) {
                container.innerHTML = '';
                updateContainerHeight();
                return;
            }
            
            container.innerHTML = ingredients.map(ing => `
                <div class="ingredient-item" data-ingredient-id="${ing.id}">
                    <input type="text" class="ingredient-name" data-ingredient-id="${ing.id}" value="${escapeHtml(ing.name || '')}" placeholder="Название" maxlength="20">
                    <input type="number" class="ingredient-quantity" data-ingredient-id="${ing.id}" value="${escapeHtml(ing.quantity || 0)}" placeholder="Кол-во" step="0.1" min="0" maxlength="5" oninput="if(this.value.length > 5) this.value = this.value.slice(0,5)">
                    <input type="text" class="ingredient-unit" data-ingredient-id="${ing.id}" value="${escapeHtml(ing.unit || '')}" placeholder="шт/г/кг" maxlength="20">
                    <button class="delete-ingredient-button" data-ingredient-id="${ing.id}">
                        <img src="/static/images/delete.png" alt="Удалить">
                    </button>
                </div>
            `).join('');
            
            document.querySelectorAll('.ingredient-name').forEach(input => {
                const ingredientId = parseInt(input.getAttribute('data-ingredient-id'));
                input.addEventListener('input', (e) => {
                    const ingredient = ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.name = e.target.value;
                });
            });
            
            document.querySelectorAll('.ingredient-quantity').forEach(input => {
                const ingredientId = parseInt(input.getAttribute('data-ingredient-id'));
                protectNumberField(input);
                input.addEventListener('input', (e) => {
                    const ingredient = ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.quantity = e.target.value;
                });
            });
            
            document.querySelectorAll('.ingredient-unit').forEach(input => {
                const ingredientId = parseInt(input.getAttribute('data-ingredient-id'));
                input.addEventListener('input', (e) => {
                    const ingredient = ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.unit = e.target.value;
                });
            });
            
            document.querySelectorAll('.delete-ingredient-button').forEach(btn => {
                const ingredientId = parseInt(btn.getAttribute('data-ingredient-id'));
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ingredients = ingredients.filter(i => i.id !== ingredientId);
                    renderIngredients();
                });
            });
            
            updateContainerHeight();
        }

        function addNewIngredient() {
            const newId = nextIngredientId++;
            ingredients.push({
                id: newId,
                name: '',
                quantity: '0',
                unit: ''
            });
            renderIngredients();
            setTimeout(() => {
                const newInput = document.querySelector(`.ingredient-name[data-ingredient-id="${newId}"]`);
                if (newInput) newInput.focus();
            }, 30);
        }

        // Отображение шагов
        function renderSteps() {
            const container = document.getElementById('stepsContainer');
            if (!container) return;
            
            if (steps.length === 0) {
                container.innerHTML = '';
                updateContainerHeight();
                return;
            }
            
            container.innerHTML = steps.map((step, idx) => `
                <div class="step-item" data-step-id="${step.id}">
                    <div class="step-number">${idx + 1}</div>
                    <div class="step-content">
                        <textarea class="step-textarea" data-step-id="${step.id}" placeholder="Опишите шаг приготовления..." maxlength="150">${escapeHtml(step.text)}</textarea>
                        <div class="step-time-wrapper">
                            <input type="number" class="step-time-input" data-step-id="${step.id}" value="${step.time || 0}" placeholder="Время" min="0" step="1" maxlength="5" oninput="if(this.value.length > 5) this.value = this.value.slice(0,5)">
                            <span class="step-time-label">мин.</span>
                        </div>
                    </div>
                    <button class="delete-step-button" data-step-id="${step.id}">
                        <img src="/static/images/delete.png" alt="Удалить">
                    </button>
                </div>
            `).join('');
            
            document.querySelectorAll('.step-textarea').forEach(textarea => {
                const stepId = parseInt(textarea.getAttribute('data-step-id'));
                textarea.addEventListener('input', (e) => {
                    const step = steps.find(s => s.id === stepId);
                    if (step) step.text = e.target.value;
                });
            });
            
            document.querySelectorAll('.step-time-input').forEach(input => {
                const stepId = parseInt(input.getAttribute('data-step-id'));
                protectNumberField(input);
                input.addEventListener('input', (e) => {
                    const step = steps.find(s => s.id === stepId);
                    if (step) step.time = e.target.value;
                });
            });
            
            document.querySelectorAll('.delete-step-button').forEach(btn => {
                const stepId = parseInt(btn.getAttribute('data-step-id'));
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    steps = steps.filter(s => s.id !== stepId);
                    renderSteps();
                });
            });
            
            updateContainerHeight();
        }

        function addNewStep() {
            const newId = nextStepId++;
            steps.push({
                id: newId,
                text: '',
                time: '0'
            });
            renderSteps();
            setTimeout(() => {
                const newTextarea = document.querySelector(`.step-textarea[data-step-id="${newId}"]`);
                if (newTextarea) newTextarea.focus();
            }, 30);
        }

        // Создание рецепта
        async function createRecipe() {
            if (!isAuthenticated()) {
                showNotification('Пожалуйста, войдите в систему', true);
                setTimeout(() => {
                    window.location.href = 'enter.html';
                }, 1500);
                return;
            }
            
            if (!validateFormData()) {
                return;
            }
            
            const recipeName = document.getElementById('recipeName').value.trim();
            const category1 = document.getElementById('category1').value.trim();
            const category2 = document.getElementById('category2').value.trim();
            
            let cookingTime = parseInt(document.getElementById('cookingTime').value) || 0;
            let calories = parseInt(document.getElementById('calories').value) || 0;
            
            cookingTime = Math.max(0, cookingTime);
            calories = Math.max(0, calories);
            
            const description = document.getElementById('description').value.trim();
            
            const ingredientsData = ingredients
                .filter(ing => ing.name && ing.name.trim() !== '')
                .map(ing => {
                    let quantity = ing.quantity || '';
                    if (quantity !== '') {
                        let numQuantity = parseFloat(quantity);
                        if (!isNaN(numQuantity) && numQuantity < 0) quantity = '0';
                        if (!isNaN(numQuantity) && numQuantity > 0) quantity = numQuantity.toString();
                    }
                    return {
                        name: ing.name.trim(),
                        quantity: quantity,
                        unit: ing.unit || ''
                    };
                });
            
            let stepOrder = 1;
            const stepsData = steps
                .filter(step => step.text && step.text.trim() !== '')
                .map(step => {
                    let time = parseInt(step.time) || 0;
                    time = Math.max(0, time);
                    return {
                        text: step.text.trim(),
                        time: time,
                        order: stepOrder++
                    };
                });
            
            const addBtn = document.getElementById('addRecipeButton');
            addBtn.disabled = true;
            addBtn.innerHTML = '<span class="loading-spinner"></span> Добавление...';
            
            try {
                const recipeData = {
                    name: recipeName,
                    category1: category1,
                    category2: category2,
                    cooking_time: cookingTime,
                    calories: calories,
                    description: description,
                    ingredients: ingredientsData,
                    steps: stepsData
                };
                
                const result = await apiCall('/recipes/', {
                    method: 'POST',
                    body: JSON.stringify(recipeData)
                });
                
                const newRecipeId = result.id;
                
                if (imageFile && newRecipeId) {
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    
                    await fetch(`${API_BASE_URL}/recipes/${newRecipeId}/upload-image/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${getToken()}` },
                        body: formData
                    });
                }
                
                showNotification('Рецепт успешно добавлен!');
                setTimeout(() => {
                    window.location.href = '/profile.html';
                }, 1500);
                
            } catch (error) {
                console.error('Ошибка создания рецепта:', error);
                showNotification(error.message || 'Ошибка при добавлении рецепта', true);
                addBtn.disabled = false;
                addBtn.innerHTML = 'Добавить рецепт';
            }
        }

        // Загрузка аватара
        async function loadUserAvatar() {
            try {
                const userId = getUserId();
                if (!userId) return;
                
                const user = await apiCall(`/users/${userId}/`);
                if (user.avatar) {
                    currentAvatarUrl = user.avatar;
                    document.getElementById('profileAvatar').src = currentAvatarUrl;
                    document.getElementById('modalAvatarPreview').src = currentAvatarUrl;
                }
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        }

        // Модальное окно профиля
        const modal = document.getElementById('editProfileModal');

        function openModal() {
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('modalAvatarPreview').src = currentAvatarUrl;
            tempAvatarFile = null;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            tempAvatarFile = null;
        }

        async function saveProfile() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            const hasPasswordChange = !!newPassword;
            const hasAvatarChange = !!tempAvatarFile;
            
            if (!hasPasswordChange && !hasAvatarChange) {
                closeModal();
                return;
            }
            
            if (hasPasswordChange) {
                if (!currentPassword) {
                    showNotification('Введите текущий пароль', true);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showNotification('Пароли не совпадают', true);
                    return;
                }
                if (newPassword.length < 4) {
                    showNotification('Минимум 4 символа', true);
                    return;
                }
                if (newPassword.length > 75) {
                    showNotification('Пароль не может превышать 75 символов', true);
                    return;
                }
            }
            
            const saveBtn = document.getElementById('saveProfileBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading-spinner"></span> Сохранение...';
            
            try {
                if (hasPasswordChange) {
                    await apiCall(`/users/${getUserId()}/change-password/`, {
                        method: 'POST',
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword
                        })
                    });
                    showNotification('Пароль изменен');
                }
                
                if (hasAvatarChange) {
                    const formData = new FormData();
                    formData.append('avatar', tempAvatarFile);
                    
                    const response = await fetch(`${API_BASE_URL}/users/${getUserId()}/upload-avatar/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${getToken()}` },
                        body: formData
                    });
                    const data = await response.json();
                    currentAvatarUrl = data.avatar;
                    document.getElementById('profileAvatar').src = currentAvatarUrl;
                    document.getElementById('modalAvatarPreview').src = currentAvatarUrl;
                    showNotification('Аватар обновлен');
                }
                
                closeModal();
                
            } catch (error) {
                showNotification(error.message, true);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Сохранить';
            }
        }

        // Инициализация
        function init() {
            console.log('Add recipe page initialized');
            
            setMaxLengths();
            
            if (steps.length === 0) addNewStep();
            if (ingredients.length === 0) addNewIngredient();
            
            document.getElementById('addIngredientButton').addEventListener('click', addNewIngredient);
            document.getElementById('addStepButton').addEventListener('click', addNewStep);
            document.getElementById('addRecipeButton').addEventListener('click', createRecipe);
            
            protectNumberField(document.getElementById('cookingTime'));
            protectNumberField(document.getElementById('calories'));
            
            const imageBox = document.getElementById('imageBox');
            if (imageBox) {
                imageBox.addEventListener('click', () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    
                    fileInput.onchange = (event) => {
                        const file = event.target.files[0];
                        if (!file) return;
                        
                        if (file.size > 5 * 1024 * 1024) {
                            showNotification('Файл больше 5MB', true);
                            return;
                        }
                        
                        imageFile = file;
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            imageBox.innerHTML = '';
                            imageBox.appendChild(img);
                        };
                        reader.readAsDataURL(file);
                    };
                    
                    fileInput.click();
                });
            }
            
            const profileIcon = document.getElementById('profileIcon');
            const dropdownMenu = document.getElementById('dropdownMenu');
            const editProfileInDropdownBtn = document.getElementById('editProfileInDropdownBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (profileIcon) {
                profileIcon.addEventListener('click', (event) => {
                    event.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });
            }
            
            document.addEventListener('click', () => {
                dropdownMenu?.classList.remove('show');
            });
            
            if (dropdownMenu) {
                dropdownMenu.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
            }
            
            if (editProfileInDropdownBtn) {
                editProfileInDropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.remove('show');
                    openModal();
                });
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userId');
                    window.location.href = '/main.html';
                });
            }
            
            document.getElementById('uploadAvatarBtn').onclick = () => document.getElementById('avatarUpload').click();
            document.getElementById('avatarUpload').onchange = (e) => {
                const file = e.target.files[0];
                if (file && file.size <= 5 * 1024 * 1024) {
                    tempAvatarFile = file;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        document.getElementById('modalAvatarPreview').src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                } else if (file) {
                    showNotification('Файл больше 5MB', true);
                }
            };
            
            document.getElementById('closeProfileModalBtn').onclick = closeModal;
            document.getElementById('cancelProfileModalBtn').onclick = closeModal;
            document.getElementById('saveProfileBtn').onclick = saveProfile;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };
            
            loadUserAvatar();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }