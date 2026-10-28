import io
import os
import re
import pymupdf  # PyMuPDF
import pytesseract
import requests
from dotenv import load_dotenv
from PIL import Image
from pymongo import MongoClient

load_dotenv()

# Configure default Windows Tesseract OCR path if present
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/canreal")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

EXPLICIT_FIGURE_RE = re.compile(
    r"\b(?:refer\s+to|as\s+shown\s+in|given\s+in|shown\s+below|in\s+the\s+following|see)\s+(?:fig(?:ure)?\.?|diagram|circuit|graph|sketch)\b"
    r"|\bfig(?:ure)?\.?\s*(\d+|[a-z])\b",
    re.IGNORECASE
)

DRAWING_EXCLUSIONS = [
    "draw a neat", "draw neat", "with a neat sketch", "with neat diagram",
    "draw the circuit", "draw the block", "draw the characteristics", "sketch and explain"
]

def is_corrupted_or_hindi_line(line):
    """
    Identifies Hindi translation lines, Devanagari script, and font/OCR
    corruption using structural and statistical phonotactic rules without
    relying on hardcoded word dictionaries.
    """
    line_clean = line.strip()
    if not line_clean:
        return True

    # 1. Unicode Devanagari range (Direct Hindi Unicode script)
    devanagari_chars = sum(1 for c in line_clean if '\u0900' <= c <= '\u097F')
    if devanagari_chars / len(line_clean) > 0.15:
        return True

    # 2. Legacy font ASCII glyph corruption (Kruti Dev / Chanakya ligatures)
    noise_symbols = sum(1 for c in line_clean if c in "{}~$^|°±¢¥§¶‘'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ")
    if noise_symbols / len(line_clean) > 0.06:
        return True

    # 3. Structural character pattern check for Latin OCR gibberish
    words = re.findall(r"\b[A-Za-z]+\b", line_clean)
    if not words:
        return True

    letters = "".join(words).lower()
    if len(letters) >= 12:
        vowel_count = sum(1 for c in letters if c in "aeiou")
        vowel_ratio = vowel_count / len(letters)

        # English text statistically maintains 25% - 58% vowels across technical sentences
        if vowel_ratio < 0.22 or vowel_ratio > 0.62:
            return True

        # Reject unnatural consonant clusters resulting from OCRing complex Hindi ligatures
        if re.search(r"[bcdfghjklmnpqrstvwxyz]{5,}", letters):
            return True

    return False

def clean_exam_text(raw_text):
    """
    Strips boilerplate exam headers and eliminates Hindi translation lines.
    """
    # Cut off standard header up to the instruction notes
    header_end = re.search(r"Note\s*:\s*.*?(?=(?:\n\s*1[\.\)]|\n\s*Q\.?\s*1))", raw_text, re.DOTALL | re.IGNORECASE)
    body = raw_text[header_end.end():] if header_end else raw_text

    cleaned_lines = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue

        # Skip headers, footers, and exam metadata
        if re.search(r"(Total No\. of|Roll No|Grading System|CBGS|PTO|Maximum Marks|Time\s*:\s*Three)", line, re.IGNORECASE):
            continue

        # Filter out Hindi / corrupted OCR lines
        if is_corrupted_or_hindi_line(line):
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines)

def detect_diagram(question_text, page_images):
    q_lower = question_text.lower()
    if EXPLICIT_FIGURE_RE.search(question_text):
        return True
    if any(phrase in q_lower for phrase in DRAWING_EXCLUSIONS):
        return False
    
    # Check for embedded sub-images (ignoring full-page scans)
    sub_diagrams = 0
    for img in page_images:
        try:
            w, h = img.get("width", 0), img.get("height", 0)
            if not (w > 1200 and h > 1600):
                sub_diagrams += 1
        except Exception:
            pass

    if sub_diagrams > 0 and any(term in q_lower for term in ["circuit", "waveform", "graph", "schematic", "network"]):
        return True

    return False

