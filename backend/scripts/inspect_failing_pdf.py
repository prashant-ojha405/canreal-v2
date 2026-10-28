# backend/scripts/inspect_failing_pdf.py
import io
import os
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from pypdf import PdfReader

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": "BT 101 SUMMER 2024"})
if not doc:
    # Fallback to any paper that failed
    doc = db.documents.find_one({"title": {"$regex": "2024", "$options": "i"}})

print(f"Inspecting Document: '{doc.get('title')}'")
res = requests.get(doc["fileUrl"], timeout=15)
reader = PdfReader(io.BytesIO(res.content))

full_text = ""
for i, page in enumerate(reader.pages):
    full_text += f"\n--- PAGE {i+1} ---\n" + (page.extract_text() or "")

print("\n=== RAW TEXT EXTRACTED (First 1500 chars) ===")
print(full_text[:1500])

client.close()