from django import forms
from django.conf import settings

class UserRegistrationForm(forms.Form):
    username = forms.CharField(label='Логин', max_length=150)
    password1 = forms.CharField(label='Пароль', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput)
    avatar = forms.ChoiceField(
        label='Аватарка',
        choices=[(p, p) for p in settings.AVATAR_PRESETS],
        required=False
    )

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Пароли не совпадают')
        return password2


class LoginForm(forms.Form):
    username = forms.CharField(label='Логин')
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput)


class RecipeForm(forms.Form):
    name = forms.CharField(label='Название', max_length=200)
    time = forms.IntegerField(label='Время приготовления (мин)', required=False)
    calories = forms.IntegerField(label='Калории', required=False)
    description = forms.CharField(label='Описание', widget=forms.Textarea, required=False)
    photo = forms.CharField(label='Путь к фото', max_length=200, required=False)
    categories = forms.CharField(label='Категории (ID через запятую)', required=False)


class RecipeIngredientForm(forms.Form):
    ingredient_id = forms.IntegerField(label='ID ингредиента')
    quantity = forms.DecimalField(label='Количество', max_digits=10, decimal_places=2, required=False)
    unit = forms.IntegerField(label='Единица измерения (код)', required=False)


class StepReceptForm(forms.Form):
    step_number = forms.IntegerField(label='Номер шага')
    description = forms.CharField(label='Описание', widget=forms.Textarea)
    timer = forms.IntegerField(label='Таймер (сек)', required=False)


class AvatarChangeForm(forms.Form):
    avatar = forms.ChoiceField(
        label='Аватарка',
        choices=[(p, p) for p in settings.AVATAR_PRESETS]
    )


class ChangePasswordForm(forms.Form):
    old_password = forms.CharField(label='Старый пароль', widget=forms.PasswordInput)
    new_password1 = forms.CharField(label='Новый пароль', widget=forms.PasswordInput)
    new_password2 = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput)

    def clean_new_password2(self):
        new1 = self.cleaned_data.get('new_password1')
        new2 = self.cleaned_data.get('new_password2')
        if new1 and new2 and new1 != new2:
            raise forms.ValidationError('Пароли не совпадают')
        return new2