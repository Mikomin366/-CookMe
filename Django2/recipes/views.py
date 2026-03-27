from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.hashers import make_password, check_password
from django.core.paginator import Paginator
from django.conf import settings
import datetime

from .forms import (
    UserRegistrationForm, LoginForm, RecipeForm, AvatarChangeForm, ChangePasswordForm
)
from .models_sa import (
    User, Receipt, Category, Ingredient, RecipeIngredient,
    Favorite, Steprecept, ReceiptCategory
)
from CookME.db import get_db
from sqlalchemy.orm import joinedload

# --------------------- Главная страница (список рецептов) ---------------------
def index(request):
    """Главная страница со списком рецептов."""
    db = next(get_db())
    recipes = db.query(Receipt).order_by(Receipt.ID.desc()).all()

    # Избранное текущего пользователя
    favorite_ids = []
    show_favorites = False
    user_id = request.session.get('user_id')
    if user_id:
        favs = db.query(Favorite).filter(Favorite.user_id == user_id).all()
        favorite_ids = [fav.recipe_id for fav in favs]
        if request.GET.get('favorites'):
            show_favorites = True
            recipes = [r for r in recipes if r.ID in favorite_ids]

    # Пагинация
    paginator = Paginator(recipes, 9)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    db.close()
    return render(request, 'recipes/index.html', {
        'page_obj': page_obj,
        'show_favorites': show_favorites,
        'favorite_ids': favorite_ids,
    })


