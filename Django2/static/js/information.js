        const API_BASE_URL = 'http://localhost:8000/api';
        
        let currentRecipe = null;
        let currentAvatarUrl = '/static/images/Ellipse 21.png';
        let tempAvatarFile = null;
        
        function getToken() {
            return localStorage.getItem('authToken');
        }
        
        function getUserId() {
            const userId = localStorage.getItem('userId');
            return userId ? parseInt(userId) : null;
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
        
        function getRecipeId() {
            const params = new URLSearchParams(window.location.search);
            return params.get('id');
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
        
        function renderIngredients(ingredients) {
            const container = document.getElementById('ingredientsList');
            if (!container) return;
            
            if (!ingredients || ingredients.length === 0) {
                container.innerHTML = '<div class="empty-message">Ингредиенты не указаны</div>';
                return;
            }
            
            container.innerHTML = ingredients.map(ing => {
                let text = ing.name;
                if (ing.quantity && ing.quantity.toString().trim() !== '' && ing.quantity.toString().trim() !== '0') {
                    text += ` — ${ing.quantity}`;
                    const unitStr = ing.unit ? String(ing.unit).trim() : '';
                    if (unitStr) {
                        text += ` ${unitStr}`;
                    }
                } else if (ing.unit) {
                    const unitStr = String(ing.unit).trim();
                    if (unitStr) {
                        text += ` — ${unitStr}`;
                    }
                }
                return `<div class="ingredient-item"><span class="ingredient-text">${escapeHtml(text)}</span></div>`;
            }).join('');
        }
        
        function renderSteps(steps) {
            const container = document.getElementById('stepsContainer');
            if (!container) return;
            
            if (!steps || steps.length === 0) {
                container.innerHTML = '<div class="empty-message">Шаги приготовления не указаны</div>';
                return;
            }
            
            container.innerHTML = steps.map((step, idx) => `
                <div class="step-item">
                    <div class="step-number">${idx + 1}</div>
                    <div class="step-content">
                        <div class="step-text">${escapeHtml(step.text)}</div>
                        ${step.time && step.time > 0 ? `
                            <div class="step-time-wrapper">
                                <span class="step-time-value">${step.time}</span>
                                <span class="step-time-label">мин.</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        function displayRecipe(recipe) {
            console.log('Показываем рецепт:', recipe);
            
            document.getElementById('recipeName').textContent = recipe.name || 'Без названия';
            
            const categories = [];
            if (recipe.category1) categories.push(recipe.category1);
            if (recipe.category2) categories.push(recipe.category2);
            if (recipe.categories && recipe.categories.length) {
                categories.push(...recipe.categories);
            }
            document.getElementById('categories').textContent = categories.length ? categories.join(', ') : 'Не указано';
            document.getElementById('cookingTime').textContent = recipe.cooking_time ? `${recipe.cooking_time} мин.` : 'Не указано';
            document.getElementById('calories').textContent = recipe.calories ? `${recipe.calories} ккал` : 'Не указано';
            document.getElementById('description').textContent = recipe.description || 'Описание отсутствует';
            
            renderIngredients(recipe.ingredients);
            renderSteps(recipe.steps);
            
            if (recipe.image) {
                const imageBox = document.getElementById('imageBox');
                imageBox.innerHTML = '';
                const img = document.createElement('img');
                img.src = recipe.image;
                img.onerror = () => {
                    imageBox.innerHTML = '<div class="placeholder">Ошибка загрузки изображения</div>';
                };
                imageBox.appendChild(img);
            } else {
                const imageBox = document.getElementById('imageBox');
                imageBox.innerHTML = '<div class="placeholder">Изображение отсутствует</div>';
            }
        }
        
        function updateEditButtonVisibility() {
            const editButton = document.getElementById('editButton');
            if (!editButton) return;
            
            const isLoggedIn = isAuthenticated();
            console.log('Кнопка редактирования видна:', isLoggedIn);
            
            if (!isLoggedIn || !currentRecipe) {
                editButton.style.display = 'none';
                return;
            }
            
            const userId = getUserId();
            const authorId = currentRecipe.author_id;
            
            console.log('userId:', userId, 'authorId:', authorId, 'currentRecipe:', currentRecipe);
            
            if (authorId && parseInt(authorId) === parseInt(userId)) {
                const editUrl = `/edit-recipe.html?id=${currentRecipe.id}`;
                editButton.style.display = 'inline-flex';
                console.log('Изменить кнопку, URL:', editUrl);
                
                editButton.href = editUrl;
                
                editButton.onclick = null;
                
                console.log('Кнопка редактирования href set to:', editUrl);
                
            } else {
                editButton.style.display = 'none';
                console.log('Кнопка редактирования спрятана');
            }
        }
        
        async function exportToPDF() {
            if (!currentRecipe) {
                showNotification('Данные рецепта не загружены', true);
                return;
            }
            
            const exportBtn = document.getElementById('exportPdfBtn');
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<span class="loading-spinner"></span> Создание PDF...';
            
            try {
                const token = getToken();
                const url = `${API_BASE_URL}/recipes/${currentRecipe.id}/export-pdf/`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Ошибка при создании PDF');
                }
                
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                
                let filename = `${currentRecipe.name}_рецепт.pdf`;
                const contentDisposition = response.headers.get('Content-Disposition');
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
                
                showNotification('PDF успешно создан!');
                
            } catch (error) {
                console.error('Ошибка создания PDF:', error);
                showNotification(error.message || 'Ошибка при создании PDF', true);
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = 'Выгрузить PDF';
            }
        }
        
        async function loadRecipe() {
            const recipeId = getRecipeId();
            
            if (!recipeId) {
                console.error('Айди рецепта не найдено');
                showNotification('Рецепт не найден', true);
                displayEmptyRecipe();
                return;
            }
            
            showLoading();
            
            try {
                const url = `${API_BASE_URL}/recipes/${recipeId}/`;
                console.log('Fetching рецепта из:', url);
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': getToken() ? `Bearer ${getToken()}` : ''
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Ошибка ${response.status}: Рецепт не найден`);
                }
                
                const recipe = await response.json();
                console.log('Рецепт загружен:', recipe);
                currentRecipe = recipe;
                displayRecipe(recipe);
                
                // Обновляем видимость кнопки
                updateEditButtonVisibility();
                
            } catch (error) {
                console.error('Ошибка загрузи рецепта:', error);
                showNotification(error.message || 'Ошибка загрузки рецепта', true);
                displayEmptyRecipe();
            } finally {
                hideLoading();
            }
        }
        
        function displayEmptyRecipe() {
            document.getElementById('recipeName').textContent = 'Рецепт не найден';
            document.getElementById('categories').textContent = '—';
            document.getElementById('cookingTime').textContent = '—';
            document.getElementById('calories').textContent = '—';
            document.getElementById('description').textContent = 'Рецепт не найден. Проверьте правильность ссылки.';
            document.getElementById('ingredientsList').innerHTML = '<div class="empty-message">Ингредиенты не указаны</div>';
            document.getElementById('stepsContainer').innerHTML = '<div class="empty-message">Шаги приготовления не указаны</div>';
            document.getElementById('imageBox').innerHTML = '<div class="placeholder">Изображение отсутствует</div>';
        }
        
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
                        document.getElementById('modalAvatarPreview').src = currentAvatarUrl;
                    }
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
            
            const logoutBtn = document.getElementById('logoutBtnInfo');
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
        
        // Кнопка шеф-повара
        const chefButton = document.getElementById('chefButton');
        if (chefButton) {
            chefButton.addEventListener('click', () => {
                if (currentRecipe) {
                    localStorage.setItem('chefRecipeData', JSON.stringify(currentRecipe));
                    window.location.href = 'chef.html';
                } else {
                    showNotification('Данные рецепта не загружены', true);
                }
            });
        }
        
        // Кнопка экспорта PDF
        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToPDF);
        }
        
        // Инициализация
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('DOM загружен');
            console.log('Нынешний URL:', window.location.href);
            console.log('Рецепт ID из URL:', getRecipeId());
            
            initDropdown();
            await loadRecipe();
            updateAuthUI();
        });