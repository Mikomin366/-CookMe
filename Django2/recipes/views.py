import io
import json
import datetime
import logging
import traceback
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password, check_password
from PIL import Image

from CookME.db import get_db
from recipes.models_sa import (
    User, Receipt, Category, Ingredient, RecipeIngredient,
    Favorite, Steprecept, ReceiptCategory
)
from recipes.auth import get_user_from_token, create_access_token
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)


# --------------------- Вспомогательные функции ---------------------
def json_response(data, status=200):
    """Универсальная функция для JSON ответов"""
    if isinstance(data, dict):
        return JsonResponse(data, status=status, json_dumps_params={'ensure_ascii': False})
    else:
        return JsonResponse(data, safe=False, status=status, json_dumps_params={'ensure_ascii': False})


# --------------------- Аутентификация ---------------------
@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        body = request.body.decode('utf-8')
        if not body:
            return json_response({'error': 'Пустой запрос'}, 400)
        
        data = json.loads(body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return json_response({'error': 'Введите логин и пароль'}, 400)
        
        db = next(get_db())
        user = db.query(User).filter(User.Login == username).first()
        db.close()
        
        if not user or not check_password(password, user.Password):
            return json_response({'error': 'Неверный логин или пароль'}, 401)
        
        # Сохраняем в сессию
        request.session['user_id'] = user.ID
        request.session['username'] = user.Login
        
        # Создаём JWT токен
        token = create_access_token(data={'user_id': user.ID})
        
        return json_response({
            'token': token,
            'id': user.ID,
            'login': user.Login,
            'avatar': f'/api/avatar/{user.ID}/' if user.avatar_blob else None
        })
        
    except json.JSONDecodeError as e:
        return json_response({'error': f'Ошибка парсинга JSON: {str(e)}'}, 400)
    except Exception as e:
        logger.error(f"Login error: {e}")
        traceback.print_exc()
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_register(request):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        body = request.body.decode('utf-8')
        data = json.loads(body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return json_response({'error': 'Введите логин и пароль'}, 400)
        
        if len(password) < 4:
            return json_response({'error': 'Пароль должен содержать не менее 4 символов'}, 400)
        
        db = next(get_db())
        existing = db.query(User).filter(User.Login == username).first()
        if existing:
            db.close()
            return json_response({'error': 'Пользователь с таким логином уже существует'}, 400)
        
        hashed_password = make_password(password)
        new_user = User(
            Login=username,
            Password=hashed_password,
            is_staff='False',
            is_superuser='False',
            date_joining=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            avatar_blob=None,
            avatar_mime_type=None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        db.close()
        
        # Сохраняем в сессию
        request.session['user_id'] = new_user.ID
        request.session['username'] = new_user.Login
        
        # Создаём JWT токен
        token = create_access_token(data={'user_id': new_user.ID})
        
        return json_response({
            'token': token,
            'id': new_user.ID,
            'login': new_user.Login,
            'avatar': None
        })
        
    except Exception as e:
        logger.error(f"Register error: {e}")
        traceback.print_exc()
        return json_response({'error': str(e)}, 500)


# --------------------- Пользователи ---------------------
def api_get_user(request, user_id):
    if request.method != 'GET':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user or user.ID != user_id:
        return json_response({'error': 'Не авторизован'}, 401)
    
    db = next(get_db())
    db_user = db.query(User).filter(User.ID == user_id).first()
    if not db_user:
        db.close()
        return json_response({'error': 'Пользователь не найден'}, 404)
    
    avatar_url = f'/api/avatar/{db_user.ID}/' if db_user.avatar_blob else None
    
    result = {
        'id': db_user.ID,
        'login': db_user.Login,
        'username': db_user.Login,
        'avatar': avatar_url
    }
    db.close()
    return json_response(result)


@csrf_exempt
def api_change_password(request, user_id):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user or user.ID != user_id:
        return json_response({'error': 'Не авторизован'}, 401)
    
    try:
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return json_response({'error': 'Введите текущий и новый пароль'}, 400)
        
        db = next(get_db())
        db_user = db.query(User).filter(User.ID == user_id).first()
        if not db_user:
            db.close()
            return json_response({'error': 'Пользователь не найден'}, 404)
        
        if not check_password(current_password, db_user.Password):
            db.close()
            return json_response({'error': 'Неверный текущий пароль'}, 400)
        
        if len(new_password) < 4:
            db.close()
            return json_response({'error': 'Новый пароль должен содержать не менее 4 символов'}, 400)
        
        db_user.Password = make_password(new_password)
        db.commit()
        db.close()
        
        return json_response({'message': 'Пароль изменен'})
        
    except Exception as e:
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_upload_avatar(request, user_id):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user or user.ID != user_id:
        return json_response({'error': 'Не авторизован'}, 401)
    
    try:
        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return json_response({'error': 'Файл не загружен'}, 400)
        
        image_data = avatar_file.read()
        img = Image.open(io.BytesIO(image_data))
        img_format = img.format.lower()
        if img_format not in ['jpeg', 'png', 'gif']:
            return json_response({'error': 'Неподдерживаемый формат изображения (JPEG, PNG, GIF)'}, 400)
        
        db = next(get_db())
        db_user = db.query(User).filter(User.ID == user_id).first()
        if not db_user:
            db.close()
            return json_response({'error': 'Пользователь не найден'}, 404)
        
        db_user.avatar_blob = image_data
        db_user.avatar_mime_type = f'image/{img_format}'
        db.commit()
        db.close()
        
        return json_response({'avatar': f'/api/avatar/{user_id}/'})
        
    except Exception as e:
        return json_response({'error': str(e)}, 500)


def api_avatar(request, user_id):
    db = next(get_db())
    user = db.query(User).filter(User.ID == user_id).first()
    if not user or not user.avatar_blob:
        db.close()
        return HttpResponse(status=404)
    response = HttpResponse(user.avatar_blob, content_type=user.avatar_mime_type)
    db.close()
    return response


# --------------------- Рецепты ---------------------
def api_recipes(request):
    if request.method != 'GET':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    db = next(get_db())
    recipes = db.query(Receipt).order_by(Receipt.ID.desc()).all()
    
    result = []
    for recipe in recipes:
        try:
            # Получаем ингредиенты
            ingredients = db.query(RecipeIngredient)\
                .options(joinedload(RecipeIngredient.ingredient))\
                .filter(RecipeIngredient.recipe_id == recipe.ID)\
                .all()
            
            # Получаем категории
            categories = db.query(Category)\
                .join(ReceiptCategory)\
                .filter(ReceiptCategory.Rec_ID == recipe.ID)\
                .all()
            
            # Получаем шаги
            steps = db.query(Steprecept)\
                .filter(Steprecept.recipe_ID == recipe.ID)\
                .order_by(Steprecept.step_number)\
                .all()
            
            # Получаем автора
            author = db.query(User).filter(User.ID == recipe.ID_user).first()
            author_name = author.Login if author else 'Неизвестный'
            
            # Проверяем избранное
            user = get_user_from_token(request)
            is_favorite = False
            if user:
                fav = db.query(Favorite).filter(
                    Favorite.user_id == user.ID,
                    Favorite.recipe_id == recipe.ID
                ).first()
                is_favorite = fav is not None
            
            result.append({
                'id': recipe.ID,
                'name': recipe.name,
                'cooking_time': recipe.time,
                'cookingTime': recipe.time,
                'calories': recipe.Calories,
                'description': recipe.description,
                'categories': [cat.name for cat in categories],
                'category1': categories[0].name if len(categories) > 0 else '',
                'category2': categories[1].name if len(categories) > 1 else '',
                'ingredients': [
                    {
                        'name': ing.ingredient.name,
                        'quantity': str(ing.quantity) if ing.quantity else '',
                        'unit': ing.unit or ''
                    }
                    for ing in ingredients
                ],
                'steps': [
                    {
                        'text': step.description,
                        'time': step.timer,
                        'order': step.step_number
                    }
                    for step in steps
                ],
                'image': f'/api/recipes/{recipe.ID}/photo/' if recipe.photo_blob else None,
                'author': author_name,
                'author_name': author_name,
                'author_id': recipe.ID_user,
                'isFavorite': is_favorite
            })
        except Exception as e:
            logger.error(f"Error processing recipe {recipe.ID}: {e}")
            continue
    
    db.close()
    return JsonResponse(result, safe=False, json_dumps_params={'ensure_ascii': False})


def api_recipe_detail(request, recipe_id):
    if request.method != 'GET':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        print(f"\n=== GET RECIPE DETAIL {recipe_id} ===")
        
        db = next(get_db())
        recipe = db.query(Receipt).filter(Receipt.ID == recipe_id).first()
        
        if not recipe:
            print(f"Recipe {recipe_id} not found in database")
            db.close()
            return json_response({'error': 'Рецепт не найден'}, 404)
        
        print(f"Found recipe: {recipe.name}, ID: {recipe.ID}, user_id: {recipe.ID_user}")
        
        # Получаем ингредиенты
        ingredients = db.query(RecipeIngredient)\
            .options(joinedload(RecipeIngredient.ingredient))\
            .filter(RecipeIngredient.recipe_id == recipe.ID)\
            .all()
        print(f"Ingredients count: {len(ingredients)}")
        
        # Получаем категории
        categories = db.query(Category)\
            .join(ReceiptCategory)\
            .filter(ReceiptCategory.Rec_ID == recipe.ID)\
            .all()
        print(f"Categories count: {len(categories)}")
        
        # Получаем шаги
        steps = db.query(Steprecept)\
            .filter(Steprecept.recipe_ID == recipe.ID)\
            .order_by(Steprecept.step_number)\
            .all()
        print(f"Steps count: {len(steps)}")
        
        # Получаем автора
        author = db.query(User).filter(User.ID == recipe.ID_user).first()
        author_name = author.Login if author else 'Неизвестный'
        
        # Проверяем избранное
        user = get_user_from_token(request)
        is_favorite = False
        if user:
            fav = db.query(Favorite).filter(
                Favorite.user_id == user.ID,
                Favorite.recipe_id == recipe.ID
            ).first()
            is_favorite = fav is not None
        
        # Формируем результат
        result = {
            'id': recipe.ID,
            'name': recipe.name,
            'cooking_time': recipe.time,
            'cookingTime': recipe.time,
            'calories': recipe.Calories,
            'description': recipe.description,
            'categories': [cat.name for cat in categories],
            'category1': categories[0].name if len(categories) > 0 else '',
            'category2': categories[1].name if len(categories) > 1 else '',
            'ingredients': [],
            'steps': [],
            'image': f'/api/recipes/{recipe.ID}/photo/' if recipe.photo_blob else None,
            'author': author_name,
            'author_name': author_name,
            'author_id': recipe.ID_user,
            'isFavorite': is_favorite
        }
        
        # Добавляем ингредиенты
        for ing in ingredients:
            try:
                result['ingredients'].append({
                    'name': ing.ingredient.name,
                    'quantity': str(ing.quantity) if ing.quantity else '',
                    'unit': ing.unit or ''
                })
            except Exception as e:
                print(f"Error processing ingredient: {e}")
                result['ingredients'].append({
                    'name': 'Ошибка',
                    'quantity': '',
                    'unit': ''
                })
        
        # Добавляем шаги
        for step in steps:
            try:
                result['steps'].append({
                    'text': step.description,
                    'time': step.timer,
                    'order': step.step_number
                })
            except Exception as e:
                print(f"Error processing step: {e}")
                result['steps'].append({
                    'text': 'Ошибка',
                    'time': 0,
                    'order': 0
                })
        
        db.close()
        print(f"Recipe {recipe_id} data prepared successfully")
        
        return json_response(result)
        
    except Exception as e:
        print(f"ERROR in api_recipe_detail: {e}")
        import traceback
        traceback.print_exc()
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_recipe_create(request):
    """Создание нового рецепта (только POST)"""
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        print("\n" + "="*60)
        print("CREATE RECIPE - START")
        print("="*60)
        
        # Получаем пользователя из токена
        user = get_user_from_token(request)
        
        if not user:
            print("❌ No user found from token")
            return json_response({'error': 'Не авторизован. Пожалуйста, войдите в систему.'}, 401)
        
        print(f"User found: ID={user.ID}, Login={user.Login}")
        
        # Читаем данные
        body = request.body.decode('utf-8')
        print(f"Raw body: {body}")
        
        if not body:
            return json_response({'error': 'Пустой запрос'}, 400)
        
        data = json.loads(body)
        print(f"Parsed data: {json.dumps(data, ensure_ascii=False, indent=2)}")
        
        # Проверяем обязательные поля
        if not data.get('name'):
            return json_response({'error': 'Название рецепта обязательно'}, 400)
        
        db = next(get_db())
        
        try:
            # Создаём рецепт
            new_recipe = Receipt(
                name=data.get('name'),
                time=data.get('cooking_time', data.get('cookingTime', 0)),
                Calories=data.get('calories', 0),
                description=data.get('description', ''),
                ID_user=user.ID,
                photo_blob=None,
                photo_mime_type=None
            )
            db.add(new_recipe)
            db.flush()
            recipe_id = new_recipe.ID
            
            print(f"Recipe created with ID: {recipe_id}")
            
            # Обработка категорий
            categories = []
            if 'categories' in data and isinstance(data['categories'], list):
                categories = data['categories']
            else:
                if data.get('category1'):
                    categories.append(data.get('category1'))
                if data.get('category2'):
                    categories.append(data.get('category2'))
            
            for cat_name in categories:
                if cat_name and cat_name.strip():
                    category = db.query(Category).filter(Category.name.ilike(cat_name.strip())).first()
                    if not category:
                        category = Category(name=cat_name.strip())
                        db.add(category)
                        db.flush()
                    rc = ReceiptCategory(Rec_ID=recipe_id, Cat_Id=category.ID)
                    db.add(rc)
            
            # Обработка ингредиентов
            for ing in data.get('ingredients', []):
                ing_name = ing.get('name', '').strip()
                if ing_name:
                    ingredient = db.query(Ingredient).filter(Ingredient.name.ilike(ing_name)).first()
                    if not ingredient:
                        ingredient = Ingredient(name=ing_name)
                        db.add(ingredient)
                        db.flush()
                    
                    quantity = ing.get('quantity', '')
                    if quantity == '' or quantity is None:
                        quantity = None
                    elif isinstance(quantity, str) and quantity.strip() == '':
                        quantity = None
                    else:
                        try:
                            quantity = float(quantity)
                        except (ValueError, TypeError):
                            quantity = None
                    
                    ri = RecipeIngredient(
                        recipe_id=recipe_id,
                        Ingredient_id=ingredient.id_in,
                        quantity=quantity,
                        unit=ing.get('unit', '')
                    )
                    db.add(ri)
            
            # Обработка шагов
            for idx, step in enumerate(data.get('steps', [])):
                step_text = step.get('text', '').strip()
                if step_text:
                    step_obj = Steprecept(
                        recipe_ID=recipe_id,
                        step_number=idx + 1,
                        description=step_text,
                        timer=int(step.get('time', 0)) if step.get('time') else 0
                    )
                    db.add(step_obj)
            
            db.commit()
            
            print(f"✅ Recipe {recipe_id} created successfully!")
            print("="*60 + "\n")
            
            return json_response({
                'id': recipe_id,
                'message': 'Рецепт создан'
            })
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return json_response({'error': f'Ошибка парсинга JSON: {str(e)}'}, 400)
    except Exception as e:
        print(f"❌ Error creating recipe: {e}")
        import traceback
        traceback.print_exc()
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_recipe_update(request, recipe_id):
    if request.method != 'PUT':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        user = get_user_from_token(request)
        if not user:
            return json_response({'error': 'Не авторизован'}, 401)
        
        data = json.loads(request.body)
        
        db = next(get_db())
        
        try:
            recipe = db.query(Receipt).filter(Receipt.ID == recipe_id, Receipt.ID_user == user.ID).first()
            if not recipe:
                db.close()
                return json_response({'error': 'Рецепт не найден или нет прав'}, 404)
            
            # Обновляем основные поля
            recipe.name = data.get('name', recipe.name)
            recipe.time = data.get('cooking_time', data.get('cookingTime', recipe.time))
            recipe.Calories = data.get('calories', recipe.Calories)
            recipe.description = data.get('description', recipe.description)
            db.flush()
            
            # Обновляем категории
            db.query(ReceiptCategory).filter(ReceiptCategory.Rec_ID == recipe.ID).delete()
            categories = []
            if 'categories' in data and isinstance(data['categories'], list):
                categories = data['categories']
            else:
                if data.get('category1'):
                    categories.append(data.get('category1'))
                if data.get('category2'):
                    categories.append(data.get('category2'))
            
            for cat_name in categories:
                if cat_name and cat_name.strip():
                    category = db.query(Category).filter(Category.name.ilike(cat_name.strip())).first()
                    if not category:
                        category = Category(name=cat_name.strip())
                        db.add(category)
                        db.flush()
                    rc = ReceiptCategory(Rec_ID=recipe.ID, Cat_Id=category.ID)
                    db.add(rc)
            
            # Обновляем ингредиенты
            db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.ID).delete()
            for ing in data.get('ingredients', []):
                ing_name = ing.get('name', '').strip()
                if ing_name:
                    ingredient = db.query(Ingredient).filter(Ingredient.name.ilike(ing_name)).first()
                    if not ingredient:
                        ingredient = Ingredient(name=ing_name)
                        db.add(ingredient)
                        db.flush()
                    
                    quantity = ing.get('quantity', '')
                    if quantity == '' or quantity is None:
                        quantity = None
                    elif isinstance(quantity, str) and quantity.strip() == '':
                        quantity = None
                    else:
                        try:
                            quantity = float(quantity)
                        except (ValueError, TypeError):
                            quantity = None
                    
                    ri = RecipeIngredient(
                        recipe_id=recipe.ID,
                        Ingredient_id=ingredient.id_in,
                        quantity=quantity,
                        unit=ing.get('unit', '')
                    )
                    db.add(ri)
            
            # Обновляем шаги
            db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).delete()
            for idx, step in enumerate(data.get('steps', [])):
                step_text = step.get('text', '').strip()
                if step_text:
                    step_obj = Steprecept(
                        recipe_ID=recipe.ID,
                        step_number=idx + 1,
                        description=step_text,
                        timer=int(step.get('time', 0)) if step.get('time') else 0
                    )
                    db.add(step_obj)
            
            db.commit()
            
            return json_response({'message': 'Рецепт обновлен'})
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
    except Exception as e:
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_recipe_delete(request, recipe_id):
    if request.method != 'DELETE':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user:
        return json_response({'error': 'Не авторизован'}, 401)
    
    db = next(get_db())
    
    try:
        recipe = db.query(Receipt).filter(Receipt.ID == recipe_id, Receipt.ID_user == user.ID).first()
        if not recipe:
            return json_response({'error': 'Рецепт не найден или нет прав'}, 404)
        
        db.query(ReceiptCategory).filter(ReceiptCategory.Rec_ID == recipe.ID).delete()
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.ID).delete()
        db.query(Steprecept).filter(Steprecept.recipe_ID == recipe.ID).delete()
        db.query(Favorite).filter(Favorite.recipe_id == recipe.ID).delete()
        db.delete(recipe)
        db.commit()
        
        return json_response({'message': 'Рецепт удален'})
        
    except Exception as e:
        db.rollback()
        return json_response({'error': str(e)}, 500)
    finally:
        db.close()


