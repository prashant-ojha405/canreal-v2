import os
import pymupdf
import requests
from dotenv import load_dotenv
from paddleocr import PaddleOCR
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": {"$regex": "SUMMER 2025", "$options": "i"}})
print(f"Fetching document: '{doc.get('title')}'...")

res = requests.get(doc["fileUrl"], timeout=20)
pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

# Render Page 2 at 200 DPI
page = pdf_doc[1]
pix = page.get_pixmap(dpi=200)
temp_img_path = "temp_page_2.png"
pix.save(temp_img_path)

print("Initializing PaddleOCR 2.x with CPU fallback flags...")
ocr = PaddleOCR(
    use_angle_cls=True,
    lang="en",
    use_gpu=False,
    enable_mkldnn=False,   # Disables Intel oneDNN backend
    ir_optim=False         # Disables graph fusion that triggers fused_conv2d
)

print("Running OCR inference on Page 2...")
results = ocr.ocr(temp_img_path, cls=True)

print("\n--- DETECTED TEXT BLOCKS (FIRST 20) ---")
if results and results[0]:
    for idx, line in enumerate(results[0][:20]):
        box, (text, conf) = line
        print(f"[{idx + 1}] Conf: {conf:.2f} | Text: {text}")

if os.path.exists(temp_img_path):
    os.remove(temp_img_path)

client.close()