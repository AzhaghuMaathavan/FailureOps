import pytest
import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def is_server_running():
    try:
        r = requests.get(f"{BASE_URL}/docs", timeout=0.5)
        return r.status_code == 200
    except Exception:
        return False

@pytest.mark.skipif(not is_server_running(), reason="Live FastAPI server not running on port 8000")
def test_leak_pronoun():
    print("Testing Q1 (Supported question)...")
    r1 = requests.post(f"{BASE_URL}/chat", json={"query": "What is the day order on February 17?"})
    data1 = r1.json()
    print("Q1 Answer:", data1["answer"])
    
    cid = data1.get("conversation_id")
    print(f"\nConversation ID: {cid}")
    
    # We must trigger the pronoun heuristic: " for these "
    print("\nTesting Q2 (Unrelated unsupported question with PRONOUN)...")
    r2 = requests.post(f"{BASE_URL}/chat", json={
        "query": "What is the hostel fee for these", 
        "conversation_id": cid
    })
    data2 = r2.json()
    print("Q2 Answer:", data2["answer"])
    
    if "day order" in data2["answer"].lower() or "february 17" in data2["answer"].lower() or data2.get("domain_state") != "OUT_OF_DOMAIN":
        print("FAIL: Q2 inherited Q1's answer!")
        assert False
    else:
        print("PASS: No leakage. Gate successfully rejected the context.")
        assert True

if __name__ == "__main__":
    test_leak_pronoun()

