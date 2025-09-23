# run_full_experiment.py
import csv
import sys
from baseline_utils import baseline_rank  # your baseline code
from ml_similarity import enhance_job_candidate_matching  # your semantic engine
import requests

API_BASE = "http://localhost:3000/api/candidate/interview-data"

# Define jobs to test
JOBS = [
    {
        "role": "Sales Manager",
        "skills": ["salesforce", "business development", "client relationship management", "negotiation", "leadership"]
    },
    {
        "role": "Data Engineer",
        "skills": ["python", "sql", "apache spark", "aws", "data warehousing"]
    },
    {
        "role": "Data Scientist",
        "skills": ["python", "machine learning", "predictive modelling", "data visualization", "statistics"]
    },
    {
        "role": "Data Analyst",
        "skills": ["sql", "excel", "python", "tableau", "power bi"]
    }
]

# Candidate emails (add as many as you like)
CANDIDATE_EMAILS = [
    "yova@gmail.com", "ram@gmail.com", "rohan@gmail.com",
    "aisha@gmail.com", "virat@gmail.com", "sri@gmail.com",
    "shiva@gmail.com", "zubair@gmail.com","aurang@gmail.com",
    "suman@gmail.com","jeeshan@gmail.com","neeshan@gmail.com",
    "jimmy@gmail.com","rahulsharma@gmail.com",
    "debit@gmail.com","abell@gmail.com","yasir@gmail.com",
    "vinod@gmail.com","vamsi@gmail.com","vamsi@gmail.com","reddy@gmail.com"
    # add more...
]

def fetch_candidate(email):
    r = requests.get(f"{API_BASE}?email={email}")
    if r.status_code != 200:
        print(f"⚠️ {email} not found")
        return None
    return r.json()

def run_experiment(output_csv="experiment_results.csv"):
    rows = []
    for job in JOBS:
        for email in CANDIDATE_EMAILS:
            data = fetch_candidate(email)
            if not data or not data.get("hasCompletedInterview"):
                continue

            # baseline score
            interview_data = data.get("interviewData", {})
            base = baseline_rank(interview_data, job["role"], job["skills"])
            # semantic score
            sem = enhance_job_candidate_matching(job["skills"], interview_data.get("skills", {}))


            row = {
                "candidate_name": data["candidate"]["name"],
                "email": email,
                "job_role": job["role"],
                "job_skills": "|".join(job["skills"]),
                "baseline_final": round(base["baseline_final"], 2),
                "baseline_overlap_pct": round(base["baseline_overlap_pct"], 2),
                "semantic_score": sem.get("overall_score", 0),
                "semantic_strong_matches": sem.get("strong_matches", 0),
                "experience_score": base["experience_score"],
                "role_compat": base["role_compat"],
            }
            rows.append(row)

    # Write to CSV
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"✅ Wrote {len(rows)} rows to {output_csv}")

if __name__ == "__main__":
    run_experiment()
