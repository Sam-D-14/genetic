"""
pipeline.py
Orchestrates the full PDF form filling pipeline:
1. Detect PDF type
2. Extract structure / render images
3. Call Claude to map fields → applicant data
4. Write values back to PDF
5. Return filled PDF bytes
"""

import json
from typing import Optional

from pdf_detector import (
    detect_pdf_type,
    extract_acroform_fields,
    extract_text_structure,
    render_pages_as_base64,
)
from claude_mapper import (
    map_fields_acroform,
    map_fields_text_based,
    map_fields_scanned,
)
from pdf_filler import fill_acroform, fill_with_annotations


def run_pipeline(
    pdf_bytes: bytes,
    applicant_data: dict,
    progress_callback=None,
) -> tuple[bytes, str, dict]:
    """
    Main pipeline entry point.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF
        applicant_data: Dict of applicant fields (name, DOB, SIN, etc.)
        progress_callback: Optional callable(step: str) for UI updates

    Returns:
        (filled_pdf_bytes, pdf_type, fields_mapping)
    """

    def log(msg: str):
        if progress_callback:
            progress_callback(msg)

    # Step 1: Detect type
    log("🔍 Detecting PDF type...")
    pdf_type = detect_pdf_type(pdf_bytes)
    log(f"📄 PDF type: **{pdf_type.upper()}**")

    # Step 2: Always render page images (needed for Claude visual context)
    log("🖼️ Rendering page images for analysis...")
    page_images = render_pages_as_base64(pdf_bytes, dpi=150)
    log(f"   Rendered {len(page_images)} page(s)")

    # Step 3: Type-specific extraction + Claude mapping
    if pdf_type == "acroform":
        log("📋 Extracting AcroForm fields...")
        field_list = extract_acroform_fields(pdf_bytes)
        log(f"   Found {len(field_list)} form field(s)")

        log("🤖 Asking Claude to map fields to applicant data...")
        field_values = map_fields_acroform(
            field_list=field_list,
            page_images=page_images,
            applicant_data=applicant_data,
            page_dimensions=[],
        )
        log(f"   Mapped {len(field_values)} field(s)")

        log("✍️ Writing values into PDF...")
        filled_bytes = fill_acroform(pdf_bytes, field_values)

        return filled_bytes, pdf_type, {"type": "acroform", "mapped_fields": field_values}

    elif pdf_type == "text":
        log("🔡 Extracting text structure and coordinates...")
        structure = extract_text_structure(pdf_bytes)
        label_count = len(structure.get("labels", []))
        log(f"   Extracted {label_count} text element(s)")

        log("🤖 Asking Claude to map fields to applicant data...")
        fields_json = map_fields_text_based(
            structure=structure,
            page_images=page_images,
            applicant_data=applicant_data,
        )
        mapped_count = len(fields_json.get("form_fields", []))
        log(f"   Mapped {mapped_count} field(s)")

        log("✍️ Writing values into PDF...")
        filled_bytes = fill_with_annotations(pdf_bytes, fields_json)

        return filled_bytes, pdf_type, {"type": "text", "fields_json": fields_json}

    else:  # scanned
        log("🖼️ Scanned PDF detected — using visual analysis...")

        log("🤖 Asking Claude to identify and map fields visually...")
        fields_json = map_fields_scanned(
            page_images=page_images,
            applicant_data=applicant_data,
        )
        mapped_count = len(fields_json.get("form_fields", []))
        log(f"   Mapped {mapped_count} field(s)")

        log("✍️ Writing values into PDF...")
        filled_bytes = fill_with_annotations(pdf_bytes, fields_json)

        return filled_bytes, pdf_type, {"type": "scanned", "fields_json": fields_json}
