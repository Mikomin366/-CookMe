        // Глобальные переменные
        window.recipeId = null;
        window.ingredients = [];
        window.nextIngredientId = 1;
        window.steps = [];
        window.nextStepId = 1;
        window.imageFile = null;
        window.currentAvatarUrl = '/static/images/Ellipse 21.png';
        window.tempAvatarFile = null;

        const API_BASE_URL = 'http://localhost:8000/api';

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
            setTimeout(() => notification.remove(), 3000);
        }

        function showLoading() {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-content"><div class="loading-spinner"></div><br>Загрузка рецепта...</div>';
            document.body.appendChild(overlay);
        }

        function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.remove();
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

        function protectNumberField(field) {
            if (!field) return;
            
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

        function getRecipeIdFromUrl() {
            const params = new URLSearchParams(window.location.search);
            return params.get('id');
        }

        function setMaxLengths() {
            const recipeName = document.getElementById('recipeName');
            const category1 = document.getElementById('category1');
            const category2 = document.getElementById('category2');
            
            if (recipeName) recipeName.maxLength = 50;
            if (category1) category1.maxLength = 30;
            if (category2) category2.maxLength = 30;
        }

        function validateFormData() {
            const recipeName = document.getElementById('recipeName').value.trim();
            
            if (recipeName.length === 0) {
                showNotification('Введите название рецепта', true);
                return false;
            }
            
            let hasValidIngredient = false;
            for (let ing of window.ingredients) {
                if (ing.name && ing.name.trim()) {
                    hasValidIngredient = true;
                }
            }
            
            if (!hasValidIngredient) {
                showNotification('Добавьте хотя бы один ингредиент', true);
                return false;
            }
            
            let hasValidStep = false;
            for (let step of window.steps) {
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

        function renderIngredients() {
            const container = document.getElementById('ingredientsList');
            if (!container) return;
            
            if (window.ingredients.length === 0) {
                container.innerHTML = '<div class="empty-message">Ингредиенты не добавлены</div>';
                return;
            }
            
            container.innerHTML = window.ingredients.map(ing => `
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
                    const ingredient = window.ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.name = e.target.value;
                });
            });
            
            document.querySelectorAll('.ingredient-quantity').forEach(input => {
                const ingredientId = parseInt(input.getAttribute('data-ingredient-id'));
                protectNumberField(input);
                input.addEventListener('input', (e) => {
                    const ingredient = window.ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.quantity = e.target.value;
                });
            });
            
            document.querySelectorAll('.ingredient-unit').forEach(input => {
                const ingredientId = parseInt(input.getAttribute('data-ingredient-id'));
                input.addEventListener('input', (e) => {
                    const ingredient = window.ingredients.find(i => i.id === ingredientId);
                    if (ingredient) ingredient.unit = e.target.value;
                });
            });
            
            document.querySelectorAll('.delete-ingredient-button').forEach(btn => {
                const ingredientId = parseInt(btn.getAttribute('data-ingredient-id'));
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.ingredients = window.ingredients.filter(i => i.id !== ingredientId);
                    renderIngredients();
                });
            });
        }

        function addNewIngredient() {
            const newId = window.nextIngredientId++;
            window.ingredients.push({
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

        function renderSteps() {
            const container = document.getElementById('stepsContainer');
            if (!container) return;
            
            if (window.steps.length === 0) {
                container.innerHTML = '<div class="empty-message">Шаги приготовления не добавлены</div>';
                return;
            }
            
            container.innerHTML = window.steps.map((step, idx) => `
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
                    const step = window.steps.find(s => s.id === stepId);
                    if (step) step.text = e.target.value;
                });
            });
            
            document.querySelectorAll('.step-time-input').forEach(input => {
                const stepId = parseInt(input.getAttribute('data-step-id'));
                protectNumberField(input);
                input.addEventListener('input', (e) => {
                    const step = window.steps.find(s => s.id === stepId);
                    if (step) step.time = e.target.value;
                });
            });
            
            document.querySelectorAll('.delete-step-button').forEach(btn => {
                const stepId = parseInt(btn.getAttribute('data-step-id'));
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.steps = window.steps.filter(s => s.id !== stepId);
                    renderSteps();
                });
            });
        }

        function addNewStep() {
            const newId = window.nextStepId++;
            window.steps.push({
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

        async function loadRecipeForEdit() {
            window.recipeId = getRecipeIdFromUrl();
            
            if (!window.recipeId) {
                showNotification('Рецепт не найден', true);
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch(`${API_BASE_URL}/recipes/${window.recipeId}/`, {
                    headers: {
                        'Authorization': getToken() ? `Bearer ${getToken()}` : ''
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Рецепт не найден');
                }
                
                const recipe = await response.json();
                
                document.getElementById('recipeName').value = recipe.name || '';
                document.getElementById('category1').value = recipe.category1 || (recipe.categories && recipe.categories[0]) || '';
                document.getElementById('category2').value = recipe.category2 || (recipe.categories && recipe.categories[1]) || '';
                document.getElementById('cookingTime').value = recipe.cooking_time || recipe.cookingTime || 0;
                document.getElementById('calories').value = recipe.calories || 0;
                document.getElementById('description').value = recipe.description || '';
                
                protectNumberField(document.getElementById('cookingTime'));
                protectNumberField(document.getElementById('calories'));
                
                window.ingredients = [];
                window.nextIngredientId = 1;
                if (recipe.ingredients && recipe.ingredients.length > 0) {
                    recipe.ingredients.forEach(ing => {
                        window.ingredients.push({
                            id: window.nextIngredientId++,
                            name: ing.name || '',
                            quantity: ing.quantity || '0',
                            unit: ing.unit || ''
                        });
                    });
                }
                renderIngredients();
                
                window.steps = [];
                window.nextStepId = 1;
                if (recipe.steps && recipe.steps.length > 0) {
                    recipe.steps.forEach(step => {
                        window.steps.push({
                            id: window.nextStepId++,
                            text: step.text || '',
                            time: step.time || '0'
                        });
                    });
                }
                renderSteps();
                
                if (recipe.image) {
                    const imageBox = document.getElementById('imageBox');
                    imageBox.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = recipe.image;
                    imageBox.appendChild(img);
                }
                
                document.getElementById('pageTitle').textContent = `Редактирование: ${recipe.name}`;
                
            } catch (error) {
                console.error('Error loading recipe:', error);
                showNotification(error.message || 'Ошибка загрузки рецепта', true);
            } finally {
                hideLoading();
            }
        }

        async function saveRecipe() {
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
            
            const ingredientsData = window.ingredients
                .filter(ing => ing.name && ing.name.trim() !== '')
                .map(ing => ({
                    name: ing.name.trim(),
                    quantity: ing.quantity || '0',
                    unit: ing.unit || ''
                }));
            
            let stepOrder = 1;
            const stepsData = window.steps
                .filter(step => step.text && step.text.trim() !== '')
                .map(step => ({
                    text: step.text.trim(),
                    time: parseInt(step.time) || 0,
                    order: stepOrder++
                }));
            
            const saveBtn = document.getElementById('saveRecipeButton');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading-spinner"></span> Сохранение...';
            
            try {
                const updateData = {
                    name: recipeName,
                    category1: category1,
                    category2: category2,
                    cooking_time: cookingTime,
                    calories: calories,
                    description: description,
                    ingredients: ingredientsData,
                    steps: stepsData
                };
                
                const response = await fetch(`${API_BASE_URL}/recipes/${window.recipeId}/`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Ошибка при сохранении');
                }
                
                if (window.imageFile) {
                    const formData = new FormData();
                    formData.append('image', window.imageFile);
                    await fetch(`${API_BASE_URL}/recipes/${window.recipeId}/upload-image/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${getToken()}` },
                        body: formData
                    });
                }
                
                showNotification('Рецепт сохранён!');
                setTimeout(() => {
                    window.location.href = `/information.html?id=${window.recipeId}`;
                }, 1500);
                
            } catch (error) {
                showNotification(error.message || 'Ошибка при сохранении', true);
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Сохранить';
            }
        }

        async function deleteRecipe() {
            if (!confirm('Вы уверены, что хотите удалить этот рецепт?')) return;
            
            const deleteBtn = document.getElementById('deleteRecipeButton');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="loading-spinner"></span> Удаление...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/recipes/${window.recipeId}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Ошибка при удалении');
                }
                
                showNotification('Рецепт удалён');
                setTimeout(() => {
                    window.location.href = '/profile.html';
                }, 1500);
                
            } catch (error) {
                showNotification(error.message || 'Ошибка при удалении', true);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = 'Удалить';
            }
        }

        async function loadUserAvatar() {
            try {
                const userId = getUserId();
                if (!userId) return;
                
                const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (response.ok) {
                    const user = await response.json();
                    if (user.avatar) {
                        window.currentAvatarUrl = user.avatar;
                        document.getElementById('profileAvatar').src = window.currentAvatarUrl;
                        document.getElementById('modalAvatarPreview').src = window.currentAvatarUrl;
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        }

        const modal = document.getElementById('editProfileModal');

        function openModal() {
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('modalAvatarPreview').src = window.currentAvatarUrl;
            window.tempAvatarFile = null;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            window.tempAvatarFile = null;
        }

        async function saveProfile() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            const hasPasswordChange = !!newPassword;
            const hasAvatarChange = !!window.tempAvatarFile;
            
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
                if (newPassword.length > 30) {
                    showNotification('Пароль не может превышать 30 символов', true);
                    return;
                }
            }
            
            const saveBtn = document.getElementById('saveProfileBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading-spinner"></span> Сохранение...';
            
            try {
                if (hasPasswordChange) {
                    const response = await fetch(`${API_BASE_URL}/users/${getUserId()}/change-password/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${getToken()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword
                        })
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Ошибка');
                    }
                    showNotification('Пароль изменен');
                }
                
                if (hasAvatarChange) {
                    const formData = new FormData();
                    formData.append('avatar', window.tempAvatarFile);
                    
                    const response = await fetch(`${API_BASE_URL}/users/${getUserId()}/upload-avatar/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${getToken()}` },
                        body: formData
                    });
                    const data = await response.json();
                    window.currentAvatarUrl = data.avatar;
                    document.getElementById('profileAvatar').src = window.currentAvatarUrl;
                    document.getElementById('modalAvatarPreview').src = window.currentAvatarUrl;
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

        function init() {
            console.log('Edit page initialized');
            
            setMaxLengths();
            
            loadUserAvatar();
            loadRecipeForEdit();
            
            document.getElementById('addIngredientButton')?.addEventListener('click', addNewIngredient);
            document.getElementById('addStepButton')?.addEventListener('click', addNewStep);
            document.getElementById('saveRecipeButton')?.addEventListener('click', saveRecipe);
            document.getElementById('deleteRecipeButton')?.addEventListener('click', deleteRecipe);
            
            document.getElementById('imageBox')?.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file && file.size <= 5 * 1024 * 1024) {
                        window.imageFile = file;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const img = document.createElement('img');
                            img.src = ev.target.result;
                            const imageBox = document.getElementById('imageBox');
                            imageBox.innerHTML = '';
                            imageBox.appendChild(img);
                        };
                        reader.readAsDataURL(file);
                    } else if (file) {
                        showNotification('Файл больше 5MB', true);
                    }
                };
                input.click();
            });
            
            document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => document.getElementById('avatarUpload').click());
            document.getElementById('avatarUpload')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.size <= 5 * 1024 * 1024) {
                    window.tempAvatarFile = file;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        document.getElementById('modalAvatarPreview').src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                } else if (file) {
                    showNotification('Файл больше 5MB', true);
                }
            });
            
            document.getElementById('closeProfileModalBtn')?.addEventListener('click', closeModal);
            document.getElementById('cancelProfileModalBtn')?.addEventListener('click', closeModal);
            document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
            modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
            
            const profileIcon = document.getElementById('profileIcon');
            const dropdownMenu = document.getElementById('dropdownMenu');
            
            profileIcon?.addEventListener('click', (event) => {
                event.stopPropagation();
                dropdownMenu?.classList.toggle('show');
            });
            
            document.addEventListener('click', () => {
                dropdownMenu?.classList.remove('show');
            });
            
            document.getElementById('editProfileBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu?.classList.remove('show');
                openModal();
            });
            
            document.getElementById('logoutBtn')?.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userId');
                window.location.href = '/main.html';
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }