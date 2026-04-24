"""
claude_mapper.py

Calls AWS Bedrock (Claude Sonnet 4, us-east-1) to map PDF fields → applicant data.
Also identifies missing fields that need user input.

FIX: All three mapping functions now process pages ONE AT A TIME and merge results,
     preventing token-limit errors on multi-page documents.
"""

import json
import base64
import io
import boto3
from PIL import Image

# ── Bedrock client ────────────────────────────────────────────────────────────
BEDROCK_REGION = "us-east-1"
MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

# ── Image resize cap ──────────────────────────────────────────────────────────
MAX_IMAGE_WIDTH = 1200  # px — anything wider gets downscaled


def _resize_b64_image(b64_data: str, max_width: int = MAX_IMAGE_WIDTH) -> tuple[str, int, int]:
    """Resize a base64 PNG so its width never exceeds max_width. Returns (new_b64, width, height)."""
    img_bytes = base64.b64decode(b64_data)
    img = Image.open(io.BytesIO(img_bytes))
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        new_w = max_width
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        w, h = new_w, new_h
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8"), w, h


# ── Shared invoke helper ──────────────────────────────────────────────────────
def _invoke(system: str, user_content: list, max_tokens: int = 8192) -> str:
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user_content}],
    })
    response = bedrock.invoke_model(modelId=MODEL_ID, body=body)
    result = json.loads(response["body"].read())
    return result["content"][0]["text"].strip()


# ── Missing field detection ───────────────────────────────────────────────────
def detect_missing_fields(
    pdf_name: str,
    field_identifiers: list[str],
    applicant_data: dict,
) -> list[dict]:
    """
    Ask Claude which fields in the PDF cannot be filled from applicant_data.
    Returns list of {field_label, reason} for fields needing user input.
    """
    system = (
        "You are a form analysis assistant. "
        "Given a list of form field labels and applicant data, "
        "identify which fields CANNOT be filled from the applicant data. "
        "Respond ONLY with a valid JSON array. No markdown, no preamble. "
        'Format: [{"field_label": "...", "reason": "brief reason why data is missing"}] '
        "Return an empty array [] if all fields can be filled."
    )

    user_content = [
        {
            "type": "text",
            "text": (
                f"PDF FORM: {pdf_name}\n\n"
                f"FORM FIELDS DETECTED:\n{json.dumps(field_identifiers, indent=2)}\n\n"
                f"APPLICANT DATA KEYS AVAILABLE:\n{json.dumps(list(applicant_data.keys()), indent=2)}\n\n"
                "Which fields cannot be filled from the applicant data? "
                "Return only the JSON array."
            ),
        }
    ]

    raw = _invoke(system, user_content, max_tokens=2048)
    return _safe_parse_json(raw)


# ── AcroForm mapping (per-page chunked) ───────────────────────────────────────
def map_fields_acroform(
    field_list: list[dict],
    page_images: list[dict],
    applicant_data: dict,
) -> list[dict]:
    """
    Maps AcroForm field IDs → applicant values.
    Processes one page image at a time; merges results.
    Returns [{field_id, page, value}].
    """
    system = (
        "You are a document form-filling assistant. "
        "Given PDF form field IDs for a SINGLE PAGE and applicant data, "
        "map each field to the correct value. "
        "Respond ONLY with a valid JSON array. No markdown, no explanation. "
        'Format: [{"field_id": "...", "page": 1, "value": "..."}] '
        "Omit fields with no matching applicant data."
    )

    all_results: list[dict] = []

    for pg in page_images:
        page_num = pg["page"]

        # Only send fields that belong to this page
        page_fields = [f for f in field_list if f.get("page") == page_num]
        if not page_fields:
            continue

        b64, w, h = _resize_b64_image(pg["b64_image"])

        user_content = [
            {"type": "text", "text": f"Page {page_num} (width={w}px, height={h}px):"},
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": b64},
            },
            {
                "type": "text",
                "text": (
                    f"FORM FIELDS ON THIS PAGE:\n{json.dumps(page_fields, indent=2)}\n\n"
                    f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                    "Map every form field on this page to the correct applicant value. "
                    "Return only the JSON array."
                ),
            },
        ]

        raw = _invoke(system, user_content)
        page_result = _safe_parse_json(raw)
        if isinstance(page_result, list):
            all_results.extend(page_result)

    return all_results


