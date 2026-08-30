-- =============================================================================
-- FailureOps X — Demo Seed Data
-- =============================================================================

INSERT INTO projects (
    id, name, code_name, company, industry, stage, description, target_users, expected_launch_date, privacy_level, health, failure_risk, risk_trend, predicted_next_failure, prediction_confidence, historical_similarity, active_failure_seeds_count
) VALUES (
    'aurora',
    'Aurora Cloud Analytics',
    'AURORA-X',
    'Aurora Technologies Inc.',
    'Developer Infrastructure / Cloud Data',
    'Growth / Scaling',
    'Real-time enterprise distributed stream processing engine with automated ingestion and ML analytics.',
    'Enterprise Data Platform Engineers & Cloud Architects',
    '2026-11-15',
    'ORGANIZATION',
    'AT_RISK',
    78.0,
    '+24% over 4 weeks',
    'Cascading Cluster Halt under Cyber Week 2.5x traffic surge in 2-4 weeks',
    0.91,
    0.89,
    4
) ON CONFLICT (id) DO NOTHING;
