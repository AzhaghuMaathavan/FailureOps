from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, nullable=False, default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
