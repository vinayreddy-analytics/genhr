# baseline_utils.py
# Simple keyword-overlap baseline scoring

def normalize_skills(skills):
    """Lowercase and strip skill tokens (no semantic expansion)."""
    return [s.lower().strip() for s in skills if s]

def skill_overlap(job_skills, candidate_skills):
    """Calculate percentage overlap between job and candidate skills."""
    if not job_skills:
        return 0.0
    job_norm = set(normalize_skills(job_skills))
    cand_norm = set(normalize_skills(candidate_skills))
    matches = job_norm.intersection(cand_norm)
    return (len(matches) / max(1, len(job_norm))) * 100

def baseline_rank(candidate, job_role, job_skills):
    """Compute baseline score for one candidate against a job."""
    overlap_pct = skill_overlap(job_skills, candidate.get("skills", []))

    # Role compatibility (simple: 100 if exact match, else 60 if related, else 0)
    declared_role = candidate.get("role", "").lower()
    role_family = job_role.lower()
    role_compat = 100 if role_family in declared_role else 60 if "data" in declared_role and "data" in role_family else 0

    # Experience score (map years → scale 0–100)
    exp_years = int(candidate.get("experience_years", 0))
    if exp_years >= 7:
        exp_score = 100
    elif exp_years >= 3:
        exp_score = 70
    elif exp_years > 0:
        exp_score = 40
    else:
        exp_score = 10

    final_score = (0.65 * role_compat) + (0.25 * overlap_pct) + (0.10 * exp_score)

    return {
        "candidate_name": candidate.get("name", "Unknown"),
        "email": candidate.get("email", ""),
        "job_role_family": job_role,
        "job_skills": "|".join(job_skills),
        "baseline_overlap_pct": round(overlap_pct, 2),
        "baseline_final": round(final_score, 2),
        "role_compat": role_compat,
        "experience_score": exp_score,
        "matched_skills": "|".join(set(normalize_skills(job_skills)) & set(normalize_skills(candidate.get("skills", [])))),
        "missing_skills": "|".join(set(normalize_skills(job_skills)) - set(normalize_skills(candidate.get("skills", []))))
    }
