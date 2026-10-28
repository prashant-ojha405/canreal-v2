# backend/scripts/diagnose_low_yield.py
import io
import os
import pymupdf
import pytesseract
import requests
from dotenv import load_dotenv
from PIL import Image
from pymongo import MongoClient

load_dotenv()

tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": "BT 101 SUMMER 2025"})
if not doc:
    doc = db.documents.find_one({"title": {"$regex": "SUMMER 2025", "$options": "i"}})

print(f"Inspecting low-yield document: '{doc.get('title')}'")
res = requests.get(doc["fileUrl"], timeout=20)
pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

for page_idx, page in enumerate(pdf_doc):
    page_text = page.get_text().strip()
    if len(page_text) < 80:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        page_text = pytesseract.image_to_string(img)
    
    print(f"\n==================== PAGE {page_idx + 1} ====================")
    print(page_text[:1200])

client.close()