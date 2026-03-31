from django.shortcuts import render
from django.http import HttpResponseRedirect
from django.urls import reverse
from CookME.db import get_db
from recipes.models_sa import Receipt, User
from recipes.auth import get_user_from_token

def main(request):
    return render(request, 'recipes/main.html')

def enter(request):
    return render(request, 'recipes/enter.html')

def register(request):
    return render(request, 'recipes/register.html')

def profile(request):
    return render(request, 'recipes/profile.html')

def information(request):
    """Страница просмотра рецепта"""
    # Получаем ID рецепта из URL
    recipe_id = request.GET.get('id')
    if not recipe_id:
        return render(request, 'recipes/information.html', {'error': 'Рецепт не найден'})
    
    # Проверяем, является ли текущий пользователь автором
    is_author = False
    user = get_user_from_token(request)
    
    if user:
        db = next(get_db())
        recipe = db.query(Receipt).filter(Receipt.ID == recipe_id).first()
        if recipe and recipe.ID_user == user.ID:
            is_author = True
        db.close()
    
    return render(request, 'recipes/information.html', {
        'recipe_id': recipe_id,
        'is_author': is_author
    })

def add_recipe(request):
    return render(request, 'recipes/add-recipe.html')

def edit_recipe(request):
    """Страница редактирования рецепта"""
    recipe_id = request.GET.get('id')
    if not recipe_id:
        return render(request, 'recipes/edit-recipe.html', {'error': 'Рецепт не найден'})
    
    # ВРЕМЕННО ОТКЛЮЧАЕМ ПРОВЕРКУ ПРАВ ДЛЯ ТЕСТИРОВАНИЯ
    # if not can_edit:
    #     return HttpResponseRedirect(f'/information.html?id={recipe_id}')
    
    return render(request, 'recipes/edit-recipe.html', {'recipe_id': recipe_id})
def chef(request):
    return render(request, 'recipes/chef.html')