import logging
from sqlalchemy.orm import Session
from app.models.community import CommunityPost, CommunityComment, CommunityTag, CommunityPostTag

logger = logging.getLogger(__name__)

DEMO_COMMUNITY_POSTS = [
    {
        "id": "post_seed_01",
        "author_id": "usr_seed_arch_01",
        "author_name": "Elena Rostova",
        "organization_id": "org_aurora_technologies",
        "post_type": "FAILURE_REPORT",
        "title": "Why our B2B analytics suite failed user activation during self-serve launch",
        "summary": "Users completed initial registration but 44% abandoned the platform before completing their first metric report setup due to mandatory SSO and workspace invite requirements.",
        "content": "During Q3 we launched a self-serve tier for our B2B analytics platform. While signups increased by 140%, activation cratered. Investigation revealed that requiring team workspace invites and SAML SSO before granting access to dashboard templates created an insurmountable obstacle for trial users who just wanted to test the platform individually first.",
        "product_context": "B2B SaaS Analytics & Telemetry",
        "failure_dimension": "ADOPTION",
        "pattern": "Onboarding Friction & Premature SSO Gate",
        "observed_failure": "44% abandonment before first metric view; D14 retention dropped to 12%.",
        "recovery_strategy": "Deferred SAML SSO and team invites until after the first template was generated with mock data. Added 1-click sample data imports.",
        "verified_outcome": "D14 activation rebounded from 12% to 39%; time-to-first-value dropped from 18m to 3.5m.",
        "tags": ["onboarding", "adoption", "activation", "b2b-saas"],
        "visibility": "COMMUNITY",
        "status": "PUBLISHED",
        "helpful_count": 28,
        "comment_count": 2,
        "accepted_comment_id": "cmt_seed_01",
        "comments": [
            {
                "id": "cmt_seed_01",
                "author_id": "usr_seed_lead_02",
                "author_name": "Marcus Vance",
                "organization_id": "org_nexus_systems",
                "content": "We encountered the exact same pattern in 2024. Storing a local sandbox state before enforcing workspace domain verification was the single biggest catalyst for our PLG motion.",
                "is_accepted": True,
                "helpful_count": 14
            },
            {
                "id": "cmt_seed_02",
                "author_id": "usr_seed_eng_03",
                "author_name": "Sarah Chen",
                "organization_id": "org_aurora_technologies",
                "content": "Did you encounter any security compliance pushback from enterprise prospects when allowing deferred SSO on enterprise domains?",
                "is_accepted": False,
                "helpful_count": 5
            }
        ]
    },
    {
        "id": "post_seed_02",
        "author_id": "usr_seed_devops_04",
        "author_name": "Devin Torres",
        "organization_id": "org_cloudwave_infra",
        "post_type": "RECOVERY",
        "title": "Recovering from microservice deployment thrashing and review paralysis",
        "summary": "PR turnaround time ballooned to 4.8 days as 24 interdependent microservices created circular blocking reviews and broken staging environments.",
        "content": "As our engineering team scaled from 20 to 80 engineers across 24 repos, PR lead time increased by 300%. Teams were hesitant to merge due to flaky integration tests across decoupled services.",
        "product_context": "Fintech Core Banking API",
        "failure_dimension": "EXECUTION",
        "pattern": "Review Paralysis & Distributed Dependency Thrash",
        "observed_failure": "Deployment frequency fell from 12/day to 0.8/day; open bug backlog grew 65%.",
        "recovery_strategy": "Consolidated core services into a modular monorepo with automated contract testing and trunk-based short-lived feature flags.",
        "verified_outcome": "PR review turnaround dropped to 4.2 hours; deployment frequency reached 18/day.",
        "tags": ["execution", "technical", "ci-cd", "deployment", "microservices"],
        "visibility": "COMMUNITY",
        "status": "PUBLISHED",
        "helpful_count": 35,
        "comment_count": 1,
        "accepted_comment_id": None,
        "comments": [
            {
                "id": "cmt_seed_03",
                "author_id": "usr_seed_arch_01",
                "author_name": "Elena Rostova",
                "organization_id": "org_aurora_technologies",
                "content": "Contract testing with Pact or OpenAPI specs is definitely the prerequisite before splitting repos. Excellent recovery breakdown.",
                "is_accepted": False,
                "helpful_count": 9
            }
        ]
    },
    {
        "id": "post_seed_03",
        "author_id": "usr_seed_pm_05",
        "author_name": "Aria Montgomery",
        "organization_id": "org_apex_health",
        "post_type": "QUESTION",
        "title": "How to handle clinical workflow resistance when replacing legacy EMR software?",
        "summary": "Clinicians are reporting high cognitive overhead and refusing to adopt the new medication reconciliation interface despite 99.9% uptime.",
        "content": "We launched our new CareFlow clinical coordination software last month. Technically the system is fast and stable, but nurse adoption is below 25%. They revert to paper charts because our modal workflow requires 8 clicks vs 2 on the legacy terminal.",
        "product_context": "Healthcare / Care Coordination",
        "failure_dimension": "OPERATIONAL",
        "pattern": "Workflow Cognitive Friction & Habit Inertia",
        "observed_failure": "Only 22% nurse shift compliance; high escalation rate to IT support.",
        "recovery_strategy": None,
        "verified_outcome": None,
        "tags": ["healthcare", "operations", "adoption", "ux-friction"],
        "visibility": "COMMUNITY",
        "status": "PUBLISHED",
        "helpful_count": 19,
        "comment_count": 1,
        "accepted_comment_id": "cmt_seed_04",
        "comments": [
            {
                "id": "cmt_seed_04",
                "author_id": "usr_seed_nurse_06",
                "author_name": "Dr. Ronald Vance",
                "organization_id": "org_apex_health",
                "content": "Introduce keyboard shortcuts (e.g. Tab + Enter) and quick-action macros. In high-stress clinical environments, reducing hand movements between mouse and keyboard is the critical adoption lever.",
                "is_accepted": True,
                "helpful_count": 16
            }
        ]
    }
]