# --------------------- Регистрация ---------------------
def register(request):
    """Регистрация пользователя."""
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password1']
            avatar = form.cleaned_data['avatar']

            db = next(get_db())
            existing = db.query(User).filter(User.Login == username).first()
            if existing:
                messages.error(request, 'Пользователь с таким логином уже существует')
                db.close()
                return render(request, 'recipes/register.html', {'form': form})

            hashed_password = make_password(password)
            new_user = User(
                Login=username,
                Password=hashed_password,
                Image=avatar or settings.AVATAR_PRESETS[0],
                is_staff='False',
                is_superuser='False',
                date_joining=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            request.session['user_id'] = new_user.ID
            request.session['username'] = new_user.Login
            messages.success(request, 'Регистрация успешна')
            db.close()
            return redirect('profile')
    else:
        form = UserRegistrationForm()
    return render(request, 'recipes/register.html', {'form': form})


# --------------------- Вход ---------------------
def login_view(request):
    """Вход пользователя."""
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            db = next(get_db())
            user = db.query(User).filter(User.Login == username).first()
            db.close()
            if user and check_password(password, user.Password):
                request.session['user_id'] = user.ID
                request.session['username'] = user.Login
                messages.success(request, 'Вы вошли')
                return redirect('profile')
            else:
                messages.error(request, 'Неверный логин или пароль')
    else:
        form = LoginForm()
    return render(request, 'recipes/login.html', {'form': form})


# --------------------- Выход ---------------------
def logout_view(request):
    """Выход."""
    request.session.flush()
    messages.success(request, 'Вы вышли')
    return redirect('index')


# --------------------- Профиль пользователя ---------------------
def profile(request):
    """Профиль пользователя: список своих рецептов."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')
    db = next(get_db())
    user = db.query(User).filter(User.ID == user_id).first()
    recipes = db.query(Receipt).filter(Receipt.ID_user == user_id).order_by(Receipt.ID.desc()).all()
    db.close()
    return render(request, 'recipes/profile.html', {'user': user, 'recipes': recipes})


# --------------------- Детальная страница рецепта ---------------------
def recipe_detail(request, recipe_id):
    """Просмотр рецепта со всеми деталями."""
    db = next(get_db())
    recipe = db.query(Receipt).filter(Receipt.ID == recipe_id).first()
    if not recipe:
        db.close()
        messages.error(request, 'Рецепт не найден')
        return redirect('index')

    # Загружаем ингредиенты вместе с их ингредиентом (Ingredient) через joinedload
    ingredients = db.query(RecipeIngredient)\
        .options(joinedload(RecipeIngredient.ingredient))\
        .filter(RecipeIngredient.recipe_id == recipe.ID)\
        .all()
    steps = db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).order_by(Steprecept.step_number).all()

    is_favorite = False
    user_id = request.session.get('user_id')
    if user_id:
        fav = db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.recipe_id == recipe.ID).first()
        is_favorite = fav is not None

    db.close()
    return render(request, 'recipes/recipe_detail.html', {
        'recipe': recipe,
        'ingredients': ingredients,
        'steps': steps,
        'is_favorite': is_favorite,
    })


# --------------------- Создание рецепта ---------------------
def recipe_create(request):
    """Создание нового рецепта."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    if request.method == 'POST':
        recipe_form = RecipeForm(request.POST)
        ingredient_count = int(request.POST.get('ingredient-count', 0))
        step_count = int(request.POST.get('step-count', 0))

        if recipe_form.is_valid():
            db = next(get_db())
            new_recipe = Receipt(
                name=recipe_form.cleaned_data['name'],
                time=recipe_form.cleaned_data['time'],
                Calories=recipe_form.cleaned_data['calories'],
                description=recipe_form.cleaned_data['description'],
                ID_user=user_id,
                photo=recipe_form.cleaned_data['photo']
            )
            db.add(new_recipe)
            db.commit()
            db.refresh(new_recipe)

            # Категории (ID через запятую)
            cat_str = recipe_form.cleaned_data.get('categories')
            if cat_str:
                cat_ids = [int(x.strip()) for x in cat_str.split(',') if x.strip().isdigit()]
                for cat_id in cat_ids:
                    rc = ReceiptCategory(Rec_ID=new_recipe.ID, Cat_Id=cat_id)
                    db.add(rc)

            # Ингредиенты
            for i in range(ingredient_count):
                ing_id = request.POST.get(f'ingredient_id_{i}')
                quantity = request.POST.get(f'quantity_{i}')
                unit = request.POST.get(f'unit_{i}')
                if ing_id and ing_id.isdigit():
                    ri = RecipeIngredient(
                        recipe_id=new_recipe.ID,
                        Ingredient_id=int(ing_id),
                        quantity=quantity,
                        unit=unit
                    )
                    db.add(ri)

            # Шаги
            for i in range(step_count):
                step_num = request.POST.get(f'step_number_{i}')
                description = request.POST.get(f'step_description_{i}')
                timer = request.POST.get(f'step_timer_{i}')
                if step_num and step_num.isdigit() and description:
                    step = Steprecept(
                        recipe_ID=new_recipe.ID,
                        step_number=int(step_num),
                        description=description,
                        timer=timer
                    )
                    db.add(step)

            db.commit()
            db.close()
            messages.success(request, 'Рецепт создан')
            return redirect('profile')
    else:
        recipe_form = RecipeForm()

    return render(request, 'recipes/recipe_form.html', {
        'form': recipe_form,
        'title': 'Создание рецепта',
        'ingredients': [],
        'steps': [],
    })


# --------------------- Редактирование рецепта ---------------------
def recipe_edit(request, recipe_id):
    """Редактирование рецепта."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    db = next(get_db())
    recipe = db.query(Receipt).filter(Receipt.ID == recipe_id, Receipt.ID_user == user_id).first()
    if not recipe:
        db.close()
        messages.error(request, 'Рецепт не найден')
        return redirect('profile')

    # Существующие ингредиенты и шаги для предзаполнения
    ingredients = db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.ID).all()
    steps = db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).order_by(Steprecept.step_number).all()

    ingredients_list = [
        {
            'ingredient_id': ing.Ingredient_id,
            'quantity': ing.quantity,
            'unit': ing.unit,
        }
        for ing in ingredients
    ]
    steps_list = [
        {
            'step_number': step.step_number,
            'description': step.description,
            'timer': step.timer,
        }
        for step in steps
    ]

    if request.method == 'POST':
        recipe_form = RecipeForm(request.POST)
        ingredient_count = int(request.POST.get('ingredient-count', 0))
        step_count = int(request.POST.get('step-count', 0))

        if recipe_form.is_valid():
            # Обновляем рецепт
            recipe.name = recipe_form.cleaned_data['name']
            recipe.time = recipe_form.cleaned_data['time']
            recipe.Calories = recipe_form.cleaned_data['calories']
            recipe.description = recipe_form.cleaned_data['description']
            recipe.photo = recipe_form.cleaned_data['photo']
            db.commit()

            # Категории
            db.query(ReceiptCategory).filter(ReceiptCategory.Rec_ID == recipe.ID).delete()
            cat_str = recipe_form.cleaned_data.get('categories')
            if cat_str:
                cat_ids = [int(x.strip()) for x in cat_str.split(',') if x.strip().isdigit()]
                for cat_id in cat_ids:
                    rc = ReceiptCategory(Rec_ID=recipe.ID, Cat_Id=cat_id)
                    db.add(rc)

            # Ингредиенты
            db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.ID).delete()
            for i in range(ingredient_count):
                ing_id = request.POST.get(f'ingredient_id_{i}')
                quantity = request.POST.get(f'quantity_{i}')
                unit = request.POST.get(f'unit_{i}')
                if ing_id and ing_id.isdigit():
                    ri = RecipeIngredient(
                        recipe_id=recipe.ID,
                        Ingredient_id=int(ing_id),
                        quantity=quantity,
                        unit=unit
                    )
                    db.add(ri)

            # Шаги
            db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).delete()
            for i in range(step_count):
                step_num = request.POST.get(f'step_number_{i}')
                description = request.POST.get(f'step_description_{i}')
                timer = request.POST.get(f'step_timer_{i}')
                if step_num and step_num.isdigit() and description:
                    step = Steprecept(
                        recipe_ID=recipe.ID,
                        step_number=int(step_num),
                        description=description,
                        timer=timer
                    )
                    db.add(step)

            db.commit()
            db.close()
            messages.success(request, 'Рецепт обновлён')
            return redirect('profile')
    else:
        # Предзаполняем форму
        cat_ids = [rc.Cat_Id for rc in db.query(ReceiptCategory).filter(ReceiptCategory.Rec_ID == recipe.ID).all()]
        cat_str = ','.join(str(cid) for cid in cat_ids)
        recipe_form = RecipeForm(initial={
            'name': recipe.name,
            'time': recipe.time,
            'calories': recipe.Calories,
            'description': recipe.description,
            'photo': recipe.photo,
            'categories': cat_str,
        })

    db.close()
    return render(request, 'recipes/recipe_form.html', {
        'form': recipe_form,
        'title': 'Редактирование рецепта',
        'ingredients': ingredients_list,
        'steps': steps_list,
    })


# --------------------- Удаление рецепта ---------------------
def recipe_delete(request, recipe_id):
    """Удаление рецепта."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    db = next(get_db())
    recipe = db.query(Receipt).filter(Receipt.ID == recipe_id, Receipt.ID_user == user_id).first()
    if not recipe:
        db.close()
        messages.error(request, 'Рецепт не найден')
        return redirect('profile')

    if request.method == 'POST':
        # Удаляем связанные записи
        db.query(ReceiptCategory).filter(ReceiptCategory.Rec_ID == recipe.ID).delete()
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.ID).delete()
        db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).delete()
        db.query(Favorite).filter(Favorite.recipe_id == recipe.ID).delete()
        db.delete(recipe)
        db.commit()
        db.close()
        messages.success(request, 'Рецепт удалён')
        return redirect('profile')

    db.close()
    return render(request, 'recipes/recipe_confirm_delete.html', {'recipe': recipe})


