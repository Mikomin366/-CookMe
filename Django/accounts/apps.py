from django.apps import AppConfig
from django.conf import settings

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Импорт должен быть внутри ready, чтобы избежать циклических импортов
        from .sqlalchemy_db import Base
        Base.metadata.create_all(settings.SQLALCHEMY_ENGINE)