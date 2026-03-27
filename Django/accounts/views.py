from django.contrib.auth import SESSION_KEY, BACKEND_SESSION_KEY
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.generic import FormView
from .forms import RegistrationForm
from .sqlalchemy_db import User
from .util import get_user_session
from datetime import datetime

from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views import View
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import SESSION_KEY, BACKEND_SESSION_KEY

class RegisterView(FormView):
    template_name = 'accounts/register.html'
    form_class = RegistrationForm
    success_url = reverse_lazy('accounts:profile')

    def form_valid(self, form):
        username = form.cleaned_data['username']
        password = form.cleaned_data['password']

        session = get_user_session()
        user = User(
            Login=username,
            Image='',
            is_staff='False',
            is_superuser='False',
            date_joining=datetime.now().isoformat()
        )
        user.set_password(password)
        session.add(user)
        session.commit()
        
        # Получаем ID до закрытия сессии
        user_id = user.ID
        session.close()

        # Вручную устанавливаем сессию Django
        self.request.session[SESSION_KEY] = user_id
        self.request.session[BACKEND_SESSION_KEY] = 'accounts.backends.SQLAlchemyBackend'

        return super().form_valid(form)

def profile(request):
    return render(request, 'accounts/profile.html', {'user': request.user})
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy

class CustomLoginView(View):
    template_name = 'accounts/login.html'
    form_class = AuthenticationForm

    def get(self, request):
        form = self.form_class()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = self.form_class(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()  # user – это UserProxy из бэкенда
            # Устанавливаем сессию вручную
            request.session[SESSION_KEY] = user.id
            request.session[BACKEND_SESSION_KEY] = 'accounts.backends.SQLAlchemyBackend'
            return redirect(reverse_lazy('accounts:profile'))
        return render(request, self.template_name, {'form': form})

class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('login')