# --------------------- Избранное ---------------------
def add_to_favorite(request, recipe_id):
    """Добавление/удаление из избранного."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    db = next(get_db())
    recipe = db.query(Receipt).filter(Receipt.ID == recipe_id).first()
    if not recipe:
        db.close()
        messages.error(request, 'Рецепт не найден')
        return redirect('index')

    fav = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.recipe_id == recipe_id
    ).first()
    if fav:
        db.delete(fav)
        messages.success(request, 'Рецепт удалён из избранного')
    else:
        new_fav = Favorite(user_id=user_id, recipe_id=recipe_id)
        db.add(new_fav)
        messages.success(request, 'Рецепт добавлен в избранное')
    db.commit()
    db.close()
    return redirect(request.META.get('HTTP_REFERER', 'index'))


# --------------------- Смена пароля ---------------------
def change_password(request):
    """Смена пароля."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    db = next(get_db())
    user = db.query(User).filter(User.ID == user_id).first()

    if request.method == 'POST':
        form = ChangePasswordForm(request.POST)
        if form.is_valid():
            old = form.cleaned_data['old_password']
            if check_password(old, user.Password):
                new = form.cleaned_data['new_password1']
                user.Password = make_password(new)
                db.commit()
                messages.success(request, 'Пароль изменён')
                db.close()
                return redirect('profile')
            else:
                messages.error(request, 'Неверный старый пароль')
    else:
        form = ChangePasswordForm()

    db.close()
    return render(request, 'recipes/change_password.html', {'form': form})


# --------------------- Смена аватарки ---------------------
def change_avatar(request):
    """Смена аватарки из пресетов."""
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')

    db = next(get_db())
    user = db.query(User).filter(User.ID == user_id).first()

    if request.method == 'POST':
        form = AvatarChangeForm(request.POST)
        if form.is_valid():
            user.Image = form.cleaned_data['avatar']
            db.commit()
            messages.success(request, 'Аватарка обновлена')
            db.close()
            return redirect('profile')
    else:
        form = AvatarChangeForm(initial={'avatar': user.Image})

    db.close()
    return render(request, 'recipes/change_avatar.html', {'form': form})