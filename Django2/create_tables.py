from sqlalchemy import create_engine
from recipes.models_sa import Base

if __name__ == '__main__':
    engine = create_engine('sqlite:///recipes.db', echo=True)
    Base.metadata.create_all(engine)
    print("Таблицы успешно созданы.")