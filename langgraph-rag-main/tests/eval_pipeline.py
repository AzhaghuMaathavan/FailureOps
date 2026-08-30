import sys
# sys.stdout.reconfigure(encoding='utf-8')
import os
import json
import time
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services.retrieval_service import search_knowledge_base
from app.services.agent_service import orchestrate_rag, call_llm
from app.core.config import settings
from app.db.database import Base

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def evaluate_generation(query, answer, expected_facts):
    if not expected_facts:
        return {"correct": True, "grounded": True, "reason": "No facts expected"}
        
    sys_prompt = (
        "You are an offline LLM-as-a-judge.\n"
        "Evaluate the provided answer against the expected facts.\n"
        "Return ONLY a JSON object with 'correct' (bool), 'grounded' (bool), and 'reason' (string).\n"
        "- correct: Does it contain the expected facts?\n"
        "- grounded: Does it avoid hallucinating information beyond the expected facts?\n"
    )
    facts_str = "\n".join(f"- {f}" for f in expected_facts)
    user_prompt = f"Query: {query}\n\nExpected Facts:\n{facts_str}\n\nActual Answer:\n{answer}"
    
    try:
        raw = call_llm(sys_prompt, user_prompt)
        text = raw.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        return {"correct": False, "grounded": False, "reason": f"Eval failed: {e}"}

def run_evaluations():
    with open('tests/evaluation_dataset.json', 'r', encoding='utf-8') as f:
        dataset = json.load(f)

    db = SessionLocal()
    metrics = {
        "retrieval_recall_15": 0,
        "rerank_recall_5": 0,
        "domain_accuracy": 0,
        "evidence_accuracy": 0,
        "answer_correctness": 0,
        "groundedness": 0,
        "total_tests": len(dataset),
        "total_valid_retrieval_tests": 0,
        "total_generated_answers": 0,
        "max_iterations_respected": 0
    }
    
    results_report = []

    for test in dataset:
        print(f"\nEvaluating [{test['id']}] - {test['category']}")
        q = test['query']
        
        # 1. Evaluate Retrieval (if there are expected chunks)
        expected_chunks = set(test['expected_source_chunk_ids'])
        
        if expected_chunks:
            metrics["total_valid_retrieval_tests"] += 1
            final_ev, r_metrics, initial_cands = search_knowledge_base(db, q)
            
            initial_ids = {c['chunk_id'] for c in initial_cands}
            final_ids = {c['chunk_id'] for c in final_ev}
            
            # Recall@15
            if expected_chunks.issubset(initial_ids):
                metrics["retrieval_recall_15"] += 1
            else:
                print(f"  [!] Missing from initial retrieval: {expected_chunks - initial_ids}")
                
            # Recall@5
            if expected_chunks.issubset(final_ids):
                metrics["rerank_recall_5"] += 1
            else:
                print(f"  [!] Missing from final rerank: {expected_chunks - final_ids}")

        # 2. Evaluate Agent
        agent_result = orchestrate_rag(db, q)
        
        domain_match = agent_result["domain_state"] == test["expected_domain_state"]
        if domain_match: metrics["domain_accuracy"] += 1
        else: print(f"  [!] Domain mismatch. Expected {test['expected_domain_state']}, got {agent_result['domain_state']}")
        
        ev_state = agent_result.get("evidence_state") or "NONE"
        ev_match = ev_state == test["expected_evidence_state"]
        if ev_match: metrics["evidence_accuracy"] += 1
        else: print(f"  [!] Evidence mismatch. Expected {test['expected_evidence_state']}, got {ev_state}")
        
        iterations = agent_result.get("iterations", 0)
        if iterations <= 3:
            metrics["max_iterations_respected"] += 1
            
        print(f"  Latency: Total {agent_result.get('latencies', {}).get('total', 0):.2f}s "
              f"(Search: {agent_result.get('latencies', {}).get('vector_retrieval', 0):.2f}s, "
              f"Rerank: {agent_result.get('latencies', {}).get('reranking', 0):.2f}s, "
              f"Gen: {agent_result.get('latencies', {}).get('generation', 0):.2f}s)")
        
        # 3. Evaluate Generation (offline LLM Judge)
        if test["expected_answer_facts"] and ev_state == "SUPPORTED":
            metrics["total_generated_answers"] += 1
            judge_res = evaluate_generation(q, agent_result["answer"], test["expected_answer_facts"])
            if judge_res.get("correct"): metrics["answer_correctness"] += 1
            if judge_res.get("grounded"): metrics["groundedness"] += 1
            if not judge_res.get("correct"): print(f"  [!] Incorrect Answer: {judge_res.get('reason')}")
            
    # Print Metrics Summary
    print("\n\n" + "="*40)
    print("METRICS REPORT")
    print("="*40)
    if metrics['total_valid_retrieval_tests'] > 0:
        print(f"Retrieval Recall@15 : {metrics['retrieval_recall_15']}/{metrics['total_valid_retrieval_tests']} ({(metrics['retrieval_recall_15']/metrics['total_valid_retrieval_tests'])*100:.1f}%)")
        print(f"Rerank Recall@5     : {metrics['rerank_recall_5']}/{metrics['total_valid_retrieval_tests']} ({(metrics['rerank_recall_5']/metrics['total_valid_retrieval_tests'])*100:.1f}%)")
    print(f"Domain Routing      : {metrics['domain_accuracy']}/{metrics['total_tests']} ({(metrics['domain_accuracy']/metrics['total_tests'])*100:.1f}%)")
    print(f"Evidence Decision   : {metrics['evidence_accuracy']}/{metrics['total_tests']} ({(metrics['evidence_accuracy']/metrics['total_tests'])*100:.1f}%)")
    
    if metrics['total_generated_answers'] > 0:
        print(f"Answer Correctness  : {metrics['answer_correctness']}/{metrics['total_generated_answers']} ({(metrics['answer_correctness']/metrics['total_generated_answers'])*100:.1f}%)")
        print(f"Answer Groundedness : {metrics['groundedness']}/{metrics['total_generated_answers']} ({(metrics['groundedness']/metrics['total_generated_answers'])*100:.1f}%)")
    
    db.close()

if __name__ == "__main__":
    run_evaluations()
