import httpx
import time
import sys

PDF_PATH = r"P:\ragflow-main\test\benchmark\test_docs\Doc1.pdf"

def main():
    print("Uploading document...")
    with open(PDF_PATH, "rb") as f:
        files = {"file": ("Doc1.pdf", f, "application/pdf")}
        resp = httpx.post("http://127.0.0.1:8000/api/v1/documents/upload", files=files, timeout=30.0)
        
    if resp.status_code != 200:
        print(f"Upload failed: {resp.text}")
        sys.exit(1)
        
    doc_id = resp.json()["document_id"]
    print(f"Uploaded! Document ID: {doc_id}")
    
    print("Polling status...")
    for _ in range(30):
        time.sleep(5)
        status_resp = httpx.get(f"http://127.0.0.1:8000/api/v1/documents/{doc_id}")
        data = status_resp.json()
        print(f"Status: {data['status']}")
        if data["status"] in ["COMPLETED", "FAILED", "PARTIAL_SUCCESS"]:
            print(f"Finished with status: {data['status']}")
            if data.get("error_message"):
                print(f"Error: {data['error_message']}")
            break

if __name__ == "__main__":
    main()
