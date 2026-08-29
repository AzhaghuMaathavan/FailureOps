import requests
import time
from sqlalchemy import text
from app.db.database import SessionLocal

if __name__ == "__main__":
    BASE_URL = "http://127.0.0.1:8000/api/v1"
    
    # Clear DB
    db = SessionLocal()
    db.execute(text("TRUNCATE TABLE documents CASCADE"))
    db.commit()
    print("DB cleared!")
    
    # Upload V1
    with open("v1.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 51 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(The attendance requirement is 75%.) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000223 00000 n \n0000000325 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n413\n%%EOF\n")
    
    print("Uploading V1...")
    files = {'file': open('v1.pdf', 'rb')}
    r = requests.post(f"{BASE_URL}/documents/upload", files=files, data={"version": "V1", "title": "COLLEGE_POLICY"})
    doc_id = r.json()["document_id"]
    print("V1 Doc ID:", doc_id)
    
    while True:
        r = requests.get(f"{BASE_URL}/documents/{doc_id}")
        if r.json()["status"] in ["COMPLETED", "FAILED", "ERROR"]:
            break
        time.sleep(1)
    
    print("\nQuerying RAG with V1...")
    r = requests.post(f"{BASE_URL}/chat/", json={"query": "What is the attendance requirement?"})
    print("RAG Answer V1:", r.json()["answer"])
    
    print("\nDeleting V1...")
    requests.delete(f"{BASE_URL}/documents/{doc_id}")
    
    print("\nQuerying RAG after delete...")
    r = requests.post(f"{BASE_URL}/chat/", json={"query": "What is the attendance requirement?"})
    print("RAG Answer after delete:", r.json()["answer"])

