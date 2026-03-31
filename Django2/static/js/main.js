        const API_BASE_URL = 'http://localhost:8000/api';
        
        // Глобальные переменные
        let allRecipes = [];
        let currentSort = 'default';
        let currentSearch = '';
        let currentUser = null;
        let currentAvatarUrl = '/static/images/Ellipse 21.png';
        let tempAvatarFile = null;
        
        // Функции авторизации
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
        
        // Управление иконкой профиля
        function updateAuthUI() {
            const authButtons = document.getElementById('authButtons');
            const profileIcon = document.getElementById('profileIcon');
            const isLoggedIn = isAuthenticated();
            
            if (isLoggedIn) {
                authButtons.style.display = 'none';
                profileIcon.style.display = 'block';
                loadProfileAvatar();
            } else {
                authButtons.style.display = 'flex';
                profileIcon.style.display = 'none';
            }
        }
        
        async function loadProfileAvatar() {
            try {
                const token = getToken();
                const userId = getUserId();
                if (!token || !userId) return;
                
                const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const user = await response.json();
                    if (user.avatar) {
                        currentAvatarUrl = user.avatar;
                        document.getElementById('profileAvatar').src = currentAvatarUrl;
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        }
        
        function initProfileDropdown() {
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
            
            const logoutBtn = document.getElementById('logoutBtnMain');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userId');
                    window.location.href = 'main.html';
                });
            }
            
            const editProfileBtn = document.getElementById('editProfileBtn');
            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.remove('show');
                    openModal();
                });
            }
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
        
        // Обработчики модального окна
        document.getElementById('closeProfileModalBtn').onclick = closeModal;
        document.getElementById('cancelProfileModalBtn').onclick = closeModal;
        document.getElementById('saveProfileBtn').onclick = saveProfile;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        
        // Api запросы
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
        
        //Загрузка данных пользователя
        async function loadUserData() {
            if (!isAuthenticated()) {
                return;
            }
            
            try {
                const userId = getUserId();
                const user = await apiCall(`/users/${userId}/`);
                currentUser = user;
                
                if (user.avatar) {
                    currentAvatarUrl = user.avatar;
                    document.getElementById('profileAvatar').src = currentAvatarUrl;
                }
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
            }
        }
        
        // Загрузка рецептов
        async function loadRecipes() {
    try {
        const container = document.getElementById('recipesContainer');
        container.innerHTML = '<div class="empty-state">Загрузка рецептов...</div>';
        
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/recipes/`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }
        
        const recipes = await response.json();
        allRecipes = recipes;
        
        // Загружаем избранное
        if (isAuthenticated()) {
            await loadUserFavorites();
        } else {
            
            allRecipes.forEach(recipe => {
                recipe.isFavorite = false;
            });
        }
        
        filterAndSortRecipes();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        const container = document.getElementById('recipesContainer');
        container.innerHTML = '<div class="empty-state">Ошибка загрузки рецептов. Попробуйте позже.</div>';
    }
}

async function loadUserFavorites() {
    try {
        const token = getToken();
        if (!token) {
            console.log('Нету токена, скипаем избранное');
            return;
        }
        
        console.log('Загрузка избранного...');
        const response = await fetch(`${API_BASE_URL}/favorites/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            console.log('Избранные загружены:', favorites);
            const favoriteIds = favorites.map(f => f.recipe_id);
            
            // Обновляем статус избранного для всех рецептов
            allRecipes.forEach(recipe => {
                recipe.isFavorite = favoriteIds.includes(recipe.id);
            });
            
            console.log('Ибранные рецепты обновлены');
        } else if (response.status === 401) {
            console.log('Избранных нету');
        }
    } catch (error) {
        console.error('Ошибка загрузки избранного:', error);
    }
}