def seed_demo_community_posts(db: Session) -> int:
    """
    Seeds initial baseline failure experiences into the Community platform if empty.
    """
    existing_count = db.query(CommunityPost).count()
    if existing_count > 0:
        return 0

    added = 0
    for p_data in DEMO_COMMUNITY_POSTS:
        post = CommunityPost(
            id=p_data["id"],
            author_id=p_data["author_id"],
            author_name=p_data["author_name"],
            organization_id=p_data["organization_id"],
            post_type=p_data["post_type"],
            title=p_data["title"],
            summary=p_data["summary"],
            content=p_data["content"],
            product_context=p_data["product_context"],
            failure_dimension=p_data["failure_dimension"],
            pattern=p_data["pattern"],
            observed_failure=p_data["observed_failure"],
            recovery_strategy=p_data["recovery_strategy"],
            verified_outcome=p_data["verified_outcome"],
            visibility=p_data["visibility"],
            status=p_data["status"],
            helpful_count=p_data["helpful_count"],
            comment_count=p_data["comment_count"],
            accepted_comment_id=p_data["accepted_comment_id"]
        )
        db.add(post)
        db.flush()

        # Tags
        for t_name in p_data["tags"]:
            tag_obj = db.query(CommunityTag).filter(CommunityTag.name == t_name).first()
            if not tag_obj:
                tag_obj = CommunityTag(id=f"tag_{t_name}", name=t_name, usage_count=1)
                db.add(tag_obj)
                db.flush()
            else:
                tag_obj.usage_count = (tag_obj.usage_count or 0) + 1

            post_tag = CommunityPostTag(post_id=post.id, tag_id=tag_obj.id)
            db.add(post_tag)

        # Comments
        for c_data in p_data.get("comments", []):
            cmt = CommunityComment(
                id=c_data["id"],
                post_id=post.id,
                author_id=c_data["author_id"],
                author_name=c_data["author_name"],
                organization_id=c_data["organization_id"],
                content=c_data["content"],
                is_accepted=c_data["is_accepted"],
                helpful_count=c_data["helpful_count"]
            )
            db.add(cmt)

        added += 1

    db.commit()
    logger.info(f"[COMMUNITY] Seeded {added} baseline community failure experiences.")
    return added
