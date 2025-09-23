# semantic_api.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Union, Dict, Any
import uvicorn
from ml_similarity import SkillSimilarityEngine

app = FastAPI(title="GenHR ML Similarity API")
engine = SkillSimilarityEngine()  # loads all-MiniLM-L6-v2

class Req(BaseModel):
    job_skills: List[Union[str, Dict[str, Any]]]
    candidate_skills: Dict[str, Any]  # expected to contain 'verified_skills' like your enhanced_skills

@app.post("/ml/skill-similarity")
def ml_skill_similarity(req: Req):
    # Pull verified skills out of enhanced skills dict if needed
    cand_verified = req.candidate_skills.get("verified_skills", [])
    # Convert to the engine’s expected list
    candidate_list = []
    for s in cand_verified:
        candidate_list.append({
            "skill": s.get("display_name", s.get("skill", "")),
            "category": s.get("category", ""),
            "score": s.get("score", 0),
        })
    result = engine.calculate_skill_similarity(req.job_skills, candidate_list)
    result["method"] = "ml_similarity"
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