async function toggleFavorite(recipeId, event) {
    event.stopPropagation();
    
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    if (!isAuthenticated()) {
        showNotification('Войдите в систему, чтобы добавлять рецепты в избранное');
        setTimeout(() => {
            window.location.href = 'enter.html';
        }, 1500);
        return;
    }
    
    const newFavoriteStatus = !recipe.isFavorite;
    const btn = event.currentTarget;
    
    // Обновление UI
    recipe.isFavorite = newFavoriteStatus;
    updateFavoriteButton(btn, newFavoriteStatus);
    
    const token = getToken();
    
    try {
        if (newFavoriteStatus) {
            // Добавляем в избранное
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
                throw new Error(error.error || error.message || 'Ошибка добавления');
            }
            
            showNotification('Рецепт добавлен в избранное ♥');
            
        } else {
            // Удаляем из избранного
            const response = await fetch(`${API_BASE_URL}/favorites/${recipeId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'Ошибка удаления');
            }
            
            showNotification('Рецепт удален из избранного ♡');
        }
        
        // Если включена сортировка "сначала избранные", обновляем отображение
        if (currentSort === 'favorite_first') {
            filterAndSortRecipes();
        }
        
    } catch (error) {
        console.error('Error toggling favorite:', error);
        // Откат при ошибке
        recipe.isFavorite = !newFavoriteStatus;
        updateFavoriteButton(btn, !newFavoriteStatus);
        showNotification(error.message, true);
    }
}

// Функция обновления кнопки избранного
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

// Функция отображения рецептов
function displayRecipes(recipes) {
    const container = document.getElementById('recipesContainer');
    
    if (!recipes || recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Рецептов пока нет<br>
                Станьте первым, кто добавит рецепт!
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="recipes-grid">
            ${recipes.map(recipe => `
                <div class="recipe-card" data-id="${recipe.id}" onclick="goToRecipePage(${recipe.id})">
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
    
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) {
        mainContainer.style.height = 'auto';
        mainContainer.style.minHeight = '500px';
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
        
        // Функции для работы с карточками
        function goToRecipePage(recipeId) {
            window.location.href = `information.html?id=${recipeId}`;
        }
        
        function goToRandomRecipe() {
            if (allRecipes.length > 0) {
                const randomIndex = Math.floor(Math.random() * allRecipes.length);
                const randomRecipe = allRecipes[randomIndex];
                window.location.href = `information.html?id=${randomRecipe.id}`;
            } else {
                showNotification('Рецепты пока не добавлены');
            }
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
        
        function displayRecipes(recipes) {
            const container = document.getElementById('recipesContainer');
            
            if (!recipes || recipes.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        Рецептов пока нет<br>
                        Станьте первым, кто добавит рецепт!
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="recipes-grid">
                    ${recipes.map(recipe => `
                        <div class="recipe-card" data-id="${recipe.id}" onclick="goToRecipePage(${recipe.id})">
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
            
            const mainContainer = document.getElementById('mainContainer');
            if (mainContainer) {
                mainContainer.style.height = 'auto';
                mainContainer.style.minHeight = '500px';
            }
        }
        
        // Фильтрация и сортировка
        function filterAndSortRecipes() {
            let filtered = [...allRecipes];
            
            if (currentSearch.trim() !== '') {
                const searchLower = currentSearch.toLowerCase();
                filtered = filtered.filter(recipe => 
                    recipe.name.toLowerCase().includes(searchLower) ||
                    (recipe.author_name || recipe.author || '').toLowerCase().includes(searchLower) ||
                    (recipe.categories || []).some(cat => cat.toLowerCase().includes(searchLower))
                );
            }
            
            if (currentSort === 'time_asc') {
                filtered.sort((a, b) => (a.cooking_time || a.cookingTime || 0) - (b.cooking_time || b.cookingTime || 0));
            } else if (currentSort === 'time_desc') {
                filtered.sort((a, b) => (b.cooking_time || b.cookingTime || 0) - (a.cooking_time || a.cookingTime || 0));
            } else if (currentSort === 'name_asc') {
                filtered.sort((a, b) => a.name.localeCompare(b.name));
            } else if (currentSort === 'calories_asc') {
                filtered.sort((a, b) => (a.calories || 0) - (b.calories || 0));
            } else if (currentSort === 'favorite_first') {
                filtered.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
            }
            
            displayRecipes(filtered);
        }
        
        function updateFilters() {
            currentSort = document.getElementById('sortFilter').value;
            currentSearch = document.getElementById('searchInput').value;
            filterAndSortRecipes();
        }
        
        // Инициализация
        document.addEventListener('DOMContentLoaded', async () => {
            initProfileDropdown();
            updateAuthUI();
            await loadUserData();
            await loadRecipes();
            
            const sortSelect = document.getElementById('sortFilter');
            const searchInput = document.getElementById('searchInput');
            const recipeDayBtn = document.getElementById('recipeOfTheDayBtn');
            
            if (sortSelect) {
                sortSelect.addEventListener('change', updateFilters);
            }
            
            if (searchInput) {
                searchInput.addEventListener('input', updateFilters);
            }
            
            if (recipeDayBtn) {
                recipeDayBtn.addEventListener('click', goToRandomRecipe);
            }
            
            const mainContainer = document.getElementById('mainContainer');
            if (mainContainer) {
                mainContainer.style.height = 'auto';
                mainContainer.style.minHeight = '500px';
            }
        });
        
        // Делаем функции глобальными
        window.goToRecipePage = goToRecipePage;
        window.toggleFavorite = toggleFavorite;