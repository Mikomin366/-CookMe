from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, login, password=None, **extra_fields):
        if not login:
            raise ValueError('The Login field must be set')
        user = self.model(login=login, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(login, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ID = models.AutoField(primary_key=True)
    Login = models.CharField(max_length=255, unique=True, verbose_name='Логин')
    Password = models.CharField(max_length=255)   # будет хранить хеш
    Image = models.CharField(max_length=255, blank=True, null=True, verbose_name='Изображение')

    # Необходимые поля для Django
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'Login'          # поле, используемое для входа
    REQUIRED_FIELDS = []              # обязательные поля при создании суперпользователя (без email)

    objects = UserManager()

    def __str__(self):
        return self.Login

    class Meta:
        db_table = 'user'             # явно указываем имя таблицы
class Category(models.Model):
    ID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        db_table = 'category'

    def __str__(self):
        return self.name

class Receipt(models.Model):
    ID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    time = models.IntegerField(null=True, blank=True)
    Calories = models.IntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    ID_user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='ID_user')
    photo = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'receipt'

    def __str__(self):
        return self.name

class ReceiptCategory(models.Model):
    ID = models.AutoField(primary_key=True)
    Rec_ID = models.ForeignKey(Receipt, on_delete=models.CASCADE, db_column='Rec_ID')
    Cat_Id = models.ForeignKey(Category, on_delete=models.CASCADE, db_column='Cat_Id')

    class Meta:
        db_table = 'receiptcategory'

class Ingredient(models.Model):
    id_in = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        db_table = 'ingredients'

class RecipeIngredient(models.Model):
    ID = models.AutoField(primary_key=True)
    recipe_id = models.ForeignKey(Receipt, on_delete=models.CASCADE, db_column='recipe_id')
    Ingredient_id = models.ForeignKey(Ingredient, on_delete=models.CASCADE, db_column='Ingredient_id')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'recipeingredient'

class Favorite(models.Model):
    ID = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    recipe_id = models.ForeignKey(Receipt, on_delete=models.CASCADE, db_column='recipe_id')
    add_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorites'