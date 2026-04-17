"""
pdf_detector.py
Detects PDF type (fillable AcroForm vs text-based vs scanned)
and extracts raw structure for Claude to analyze.
"""

import base64
import tempfile

import fitz  # pymupdf
import pdfplumber
from pypdf import PdfReader


def detect_pdf_type(pdf_bytes: bytes) -> str:
    """Returns one of: 'acroform' | 'text' | 'scanned'"""
    reader = PdfReader(_bytes_to_tmp(pdf_bytes))
    if reader.get_fields():
        return "acroform"

    with pdfplumber.open(_bytes_to_tmp(pdf_bytes)) as pdf:
        total_text = ""
        for page in pdf.pages:
            total_text += page.extract_text() or ""

    if len(total_text.strip()) > 50:
        return "text"

    return "scanned"


def extract_acroform_fields(pdf_bytes: bytes) -> list[dict]:
    """Extracts AcroForm field names, types, and rects."""
    reader = PdfReader(_bytes_to_tmp(pdf_bytes))
    result = []

    for page_num, page in enumerate(reader.pages, 1):
        annotations = page.get("/Annots", [])
        if not annotations:
            continue
        for annot in annotations:
            obj = annot.get_object()
            ft = obj.get("/FT")
            t = obj.get("/T")
            rect = obj.get("/Rect")
            if t and rect:
                result.append({
                    "field_id": str(t),
                    "page": page_num,
                    "rect": [float(x) for x in rect],
                    "type": _map_field_type(ft),
                })

    return result


def extract_text_structure(pdf_bytes: bytes) -> dict:
    """Extracts text labels, lines, and checkbox rects from a text-based PDF."""
    structure = {"pages": [], "labels": [], "lines": [], "checkboxes": []}

    with pdfplumber.open(_bytes_to_tmp(pdf_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            structure["pages"].append({
                "page_number": page_num,
                "pdf_width": float(page.width),
                "pdf_height": float(page.height),
            })
            for w in page.extract_words():
                structure["labels"].append({
                    "page": page_num,
                    "text": w["text"],
                    "x0": round(float(w["x0"]), 1),
                    "top": round(float(w["top"]), 1),
                    "x1": round(float(w["x1"]), 1),
                    "bottom": round(float(w["bottom"]), 1),
                })
            for line in page.lines:
                if abs(float(line["x1"]) - float(line["x0"])) > page.width * 0.4:
                    structure["lines"].append({
                        "page": page_num,
                        "y": round(float(line["top"]), 1),
                        "x0": round(float(line["x0"]), 1),
                        "x1": round(float(line["x1"]), 1),
                    })
            for rect in page.rects:
                w = float(rect["x1"]) - float(rect["x0"])
                h = float(rect["bottom"]) - float(rect["top"])
                if 5 <= w <= 15 and 5 <= h <= 15 and abs(w - h) < 3:
                    structure["checkboxes"].append({
                        "page": page_num,
                        "x0": round(float(rect["x0"]), 1),
                        "top": round(float(rect["top"]), 1),
                        "x1": round(float(rect["x1"]), 1),
                        "bottom": round(float(rect["bottom"]), 1),
                    })

    return structure


def render_pages_as_base64(pdf_bytes: bytes, dpi: int = 150) -> list[dict]:
    """Renders each PDF page as a base64 PNG for Claude visual analysis."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for i, page in enumerate(doc):
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        pages.append({
            "page": i + 1,
            "width": pix.width,
            "height": pix.height,
            "b64_image": base64.b64encode(img_bytes).decode("utf-8"),
        })
    doc.close()
    return pages


def _bytes_to_tmp(pdf_bytes: bytes) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(pdf_bytes)
    tmp.flush()
    return tmp.name


def _map_field_type(ft) -> str:
    mapping = {"/Tx": "text", "/Btn": "checkbox", "/Ch": "choice", "/Sig": "signature"}
    return mapping.get(str(ft), "unknown")
