from sqlalchemy import Column, String
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="RECRUITER") # ADMIN, RECRUITER
    hashed_password = Column(String, nullable=True)
