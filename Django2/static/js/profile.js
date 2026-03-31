        const API_BASE_URL = 'http://localhost:8000/api';
        
        // Глобальные переменные
        let allRecipes = [];           
        let userRecipes = [];          
        let favoriteRecipes = [];      
        let showOnlyFavorites = false;  
        let currentUser = null;
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
            return String(str).replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
        
        // Загрузка данных пользователя
        async function loadUserData() {
            try {
                const userId = getUserId();
                if (!userId) {
                    window.location.href = 'enter.html';
                    return;
                }
                
                const user = await apiCall(`/users/${userId}/`);
                currentUser = user;
                document.getElementById('userName').textContent = user.login || user.username || 'Пользователь';
                
                if (user.avatar) {
                    currentAvatarUrl = user.avatar;
                    document.getElementById('profileAvatar').src = currentAvatarUrl;
                    document.getElementById('modalAvatarPreview').src = currentAvatarUrl;
                }
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
                if (error.message === 'Не авторизован') {
                    window.location.href = 'enter.html';
                }
            }
        }
        
        // Загрузка всех рецептов
        async function loadAllRecipes() {
            try {
                const recipes = await apiCall('/recipes/');
                allRecipes = recipes;
                
                const userId = parseInt(getUserId());
                
                // Фильтруем рецепты пользователя (свои)
                userRecipes = allRecipes.filter(recipe => {
                    return recipe.author_id && parseInt(recipe.author_id) === userId;
                });
                
                // Загружаем избранное
                await loadFavorites();
                
                // Отображаем рецепты
                filterAndDisplayRecipes();
                
            } catch (error) {
                console.error('Ошибка загрузки рецептов:', error);
                document.getElementById('recipesList').innerHTML = '<div class="empty-message">Ошибка загрузки рецептов</div>';
            }
        }
        
        // Загрузка избранных рецептов пользователя
        async function loadFavorites() {
            try {
                const token = getToken();
                if (!token) return;
                
                const response = await fetch(`${API_BASE_URL}/favorites/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const favorites = await response.json();
                    const favoriteIds = favorites.map(f => f.recipe_id);
                    
                    // Отмечаем избранное для всех рецептов
                    allRecipes.forEach(recipe => {
                        recipe.isFavorite = favoriteIds.includes(recipe.id);
                    });
                    
                    // Получаем полные данные избранных рецептов (все рецепты, которые в избранном)
                    favoriteRecipes = allRecipes.filter(recipe => recipe.isFavorite);
                    
                    console.log('Favorite recipes loaded:', favoriteRecipes.length);
                }
            } catch (error) {
                console.error('Ошибка загрузки избранного:', error);
                favoriteRecipes = [];
            }
        }
        
        // Добавление/удаление из избранного
        async function toggleFavorite(recipeId, event) {
            event.stopPropagation();
            
            // Ищем рецепт во всех рецептах
            const recipe = allRecipes.find(r => r.id === recipeId);
            if (!recipe) return;
            
            const newFavoriteStatus = !recipe.isFavorite;
            const btn = event.currentTarget;
            
            // Обновление UI
            recipe.isFavorite = newFavoriteStatus;
            updateFavoriteButton(btn, newFavoriteStatus);
            
            const token = getToken();
            if (!token) {
                showNotification('Войдите в систему, чтобы добавлять в избранное');
                window.location.href = 'enter.html';
                return;
            }
            
            try {
                if (newFavoriteStatus) {
                    const response = await fetch(`${API_BASE_URL}/favorites/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ recipe_id: recipeId })
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Ошибка');
                    }
                    showNotification('Рецепт добавлен в избранное ♥');
                    
                } else {
                    const response = await fetch(`${API_BASE_URL}/favorites/${recipeId}/`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Ошибка');
                    }
                    showNotification('Рецепт удален из избранного ♡');
                }
                
                await loadFavorites();
                
                filterAndDisplayRecipes();
                
            } catch (error) {
                // Откат при ошибке
                recipe.isFavorite = !newFavoriteStatus;
                updateFavoriteButton(btn, !newFavoriteStatus);
                showNotification(error.message, true);
            }
        }
        
        function updateFavoriteButton(btn, isFavorite) {
            const iconSpan = btn.querySelector('.favorite-icon');
            if (iconSpan) {
                iconSpan.textContent = isFavorite ? '💖' : '♡';
            }
            if (isFavorite) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        
        // Фильтрация и отображение рецептов
        function filterAndDisplayRecipes() {
            const sectionTitle = document.getElementById('sectionTitle');
            let recipesToShow = [];
            
            if (showOnlyFavorites) {
                // Показываем избранные рецепты (из всех рецептов)
                recipesToShow = favoriteRecipes;
                sectionTitle.textContent = 'Избранные рецепты';
            } else {
                // Показываем только свои рецепты
                recipesToShow = userRecipes;
                sectionTitle.textContent = 'Ваши рецепты';
            }
            
            displayRecipes(recipesToShow);
        }
        
        // Отображение карточек рецепта
        function displayRecipes(recipes) {
            const container = document.getElementById('recipesList');
            
            if (!recipes || recipes.length === 0) {
                let message = '';
                if (showOnlyFavorites) {
                    message = 'У вас пока нет избранных рецептов<br>Добавляйте рецепты в избранное на главной странице!';
                } else {
                    message = 'У вас пока нет рецептов<br>Создайте свой первый рецепт!';
                }
                container.innerHTML = `<div class="empty-message">${message}</div>`;
                return;
            }
            
            container.innerHTML = `
                <div class="recipes-grid">
                    ${recipes.map(recipe => `
                        <div class="recipe-card" data-id="${recipe.id}" onclick="goToRecipe(${recipe.id})">
                            <div class="decorative-circles">
                                <div class="outer-circle">
                                    <div class="inner-circle"></div>
                                </div>
                            </div>
                            
                            <div class="favorite-btn ${recipe.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${recipe.id}, event)">
                                <span class="favorite-icon">${recipe.isFavorite ? '💖' : '♡'}</span>
                            </div>
                            
                            <div class="recipe-photo">
                                ${recipe.image ? `<img src="${recipe.image}" alt="${escapeHtml(recipe.name)}">` : ''}
                            </div>
                            <div class="recipe-content">
                                <div class="recipe-name">${escapeHtml(recipe.name)}</div>
                                
                                <div class="recipe-categories">
                                    ${(recipe.categories || []).map(cat => `
                                        <span class="category-tag">${escapeHtml(cat)}</span>
                                    `).join('')}
                                </div>
                                
                                <div class="recipe-info-row calories-row">
                                    <span class="info-label">Калории</span>
                                    <span class="info-value">${recipe.calories || 0} ккал</span>
                                </div>
                                
                                <div class="recipe-info-row time-row">
                                    <span class="info-label">Время готовки</span>
                                    <span class="info-value">${recipe.cooking_time || recipe.cookingTime || 0} мин</span>
                                </div>
                                
                                <div class="recipe-info-row author-row">
                                    <span class="info-label">Автор</span>
                                    <span class="info-value">${escapeHtml(recipe.author_name || recipe.author || 'Неизвестный')}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Переключение режима избранного
        function toggleFavoritesMode() {
            const btn = document.getElementById('favoriteButton');
            showOnlyFavorites = !showOnlyFavorites;
            
            if (showOnlyFavorites) {
                btn.classList.add('active');
                btn.textContent = 'Показать все';
                showNotification('Показываются избранные рецепты');
            } else {
                btn.classList.remove('active');
                btn.textContent = 'Избранное';
                showNotification('Показаны ваши рецепты');
            }
            
            filterAndDisplayRecipes();
        }
        
        // Действия с рецептами
        function goToRecipe(recipeId) {
            window.location.href = `information.html?id=${recipeId}`;
        }
        
        // Модальное окно
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
        
        // Загрузка аватара в модальном окне
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
        
        // Выход
        function logout() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            window.location.href = 'main.html';
        }
        
        // Выпадающее меню
        function initDropdown() {
            const profileIcon = document.getElementById('profileIcon');
            const dropdownMenu = document.getElementById('dropdownMenu');
            
            if (profileIcon) {
                profileIcon.addEventListener('click', (event) => {
                    event.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });
            }
            
            document.addEventListener('click', () => {
                if (dropdownMenu) dropdownMenu.classList.remove('show');
            });
            
            if (dropdownMenu) {
                dropdownMenu.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
            }
        }
        
        // Обработчики кнопок
        document.getElementById('addRecipeButton').onclick = () => {
            window.location.href = 'add-recipe.html';
        };
        
        document.getElementById('favoriteButton').onclick = toggleFavoritesMode;
        
        document.getElementById('editProfileBtn').onclick = (e) => {
            e.stopPropagation();
            document.getElementById('dropdownMenu').classList.remove('show');
            openModal();
        };
        
        document.getElementById('logoutBtn').onclick = logout;
        document.getElementById('closeModalBtn').onclick = closeModal;
        document.getElementById('cancelModalBtn').onclick = closeModal;
        document.getElementById('saveProfileBtn').onclick = saveProfile;
        
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        
        // Инициализация
        async function init() {
            // Проверяем авторизацию
            if (!isAuthenticated()) {
                showNotification('Необходимо войти в систему', true);
                setTimeout(() => {
                    window.location.href = 'enter.html';
                }, 1500);
                return;
            }
            
            initDropdown();
            await loadUserData();
            await loadAllRecipes();
        }
        
        init();
        
        // Делаем функции глобальными
        window.goToRecipe = goToRecipe;
        window.toggleFavorite = toggleFavorite;