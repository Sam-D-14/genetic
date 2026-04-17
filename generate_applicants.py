"""
generate_applicants.py
Run once in terminal to generate realistic Canadian applicant data.

Usage:
    python generate_applicants.py
    python generate_applicants.py --output my_applicants.json

Produces: applicants.json (array of applicant dicts)
"""

import json
import random
import argparse
from datetime import date, timedelta

# ── Canadian data pools ──────────────────────────────────────────────────────

FIRST_NAMES = [
    "James", "Sarah", "Michael", "Emily", "David", "Jessica", "Daniel", "Ashley",
    "Matthew", "Amanda", "Christopher", "Stephanie", "Andrew", "Nicole", "Joshua",
    "Melissa", "Ryan", "Jennifer", "Kevin", "Angela", "Priya", "Raj", "Amir",
    "Fatima", "Chen", "Wei", "Sophie", "Lucas", "Olivia", "Ethan",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
    "Martin", "Thompson", "Robinson", "Clark", "Rodriguez", "Patel", "Singh",
    "Kim", "Nguyen", "Tremblay", "Gagnon", "Roy", "Leblanc", "Cheng", "Kumar",
]

STREETS = [
    "Main St", "Queen St", "King St", "Yonge St", "Bay St", "Bloor St",
    "Dundas St", "College St", "Spadina Ave", "Bathurst St", "Dufferin St",
    "Keele St", "Jane St", "Wilson Ave", "Lawrence Ave", "Eglinton Ave",
    "Sheppard Ave", "Finch Ave", "Steeles Ave", "Dixon Rd",
]

PROVINCES = {
    "Ontario":           {"code": "ON", "postal_prefix": ["M", "L", "K", "N", "P"]},
    "British Columbia":  {"code": "BC", "postal_prefix": ["V"]},
    "Alberta":           {"code": "AB", "postal_prefix": ["T"]},
    "Quebec":            {"code": "QC", "postal_prefix": ["G", "H", "J"]},
    "Manitoba":          {"code": "MB", "postal_prefix": ["R"]},
    "Saskatchewan":      {"code": "SK", "postal_prefix": ["S"]},
    "Nova Scotia":       {"code": "NS", "postal_prefix": ["B"]},
    "New Brunswick":     {"code": "NB", "postal_prefix": ["E"]},
}

CITIES_BY_PROVINCE = {
    "Ontario":          ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton"],
    "British Columbia": ["Vancouver", "Surrey", "Burnaby", "Richmond", "Kelowna"],
    "Alberta":          ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Airdrie"],
    "Quebec":           ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil"],
    "Manitoba":         ["Winnipeg", "Brandon", "Steinbach", "Portage la Prairie"],
    "Saskatchewan":     ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw"],
    "Nova Scotia":      ["Halifax", "Dartmouth", "Sydney", "Truro"],
    "New Brunswick":    ["Moncton", "Saint John", "Fredericton", "Miramichi"],
}

EMPLOYERS = [
    "Maple Leaf Foods Inc.", "Rogers Communications", "TD Bank Group",
    "RBC Royal Bank", "Shoppers Drug Mart", "Loblaw Companies Ltd.",
    "Air Canada", "Bell Canada", "Telus Corporation", "Scotiabank",
    "BMO Financial Group", "CIBC", "Hydro One", "Ontario Power Generation",
    "Amazon Canada", "Google Canada", "Microsoft Canada", "IBM Canada",
    "Deloitte Canada", "KPMG Canada", "PwC Canada", "Accenture Canada",
    "Magna International", "Bombardier Inc.", "SNC-Lavalin Group",
]

PROPERTY_TYPES = [
    "Detached House", "Semi-Detached House", "Townhouse", "Condominium",
    "Duplex", "Basement Apartment",
]

BANKS = [
    "TD Canada Trust", "RBC Royal Bank", "Scotiabank", "BMO Bank of Montreal",
    "CIBC", "National Bank of Canada", "Tangerine", "EQ Bank",
]

BUSINESS_TYPES = [
    "Consulting", "Freelance Software Development", "Photography",
    "Graphic Design", "Accounting Services", "Real Estate Agent",
    "Personal Training", "Tutoring Services", "Catering", "Landscaping",
]

INSURANCE_COMPANIES = [
    "Intact Insurance", "Aviva Canada", "Desjardins Insurance",
    "Economical Insurance", "Wawanesa Insurance", "Co-operators",
    "Sun Life Financial", "Manulife", "Great-West Life",
]


