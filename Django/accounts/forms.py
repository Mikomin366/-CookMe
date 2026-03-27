from django import forms
from django.core.exceptions import ValidationError
from .sqlalchemy_db import User
from .util import get_user_session

class RegistrationForm(forms.Form):
    username = forms.CharField(label='Логин', max_length=150)
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput)
    password_confirm = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput)

    def clean_username(self):
        username = self.cleaned_data.get('username')
        session = get_user_session()
        user = session.query(User).filter_by(Login=username).first()
        if user:
            raise ValidationError('Пользователь с таким логином уже существует.')
        return username

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')
        if password and password_confirm and password != password_confirm:
            raise ValidationError('Пароли не совпадают.')
        return cleaned_data