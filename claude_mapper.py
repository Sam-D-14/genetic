"""
claude_mapper.py
Sends PDF structure + page images + applicant JSON to Claude.
Returns a fields.json-compatible list of {field_label, page, entry_bounding_box, entry_text}.
"""

import json
import os
from anthropic import Anthropic

client = Anthropic()


def map_fields_acroform(
    field_list: list[dict],
    page_images: list[dict],
    applicant_data: dict,
    page_dimensions: list[dict],
) -> list[dict]:
    """
    For AcroForm PDFs. Claude maps field_ids to applicant values.
    Returns list of {field_id, page, value}.
    """
    system = (
        "You are a document form-filling assistant. "
        "Given a list of PDF form field IDs and applicant data, "
        "map each field to the correct applicant value. "
        "Respond ONLY with a valid JSON array. No markdown, no explanation. "
        "Format: [{\"field_id\": \"...\", \"page\": 1, \"value\": \"...\"}]"
        "If a field has no matching applicant data, omit it from the output."
    )

    image_blocks = _build_image_blocks(page_images)

    user_content = image_blocks + [
        {
            "type": "text",
            "text": (
                f"FORM FIELDS:\n{json.dumps(field_list, indent=2)}\n\n"
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Map every form field to the correct applicant value. "
                "Use the page images to understand what each field is for. "
                "Return only the JSON array."
            ),
        }
    ]

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    return _safe_parse_json(raw)


def map_fields_text_based(
    structure: dict,
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For text-based (non-fillable) PDFs.
    Claude analyzes structure + images and returns a fields.json-compatible dict.
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
        "- entry_bounding_box must be INSIDE the field entry area, not overlapping labels\n"
        "- font_size should be 8-10 for most form fields\n"
        "- For checkboxes, entry_text should be 'X' with font_size 8\n"
        "- Only include fields that have matching applicant data\n"
        "- Coordinates come from the structure JSON, not the images"
    )

    image_blocks = _build_image_blocks(page_images)

    user_content = image_blocks + [
        {
            "type": "text",
            "text": (
                f"PDF STRUCTURE:\n{json.dumps(structure, indent=2)}\n\n"
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Analyze the structure and page images. "
                "Create the fields.json mapping for all matched fields. "
                "Return only the JSON object."
            ),
        }
    ]

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=8192,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    return _safe_parse_json(raw)


def map_fields_scanned(
    page_images: list[dict],
    applicant_data: dict,
) -> dict:
    """
    For scanned/image-based PDFs.
    Claude does full visual analysis and returns fields.json using image coordinates.
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
        "- font_size 8-10 for text fields, 8 for checkboxes\n"
        "- Only include fields with matching applicant data"
    )

    image_blocks = _build_image_blocks(page_images)

    user_content = image_blocks + [
        {
            "type": "text",
            "text": (
                f"APPLICANT DATA:\n{json.dumps(applicant_data, indent=2)}\n\n"
                "Analyze these form images. Map applicant data to every matching field. "
                "Return only the JSON object."
            ),
        }
    ]

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=8192,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    return _safe_parse_json(raw)


def _build_image_blocks(page_images: list[dict]) -> list[dict]:
    blocks = []
    for pg in page_images:
        blocks.append({
            "type": "text",
            "text": f"Page {pg['page']} (width={pg['width']}px, height={pg['height']}px):",
        })
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
    # Strip markdown fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(raw.strip())
