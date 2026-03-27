from django.conf import settings

def get_user_session():
    return settings.SQLALCHEMY_SESSION()