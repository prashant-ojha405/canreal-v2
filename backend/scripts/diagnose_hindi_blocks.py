import io
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
temp_img_path = "temp_page_2.png"
pix.save(temp_img_path)

print("Initializing English PaddleOCR...")
ocr = PaddleOCR(lang="en", device="cpu", enable_mkldnn=False)

print("Running inference...")
results = ocr.predict(temp_img_path)

COMMON_ENGLISH_WORDS = {
    "define", "explain", "write", "types", "prevention", "of", "and", "the",
    "theory", "mechanism", "corrosion", "what", "is", "difference", "between",
    "state", "calculate", "derive", "draw", "diagram", "with", "neat", "sketch",
    "short", "notes", "following", "unit", "marks", "or"
}

def calculate_text_health(text: str, score: float) -> dict:
    clean_text = text.strip()
    if not clean_text:
        return {
            "text": "",
            "score": score,
            "vowel_ratio": 0.0,
            "symbol_ratio": 0.0,
            "verdict": "EMPTY"
        }
    
    # 1. Check for standalone question/subquestion markers: e.g. [3], [4], (a), (b), Q.1, OR
    if re.fullmatch(r'(\[\d+\]|\(\d+\)|\([a-z]\)|[a-z]\)|\d+\.?|OR)', clean_text, re.IGNORECASE):
        return {
            "text": clean_text,
            "score": score,
            "vowel_ratio": 0.0,
            "symbol_ratio": 0.0,
            "verdict": "STRUCT_MARK"
        }

    alpha_chars = [c for c in clean_text if c.isalpha()]
    total_chars = len(clean_text)
    symbols = [c for c in clean_text if not c.isalnum() and not c.isspace()]
    
    vowels = [c for c in alpha_chars if c.lower() in 'aeiou']
    vowel_ratio = len(vowels) / len(alpha_chars) if alpha_chars else 0.0
    symbol_ratio = len(symbols) / total_chars if total_chars else 0.0
    
    words = re.findall(r'[a-zA-Z]{2,}', clean_text.lower())
    has_known_english = any(w in COMMON_ENGLISH_WORDS for w in words)
    
    # Heuristic for misread Hindi lines:
    # 1. Low recognition confidence (< 0.78) with abnormal vowel ratio or sparse single-letter words
    # 2. Or pure non-alphabetic numeric noise like "100002", "2 B 122 %06"
    # 3. No genuine English question vocabulary found
    is_noise_or_hindi = False
    
    if score < 0.78 and not has_known_english:
        is_noise_or_hindi = True
    elif (vowel_ratio < 0.15 or vowel_ratio > 0.65) and not has_known_english:
        is_noise_or_hindi = True
    elif symbol_ratio > 0.35:
        is_noise_or_hindi = True

    verdict = "HINDI_GARBAGE" if is_noise_or_hindi else "ENGLISH_KEEP"

    return {
        "text": clean_text,
        "score": score,
        "vowel_ratio": round(vowel_ratio, 2),
        "symbol_ratio": round(symbol_ratio, 2),
        "verdict": verdict
    }

print("\n" + "="*85)
print(f"{'IDX':<4} | {'CONF':<6} | {'VOWEL':<6} | {'SYM':<5} | {'VERDICT':<14} | {'RAW TEXT'}")
print("="*85)

for res_dict in results:
    texts = res_dict.get("rec_texts", [])
    scores = res_dict.get("rec_scores", [])
    boxes = res_dict.get("rec_boxes", [])
    
    for idx, (t, s) in enumerate(zip(texts, scores)):
        metrics = calculate_text_health(t, s)
        print(f"[{idx+1:02d}] | {metrics['score']:<6.2f} | {metrics['vowel_ratio']:<6} | {metrics['symbol_ratio']:<5} | {metrics['verdict']:<14} | {metrics['text']}")

if os.path.exists(temp_img_path):
    os.remove(temp_img_path)

client.close()