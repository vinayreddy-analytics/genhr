# baseline_matching.py
from typing import List, Dict, Callable, Tuple, Set

def canonicalise(tokens: List[str], tool_patterns: Dict[str, List[str]]) -> Set[str]:
    """Map raw tokens to canonical forms using TOOL_PATTERNS; lowercased exact matching."""
    out = set()
    for raw in tokens:
        t = raw.strip().lower()
        mapped = None
        for canon, variants in tool_patterns.items():
            for v in variants:
                # normalise variant spacing/punct for simple contains/equality checks
                if t == v.strip().lower():
                    mapped = canon
                    break
            if mapped: break
        out.add(mapped if mapped else t)
    return out

def skill_overlap_percent(job_skills_norm: Set[str], cand_skills_norm: Set[str]) -> float:
    if not job_skills_norm:
        return 0.0
    hits = sum(1 for j in job_skills_norm if j in cand_skills_norm)
    return (hits / len(job_skills_norm)) * 100.0

def default_experience_score(years: float) -> float:
    """Simple monotonic mapping for the baseline; replace if your pipeline has a canonical mapping."""
    try:
        y = max(0.0, float(years))
    except (TypeError, ValueError):
        y = 0.0
    return min(100.0, y * 12.5)  # 0y=0, 4y=50, 8y=100

def final_score(role_comp: float, overlap_pct: float, exp_score: float) -> float:
    return 0.65 * role_comp + 0.25 * overlap_pct + 0.10 * exp_score

def baseline_rank(
    job_skills: List[str],
    candidate_records: List[Dict],
    tool_patterns: Dict[str, List[str]],
    role_compat_fn: Callable[[Dict], float],  # returns 0–100 based on your role logic
    exp_score_fn: Callable[[float], float] = default_experience_score
) -> List[Dict]:
    """Returns sorted list with percandidate breakdown."""
    job_norm = canonicalise(job_skills, tool_patterns)
    ranked = []
    for c in candidate_records:
        cand_tokens = [s.get("skill") or s.get("display_name","") for s in c["verified_skills"]]
        cand_norm = canonicalise(cand_tokens, tool_patterns)
        overlap = skill_overlap_percent(job_norm, cand_norm)
        role_comp = role_compat_fn(c)  # for example - 100 if family matches else 40
        exp_score = exp_score_fn(c.get("experience_years", 0))
        score = final_score(role_comp, overlap, exp_score)
        ranked.append({
            "candidate_id": c["id"],
            "name": c.get("name",""),
            "final_score": round(score, 2),
            "overlap_pct": round(overlap, 2),
            "role_compat": round(role_comp, 1),
            "experience_score": round(exp_score, 1),
            "verified_skills_count": len(c["verified_skills"]),
            "matched_skills": sorted(list(job_norm.intersection(cand_norm))),
            "missing_skills": sorted(list(job_norm.difference(cand_norm))),
        })
    # Tie-breaks with exp score, verified skill count, name
    ranked.sort(key=lambda r: (-r["final_score"], -r["experience_score"], -r["verified_skills_count"], r["name"]))
    return ranked
