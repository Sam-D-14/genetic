"""
pipeline.py
Orchestrates the full pipeline for N applicants × M PDFs.

For each (applicant, pdf) pair:
1. Detect PDF type
2. Extract structure / render images
3. Detect missing fields → return them for UI prompting
4. (After user fills missing fields) Map + fill PDF
5. Collect all filled PDFs → zip by applicant folder
"""

import io
import zipfile
import re
from pathlib import Path

from pdf_detector import (
    detect_pdf_type,
    extract_acroform_fields,
    extract_text_structure,
    render_pages_as_base64,
)
from claude_mapper import (
    detect_missing_fields,
    map_fields_acroform,
    map_fields_text_based,
    map_fields_scanned,
)
from pdf_filler import fill_acroform, fill_with_annotations


# ── Phase 1: Analyse all PDFs and detect missing fields ──────────────────────

def analyse_pdfs(
    pdf_files: dict[str, bytes],
    applicants: list[dict],
    progress_callback=None,
) -> dict:
    """
    Pre-analyses all uploaded PDFs and detects fields missing from applicant data.

    Args:
        pdf_files: {filename: pdf_bytes}
        applicants: list of applicant dicts
        progress_callback: callable(msg)

    Returns:
        analysis: {
            pdf_name: {
                "type": "acroform"|"text"|"scanned",
                "field_ids": [...],          # for missing-field detection
                "structure": {...},           # for text-based
                "page_images": [...],         # rendered pages
                "acroform_fields": [...],     # for acroform only
            }
        }
    """
    def log(msg):
        if progress_callback:
            progress_callback(msg)

    analysis = {}

    for pdf_name, pdf_bytes in pdf_files.items():
        log(f"🔍 Analysing **{pdf_name}**...")
        pdf_type = detect_pdf_type(pdf_bytes)
        log(f"   Type: `{pdf_type}`")

        page_images = render_pages_as_base64(pdf_bytes, dpi=150)
        log(f"   Rendered {len(page_images)} page(s)")

        entry = {
            "type": pdf_type,
            "page_images": page_images,
            "field_ids": [],
            "structure": {},
            "acroform_fields": [],
        }

        if pdf_type == "acroform":
            fields = extract_acroform_fields(pdf_bytes)
            entry["acroform_fields"] = fields
            entry["field_ids"] = [f["field_id"] for f in fields]
            log(f"   Found {len(fields)} AcroForm field(s)")

        elif pdf_type == "text":
            structure = extract_text_structure(pdf_bytes)
            entry["structure"] = structure
            entry["field_ids"] = [lbl["text"] for lbl in structure.get("labels", [])]
            log(f"   Extracted {len(entry['field_ids'])} text label(s)")

        analysis[pdf_name] = entry

    # Detect missing fields using first applicant as representative sample
    if applicants:
        sample = applicants[0]
        for pdf_name, entry in analysis.items():
            log(f"🔎 Checking missing fields in **{pdf_name}**...")
            try:
                missing = detect_missing_fields(
                    pdf_name=pdf_name,
                    field_identifiers=entry["field_ids"][:60],  # cap to avoid token limits
                    applicant_data=sample,
                )
                entry["missing_fields"] = missing
                if missing:
                    log(f"   ⚠️ {len(missing)} field(s) need user input")
                else:
                    log(f"   ✅ All fields covered by applicant data")
            except Exception as e:
                log(f"   ⚠️ Could not detect missing fields: {e}")
                entry["missing_fields"] = []

    return analysis


# ── Phase 2: Fill all PDFs and build ZIP ─────────────────────────────────────

def fill_all_and_zip(
    pdf_files: dict[str, bytes],
    applicants: list[dict],
    analysis: dict,
    user_overrides: dict,
    progress_callback=None,
) -> bytes:
    """
    Fills all PDFs for all applicants and returns a ZIP archive.

    Args:
        pdf_files: {filename: pdf_bytes}
        applicants: list of applicant dicts
        analysis: output from analyse_pdfs()
        user_overrides: {field_label: value} — user-provided values for missing fields
        progress_callback: callable(msg)

    Returns:
        ZIP bytes with structure: applicant_name/pdf_name.pdf
    """
    def log(msg):
        if progress_callback:
            progress_callback(msg)

    zip_buf = io.BytesIO()

    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for applicant in applicants:
            folder = _safe_folder_name(applicant.get("full_name", applicant.get("id", "applicant")))
            merged_data = {**applicant, **user_overrides}

            for pdf_name, pdf_bytes in pdf_files.items():
                log(f"📝 Filling **{pdf_name}** for **{applicant['full_name']}**...")
                entry = analysis.get(pdf_name, {})
                pdf_type = entry.get("type", "text")

                try:
                    filled = _fill_single(
                        pdf_bytes=pdf_bytes,
                        pdf_name=pdf_name,
                        pdf_type=pdf_type,
                        entry=entry,
                        applicant_data=merged_data,
                    )
                    arc_path = f"{folder}/{pdf_name}"
                    zf.writestr(arc_path, filled)
                    log(f"   ✅ Done → {arc_path}")

                except Exception as e:
                    log(f"   ❌ Error filling {pdf_name} for {applicant['full_name']}: {e}")

    zip_buf.seek(0)
    return zip_buf.getvalue()


# ── Internal: fill a single PDF ───────────────────────────────────────────────

def _fill_single(
    pdf_bytes: bytes,
    pdf_name: str,
    pdf_type: str,
    entry: dict,
    applicant_data: dict,
) -> bytes:
    page_images = entry.get("page_images", [])

    if pdf_type == "acroform":
        field_values = map_fields_acroform(
            field_list=entry["acroform_fields"],
            page_images=page_images,
            applicant_data=applicant_data,
        )
        return fill_acroform(pdf_bytes, field_values)

    elif pdf_type == "text":
        fields_json = map_fields_text_based(
            structure=entry["structure"],
            page_images=page_images,
            applicant_data=applicant_data,
        )
        return fill_with_annotations(pdf_bytes, fields_json)

    else:  # scanned
        fields_json = map_fields_scanned(
            page_images=page_images,
            applicant_data=applicant_data,
        )
        return fill_with_annotations(pdf_bytes, fields_json)


def _safe_folder_name(name: str) -> str:
    return re.sub(r"[^\w\-_. ]", "_", name).strip().replace(" ", "_")
