# backend/scripts/test_pymupdf.py
import os
import pymupdf
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": "BT 101 SUMMER 2024"})
if not doc:
    doc = db.documents.find_one({"title": {"$regex": "2024", "$options": "i"}})

print(f"Testing PyMuPDF on: '{doc.get('title')}'")

res = requests.get(doc["fileUrl"], timeout=15)
pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

print(f"Total Pages: {len(pdf_doc)}")
for i, page in enumerate(pdf_doc):
    text = page.get_text().strip()
    images = page.get_images()
    print(f"Page {i+1}: {len(text)} text chars found | {len(images)} image object(s) detected.")

client.close()