def api_recipe_photo(request, recipe_id):
    db = next(get_db())
    recipe = db.query(Receipt).filter(Receipt.ID == recipe_id).first()
    if not recipe or not recipe.photo_blob:
        db.close()
        return HttpResponse(status=404)
    response = HttpResponse(recipe.photo_blob, content_type=recipe.photo_mime_type)
    db.close()
    return response


@csrf_exempt
def api_upload_recipe_image(request, recipe_id):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        user = get_user_from_token(request)
        if not user:
            return json_response({'error': 'Не авторизован'}, 401)
        
        image_file = request.FILES.get('image')
        if not image_file:
            return json_response({'error': 'Файл не загружен'}, 400)
        
        image_data = image_file.read()
        img = Image.open(io.BytesIO(image_data))
        img_format = img.format.lower()
        if img_format not in ['jpeg', 'png', 'gif']:
            return json_response({'error': 'Неподдерживаемый формат изображения'}, 400)
        
        db = next(get_db())
        
        try:
            recipe = db.query(Receipt).filter(Receipt.ID == recipe_id, Receipt.ID_user == user.ID).first()
            if not recipe:
                return json_response({'error': 'Рецепт не найден или нет прав'}, 404)
            
            recipe.photo_blob = image_data
            recipe.photo_mime_type = f'image/{img_format}'
            db.commit()
            
            return json_response({'message': 'Фото загружено'})
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
    except Exception as e:
        return json_response({'error': str(e)}, 500)


