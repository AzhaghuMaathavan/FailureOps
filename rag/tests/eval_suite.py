import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

TEST_QUERIES = [
    ("Exact fact", "What is the day order on February 17?"),
    ("Exhaustive list", "List all dates on which classes are suspended."),
    ("Date lookup", "When does the end semester examination start?"),
    ("Holiday lookup", "Is October 17 a holiday?"),
    ("Department query", "Which departments are covered by this circular?"),
    ("Missing evidence", "What is the policy for quantum physics lab usage?") # Should return INSUFFICIENT_EVIDENCE
]

def run_evals():
    print("Starting Evaluation Suite...")
    for category, query in TEST_QUERIES:
        print(f"\n--- Testing: {category} ---")
        print(f"Query: {query}")
        
        t0 = time.time()
        try:
            resp = requests.post(f"{BASE_URL}/chat", json={"query": query})
            resp.raise_for_status()
            data = resp.json()
            latency = time.time() - t0
            
            answer = data.get("answer", "NO ANSWER")
            domain_state = data.get("domain_state")
            evidence_state = data.get("evidence_state")
            iterations = data.get("iterations")
            
            print(f"Latency: {latency:.2f}s | Iters: {iterations} | Domain: {domain_state} | Evidence: {evidence_state}")
            print(f"Answer snippet: {answer[:200]}...")
            if "INSUFFICIENT_EVIDENCE" in answer:
                print("Result: INSUFFICIENT_EVIDENCE returned safely.")
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    run_evals()
