import httpx
import time
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.chunk import Chunk

# We know these documents already exist in the DB from Phase 3 & 4
DOC_1_ID = "644ad032-1f73-4543-8569-45743b0bac16"
TABLE_DOC_ID = "211f0853-c85b-48dd-9dec-8fe6d162343a"

def check_db(doc_id):
    engine = create_engine('postgresql://postgres:postgres@127.0.0.1:5435/agentic_rag')
    Session = sessionmaker(bind=engine)
    db = Session()
    
    chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).all()
    completed = [c for c in chunks if c.embedding_status == 'COMPLETED']
    failed = [c for c in chunks if c.embedding_status == 'FAILED']
    pending = [c for c in chunks if c.embedding_status == 'PENDING']
    
    print(f"\nDB State for {doc_id}:")
    print(f"Total chunks: {len(chunks)}")
    print(f"Completed: {len(completed)}")
    print(f"Failed: {len(failed)}")
    print(f"Pending: {len(pending)}")
    
    if completed:
        sample = completed[0]
        dim = len(sample.embedding) if sample.embedding else 0
        print(f"Sample Embedding Dimension: {dim}")
        print(f"Embedding Model: {sample.embedding_model}")
        print(f"Lineage Preserved: {sample.lineage}")
        print(f"Content Preserved: {sample.content[:100]}...")

def test_embed(doc_id, force=False):
    print(f"\nTriggering embedding for {doc_id} (force={force})...")
    url = f"http://127.0.0.1:8000/api/v1/documents/{doc_id}/embed"
    if force:
        url += "?force=true"
    
    start_time = time.time()
    resp = httpx.post(url, timeout=120.0)
    end_time = time.time()
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"API Response: {data}")
        print(f"Latency: {end_time - start_time:.2f}s")
    else:
        print(f"API Error: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    print("Testing Doc 1...")
    test_embed(DOC_1_ID)
    check_db(DOC_1_ID)
    
    print("\nTesting Idempotency (should skip)...")
    test_embed(DOC_1_ID)
    
    print("\nTesting Force Re-embed...")
    test_embed(DOC_1_ID, force=True)
    
    print("\nTesting Table Doc...")
    test_embed(TABLE_DOC_ID)
    check_db(TABLE_DOC_ID)
