import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from app.db.database import get_db
from app.core.tenant import get_tenant_context
from app.core.safety_scanner import scan_sensitive_information
from app.models.community import (
    CommunityPost,
    CommunityComment,
    CommunityTag,
    CommunityPostTag,
    CommunityHelpfulVote,
    CommunityReport
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/community", tags=["Community"])


# ------------------ Schemas ------------------

class PostCreateRequest(BaseModel):
    post_type: str = Field("QUESTION", description="QUESTION, LESSON, FAILURE_REPORT, RECOVERY, DISCUSSION")
    title: str
    summary: str
    content: str
    product_context: Optional[str] = None
    failure_dimension: Optional[str] = None
    pattern: Optional[str] = None
    observed_failure: Optional[str] = None
    recovery_strategy: Optional[str] = None
    verified_outcome: Optional[str] = None
    tags: List[str] = []
    evidence_references: Optional[List[Dict[str, Any]]] = None
    visibility: str = Field("PRIVATE", description="PRIVATE, ORGANIZATION, COMMUNITY, GLOBAL_SANITIZED")


class PostUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    product_context: Optional[str] = None
    failure_dimension: Optional[str] = None
    pattern: Optional[str] = None
    observed_failure: Optional[str] = None
    recovery_strategy: Optional[str] = None
    verified_outcome: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[List[str]] = None


class CommentCreateRequest(BaseModel):
    content: str


class HelpfulToggleRequest(BaseModel):
    comment_id: Optional[str] = None


class AcceptCommentRequest(BaseModel):
    comment_id: str


class ReportCreateRequest(BaseModel):
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    reason: str


class ScanRequest(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_name: str
    organization_id: str
    content: str
    is_accepted: bool
    helpful_count: int
    created_at: str
    has_voted_helpful: Optional[bool] = False


class PostResponse(BaseModel):
    id: str
    author_id: str
    author_name: str
    organization_id: str
    post_type: str
    title: str
    summary: str
    content: str
    product_context: Optional[str] = None
    failure_dimension: Optional[str] = None
    pattern: Optional[str] = None
    similarity_score: Optional[float] = None
    observed_failure: Optional[str] = None
    recovery_strategy: Optional[str] = None
    verified_outcome: Optional[str] = None
    evidence_references: Optional[List[Dict[str, Any]]] = None
    visibility: str
    status: str
    helpful_count: int
    comment_count: int
    accepted_comment_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    tags: List[str] = []
    comments: Optional[List[CommentResponse]] = None
    has_voted_helpful: Optional[bool] = False


# ------------------ Endpoints ------------------

@router.post("/scan")
def scan_content(payload: ScanRequest):
    """
    Automated pre-publish safety scan for API keys, passwords, credentials, and PII.
    """
    return scan_sensitive_information(payload.text)


@router.get("/tags")
def get_popular_tags(db: Session = Depends(get_db)):
    """
    Retrieves popular community tags with usage counters.
    """
    tags = db.query(CommunityTag).order_by(CommunityTag.usage_count.desc()).limit(30).all()
    return [{"id": t.id, "name": t.name, "usage_count": t.usage_count} for t in tags]


@router.get("/posts")
def list_posts(
    post_type: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = Query("trending", description="trending, recent, most_discussed, verified_outcomes"),
    query: Optional[str] = None,
    visibility: Optional[str] = None,
    limit: int = 30,
    offset: int = 0,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Lists community posts with multi-tenant privacy enforcement and faceted filtering.
    """
    user_id = x_user_id or "usr_anonymous"

    # Base query
    q = db.query(CommunityPost).filter(CommunityPost.status == "PUBLISHED")

    # Strict Privacy Scoping:
    # 1. COMMUNITY & GLOBAL_SANITIZED: Visible to all authenticated users
    # 2. ORGANIZATION: Visible to members of the same organization
    # 3. PRIVATE: Visible ONLY to the post's author within the same organization
    q = q.filter(
        or_(
            CommunityPost.visibility.in_(["COMMUNITY", "GLOBAL_SANITIZED"]),
            and_(CommunityPost.visibility == "ORGANIZATION", CommunityPost.organization_id == org_id),
            and_(CommunityPost.visibility == "PRIVATE", CommunityPost.organization_id == org_id, CommunityPost.author_id == user_id)
        )
    )

    if post_type and post_type.upper() != "ALL":
        q = q.filter(CommunityPost.post_type == post_type.upper())

    if visibility and visibility.upper() != "ALL":
        q = q.filter(CommunityPost.visibility == visibility.upper())

    if tag:
        tag_obj = db.query(CommunityTag).filter(func.lower(CommunityTag.name) == tag.lower()).first()
        if tag_obj:
            q = q.join(CommunityPostTag).filter(CommunityPostTag.tag_id == tag_obj.id)
        else:
            return {"posts": [], "total": 0}

    if query:
        search_pattern = f"%{query.strip()}%"
        q = q.filter(
            or_(
                CommunityPost.title.ilike(search_pattern),
                CommunityPost.summary.ilike(search_pattern),
                CommunityPost.content.ilike(search_pattern),
                CommunityPost.pattern.ilike(search_pattern),
                CommunityPost.recovery_strategy.ilike(search_pattern),
                CommunityPost.verified_outcome.ilike(search_pattern),
            )
        )

    # Sorting
    if sort == "recent":
        q = q.order_by(CommunityPost.created_at.desc())
    elif sort == "most_discussed":
        q = q.order_by(CommunityPost.comment_count.desc(), CommunityPost.created_at.desc())
    elif sort == "verified_outcomes":
        q = q.filter(CommunityPost.verified_outcome != None).order_by(CommunityPost.helpful_count.desc(), CommunityPost.created_at.desc())
    else:  # trending (default)
        q = q.order_by(CommunityPost.helpful_count.desc(), CommunityPost.comment_count.desc(), CommunityPost.created_at.desc())

    total = q.count()
    posts = q.offset(offset).limit(limit).all()

    # Check user helpful votes in batch
    post_ids = [p.id for p in posts]
    user_votes = set()
    if post_ids and user_id:
        votes = db.query(CommunityHelpfulVote.post_id).filter(
            CommunityHelpfulVote.user_id == user_id,
            CommunityHelpfulVote.post_id.in_(post_ids)
        ).all()
        user_votes = {v[0] for v in votes}

    results = []
    for p in posts:
        tag_names = [t.name for t in p.tags]
        results.append({
            "id": p.id,
            "author_id": p.author_id,
            "author_name": p.author_name,
            "organization_id": p.organization_id,
            "post_type": p.post_type,
            "title": p.title,
            "summary": p.summary,
            "content": p.content,
            "product_context": p.product_context,
            "failure_dimension": p.failure_dimension,
            "pattern": p.pattern,
            "similarity_score": p.similarity_score,
            "observed_failure": p.observed_failure,
            "recovery_strategy": p.recovery_strategy,
            "verified_outcome": p.verified_outcome,
            "evidence_references": p.evidence_references,
            "visibility": p.visibility,
            "status": p.status,
            "helpful_count": p.helpful_count or 0,
            "comment_count": p.comment_count or 0,
            "accepted_comment_id": p.accepted_comment_id,
            "created_at": p.created_at.isoformat() if p.created_at else "",
            "updated_at": p.updated_at.isoformat() if p.updated_at else "",
            "tags": tag_names,
            "has_voted_helpful": p.id in user_votes
        })

    return {"posts": results, "total": total}


@router.post("/posts", response_model=PostResponse)
def create_post(
    payload: PostCreateRequest,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Creates and publishes a new FailureOps Community post.
    Enforces privacy validation, automated safety scanning, and tag indexing.
    """
    user_id = x_user_id or "usr_lead_architect"
    author_name = x_user_name or "Intelligence Architect"

    # 1. Automated Secret & PII Scan if post is visible outside PRIVATE
    if payload.visibility != "PRIVATE":
        full_text = f"{payload.title}\n{payload.summary}\n{payload.content}"
        scan_res = scan_sensitive_information(full_text)
        if scan_res["has_sensitive_data"]:
            logger.warning(f"[COMMUNITY_SECURITY] Post creation blocked due to sensitive findings: {scan_res['warning']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security Policy: {scan_res['warning']}"
            )

    post_id = f"post_{uuid.uuid4().hex[:12]}"

    # Clean and sanitize evidence references (never store raw internal file paths)
    sanitized_refs = []
    if payload.evidence_references:
        for ref in payload.evidence_references:
            sanitized_refs.append({
                "document_title": ref.get("document_title", "Document Evidence"),
                "location": ref.get("location", "Citation reference"),
                "excerpt": ref.get("excerpt", "Approved sanitized observation summary") if payload.visibility in ("COMMUNITY", "GLOBAL_SANITIZED") else ref.get("excerpt", "")
            })

    new_post = CommunityPost(
        id=post_id,
        author_id=user_id,
        author_name=author_name,
        organization_id=org_id,
        post_type=payload.post_type.upper(),
        title=payload.title.strip(),
        summary=payload.summary.strip(),
        content=payload.content.strip(),
        product_context=payload.product_context,
        failure_dimension=payload.failure_dimension.upper() if payload.failure_dimension else None,
        pattern=payload.pattern,
        observed_failure=payload.observed_failure,
        recovery_strategy=payload.recovery_strategy,
        verified_outcome=payload.verified_outcome,
        evidence_references=sanitized_refs,
        visibility=payload.visibility.upper(),
        status="PUBLISHED",
        helpful_count=0,
        comment_count=0
    )
    db.add(new_post)
    db.flush()

    # Tag attachment
    attached_tags = []
    if payload.tags:
        for raw_tag in payload.tags:
            clean_tag = raw_tag.strip().lower().replace(" ", "-")
            if not clean_tag:
                continue
            tag_obj = db.query(CommunityTag).filter(CommunityTag.name == clean_tag).first()
            if not tag_obj:
                tag_obj = CommunityTag(
                    id=f"tag_{uuid.uuid4().hex[:8]}",
                    name=clean_tag,
                    usage_count=1
                )
                db.add(tag_obj)
                db.flush()
            else:
                tag_obj.usage_count = (tag_obj.usage_count or 0) + 1

            post_tag = CommunityPostTag(post_id=post_id, tag_id=tag_obj.id)
            db.add(post_tag)
            attached_tags.append(tag_obj.name)

    db.commit()
    db.refresh(new_post)

    return PostResponse(
        id=new_post.id,
        author_id=new_post.author_id,
        author_name=new_post.author_name,
        organization_id=new_post.organization_id,
        post_type=new_post.post_type,
        title=new_post.title,
        summary=new_post.summary,
        content=new_post.content,
        product_context=new_post.product_context,
        failure_dimension=new_post.failure_dimension,
        pattern=new_post.pattern,
        similarity_score=new_post.similarity_score,
        observed_failure=new_post.observed_failure,
        recovery_strategy=new_post.recovery_strategy,
        verified_outcome=new_post.verified_outcome,
        evidence_references=new_post.evidence_references,
        visibility=new_post.visibility,
        status=new_post.status,
        helpful_count=new_post.helpful_count,
        comment_count=new_post.comment_count,
        accepted_comment_id=new_post.accepted_comment_id,
        created_at=new_post.created_at.isoformat() if new_post.created_at else "",
        updated_at=new_post.updated_at.isoformat() if new_post.updated_at else "",
        tags=attached_tags,
        comments=[]
    )


@router.get("/posts/{post_id}", response_model=PostResponse)
def get_post_details(
    post_id: str,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves full community post details and threaded comments with tenant privacy checks.
    """
    user_id = x_user_id or "usr_anonymous"
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found.")

    # Privacy Check
    if post.visibility == "PRIVATE" and (post.organization_id != org_id or post.author_id != user_id):
        raise HTTPException(status_code=403, detail="Unauthorized: Private post is only accessible to author.")
    if post.visibility == "ORGANIZATION" and post.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Post is restricted to organization members.")

    # Fetch helpful votes for post and comments
    user_voted_post = False
    voted_comment_ids = set()
    if user_id:
        post_vote = db.query(CommunityHelpfulVote).filter(
            CommunityHelpfulVote.user_id == user_id,
            CommunityHelpfulVote.post_id == post_id,
            CommunityHelpfulVote.comment_id == None
        ).first()
        user_voted_post = bool(post_vote)

        c_votes = db.query(CommunityHelpfulVote.comment_id).filter(
            CommunityHelpfulVote.user_id == user_id,
            CommunityHelpfulVote.post_id == post_id,
            CommunityHelpfulVote.comment_id != None
        ).all()
        voted_comment_ids = {v[0] for v in c_votes}

    comments_data = []
    for c in post.comments:
        comments_data.append(CommentResponse(
            id=c.id,
            post_id=c.post_id,
            author_id=c.author_id,
            author_name=c.author_name,
            organization_id=c.organization_id,
            content=c.content,
            is_accepted=c.is_accepted,
            helpful_count=c.helpful_count or 0,
            created_at=c.created_at.isoformat() if c.created_at else "",
            has_voted_helpful=c.id in voted_comment_ids
        ))

    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_name=post.author_name,
        organization_id=post.organization_id,
        post_type=post.post_type,
        title=post.title,
        summary=post.summary,
        content=post.content,
        product_context=post.product_context,
        failure_dimension=post.failure_dimension,
        pattern=post.pattern,
        similarity_score=post.similarity_score,
        observed_failure=post.observed_failure,
        recovery_strategy=post.recovery_strategy,
        verified_outcome=post.verified_outcome,
        evidence_references=post.evidence_references,
        visibility=post.visibility,
        status=post.status,
        helpful_count=post.helpful_count or 0,
        comment_count=post.comment_count or 0,
        accepted_comment_id=post.accepted_comment_id,
        created_at=post.created_at.isoformat() if post.created_at else "",
        updated_at=post.updated_at.isoformat() if post.updated_at else "",
        tags=[t.name for t in post.tags],
        comments=comments_data,
        has_voted_helpful=user_voted_post
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse)
def add_comment(
    post_id: str,
    payload: CommentCreateRequest,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Adds a comment to an active community post.
    """
    user_id = x_user_id or "usr_contributor"
    author_name = x_user_name or "Intelligence Contributor"

    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    comment_id = f"cmt_{uuid.uuid4().hex[:12]}"
    new_comment = CommunityComment(
        id=comment_id,
        post_id=post_id,
        author_id=user_id,
        author_name=author_name,
        organization_id=org_id,
        content=payload.content.strip(),
        is_accepted=False,
        helpful_count=0
    )
    db.add(new_comment)
    post.comment_count = (post.comment_count or 0) + 1
    db.commit()
    db.refresh(new_comment)

    return CommentResponse(
        id=new_comment.id,
        post_id=new_comment.post_id,
        author_id=new_comment.author_id,
        author_name=new_comment.author_name,
        organization_id=new_comment.organization_id,
        content=new_comment.content,
        is_accepted=new_comment.is_accepted,
        helpful_count=new_comment.helpful_count,
        created_at=new_comment.created_at.isoformat() if new_comment.created_at else "",
        has_voted_helpful=False
    )


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Deletes own comment.
    """
    user_id = x_user_id or "usr_anonymous"
    comment = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")
    if comment.author_id != user_id and comment.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this comment.")

    post = db.query(CommunityPost).filter(CommunityPost.id == comment.post_id).first()
    if post and post.comment_count and post.comment_count > 0:
        post.comment_count -= 1

    db.delete(comment)
    db.commit()
    return {"success": True, "message": "Comment deleted."}


@router.post("/posts/{post_id}/helpful")
def toggle_helpful(
    post_id: str,
    payload: HelpfulToggleRequest,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Toggles a Helpful vote on a post or on a specific comment.
    """
    user_id = x_user_id or "usr_anonymous"
    comment_id = payload.comment_id

    existing_vote = db.query(CommunityHelpfulVote).filter(
        CommunityHelpfulVote.user_id == user_id,
        CommunityHelpfulVote.post_id == post_id,
        CommunityHelpfulVote.comment_id == comment_id
    ).first()

    if existing_vote:
        # Remove vote
        db.delete(existing_vote)
        if comment_id:
            cmt = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
            if cmt and cmt.helpful_count > 0:
                cmt.helpful_count -= 1
        else:
            pst = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
            if pst and pst.helpful_count > 0:
                pst.helpful_count -= 1
        db.commit()
        return {"voted": False, "message": "Helpful vote removed."}
    else:
        # Add vote
        vote = CommunityHelpfulVote(
            id=f"vote_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            post_id=post_id,
            comment_id=comment_id
        )
        db.add(vote)
        if comment_id:
            cmt = db.query(CommunityComment).filter(CommunityComment.id == comment_id).first()
            if cmt:
                cmt.helpful_count = (cmt.helpful_count or 0) + 1
        else:
            pst = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
            if pst:
                pst.helpful_count = (pst.helpful_count or 0) + 1
        db.commit()
        return {"voted": True, "message": "Marked as helpful."}


@router.post("/posts/{post_id}/accept")
def accept_answer(
    post_id: str,
    payload: AcceptCommentRequest,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Sets the accepted / most useful answer for a question post (author only).
    """
    user_id = x_user_id or "usr_anonymous"
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.author_id != user_id and post.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Only the post author can accept an answer.")

    # Reset any previous accepted comment
    db.query(CommunityComment).filter(CommunityComment.post_id == post_id).update({"is_accepted": False})

    target_comment = db.query(CommunityComment).filter(
        CommunityComment.id == payload.comment_id,
        CommunityComment.post_id == post_id
    ).first()
    if not target_comment:
        raise HTTPException(status_code=404, detail="Target comment not found.")

    target_comment.is_accepted = True
    post.accepted_comment_id = payload.comment_id
    db.commit()

    return {"success": True, "accepted_comment_id": payload.comment_id}


@router.post("/report")
def report_community_item(
    payload: ReportCreateRequest,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Submits a moderation report for a suspicious post or comment.
    """
    reporter_id = x_user_id or "usr_anonymous"
    report = CommunityReport(
        id=f"rep_{uuid.uuid4().hex[:10]}",
        reporter_id=reporter_id,
        post_id=payload.post_id,
        comment_id=payload.comment_id,
        reason=payload.reason.strip(),
        status="PENDING"
    )
    db.add(report)
    db.commit()
    return {"success": True, "message": "Report received. Content has been flagged for moderation."}


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Deletes a community post and all associated comments.
    """
    user_id = x_user_id or "usr_anonymous"
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.author_id != user_id and post.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this post.")

    db.delete(post)
    db.commit()
    return {"success": True, "message": "Post deleted successfully."}
