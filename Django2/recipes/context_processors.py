from .models_sa import User
from CookME.db import get_db

def user_processor(request):
    user_id = request.session.get('user_id')
    if user_id:
        db = next(get_db())
        user = db.query(User).filter(User.ID == user_id).first()
        db.close()
        return {'user': user}
    return {'user': None}