import os
import re
import nltk
import numpy as np
import pymupdf
import requests
from dotenv import load_dotenv
from paddleocr import PaddleOCR
from pymongo import MongoClient

try:
    nltk.data.find("corpora/words")
except LookupError:
    nltk.download("words", quiet=True)

from nltk.corpus import words
ENGLISH_WORDS_SET = set(w.lower() for w in words.words())

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

doc = db.documents.find_one({"title": {"$regex": "SUMMER 2025", "$options": "i"}})
print(f"Fetching document: '{doc.get('title')}'...")

res = requests.get(doc["fileUrl"], timeout=20)
pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

# Page 2 in index (Booklet Pages 3 & 4)
page = pdf_doc[1]
pix = page.get_pixmap(dpi=200)
img_width = pix.width
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

    def is_valid_line(self) -> bool:
        clean = self.text.strip()
        if not clean:
            return False

        if re.search(r'(rgpvonline|ranvonlino|Contd|BT-101|PTO|https?://|\.com)', clean, re.I):
            return False

        if re.fullmatch(r'\[\d+\]|\d+', clean):
            return False

        # Structural delimiters: 3. a), 4.a), b), (a), iii), etc.
        if re.fullmatch(r'^(\d+\s*[\.\)]|\(?\d+\)?\s*[a-d]\)|\([a-d]\)|[a-d]\)|[iIvVxX]+\)|OR)$', clean, re.I):
            return True

        tokens = re.findall(r'[a-zA-Z]{2,}', clean.lower())
        if not tokens:
            if re.search(r'[\=\+\-\*\/\d]{2,}', clean) and self.score > 0.75:
                return True
            return False

        valid_words = sum(1 for t in tokens if t in ENGLISH_WORDS_SET)
        valid_ratio = valid_words / len(tokens)

        if self.score >= 0.75 and valid_ratio >= 0.30:
            return True
        if valid_words >= 2:
            return True
        if self.score >= 0.88 and valid_ratio >= 0.20:
            return True

        return False

raw_blocks = []
for res_dict in results:
    texts = res_dict.get("rec_texts", [])
    scores = res_dict.get("rec_scores", [])
    boxes = res_dict.get("rec_boxes", [])

    for t, s, b in zip(texts, scores, boxes):
        blk = BoundingBlock(t, b, s)
        if blk.is_valid_line():
            raw_blocks.append(blk)

mid_x = img_width * 0.5
left_blocks = [b for b in raw_blocks if b.x0 < mid_x]
right_blocks = [b for b in raw_blocks if b.x0 >= mid_x]

def assemble_booklet_column(blocks):
    if not blocks:
        return []

    # Sort vertically with line tolerance band (22px)
    blocks.sort(key=lambda b: (round(b.y0 / 22) * 22, b.x0))

    questions = []
    current_q = []
    
    # Matches delimiters like: "3. a)", "4.a)", "b)", "(a)", "5. a)"
    delim_pattern = re.compile(r'^(\d+\s*\.\s*[a-d]\)|\d+\s*[\.\)]|\(?\d+\)?\s*[a-d]\)|\([a-d]\)|[a-d]\))', re.I)

    for b in blocks:
        # Check if line begins with a question delimiter
        if delim_pattern.match(b.text):
            if current_q:
                questions.append(" ".join(current_q))
                current_q = []
            current_q.append(b.text)
        else:
            if not current_q:
                current_q.append(b.text)
            else:
                current_q.append(b.text)

    if current_q:
        questions.append(" ".join(current_q))

    return questions

all_extracted = assemble_booklet_column(left_blocks) + assemble_booklet_column(right_blocks)

print("\n" + "="*70)
print(f"REFINED QUESTION EXTRACTION ({len(all_extracted)} found)")
print("="*70)

for idx, q in enumerate(all_extracted, 1):
    cleaned = re.sub(r'\s+', ' ', q).strip()
    print(f"\n[Question {idx}]:\n{cleaned}")

if os.path.exists(temp_img_path):
    os.remove(temp_img_path)

client.close()