# ── Text-based PDF mapping (per-page chunked) ─────────────────────────────────
def map_fields_text_based(
    structure: dict,
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For text-based non-fillable PDFs. Processes one page at a time, merges into
    a single fields.json-compatible dict with 'pages' and 'form_fields'.
    """
    system = (
        "You are a document form-filling assistant. "
        "Given PDF structure data (labels, lines, checkboxes with coordinates) "
        "for a SINGLE PAGE and the page image, identify all form fields and map "
        "applicant data to them. "
        "Respond ONLY with a valid JSON object. No markdown, no explanation.\n\n"
        "Required format:\n"
        "{\n"
        '  "page_info": {"page_number": 1, "pdf_width": 612, "pdf_height": 792},\n'
        '  "form_fields": [\n'
        "    {\n"
        '      "page_number": 1,\n'
        '      "field_label": "Last Name",\n'
        '      "description": "Applicant last name",\n'
        '      "label_bounding_box": [x0, top, x1, bottom],\n'
        '      "entry_bounding_box": [x0, top, x1, bottom],\n'
        '      "entry_text": {"text": "Smith", "font_size": 9}\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Use PDF coordinate system (y=0 at TOP, increases downward)\n"
        "- entry_bounding_box must be INSIDE the blank entry area, not overlapping labels\n"
        "- font_size 8-10 for text fields, 8 for checkboxes\n"
        "- For checkboxes, entry_text should be 'X'\n"
        "- Only include fields that have matching applicant data\n"
        "- Coordinates come from the structure JSON"
    )

    merged_pages = []
    merged_fields = []

    # Build a per-page lookup for structure elements
    all_labels = structure.get("labels", [])
    all_lines = structure.get("lines", [])
    all_checkboxes = structure.get("checkboxes", [])

    for pg in page_images:
        page_num = pg["page"]

        # Find the page metadata from structure
        page_meta = next(
            (p for p in structure.get("pages", []) if p["page_number"] == page_num),
            {"page_number": page_num, "pdf_width": pg["width"], "pdf_height": pg["height"]},
        )

        page_structure = {
            "pages": [page_meta],
            "labels": [l for l in all_labels if l.get("page") == page_num],
            "lines": [l for l in all_lines if l.get("page") == page_num],
            "checkboxes": [c for c in all_checkboxes if c.get("page") == page_num],
        }

        b64, w, h = _resize_b64_image(pg["b64_image"])

        user_content = [
            {"type": "text", "text": f"Page {page_num} (width={w}px, height={h}px):"},
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": b64},
            },
            {
                "type": "text",
                "text": (
                    f"PDF STRUCTURE FOR THIS PAGE:\n{json.dumps(page_structure, indent=2)}\n\n"
                    f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                    "Create the fields.json mapping for this page only. Return only the JSON object."
                ),
            },
        ]

        raw = _invoke(system, user_content)
        page_result = _safe_parse_json(raw)

        if isinstance(page_result, dict):
            if "page_info" in page_result:
                merged_pages.append(page_result["page_info"])
            if "form_fields" in page_result:
                merged_fields.extend(page_result["form_fields"])

    return {"pages": merged_pages, "form_fields": merged_fields}


# ── Scanned PDF mapping (per-page chunked) ────────────────────────────────────
def map_fields_scanned(
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For scanned/image-based PDFs. Processes one page at a time using Claude's
    visual analysis, then merges all results into a single fields.json dict.
    """
    system = (
        "You are a document form-filling assistant analyzing a SINGLE scanned form image. "
        "Identify all form fields visually and map applicant data to them. "
        "Respond ONLY with a valid JSON object. No markdown, no explanation.\n\n"
        "Required format:\n"
        "{\n"
        '  "page_info": {"page_number": 1, "image_width": 1700, "image_height": 2200},\n'
        '  "form_fields": [\n'
        "    {\n"
        '      "page_number": 1,\n'
        '      "field_label": "Last Name",\n'
        '      "description": "Applicant last name",\n'
        '      "label_bounding_box": [x0, top, x1, bottom],\n'
        '      "entry_bounding_box": [x0, top, x1, bottom],\n'
        '      "entry_text": {"text": "Smith", "font_size": 9}\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Use IMAGE pixel coordinates (y=0 at TOP)\n"
        "- entry_bounding_box must be in the blank entry area\n"
        "- font_size 8-10, for checkboxes use 'X' at font_size 8\n"
        "- Only include fields with matching applicant data"
    )

    merged_pages = []
    merged_fields = []

    for pg in page_images:
        page_num = pg["page"]
        b64, w, h = _resize_b64_image(pg["b64_image"])

        user_content = [
            {"type": "text", "text": f"Page {page_num} (width={w}px, height={h}px):"},
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": b64},
            },
            {
                "type": "text",
                "text": (
                    f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                    "Analyze this single form page. Map applicant data to every matching field. "
                    "Return only the JSON object."
                ),
            },
        ]

        raw = _invoke(system, user_content)
        page_result = _safe_parse_json(raw)

        if isinstance(page_result, dict):
            if "page_info" in page_result:
                merged_pages.append(page_result["page_info"])
            if "form_fields" in page_result:
                merged_fields.extend(page_result["form_fields"])

    return {"pages": merged_pages, "form_fields": merged_fields}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _build_image_blocks(page_images: list[dict]) -> list[dict]:
    """Legacy helper kept for backward compatibility (not used by chunked functions)."""
    blocks = []
    for pg in page_images:
        b64, w, h = _resize_b64_image(pg["b64_image"])
        blocks.append({"type": "text", "text": f"Page {pg['page']} (width={w}px, height={h}px):"})
        blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": b64,
            },
        })
    return blocks


def _safe_parse_json(raw: str):
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(raw.strip())
