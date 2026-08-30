from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


class CommunityPostTag(Base):
    __tablename__ = "community_post_tags"

    post_id = Column(String, ForeignKey("community_posts.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String, ForeignKey("community_tags.id", ondelete="CASCADE"), primary_key=True)


class CommunityTag(Base):
    __tablename__ = "community_tags"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("CommunityPost", secondary="community_post_tags", back_populates="tags")


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(String, primary_key=True, index=True)
    author_id = Column(String, nullable=False, index=True)
    author_name = Column(String, nullable=False, default="Intelligence Architect")
    organization_id = Column(String, nullable=False, index=True)

    post_type = Column(String, nullable=False, default="QUESTION", index=True)  # QUESTION, LESSON, FAILURE_REPORT, RECOVERY, DISCUSSION
    title = Column(String, nullable=False, index=True)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    product_context = Column(String, nullable=True)

    # FailureOps Intelligence Domain Links
    failure_dimension = Column(String, nullable=True)  # ADOPTION, TECHNICAL, OPERATIONAL, DELIVERY, FINANCIAL, QUALITY, etc.
    pattern = Column(String, nullable=True)
    similarity_score = Column(Float, nullable=True)
    observed_failure = Column(Text, nullable=True)
    recovery_strategy = Column(Text, nullable=True)
    verified_outcome = Column(Text, nullable=True)
    evidence_references = Column(JSON, nullable=True)  # List of sanitized/masked references

    # Privacy & Lifecycle
    visibility = Column(String, nullable=False, default="PRIVATE", index=True)  # PRIVATE, ORGANIZATION, COMMUNITY, GLOBAL_SANITIZED
    status = Column(String, nullable=False, default="PUBLISHED", index=True)   # DRAFT, PUBLISHED, FLAGGED, REMOVED

    helpful_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    accepted_comment_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan", order_by="CommunityComment.created_at.asc()")
    tags = relationship("CommunityTag", secondary="community_post_tags", back_populates="posts")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String, nullable=False, index=True)
    author_name = Column(String, nullable=False, default="Intelligence Contributor")
    organization_id = Column(String, nullable=False, index=True)

    content = Column(Text, nullable=False)
    is_accepted = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    post = relationship("CommunityPost", back_populates="comments")


class CommunityHelpfulVote(Base):
    __tablename__ = "community_helpful_votes"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    post_id = Column(String, nullable=True, index=True)
    comment_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id = Column(String, primary_key=True, index=True)
    reporter_id = Column(String, nullable=False, index=True)
    post_id = Column(String, nullable=True, index=True)
    comment_id = Column(String, nullable=True, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="PENDING")  # PENDING, RESOLVED, DISMISSED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
