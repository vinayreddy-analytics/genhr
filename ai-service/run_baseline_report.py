# run_baseline_report.py
import csv, sys, json, requests
from typing import Dict, List
from baseline_matching import canonicalise, skill_overlap_percent, default_experience_score, final_score

BASE_URL = "http://localhost:3000"  # change if different

# --- EITHER import from your interview.py ---
# from interview import TOOL_PATTERNS
# --- OR paste a minimal subset for the roles you're testing ---
TOOL_PATTERNS: Dict[str, List[str]] = {
    "python": ["python"],
    "sql": ["sql", "mysql", "postgresql"],
    "excel": ["excel", "microsoft excel"],
    "tableau": ["tableau"],
    "power bi": ["power bi", "powerbi"],
    "react": ["react", "reactjs"],
    "javascript": ["javascript", "js"],
}

# run_baseline_report.py
import requests

def fetch_candidate(email: str) -> dict | None:
    url = f"{BASE_URL}/api/candidate/interview-data?email={email}"
    r = requests.get(url, timeout=20)
    if r.status_code == 404:
        try:
            data = r.json()
            print(f"[WARN] {email} not found. Try one of:", data.get("availableCandidates"))
        except Exception:
            print(f"[WARN] {email} not found (404).")
        return None
    r.raise_for_status()
    return r.json()


def role_compat_from_record(rec: dict, job_role_family: str) -> float:
    """
    Simple role compatibility for baseline reporting:
    100 if candidate interview role string contains the family token (case-insensitive),
    else 60 if loosely related, else 40 as a weak fit. Adjust if you have a stricter rule.
    """
    role = (rec.get("interview", {})).get("role", "") or ""
    rlow, fam = role.lower(), job_role_family.lower()
    if fam in rlow:
        return 100.0
    # light fallback, tweak this if you have explicit mappings
    if any(tok in rlow for tok in ["data", "analyst", "science", "engineer"]) and any(tok in fam for tok in ["data", "analyst", "science", "engineer"]):
        return 60.0
    return 40.0

def candidate_record_from_api(payload: dict) -> dict:
    """Shape into what the baseline needs."""
    cand = payload["candidate"]
    inter = payload["interview"]
    skills = payload["skills"]["verified_skills"]

    # pick the most faithful skill token we can
    tokens = []
    for s in skills:
        tok = s.get("skill") or s.get("display_name") or ""
        tokens.append(tok)

    return {
        "id": cand["id"],
        "name": cand.get("name", ""),
        "email": cand.get("email", ""),
        "experience_years": cand.get("experience_years", 0),
        "role": inter.get("role", ""),
        "verified_skills": [{"skill": t} for t in tokens],
        # semantic score if you want to display it alongside baseline (optional)
        "semantic_overall": inter.get("overall_rating", None),
    }

def run_report(job_role_family: str, job_skills_raw: List[str], emails: List[str], out_csv: str):
    # canonicalise job skill tokens
    job_norm = canonicalise(job_skills_raw, TOOL_PATTERNS)

    rows = []
    for email in emails:
        data = fetch_candidate(email)
        if not data:
            continue
        if not data.get("hasCompletedInterview"):
            print(f"Skip {email}: no completed interview")
            continue

        rec = candidate_record_from_api(data)
        cand_tokens = [s["skill"] for s in rec["verified_skills"]]
        cand_norm = canonicalise(cand_tokens, TOOL_PATTERNS)

        overlap_pct = skill_overlap_percent(job_norm, cand_norm)
        role_comp = role_compat_from_record({"interview": {"role": rec["role"]}}, job_role_family)
        exp_score = default_experience_score(rec["experience_years"])
        baseline_final = final_score(role_comp, overlap_pct, exp_score)

        rows.append({
            "candidate_name": rec["name"],
            "email": rec["email"],
            "job_role_family": job_role_family,
            "job_skills": "|".join(job_skills_raw),
            "baseline_overlap_pct": round(overlap_pct, 2),
            "baseline_final": round(baseline_final, 2),
            "role_compat": round(role_comp, 1),
            "experience_score": round(exp_score, 1),
            "semantic_overall_rating": rec.get("semantic_overall", ""),
            "matched_skills": "|".join(sorted(j for j in job_norm if j in cand_norm)),
            "missing_skills": "|".join(sorted(j for j in job_norm if j not in cand_norm)),
        })

    # sort like the UI: final desc, then exp score desc, then name asc
    rows.sort(key=lambda r: (-r["baseline_final"], -r["experience_score"], r["candidate_name"].lower()))

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    print(f"✅ Wrote {len(rows)} rows to {out_csv}")

if __name__ == "__main__":
    # Example usage:
    # python run_baseline_report.py "Data Analyst" "python,sql,tableau" "alice@x.com,bob@y.com" out.csv
    if len(sys.argv) != 5:
        print("Usage: python run_baseline_report.py <job_role_family> <comma_separated_job_skills> <comma_separated_emails> <out_csv>")
        sys.exit(1)

    job_role = sys.argv[1]
    job_skills = [t.strip() for t in sys.argv[2].split(",") if t.strip()]
    emails = [e.strip() for e in sys.argv[3].split(",") if e.strip()]
    out_csv = sys.argv[4]
    run_report(job_role, job_skills, emails, out_csv)
