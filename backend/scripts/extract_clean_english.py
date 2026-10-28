import os
import re
import numpy as np
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

# Page 2 (0-indexed: 1)
page = pdf_doc[1]
pix = page.get_pixmap(dpi=200)
page_width = pix.width
temp_img_path = "temp_page_2.png"
pix.save(temp_img_path)

ocr = PaddleOCR(lang="en", device="cpu", enable_mkldnn=False)
results = ocr.predict(temp_img_path)

class BoundingBlock:
    def __init__(self, text, box, score):
        self.text = text.strip()
        self.score = float(score)

        box_arr = np.array(box)
        if box_arr.ndim == 1 and len(box_arr) == 4:
            self.x0, self.y0, self.x1, self.y1 = box_arr
        elif box_arr.ndim == 2:
            self.x0 = float(np.min(box_arr[:, 0]))
            self.x1 = float(np.max(box_arr[:, 0]))
            self.y0 = float(np.min(box_arr[:, 1]))
            self.y1 = float(np.max(box_arr[:, 1]))
        else:
            self.x0, self.y0, self.x1, self.y1 = 0, 0, 0, 0

        self.center_y = (self.y0 + self.y1) / 2
        self.center_x = (self.x0 + self.x1) / 2

    def is_english(self) -> bool:
        if not self.text:
            return False

        # Drop headers/footers directly
        if re.search(r'(rgpvonline|Contd|BT-101|PTO|http)', self.text, re.I):
            return False

        # Drop stray single numbers/gibberish
        if re.fullmatch(r'(\d{4,}|\d+|[;~^|\\]+)', self.text):
            return False

        # Structural markers: question labels, sub-parts
        if re.match(r'^(\(?\d+[\.\)]|\(?[a-z]\)|\[\d+\])', self.text, re.I):
            return True

        alpha_chars = [c for c in self.text if c.isalpha()]
        if not alpha_chars:
            return False

        vowels = [c for c in alpha_chars if c.lower() in 'aeiou']
        vowel_ratio = len(vowels) / len(alpha_chars)

        if self.score >= 0.85:
            return True

        if self.score >= 0.70 and 0.20 <= vowel_ratio <= 0.55:
            return True

        return False

# Parse all blocks
blocks = []
for res_dict in results:
    texts = res_dict.get("rec_texts", [])
    scores = res_dict.get("rec_scores", [])
    boxes = res_dict.get("rec_boxes", [])

    for t, s, b in zip(texts, scores, boxes):
        blk = BoundingBlock(t, b, s)
        if blk.is_english():
            blocks.append(blk)

# Sort by column first, then Y position
left_col = [b for b in blocks if b.center_x < (page_width * 0.5)]
right_col = [b for b in blocks if b.center_x >= (page_width * 0.5)]

# If mostly single column layout across whole page width, sort vertically
full_width_blocks = [b for b in blocks if (b.x1 - b.x0) > (page_width * 0.55)]

if len(full_width_blocks) > len(blocks) * 0.4:
    # Primarily single-column page with occasional side annotations
    sorted_blocks = sorted(blocks, key=lambda b: (round(b.y0 / 20) * 20, b.x0))
else:
    # 2-Column layout
    left_col.sort(key=lambda b: b.y0)
    right_col.sort(key=lambda b: b.y0)
    sorted_blocks = left_col + right_col

print("\n" + "="*70)
print("CLEAN RECONSTRUCTED QUESTION STREAM")
print("="*70)

for b in sorted_blocks:
    print(f"[X: {int(b.x0):04d}, Y: {int(b.y0):04d}] {b.text}")

if os.path.exists(temp_img_path):
    os.remove(temp_img_path)

client.close()