from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Создаём engine (SQLite)
engine = create_engine('sqlite:///recipes.db', echo=True)
SessionLocal = sessionmaker(bind=engine)

# Функция для получения сессии в представлениях
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()