# --------------------- Избранное ---------------------
def api_favorites(request):
    if request.method != 'GET':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user:
        return JsonResponse([], safe=False)
    
    db = next(get_db())
    favorites = db.query(Favorite).filter(Favorite.user_id == user.ID).all()
    result = [{'recipe_id': fav.recipe_id, 'id': fav.ID} for fav in favorites]
    db.close()
    return JsonResponse(result, safe=False, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
def api_add_favorite(request):
    if request.method != 'POST':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    try:
        user = get_user_from_token(request)
        if not user:
            return json_response({'error': 'Не авторизован'}, 401)
        
        data = json.loads(request.body)
        recipe_id = data.get('recipe_id')
        if not recipe_id:
            return json_response({'error': 'recipe_id обязателен'}, 400)
        
        db = next(get_db())
        
        try:
            existing = db.query(Favorite).filter(
                Favorite.user_id == user.ID,
                Favorite.recipe_id == recipe_id
            ).first()
            
            if not existing:
                new_fav = Favorite(user_id=user.ID, recipe_id=recipe_id)
                db.add(new_fav)
                db.commit()
            
            return json_response({'message': 'Добавлено в избранное'})
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
    except Exception as e:
        return json_response({'error': str(e)}, 500)


@csrf_exempt
def api_remove_favorite(request, recipe_id):
    if request.method != 'DELETE':
        return json_response({'error': 'Метод не разрешен'}, 405)
    
    user = get_user_from_token(request)
    if not user:
        return json_response({'error': 'Не авторизован'}, 401)
    
    db = next(get_db())
    
    try:
        fav = db.query(Favorite).filter(
            Favorite.user_id == user.ID,
            Favorite.recipe_id == recipe_id
        ).first()
        if fav:
            db.delete(fav)
            db.commit()
        
        return json_response({'message': 'Удалено из избранного'})
        
    except Exception as e:
        db.rollback()
        return json_response({'error': str(e)}, 500)
    finally:
        db.close()


# --------------------- Обработчики ---------------------
@csrf_exempt
def api_recipes_handler(request):
    """Обрабатывает GET (список) и POST (создание) запросы"""
    if request.method == 'GET':
        return api_recipes(request)
    elif request.method == 'POST':
        return api_recipe_create(request)
    else:
        return json_response({'error': 'Метод не разрешен'}, 405)


@csrf_exempt
def api_recipe_detail_handler(request, recipe_id):
    """Обрабатывает GET (детали), PUT (обновление), DELETE (удаление) запросы"""
    if request.method == 'GET':
        return api_recipe_detail(request, recipe_id)
    elif request.method == 'PUT':
        return api_recipe_update(request, recipe_id)
    elif request.method == 'DELETE':
        return api_recipe_delete(request, recipe_id)
    else:
        return json_response({'error': 'Метод не разрешен'}, 405)