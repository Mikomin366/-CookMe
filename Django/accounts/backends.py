from django.contrib.auth.backends import BaseBackend
from django.conf import settings
from .sqlalchemy_db import User
from .util import get_user_session
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views import View
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import SESSION_KEY, BACKEND_SESSION_KEY

class CustomLoginView(View):
    template_name = 'accounts/login.html'
    form_class = AuthenticationForm

    def get(self, request):
        form = self.form_class()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = self.form_class(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()  # user - это наш UserProxy
            # Сохраняем пользователя в сессии
            request.session[SESSION_KEY] = user.id
            request.session[BACKEND_SESSION_KEY] = 'accounts.backends.SQLAlchemyBackend'
            return redirect(reverse_lazy('accounts:profile'))
        return render(request, self.template_name, {'form': form})
class SQLAlchemyBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None):
        session = get_user_session()
        try:
            user = session.query(User).filter_by(Login=username).first()
            if user and user.check_password(password):
                return UserProxy(user)
        finally:
            session.close()
        return None

def get_user(self, user_id):
    session = get_user_session()
    try:
        user = session.query(User).filter_by(ID=user_id).first()
        if user:
            return UserProxy(user)
    except:
        return None
    finally:
        session.close()
    return None
class UserProxy:
    def __init__(self, user):
        self._user = user

    @property
    def id(self):
        return self._user.ID

    @property
    def username(self):
        return self._user.Login

    @property
    def email(self):
        return self._user.Login

    @property
    def is_staff(self):
        return self._user.is_staff.lower() == 'true'

    @property
    def is_superuser(self):
        return self._user.is_superuser.lower() == 'true'

    @property
    def is_active(self):
        return True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_username(self):
        return self.username

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    @property
    def pk(self):
        return self.id