# ── Generators ───────────────────────────────────────────────────────────────

def random_sin() -> str:
    """Generate a fake Canadian SIN (9 digits, formatted as XXX-XXX-XXX)."""
    digits = [random.randint(0, 9) for _ in range(9)]
    digits[0] = random.choice([1, 2, 3, 4, 5, 6, 7, 8, 9])
    return f"{digits[0]}{digits[1]}{digits[2]}-{digits[3]}{digits[4]}{digits[5]}-{digits[6]}{digits[7]}{digits[8]}"


def random_dob(min_age: int = 22, max_age: int = 65) -> str:
    today = date.today()
    age_days = random.randint(min_age * 365, max_age * 365)
    dob = today - timedelta(days=age_days)
    return dob.strftime("%Y-%m-%d")


def random_postal(prefix_list: list) -> str:
    prefix = random.choice(prefix_list)
    letters = "ABCEGHJKLMNPRSTVWXYZ"
    digits = "0123456789"
    return (
        f"{prefix}{random.choice(digits)}{random.choice(letters)} "
        f"{random.choice(digits)}{random.choice(letters)}{random.choice(digits)}"
    )


def random_phone() -> str:
    area = random.choice(["416", "647", "437", "905", "289", "519", "613", "343",
                           "604", "778", "236", "403", "587", "780", "514", "438"])
    return f"({area}) {random.randint(200,999)}-{random.randint(1000,9999)}"


def random_income(min_val: int = 35000, max_val: int = 180000) -> str:
    return f"{random.randint(min_val, max_val):,.2f}"


def random_address(province: str, city: str, postal: str) -> dict:
    number = random.randint(1, 9999)
    street = random.choice(STREETS)
    unit = f"Unit {random.randint(1, 50)}, " if random.random() < 0.3 else ""
    prov_data = PROVINCES[province]
    return {
        "street": f"{unit}{number} {street}",
        "city": city,
        "province": province,
        "province_code": prov_data["code"],
        "postal_code": postal,
        "full_address": f"{unit}{number} {street}, {city}, {prov_data['code']} {postal}",
    }


