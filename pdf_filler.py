"""
pdf_filler.py
Writes mapped field values back onto the original PDF.
- AcroForm: fills fields by name via pypdf
- Text/Scanned: overlays text at bounding box coords via pymupdf
"""

import io
import tempfile

import fitz  # pymupdf
from pypdf import PdfReader, PdfWriter


# ── AcroForm filling ─────────────────────────────────────────────────────────

def fill_acroform(pdf_bytes: bytes, field_values: list[dict]) -> bytes:
    """
    field_values: [{field_id, page, value}]
    Returns filled PDF bytes.
    """
    tmp_in = _bytes_to_tmp(pdf_bytes)
    reader = PdfReader(tmp_in)
    writer = PdfWriter()
    writer.append(reader)

    value_map = {item["field_id"]: item["value"] for item in field_values}
    for page in writer.pages:
        try:
            writer.update_page_form_field_values(page, value_map)
        except Exception:
            pass

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ── Text overlay filling ──────────────────────────────────────────────────────

def fill_with_annotations(pdf_bytes: bytes, fields_json: dict) -> bytes:
    """
    fields_json: dict with 'pages' and 'form_fields' from claude_mapper.
    Auto-detects coordinate system (pdf vs image) and writes text overlays.
    Returns filled PDF bytes.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_meta = {p["page_number"]: p for p in fields_json.get("pages", [])}

    for field in fields_json.get("form_fields", []):
        page_num = field["page_number"] - 1  # 0-indexed
        if page_num < 0 or page_num >= len(doc):
            continue

        page = doc[page_num]
        pdf_w = page.rect.width
        pdf_h = page.rect.height

        meta = pages_meta.get(field["page_number"], {})
        use_image_coords = "image_width" in meta and "image_height" in meta

        entry_box = field.get("entry_bounding_box", [])
        if len(entry_box) != 4:
            continue

        x0, top, x1, bottom = entry_box

        if use_image_coords:
            img_w = meta["image_width"]
            img_h = meta["image_height"]
            x0 = x0 * (pdf_w / img_w)
            x1 = x1 * (pdf_w / img_w)
            top = top * (pdf_h / img_h)
            bottom = bottom * (pdf_h / img_h)

        entry_text = field.get("entry_text", {})
        text = str(entry_text.get("text", ""))
        font_size = float(entry_text.get("font_size", 9))

        if not text:
            continue

        rect = fitz.Rect(x0, top, x1, bottom) & page.rect
        if rect.is_empty or rect.is_infinite:
            continue

        try:
            page.insert_textbox(
                rect, text,
                fontsize=font_size,
                fontname="helv",
                color=(0, 0, 0),
                align=0,
            )
        except Exception:
            try:
                page.insert_text(
                    fitz.Point(x0 + 1, top + font_size + 1),
                    text, fontsize=font_size,
                    fontname="helv", color=(0, 0, 0),
                )
            except Exception:
                pass

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True)
    doc.close()
    return buf.getvalue()


def _bytes_to_tmp(pdf_bytes: bytes) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(pdf_bytes)
    tmp.flush()
    return tmp.name
