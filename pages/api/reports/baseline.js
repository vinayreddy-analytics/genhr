// pages/api/reports/baseline.js
// Usage: /api/reports/baseline?role=Data%20Analyst&skills=python,sql,tableau&emails=alice@x.com,bob@y.com
import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "genhr";

const TOOL_PATTERNS = {
  python: ["python"],
  sql: ["sql","mysql","postgresql"],
  excel: ["excel","microsoft excel"],
  tableau: ["tableau"],
  "power bi": ["power bi","powerbi"],
  react: ["react","reactjs"],
  javascript: ["javascript","js"],
};

function canonicalise(tokens, patterns){
  const out = new Set();
  for (const raw of tokens || []) {
    const t = (raw || "").trim().toLowerCase();
    let mapped = null;
    for (const [canon, variants] of Object.entries(patterns)) {
      if (variants.some(v => t === v.trim().toLowerCase())) { mapped = canon; break; }
    }
    out.add(mapped || t);
  }
  return out;
}
function skillOverlap(jobSet, candSet){
  if (!jobSet.size) return 0;
  let hits = 0; for (const j of jobSet) if (candSet.has(j)) hits++;
  return (hits / jobSet.size) * 100.0;
}
function expScore(years){
  const y = Math.max(0, parseFloat(years || 0) || 0);
  return Math.min(100, y * 12.5);
}
function finalScore(roleComp, overlap, exp){ return 0.65*roleComp + 0.25*overlap + 0.10*exp; }

async function connect(){
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  return client.db(DB_NAME);
}

export default async function handler(req, res){
  try{
    const { role="", skills="", emails="" } = req.query;
    if (!skills || !emails) return res.status(400).send("skills and emails are required");

    const jobSkills = skills.split(",").map(s => s.trim()).filter(Boolean);
    const jobSet = canonicalise(jobSkills, TOOL_PATTERNS);

    const db = await connect();
    const emailsArr = emails.split(",").map(e => e.trim()).filter(Boolean);

    const rows = [];
    for (const email of emailsArr){
      const cand = await db.collection("candidates").findOne({ email });
      if (!cand) continue;

      const interview = await db.collection("interviews").findOne(
        { candidate_id: cand._id },
        { sort: { completed_at: -1 } }
      );
      if (!interview) continue;

      // Use enhanced_skills if present, else legacy, else competency->skills fallback
      let skillsList = [];
      if (interview?.enhanced_skills?.verified_skills?.length){
        skillsList = interview.enhanced_skills.verified_skills.map(s => s.display_name || s.skill || "");
      } else if (interview?.skill_ratings?.verified_skills?.length){
        skillsList = interview.skill_ratings.verified_skills.map(s => s.display_name || s.skill || "");
      } else if (interview?.competency_scores){
        skillsList = Object.keys(interview.competency_scores);
      }

      const candSet = canonicalise(skillsList, TOOL_PATTERNS);
      const overlap = skillOverlap(jobSet, candSet);

      // Simple role compatibility (adjust to your rule if you have one)
      const r = (interview.role || "").toLowerCase();
      const fam = role.toLowerCase();
      const roleComp = fam && r.includes(fam) ? 100 : (["data","analyst","science","engineer"].some(t=>r.includes(t) && fam.includes(t)) ? 60 : 40);

      const exp = expScore(cand.experience_years || cand.experience || 0);
      const baseline = finalScore(roleComp, overlap, exp);

      rows.push({
        candidate_name: cand.name || cand.fullName || email.split("@")[0],
        email,
        job_role_family: role,
        job_skills: jobSkills.join("|"),
        baseline_overlap_pct: overlap.toFixed(2),
        baseline_final: baseline.toFixed(2),
        role_compat: roleComp.toFixed(1),
        experience_score: exp.toFixed(1),
        semantic_overall_rating: interview.overall_rating || "",
        matched_skills: [...jobSet].filter(j => candSet.has(j)).sort().join("|"),
        missing_skills: [...jobSet].filter(j => !candSet.has(j)).sort().join("|"),
      });
    }

    rows.sort((a,b) => (parseFloat(b.baseline_final)-parseFloat(a.baseline_final)) ||
                       (parseFloat(b.experience_score)-parseFloat(a.experience_score)) ||
                       a.candidate_name.localeCompare(b.candidate_name));

    // Return CSV for easy copy-paste
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r[h]??"").toString().replace(/"/g,'""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type","text/csv");
    res.status(200).send(csv);
  } catch(err){
    console.error(err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
}
