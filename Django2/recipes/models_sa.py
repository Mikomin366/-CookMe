from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, DECIMAL, LargeBinary
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'user'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    Login = Column(String, nullable=False, unique=True)
    Password = Column(String, nullable=False)
    is_staff = Column(String, nullable=False)
    is_superuser = Column(String, nullable=False)
    date_joining = Column(String, nullable=False)

    avatar_blob = Column(LargeBinary)          # бинарные данные аватарки
    avatar_mime_type = Column(String(100))     # MIME-тип аватарки

    receipts = relationship('Receipt', back_populates='user')
    favorites = relationship('Favorite', back_populates='user')


class Category(Base):
    __tablename__ = 'category'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    receipts = relationship('ReceiptCategory', back_populates='category')


class Receipt(Base):
    __tablename__ = 'receipt'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    time = Column(Integer)
    Calories = Column(Integer)
    description = Column(String)
    ID_user = Column(Integer, ForeignKey('user.ID'), nullable=False)

    # Хранение фото в БД
    photo_blob = Column(LargeBinary)
    photo_mime_type = Column(String(100))

    user = relationship('User', back_populates='receipts')
    categories = relationship('ReceiptCategory', back_populates='receipt')
    ingredients = relationship('RecipeIngredient', back_populates='receipt')
    favorited_by = relationship('Favorite', back_populates='recipe')


class ReceiptCategory(Base):
    __tablename__ = 'receiptcategory'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    Rec_ID = Column(Integer, ForeignKey('receipt.ID'), nullable=False)
    Cat_Id = Column(Integer, ForeignKey('category.ID'), nullable=False)

    receipt = relationship('Receipt', back_populates='categories')
    category = relationship('Category', back_populates='receipts')


class Ingredient(Base):
    __tablename__ = 'ingredients'

    id_in = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    recipes = relationship('RecipeIngredient', back_populates='ingredient')


class RecipeIngredient(Base):
    __tablename__ = 'recipeingredient'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey('receipt.ID'), nullable=False)
    Ingredient_id = Column(Integer, ForeignKey('ingredients.id_in'), nullable=False)
    quantity = Column(DECIMAL(10, 2))
    unit = Column(Integer)

    receipt = relationship('Receipt', back_populates='ingredients')
    ingredient = relationship('Ingredient', back_populates='recipes')


class Favorite(Base):
    __tablename__ = 'favorites'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user.ID'), nullable=False)
    recipe_id = Column(Integer, ForeignKey('receipt.ID'), nullable=False)
    add_time = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='favorites')
    recipe = relationship('Receipt', back_populates='favorited_by')


class Steprecept(Base):
    __tablename__ = 'steprecept'

    ID = Column(Integer, primary_key=True, autoincrement=True)
    recipe_ID = Column(Integer, ForeignKey('receipt.ID'), nullable=False)
    step_number = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    timer = Column(Integer)