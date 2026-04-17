# Smart PDF Form Filler

AI-powered pipeline that fills any PDF form (T4, lease agreement, home insurance, pay stub, sale agreement, statement of business, etc.) automatically from applicant data — using **AWS Bedrock + Claude Sonnet 4**.

---

## Project Structure

```
pdf_form_filler/
├── generate_applicants.py   # Run once in terminal → produces applicants.json
├── app.py                   # Streamlit UI (5-step workflow)
├── pipeline.py              # Multi-applicant × multi-PDF orchestrator
├── pdf_detector.py          # PDF type detection + structure extraction
├── claude_mapper.py         # AWS Bedrock / Claude Sonnet 4 API calls
├── pdf_filler.py            # pymupdf / pypdf write-back engine
├── requirements.txt
└── README.md
```

---

## Prerequisites

- Python 3.11+
- AWS credentials configured (`~/.aws/credentials` or environment variables)
- AWS Bedrock access enabled in `us-east-1` with Claude Sonnet 4

### AWS Setup

```bash
# Configure AWS credentials
aws configure

# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId,'claude')]"
```

---

## Installation

```bash
pip install -r requirements.txt
```

---

## Usage

### Step 1 — Generate Applicant Data (run once)

```bash
python generate_applicants.py
# Prompts: How many applicants to generate?
# Outputs: applicants.json
```

Optional custom output path:
```bash
python generate_applicants.py --output my_clients.json
```

**What's generated per applicant (Canadian data):**
- Identity: full name, DOB, SIN, phone, email
- Address: street, city, province, postal code
- Employment: employer, occupation, income, years employed
- T4 fields: employment income, federal/provincial tax, CPP, EI, RRSP
- Banking: bank name, transit, institution, account number, credit score
- Property: type, address, value, insurance details
- Rental/Lease: rental address, monthly rent, lease dates, landlord info
- Sale Agreement: purchase price, closing date, deposit, realtor
- Business: business name, type, BN, income, expenses (35% of applicants)

---

### Step 2 — Launch Streamlit App

```bash
streamlit run app.py
```

---

### Step 3 — UI Workflow

The app guides you through 5 steps:

#### Step 1: Upload `applicants.json`
Upload the file generated in the terminal step. Shows a preview list of all applicants.

#### Step 2: Upload PDF Templates
Upload one or more blank/template PDFs. Supported form types:
- **T4** (tax slips)
- **Pay stubs**
- **Lease agreements**
- **Home insurance forms**
- **Statement of Business or Profession (T2125)**
- **Sale/purchase agreements**
- **Credit application forms**
- **Any other structured PDF form**

#### Step 3: Analyse PDFs
Click **Analyse PDFs & Detect Missing Fields**. The system:
1. Detects each PDF's type (AcroForm / text-based / scanned)
2. Extracts form structure and field labels
3. Asks Claude to identify any fields not covered by applicant data

#### Step 4: Fill Missing Fields
If any fields cannot be auto-filled, a form appears with:
- The field label
- A tooltip explaining why it's missing
- A text input (leave blank to skip that field)

#### Step 5: Generate & Download
Click **Generate All & Download ZIP**. The system:
- Runs Claude to map applicant data → each PDF's fields
- Writes values back to the PDF preserving original layout
- Packages everything into a ZIP:

```
filled_forms.zip
├── John_Smith/
│   ├── t4_2024.pdf
│   ├── lease_agreement.pdf
│   └── home_insurance.pdf
├── Jane_Doe/
│   ├── t4_2024.pdf
│   ├── lease_agreement.pdf
│   └── home_insurance.pdf
└── ...
```

---

## How PDF Filling Works

### PDF Type Detection

| Type | Detection Method | Fill Strategy |
|---|---|---|
| **AcroForm** (fillable fields) | pypdf field detection | Fill fields by ID name |
| **Text-based** (no form fields) | pdfplumber text extraction | pymupdf text overlay at exact coordinates |
| **Scanned** (image-based) | Fallback when no text found | Claude visual analysis + pymupdf overlay |

### Why pymupdf for overlay?
Unlike ReportLab (which creates a blank canvas) or PyPDF2 (which ignores layout), `pymupdf`'s `insert_textbox()` writes directly on top of the original PDF page — preserving all visual structure, borders, logos, and formatting.

### Why Claude for field mapping?
Claude receives:
- Page images (rendered at 150 DPI) for visual context
- Structured label/coordinate data from pdfplumber
- The full applicant data JSON

It returns precise field positions and values, handling variations in field label wording across different form types.

---

## Configuration

### Bedrock Model
Edit `claude_mapper.py` to change the model:
```python
BEDROCK_REGION = "us-east-1"
MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
```

### Render DPI
Edit `pipeline.py` → `render_pages_as_base64(pdf_bytes, dpi=150)`.
Higher DPI = better Claude visual accuracy but slower and higher token cost.
- `100` — fast, lower quality
- `150` — balanced (default)
- `200` — high quality, slower

---

## Known Limitations

- **Scanned PDFs**: Coordinate accuracy depends entirely on Claude's visual estimation. Expect ±5–10pt variance. Government-standardized forms (T4, T2125) are more reliable.
- **Multi-page complex forms**: Claude receives all pages but coordinate mapping across many pages increases token usage significantly.
- **Handwriting**: Not supported — only typed form fields.
- **Password-protected PDFs**: Must be decrypted before use.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `boto3.exceptions.NoCredentialsError` | Run `aws configure` or set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars |
| `ValidationException: model not found` | Verify the model ID in `claude_mapper.py` matches your Bedrock console |
| Filled text appears outside field boxes | PDF uses non-standard coordinate origin — open an issue with the PDF type |
| Missing fields form shows too many fields | Claude over-detected; leave extras blank to skip them |
| ZIP is empty | Check the Streamlit log in Step 5 for per-PDF errors |

---

## License

Internal use only. Do not distribute applicant data or filled forms beyond intended recipients.
