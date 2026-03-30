from django import forms
from django.core.exceptions import ValidationError
from django.conf import settings

class UserRegistrationForm(forms.Form):
    username = forms.CharField(label='Логин', max_length=150, widget=forms.TextInput(attrs={'class': 'form-control'}))
    password1 = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    password2 = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput(attrs={'class': 'form-control'}))

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Пароли не совпадают')
        return password2


class LoginForm(forms.Form):
    username = forms.CharField(label='Логин', widget=forms.TextInput(attrs={'class': 'form-control'}))
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))


class RecipeForm(forms.Form):
    name = forms.CharField(label='Название', max_length=200, widget=forms.TextInput(attrs={'class': 'form-control'}))
    time = forms.IntegerField(label='Время приготовления (мин)', required=False, widget=forms.NumberInput(attrs={'class': 'form-control'}))
    calories = forms.IntegerField(label='Калории', required=False, widget=forms.NumberInput(attrs={'class': 'form-control'}))
    description = forms.CharField(label='Описание', widget=forms.Textarea(attrs={'class': 'form-control'}), required=False)
    photo_upload = forms.ImageField(label='Фото рецепта', required=False, widget=forms.FileInput(attrs={'class': 'form-control-file'}))
    categories_text = forms.CharField(
        label='Категории',
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control'}),
        help_text='Введите названия категорий через запятую.'
    )

    def clean_time(self):
        time = self.cleaned_data.get('time')
        if time is not None and time < 0:
            raise ValidationError('Время не может быть отрицательным')
        return time

    def clean_calories(self):
        calories = self.cleaned_data.get('calories')
        if calories is not None and calories < 0:
            raise ValidationError('Калории не могут быть отрицательными')
        return calories


class AvatarChangeForm(forms.Form):
    avatar_upload = forms.ImageField(
        label='Загрузить аватарку',
        required=True,
        widget=forms.FileInput(attrs={'class': 'form-control-file'})
    )


class ChangePasswordForm(forms.Form):
    old_password = forms.CharField(label='Старый пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    new_password1 = forms.CharField(label='Новый пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    new_password2 = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput(attrs={'class': 'form-control'}))

    def clean_new_password2(self):
        new1 = self.cleaned_data.get('new_password1')
        new2 = self.cleaned_data.get('new_password2')
        if new1 and new2 and new1 != new2:
            raise forms.ValidationError('Пароли не совпадают')
        return new2