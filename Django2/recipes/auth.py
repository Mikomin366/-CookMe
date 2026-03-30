import jwt
from datetime import datetime, timedelta
from django.conf import settings
from CookME.db import get_db
from recipes.models_sa import User

SECRET_KEY = getattr(settings, 'JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_user_from_token(request):
    """Получение пользователя из токена в заголовке Authorization"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        payload = decode_token(token)
        if payload and 'user_id' in payload:
            user_id = payload['user_id']
            db = next(get_db())
            user = db.query(User).filter(User.ID == user_id).first()
            db.close()
            return user
    
    # Резервный вариант - из сессии (для обратной совместимости)
    user_id = request.session.get('user_id')
    if user_id:
        db = next(get_db())
        user = db.query(User).filter(User.ID == user_id).first()
        db.close()
        return user
    
    return None