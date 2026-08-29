import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1/retrieval/search"

QUERIES = [
    "What is the purpose of RAGFlow?",                   # 1. Fact exists in Doc1
    "What subjects are scheduled on Monday at 11 AM?",    # 2. Table targeting
    "What handles complex formats beyond plain text?",    # 3. Specific section in Doc1
    "What is the airspeed velocity of an unladen swallow?" # 4. Unrelated question
]

def run_tests():
    for q in QUERIES:
        print(f"\n======================================")
        print(f"QUERY: '{q}'")
        print(f"======================================")
        
        payload = {"query": q}
        resp = httpx.post(BASE_URL, json=payload, timeout=60.0)
        
        if resp.status_code != 200:
            print(f"ERROR: {resp.status_code} - {resp.text}")
            continue
            
        data = resp.json()
        results = data.get("results", [])
        
        print(f"Retrieved {len(results)} ranked chunks.")
        
        for idx, res in enumerate(results):
            print(f"\n--- Rank {res['rank']} ---")
            print(f"Vector Distance: {res['vector_distance']:.4f}")
            print(f"Rerank Score   : {res['rerank_score']:.4f}")
            print(f"Document ID    : {res['document_id']}")
            print(f"Headers        : {res['headers']}")
            print(f"Lineage        : {res['lineage']}")
            content_preview = res['content'].replace("\n", " ")[:150]
            print(f"Content        : {content_preview}...")

if __name__ == "__main__":
    run_tests()
