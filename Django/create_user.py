import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangoproject.djangoproject.settings')
django.setup()

from accounts.sqlalchemy_db import User
from accounts.util import get_user_session
from datetime import datetime

session = get_user_session()
user = User(
    Login='admin',
    Image='',
    is_staff='True',
    is_superuser='True',
    date_joining=datetime.now().isoformat()
)
user.set_password('admin123')
session.add(user)
session.commit()
session.close()