def split_into_questions(cleaned_text, page_images):
    # Matches: "1.", "1. a)", "Q.1", "(a)", "a)"
    pattern = r"(?=(?:^|\n)\s*(?:Q\.?\s*)?([1-8])\s*[\.\)]\s*(\([a-d]\)|[a-d]\))?)"
    chunks = re.split(pattern, cleaned_text, flags=re.IGNORECASE)

    questions = []
    i = 1
    while i < len(chunks):
        q_num = chunks[i] or ""
        sub_part = chunks[i+1] or ""
        body = chunks[i+2] if (i+2) < len(chunks) else ""

        full_label = f"Q.{q_num}{sub_part}".strip()
        text = body.strip().replace("\n", " ")

        if text and len(text) > 15:
            questions.append({
                "questionNumber": full_label,
                "questionText": text,
                "hasDiagram": detect_diagram(text, page_images),
                "marks": 7
            })
        i += 3

    # Fallback if standard subpart pattern missed
    if not questions:
        raw_items = re.split(r"\n(?=\d+\s*[\.\)])", cleaned_text)
        for item in raw_items:
            clean_item = item.strip().replace("\n", " ")
            if len(clean_item) > 20:
                questions.append({
                    "questionNumber": clean_item[:4].strip(),
                    "questionText": clean_item,
                    "hasDiagram": detect_diagram(clean_item, page_images),
                    "marks": 7
                })

    return questions

def map_unit_from_syllabus(question_text, syllabus):
    if not syllabus:
        return 1

    best_unit = 1
    highest_score = -1

    for unit_obj in syllabus:
        unit_num = unit_obj.get("unitNumber", 1)
        topics = unit_obj.get("topics", [])
        
        score = 0
        q_lower = question_text.lower()
        for topic in topics:
            words = [w for w in re.split(r"\W+", topic.lower()) if len(w) > 3]
            for w in words:
                if w in q_lower:
                    score += 1

        if score > highest_score:
            highest_score = score
            best_unit = unit_num

    return best_unit

def process_batch():
    raw_docs = list(db.documents.find({"category": "pyq"}))
    print(f"Found {len(raw_docs)} PYQ document(s) in database.\n")

    for doc in raw_docs:
        doc_id = doc["_id"]
        if db.questions.count_documents({"rawDocument": doc_id}) > 0:
            print(f"⏭  Skipping already processed: '{doc.get('title')}'")
            continue

        print(f"📥 Processing: '{doc.get('title')}'...")
        pdf_url = doc.get("fileUrl")
        if not pdf_url:
            continue

        try:
            res = requests.get(pdf_url, timeout=25)
            pdf_doc = pymupdf.open(stream=res.content, filetype="pdf")

            full_text = ""
            page_images_meta = []

            for page in pdf_doc:
                page_text = page.get_text().strip()

                # If the page has fewer than 80 chars, run local OCR
                if len(page_text) < 80:
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    page_text = pytesseract.image_to_string(img)

                full_text += f"\n{page_text}\n"

                for img_info in page.get_images():
                    page_images_meta.append({"width": img_info[2], "height": img_info[3]})

            cleaned = clean_exam_text(full_text)
            parsed_questions = split_into_questions(cleaned, page_images_meta)

            if not parsed_questions:
                print(f"   ⚠️ No questions matched pattern for '{doc.get('title')}'.")
                continue

            subject = db.subjects.find_one({"_id": doc["subject"]})
            syllabus = subject.get("syllabus", []) if subject else []

            records = []
            term = "Summer" if "summer" in doc.get("title", "").lower() else "Winter"
            year = doc.get("academicYear", 2026)

            for q in parsed_questions:
                unit = map_unit_from_syllabus(q["questionText"], syllabus)
                records.append({
                    "subject": doc["subject"],
                    "rawDocument": doc_id,
                    "unit": unit,
                    "questionNumber": q["questionNumber"],
                    "questionText": q["questionText"],
                    "marks": q["marks"],
                    "academicYear": year,
                    "sessionTerm": term,
                    "hasDiagram": q["hasDiagram"]
                })

            if records:
                db.questions.insert_many(records, ordered=False)
                print(f"   ✅ Saved {len(records)} questions into MongoDB.\n")

        except Exception as e:
            print(f"   ❌ Error processing '{doc.get('title')}': {e}\n")

if __name__ == "__main__":
    process_batch()
    client.close()