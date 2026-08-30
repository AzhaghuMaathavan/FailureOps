import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1/chat/"

QUERIES = [
    # 1. OUT_OF_DOMAIN
    "What is the population of France?",
    
    # 2. Directly supported query
    "What is the purpose of RAGFlow?",
    
    # 3. Query requiring targeted retrieval (mocked iterative by combining two facts)
    "What is the purpose of RAGFlow, and what subject is scheduled on Monday at 11 AM?",
    
    # 4. Unsupported query
    "What is the hostel fee in 2035?",
    
    # 5. Table query
    "What subject is scheduled on Monday at 11 AM?"
]

def run_tests():
    for q in QUERIES:
        print(f"\n======================================")
        print(f"QUERY: '{q}'")
        print(f"======================================")
        
        payload = {"query": q}
        resp = httpx.post(BASE_URL, json=payload, timeout=120.0)
        
        if resp.status_code != 200:
            print(f"ERROR: {resp.status_code} - {resp.text}")
            continue
            
        data = resp.json()
        print(f"Domain State   : {data.get('domain_state')}")
        print(f"Evidence State : {data.get('evidence_state')}")
        print(f"Iterations     : {data.get('iterations')}")
        print(f'Tools Used     : {data.get("tools_used")}'); print(f'Latencies      : {data.get("latencies")}')
        print(f"Answer         :\n{data.get('answer')}")
        
        citations = data.get("citations", [])
        if citations:
            print(f"\nCitations included ({len(citations)} source blocks).")

if __name__ == "__main__":
    run_tests()
