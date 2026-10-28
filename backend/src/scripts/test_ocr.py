# backend/scripts/test_ocr.py
import io
import os
import pymupdf
import pytesseract
import requests
from dotenv import load_dotenv
from PIL import Image
from pymongo import MongoClient

load_dotenv()

# Standard Tesseract path on Windows
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": "BT 101 SUMMER 2024"})
print(f"Downloading scanned paper: '{doc['title']}'...")

res = requests.get(doc["fileUrl"], timeout=20)
pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

print("Rendering Page 1 to image and running local OCR...")
page = pdf_doc[0]
pix = page.get_pixmap(dpi=200)  # Render page at 200 DPI for sharp OCR text
img = Image.open(io.BytesIO(pix.tobytes("png")))

text = pytesseract.image_to_string(img)

print("\n=== OCR EXTRACTED TEXT PREVIEW (First 800 chars) ===")
print(text[:800])

client.close()