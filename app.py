"""
app.py
Streamlit UI for the Smart PDF Form Filler.
Upload any PDF + paste applicant JSON → download filled PDF.
"""

import json
import base64
import io
import streamlit as st
from pipeline import run_pipeline

# ── Page config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Smart PDF Form Filler",
    page_icon="📄",
    layout="wide",
)

# ── Styles ──────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main-header { font-size: 2rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
    .sub-header  { font-size: 1rem; color: #64748b; margin-bottom: 2rem; }
    .badge       { display: inline-block; padding: 2px 10px; border-radius: 12px;
                   font-size: 0.78rem; font-weight: 600; }
    .badge-acroform { background: #dbeafe; color: #1d4ed8; }
    .badge-text     { background: #dcfce7; color: #15803d; }
    .badge-scanned  { background: #fef9c3; color: #a16207; }
    .log-box     { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                   padding: 12px 16px; font-size: 0.85rem; font-family: monospace;
                   max-height: 220px; overflow-y: auto; }
</style>
""", unsafe_allow_html=True)

# ── Header ──────────────────────────────────────────────────────────────────
st.markdown('<div class="main-header">📄 Smart PDF Form Filler</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-header">Upload any tax form, pay stub, or document template — '
    'AI fills it automatically from your applicant data.</div>',
    unsafe_allow_html=True,
)

# ── Layout ──────────────────────────────────────────────────────────────────
col_left, col_right = st.columns([1, 1], gap="large")

# ── Left column: inputs ─────────────────────────────────────────────────────
with col_left:
    st.subheader("1. Upload Template PDF")
    uploaded_file = st.file_uploader(
        "Accepts: T4, pay stub, CIBR, or any fillable / blank form",
        type=["pdf"],
        label_visibility="collapsed",
    )

    st.subheader("2. Applicant Data (JSON)")
    default_json = json.dumps({
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "1985-06-15",
        "sin": "123-456-789",
        "address": "123 Main St, Toronto, ON M5V 1A1",
        "employer_name": "Acme Corp",
        "employment_income": "85000.00",
        "federal_tax_deducted": "18000.00",
        "province": "Ontario",
        "tax_year": "2024",
    }, indent=2)

    applicant_json_str = st.text_area(
        "Paste or edit applicant data",
        value=default_json,
        height=320,
        label_visibility="collapsed",
    )

    run_btn = st.button("🚀 Fill Form", type="primary", use_container_width=True)

# ── Right column: output ────────────────────────────────────────────────────
with col_right:
    st.subheader("3. Result")

    result_placeholder = st.empty()
    log_placeholder = st.empty()
    download_placeholder = st.empty()

    if not run_btn:
        result_placeholder.info("Upload a PDF and provide applicant data, then click **Fill Form**.")

# ── Helpers ─────────────────────────────────────────────────────────────────

def _show_pdf_preview(pdf_bytes: bytes):
    """Render first page of PDF as an inline image preview."""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        mat = fitz.Matrix(1.5, 1.5)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        doc.close()
        st.image(img_bytes, use_container_width=True)
    except Exception:
        st.caption("Preview unavailable.")


# ── Run pipeline ────────────────────────────────────────────────────────────
if run_btn:
    errors = []

    if not uploaded_file:
        errors.append("Please upload a PDF file.")

    try:
        applicant_data = json.loads(applicant_json_str)
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {e}")
        applicant_data = {}

    if errors:
        with col_right:
            for err in errors:
                st.error(err)
    else:
        pdf_bytes = uploaded_file.read()
        log_lines = []

        def update_log(msg: str):
            log_lines.append(msg)
            log_html = "<br>".join(log_lines)
            log_placeholder.markdown(
                f'<div class="log-box">{log_html}</div>',
                unsafe_allow_html=True,
            )

        with col_right:
            result_placeholder.info("⏳ Processing — this may take 15–30 seconds...")

            try:
                filled_bytes, pdf_type, mapping = run_pipeline(
                    pdf_bytes=pdf_bytes,
                    applicant_data=applicant_data,
                    progress_callback=update_log,
                )

                badge_class = f"badge-{pdf_type}"
                result_placeholder.markdown(
                    f'✅ Done &nbsp; <span class="badge {badge_class}">{pdf_type.upper()}</span>',
                    unsafe_allow_html=True,
                )

                # Download button
                download_placeholder.download_button(
                    label="⬇️ Download Filled PDF",
                    data=filled_bytes,
                    file_name=f"filled_{uploaded_file.name}",
                    mime="application/pdf",
                    use_container_width=True,
                )

                # Preview thumbnail
                st.subheader("Preview (Page 1)")
                _show_pdf_preview(filled_bytes)

                # Mapping details expander
                with st.expander("🔍 Field Mapping Details"):
                    st.json(mapping)

            except Exception as e:
                result_placeholder.error(f"❌ Pipeline error: {e}")
                import traceback
                st.code(traceback.format_exc())
