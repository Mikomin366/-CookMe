from django.urls import path
from django.http import JsonResponse
from . import html_views
# Исправляем импорт - убираем .api если папки api нет
from . import views as api_views

def api_root(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'Cooking Book API v1.0',
        'endpoints': {
            'auth': {
                'login': '/api/login/',
                'register': '/api/register/',
            },
            'users': '/api/users/<int:user_id>/',
            'recipes': '/api/recipes/',
            'favorites': '/api/favorites/',
        }
    })

urlpatterns = [
    # HTML страницы
    path('', html_views.main, name='main'),
    path('main.html', html_views.main, name='main_html'),
    path('enter.html', html_views.enter, name='enter'),
    path('register.html', html_views.register, name='register'),
    path('profile.html', html_views.profile, name='profile'),
    path('information.html', html_views.information, name='information'),
    path('add-recipe.html', html_views.add_recipe, name='add_recipe'),
    path('edit-recipe.html', html_views.edit_recipe, name='edit_recipe'),
    path('chef.html', html_views.chef, name='chef'),
    
    # API
    path('api/', api_root, name='api_root'),
    path('api/login/', api_views.api_login, name='api_login'),
    path('api/register/', api_views.api_register, name='api_register'),
    path('api/users/<int:user_id>/', api_views.api_get_user, name='api_get_user'),
    path('api/users/<int:user_id>/change-password/', api_views.api_change_password, name='api_change_password'),
    path('api/users/<int:user_id>/upload-avatar/', api_views.api_upload_avatar, name='api_upload_avatar'),
    path('api/avatar/<int:user_id>/', api_views.api_avatar, name='api_avatar'),
    
    # Рецепты - единые обработчики
    path('api/recipes/', api_views.api_recipes_handler, name='api_recipes'),
    path('api/recipes/<int:recipe_id>/', api_views.api_recipe_detail_handler, name='api_recipe_detail'),
    path('api/recipes/<int:recipe_id>/upload-image/', api_views.api_upload_recipe_image, name='api_upload_recipe_image'),
    path('api/recipes/<int:recipe_id>/photo/', api_views.api_recipe_photo, name='api_recipe_photo'),
    
    # Избранное
    path('api/favorites/', api_views.api_favorites, name='api_favorites'),
    path('api/favorites/', api_views.api_add_favorite, name='api_add_favorite'),
    path('api/favorites/<int:recipe_id>/', api_views.api_remove_favorite, name='api_remove_favorite'),
]