def generate_applicant(index: int) -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    province = random.choice(list(PROVINCES.keys()))
    city = random.choice(CITIES_BY_PROVINCE[province])
    postal = random_postal(PROVINCES[province]["postal_prefix"])
    address = random_address(province, city, postal)
    dob = random_dob()
    tax_year = str(date.today().year - 1)
    employment_income = random_income(40000, 160000)
    federal_tax = f"{float(employment_income.replace(',', '')) * random.uniform(0.18, 0.26):,.2f}"
    provincial_tax = f"{float(employment_income.replace(',', '')) * random.uniform(0.08, 0.14):,.2f}"
    cpp = f"{min(float(employment_income.replace(',', '')) * 0.0595, 3799.80):,.2f}"
    ei = f"{min(float(employment_income.replace(',', '')) * 0.0166, 1049.12):,.2f}"
    employer = random.choice(EMPLOYERS)
    has_business = random.random() < 0.35
    is_renter = random.random() < 0.55

    applicant = {
        # ── Identity ──────────────────────────────────────────────────────
        "id": f"applicant_{index:03d}",
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}",
        "date_of_birth": dob,
        "sin": random_sin(),
        "phone": random_phone(),
        "email": f"{first.lower()}.{last.lower()}{random.randint(1,99)}@email.ca",
        "gender": random.choice(["Male", "Female", "Non-binary", "Prefer not to say"]),

        # ── Address ───────────────────────────────────────────────────────
        "address": address["street"],
        "city": address["city"],
        "province": address["province"],
        "province_code": address["province_code"],
        "postal_code": address["postal_code"],
        "full_address": address["full_address"],
        "country": "Canada",

        # ── Employment ────────────────────────────────────────────────────
        "employer_name": employer,
        "employer_address": f"{random.randint(1, 999)} {random.choice(STREETS)}, {city}, {address['province_code']} {postal}",
        "employer_phone": random_phone(),
        "employment_status": random.choice(["Full-time", "Part-time", "Contract"]),
        "occupation": random.choice([
            "Software Engineer", "Accountant", "Nurse", "Teacher", "Sales Manager",
            "Project Manager", "Data Analyst", "Marketing Coordinator", "Electrician",
            "Administrative Assistant", "Financial Advisor", "Operations Manager",
        ]),
        "years_employed": str(random.randint(1, 20)),

        # ── T4 / Tax ──────────────────────────────────────────────────────
        "tax_year": tax_year,
        "employment_income": employment_income,
        "federal_tax_deducted": federal_tax,
        "provincial_tax_deducted": provincial_tax,
        "cpp_contributions": cpp,
        "ei_premiums": ei,
        "other_income": f"{random.randint(0, 15000):,.2f}" if random.random() < 0.4 else "0.00",
        "rrsp_contributions": f"{random.randint(0, 27830):,.2f}" if random.random() < 0.6 else "0.00",

        # ── Banking ───────────────────────────────────────────────────────
        "bank_name": random.choice(BANKS),
        "bank_transit": f"{random.randint(10000, 99999)}",
        "bank_institution": f"{random.randint(100, 999)}",
        "bank_account": f"{random.randint(1000000, 9999999)}",
        "credit_score": str(random.randint(580, 850)),

        # ── Property / Insurance ──────────────────────────────────────────
        "property_type": random.choice(PROPERTY_TYPES),
        "property_address": f"{random.randint(1, 9999)} {random.choice(STREETS)}, {city}, {address['province_code']} {postal}",
        "property_value": f"{random.randint(350000, 2000000):,.2f}",
        "insurance_company": random.choice(INSURANCE_COMPANIES),
        "insurance_policy_number": f"POL-{random.randint(100000, 999999)}",
        "insurance_amount": f"{random.randint(300000, 2000000):,.2f}",
        "insurance_premium_monthly": f"{random.randint(80, 400):,.2f}",
        "insurance_start_date": f"{tax_year}-01-01",
        "insurance_end_date": f"{int(tax_year)+1}-01-01",

        # ── Rental / Lease ────────────────────────────────────────────────
        "is_renter": is_renter,
        "rental_address": f"{random.randint(1, 9999)} {random.choice(STREETS)}, Apt {random.randint(1,50)}, {city}, {address['province_code']} {postal}" if is_renter else "",
        "monthly_rent": f"{random.randint(1200, 4500):,.2f}" if is_renter else "",
        "lease_start_date": f"{tax_year}-{random.randint(1,12):02d}-01" if is_renter else "",
        "lease_end_date": f"{int(tax_year)+1}-{random.randint(1,12):02d}-01" if is_renter else "",
        "landlord_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}" if is_renter else "",
        "landlord_phone": random_phone() if is_renter else "",
        "landlord_address": f"{random.randint(1, 9999)} {random.choice(STREETS)}, {city}, {address['province_code']} {postal}" if is_renter else "",
        "security_deposit": f"{random.randint(1200, 4500):,.2f}" if is_renter else "",

        # ── Sale Agreement ────────────────────────────────────────────────
        "purchase_price": f"{random.randint(350000, 2000000):,.2f}",
        "closing_date": f"{int(tax_year)+1}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
        "deposit_amount": f"{random.randint(10000, 100000):,.2f}",
        "realtor_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "realtor_brokerage": random.choice([
            "RE/MAX Canada", "Royal LePage", "Century 21 Canada",
            "Keller Williams", "Sutton Group", "Coldwell Banker Canada",
        ]),

        # ── Business (Statement of Business) ─────────────────────────────
        "has_business": has_business,
        "business_name": f"{last} {random.choice(BUSINESS_TYPES)} Services" if has_business else "",
        "business_type": random.choice(BUSINESS_TYPES) if has_business else "",
        "business_number": f"{random.randint(100000000, 999999999)}RT0001" if has_business else "",
        "business_address": address["full_address"] if has_business else "",
        "business_income": random_income(15000, 120000) if has_business else "0.00",
        "business_expenses": f"{random.randint(5000, 40000):,.2f}" if has_business else "0.00",
        "business_net_income": f"{random.randint(10000, 80000):,.2f}" if has_business else "0.00",
        "fiscal_year_end": "December 31",
    }

    return applicant


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate Canadian applicant test data")
    parser.add_argument("--output", default="applicants.json", help="Output JSON file path")
    args = parser.parse_args()

    while True:
        try:
            count = int(input("How many applicants to generate? ").strip())
            if count < 1:
                raise ValueError
            break
        except ValueError:
            print("Please enter a positive integer.")

    print(f"\nGenerating {count} Canadian applicant(s)...")
    applicants = [generate_applicant(i + 1) for i in range(count)]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(applicants, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {count} applicant(s) to '{args.output}'")
    print(f"\nSample applicant: {applicants[0]['full_name']} — {applicants[0]['city']}, {applicants[0]['province_code']}")


if __name__ == "__main__":
    main()
