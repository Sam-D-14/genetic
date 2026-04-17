"""
claude_mapper.py
Calls AWS Bedrock (Claude Sonnet 4, us-east-1) to map PDF fields → applicant data.
Also identifies missing fields that need user input.
"""

import json
import boto3

# ── Bedrock client ───────────────────────────────────────────────────────────
BEDROCK_REGION = "us-east-1"
MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


# ── Shared invoke helper ─────────────────────────────────────────────────────

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


# ── Missing field detection ──────────────────────────────────────────────────

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


# ── AcroForm mapping ─────────────────────────────────────────────────────────

def map_fields_acroform(
    field_list: list[dict],
    page_images: list[dict],
    applicant_data: dict,
) -> list[dict]:
    """
    Maps AcroForm field IDs → applicant values.
    Returns [{field_id, page, value}].
    """
    system = (
        "You are a document form-filling assistant. "
        "Given PDF form field IDs and applicant data, map each field to the correct value. "
        "Respond ONLY with a valid JSON array. No markdown, no explanation. "
        'Format: [{"field_id": "...", "page": 1, "value": "..."}] '
        "Omit fields with no matching applicant data."
    )

    user_content = _build_image_blocks(page_images) + [
        {
            "type": "text",
            "text": (
                f"FORM FIELDS:\n{json.dumps(field_list, indent=2)}\n\n"
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Map every form field to the correct applicant value. "
                "Use the page images to understand each field's purpose. "
                "Return only the JSON array."
            ),
        }
    ]

    raw = _invoke(system, user_content)
    return _safe_parse_json(raw)


# ── Text-based PDF mapping ───────────────────────────────────────────────────

def map_fields_text_based(
    structure: dict,
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For text-based non-fillable PDFs.
    Returns fields.json-compatible dict with 'pages' and 'form_fields'.
    """
    system = (
        "You are a document form-filling assistant. "
        "Given PDF structure data (labels, lines, checkboxes with coordinates) "
        "and page images, identify all form fields and map applicant data to them. "
        "Respond ONLY with a valid JSON object. No markdown, no explanation.\n\n"
        "Required format:\n"
        "{\n"
        "  \"pages\": [{\"page_number\": 1, \"pdf_width\": 612, \"pdf_height\": 792}],\n"
        "  \"form_fields\": [\n"
        "    {\n"
        "      \"page_number\": 1,\n"
        "      \"field_label\": \"Last Name\",\n"
        "      \"description\": \"Applicant last name\",\n"
        "      \"label_bounding_box\": [x0, top, x1, bottom],\n"
        "      \"entry_bounding_box\": [x0, top, x1, bottom],\n"
        "      \"entry_text\": {\"text\": \"Smith\", \"font_size\": 9}\n"
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

    user_content = _build_image_blocks(page_images) + [
        {
            "type": "text",
            "text": (
                f"PDF STRUCTURE:\n{json.dumps(structure, indent=2)}\n\n"
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Create the fields.json mapping. Return only the JSON object."
            ),
        }
    ]

    raw = _invoke(system, user_content)
    return _safe_parse_json(raw)


# ── Scanned PDF mapping ──────────────────────────────────────────────────────

def map_fields_scanned(
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For scanned/image-based PDFs.
    Claude does full visual analysis using image coordinates.
    """
    system = (
        "You are a document form-filling assistant analyzing scanned form images. "
        "Identify all form fields visually and map applicant data to them. "
        "Respond ONLY with a valid JSON object. No markdown, no explanation.\n\n"
        "Required format:\n"
        "{\n"
        "  \"pages\": [{\"page_number\": 1, \"image_width\": 1700, \"image_height\": 2200}],\n"
        "  \"form_fields\": [\n"
        "    {\n"
        "      \"page_number\": 1,\n"
        "      \"field_label\": \"Last Name\",\n"
        "      \"description\": \"Applicant last name\",\n"
        "      \"label_bounding_box\": [x0, top, x1, bottom],\n"
        "      \"entry_bounding_box\": [x0, top, x1, bottom],\n"
        "      \"entry_text\": {\"text\": \"Smith\", \"font_size\": 9}\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Use IMAGE pixel coordinates (y=0 at TOP)\n"
        "- entry_bounding_box must be in the blank entry area\n"
        "- font_size 8-10, for checkboxes use 'X' at font_size 8\n"
        "- Only include fields with matching applicant data"
    )

    user_content = _build_image_blocks(page_images) + [
        {
            "type": "text",
            "text": (
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Analyze these form images. Map applicant data to every matching field. "
                "Return only the JSON object."
            ),
        }
    ]

    raw = _invoke(system, user_content)
    return _safe_parse_json(raw)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_image_blocks(page_images: list[dict]) -> list[dict]:
    blocks = []
    for pg in page_images:
        blocks.append({"type": "text", "text": f"Page {pg['page']} (width={pg['width']}px, height={pg['height']}px):"})
        blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": pg["b64_image"],
            },
        })
    return blocks


def _safe_parse_json(raw: str):
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(raw.strip())
