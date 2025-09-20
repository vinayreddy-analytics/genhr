import { MongoClient, ObjectId } from 'mongodb';

class SimpleCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }
  
  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
    
    // Clean up expired entries occasionally
    if (this.cache.size % 50 === 0) {
      this.cleanup();
    }
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
  
  clear() {
    this.cache.clear();
  }
  
  stats() {
    return {
      size: this.cache.size,
      maxSize: 1000, // Arbitrary limit
      ttlMinutes: this.ttl / 60000
    };
  }
}

// Create cache instances
const matchCache = new SimpleCache(5);        // Match calculations cache (5 min)
const candidateCache = new SimpleCache(10);   // Candidate data cache (10 min)
const mlCache = new SimpleCache(15);          // ML similarity cache (15 min)

// Cache key generators
function getMatchCacheKey(jobId, candidateId, candidateInterviewId) {
  return `match:${jobId}:${candidateId}:${candidateInterviewId || 'none'}`;
}

function getCandidateCacheKey(candidateId) {
  return `candidate:${candidateId}`;
}

function getMLCacheKey(jobSkills, candidateSkills) {
  const jobKey = Array.isArray(jobSkills) ? jobSkills.sort().join(',') : '';
  const candidateKey = Array.isArray(candidateSkills) ? candidateSkills.slice(0, 5).sort().join(',') : '';
  return `ml:${jobKey}:${candidateKey}`;
}

// ENHANCED ML matching function with caching
async function calculateMLSkillMatchCached(jobSkills, candidateInterview) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 80, details: ['No specific skills required'], matched: 0, total: 0, algorithm: 'ml_v3.0' };
  }
  
  if (!candidateInterview || !candidateInterview.enhanced_skills) {
    return { score: 0, details: ['No enhanced skills data'], matched: 0, total: jobSkills.length, algorithm: 'ml_v3.0' };
  }

  // Create cache key based on job skills and candidate skills
  const candidateSkills = candidateInterview.enhanced_skills.verified_skills?.map(s => s.display_name) || [];
  const cacheKey = getMLCacheKey(jobSkills, candidateSkills);
  
  // Try cache first
  const cached = mlCache.get(cacheKey);
  if (cached) {
    console.log(`   ⚡ ML Cache hit for ${jobSkills.length} skills`);
    return cached;
  }

  try {
    // Call ML API
    const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
    
    const response = await fetch(`${AI_BASE_URL}/ml/skill-similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_skills: jobSkills,
        candidate_enhanced_skills: candidateInterview.enhanced_skills
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.similarity_result) {
      const result = data.similarity_result;
      
      const processedResult = {
        score: Math.round(result.overall_score),
        details: result.matches.map(match => {
          const strength = match.match_strength;
          const score = Math.round(match.similarity_score * 100);
          
          let emoji = '🔥';
          if (strength === 'exact') emoji = '🎯';
          else if (strength === 'strong') emoji = '💪';
          else if (strength === 'moderate') emoji = '👍';
          else if (strength === 'weak') emoji = '⚠️';
          else emoji = '❌';
          
          return `${match.job_skill}: ${score}/100 ${emoji} (ML: ${match.candidate_skill})`;
        }),
        matched: result.strong_matches + result.moderate_matches,
        total: result.job_skills_count,
        algorithm: 'ml_v3.0_cached',
        coverage: result.coverage,
        ml_breakdown: {
          strong_matches: result.strong_matches,
          moderate_matches: result.moderate_matches,
          weak_matches: result.weak_matches
        }
      };
      
      // Cache the result
      mlCache.set(cacheKey, processedResult);
      console.log(`   💾 ML result cached for ${jobSkills.length} skills`);
      
      return processedResult;
    }
  } catch (error) {
    console.error('ML similarity API call failed:', error);
  }
  
  // Fallback to non-ML matching
  return calculateSkillMatchFromVerifiedSkills(jobSkills, candidateInterview.enhanced_skills);
}

// ENHANCED main matching function with caching
async function calculateJobCandidateMatchCached(job, candidate, candidateInterview) {
  // Create cache key
  const cacheKey = getMatchCacheKey(
    job._id.toString(), 
    candidate._id.toString(), 
    candidateInterview?._id.toString()
  );
  
  // Try cache first
  const cached = matchCache.get(cacheKey);
  if (cached) {
    console.log(`   ⚡ Match cache hit for ${candidate.email}`);
    return cached;
  }

  console.log(`\n🔍 MATCHING: ${candidate.email || candidate.name} for "${job.title}"`);
  
  let totalScore = 0;
  let matchDetails = [];
  
  // STEP 1: MANDATORY ROLE FILTERING (65% weight)
  const jobRole = standardizeRole(job.title);
  const candidateRole = candidateInterview?.role ? standardizeRole(candidateInterview.role) : null;
  
  console.log(`   Job: "${jobRole}", Candidate: "${candidateRole}"`);
  
  if (!candidateRole) {
    const result = {
      score: 0,
      matchDetails: ['❌ No candidate role data'],
      hasInterview: !!candidateInterview,
      verified: !!(candidate.linkedin || candidate.github)
    };
    matchCache.set(cacheKey, result);
    return result;
  }
  
  if (!rolesAreCompatible(jobRole, candidateRole)) {
    console.log(`   ❌ ROLE MISMATCH: ${candidateRole} ≠ ${jobRole}`);
    const result = {
      score: 0,
      matchDetails: [`❌ Role mismatch: Looking for ${jobRole}, candidate is ${candidateRole}`],
      hasInterview: !!candidateInterview,
      verified: !!(candidate.linkedin || candidate.github)
    };
    matchCache.set(cacheKey, result);
    return result;
  }
  
  // Role compatibility score
  const exactMatch = standardizeRole(jobRole) === standardizeRole(candidateRole);
  const roleScore = exactMatch ? 65 : 50;
  totalScore += roleScore;
  matchDetails.push(`✅ Role: ${candidateRole} ${exactMatch ? '(exact match)' : '(compatible)'} → ${roleScore}/65`);
  
  // STEP 2: CACHED ML-POWERED SKILL MATCHING (25% weight)
  let skillMatch;
  
  if (candidateInterview?.enhanced_skills?.verified_skills) {
    skillMatch = await calculateMLSkillMatchCached(job.required_skills, candidateInterview);
  } else if (candidateInterview?.enhanced_skills) {
    skillMatch = calculateSkillMatchFromVerifiedSkills(job.required_skills, candidateInterview.enhanced_skills);
  } else {
    skillMatch = calculateLegacySkillMatch(job.required_skills, candidateInterview);
  }
  
  const skillScore = Math.round((skillMatch.score / 100) * 25);
  totalScore += skillScore;
  
  const algorithmInfo = skillMatch.algorithm === 'ml_v3.0_cached' ? ' 🤖💾 (ML+Cache)' : 
                       skillMatch.algorithm === 'ml_v3.0' ? ' 🤖 (ML-powered)' : 
                       skillMatch.algorithm === 'enhanced_v2.0' ? ' ⚡ (Enhanced)' : ' 📋 (Legacy)';
  matchDetails.push(`🔧 Skills: ${skillMatch.matched}/${skillMatch.total} matched → ${skillScore}/25${algorithmInfo}`);
  
  // Add top skill details
  if (skillMatch.details && skillMatch.details.length > 0) {
    matchDetails.push(...skillMatch.details.slice(0, 3));
  }
  
  // STEP 3: EXPERIENCE MATCHING (10% weight)
  const jobExp = parseInt(job.experience) || 0;
  const candidateExp = candidate.experience_years || 0;
  
  let expScore = 0;
  if (candidateExp >= jobExp) {
    expScore = 10;
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ✅ → 10/10`);
  } else if (candidateExp >= jobExp * 0.5) {
    expScore = 6;
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ⚠️ → 6/10`);
  } else {
    expScore = Math.max(2, Math.round((candidateExp / Math.max(1, jobExp)) * 10));
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ❌ → ${expScore}/10`);
  }
  totalScore += expScore;
  
  const finalScore = Math.min(100, Math.round(totalScore));
  
  console.log(`   🎯 FINAL SCORE: ${finalScore}% (Role:${roleScore} + Skills:${skillScore} + Exp:${expScore}) [${skillMatch.algorithm}]`);
  
  const result = {
    score: finalScore,
    matchDetails,
    hasInterview: !!candidateInterview,
    verified: !!(candidate.linkedin || candidate.github),
    breakdown: {
      role_score: roleScore,
      skill_score: skillScore,
      experience_score: expScore,
      role_compatible: true,
      algorithm_used: skillMatch.algorithm
    }
  };
  
  // Cache the result
  matchCache.set(cacheKey, result);
  console.log(`   💾 Match result cached`);
  
  return result;
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'genhr';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedDb = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Role standardization mapping
const ROLE_MAPPINGS = {
  'data analyst': 'data_analyst',
  'business analyst': 'business_analyst', 
  'financial analyst': 'financial_analyst',
  'data scientist': 'data_scientist',
  'data engineer': 'data_engineer',
  'software developer': 'software_developer',
  'frontend developer': 'frontend_developer',
  'backend developer': 'backend_developer',
  'full stack developer': 'software_developer',
  'project manager': 'project_manager',
  'technical project manager': 'technical_project_manager',
  'sales manager': 'sales_manager',
  'sales executive': 'sales_executive',
  'retail store manager': 'retail_store_manager',
  'customer care representative': 'customer_care_representative',
  'mechanical engineer': 'mechanical_engineer',
  'design technician': 'design_technician',
  'drafting technician': 'design_technician',
  'cad technician': 'design_technician'
};

// Role compatibility matrix
const ROLE_COMPATIBILITY = {
  'data_analyst': ['data_analyst', 'business_analyst'],
  'business_analyst': ['business_analyst', 'data_analyst'], 
  'design_technician': ['design_technician', 'mechanical_engineer'],
  'mechanical_engineer': ['mechanical_engineer', 'design_technician'],
  'sales_manager': ['sales_manager', 'sales_executive'],
  'sales_executive': ['sales_executive', 'sales_manager'],
  'software_developer': ['software_developer', 'frontend_developer', 'backend_developer'],
  'frontend_developer': ['frontend_developer', 'software_developer'],
  'backend_developer': ['backend_developer', 'software_developer'],
  'project_manager': ['project_manager', 'technical_project_manager'],
  'technical_project_manager': ['technical_project_manager', 'project_manager']
};

function standardizeRole(roleString) {
  if (!roleString) return null;
  const normalized = roleString.toLowerCase().trim();
  return ROLE_MAPPINGS[normalized] || normalized.replace(/[\s-]+/g, '_');
}

function rolesAreCompatible(jobRole, candidateRole) {
  if (!jobRole || !candidateRole) return false;
  
  const jobRoleStd = standardizeRole(jobRole);
  const candidateRoleStd = standardizeRole(candidateRole);
  
  // Exact match (highest priority)
  if (jobRoleStd === candidateRoleStd) return true;
  
  // Check compatibility matrix  
  const compatibleRoles = ROLE_COMPATIBILITY[jobRoleStd] || [jobRoleStd];
  return compatibleRoles.includes(candidateRoleStd);
}

// PHASE 3: ML-powered skill matching
async function calculateMLSkillMatch(jobSkills, candidateInterview) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 80, details: ['No specific skills required'], matched: 0, total: 0, algorithm: 'ml_v3.0' };
  }
  
  if (!candidateInterview || !candidateInterview.enhanced_skills) {
    return { score: 0, details: ['No enhanced skills data for ML matching'], matched: 0, total: jobSkills.length, algorithm: 'ml_v3.0' };
  }

  try {
    // Call the ML similarity endpoint
    const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
    
    const response = await fetch(`${AI_BASE_URL}/ml/skill-similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_skills: jobSkills,
        candidate_enhanced_skills: candidateInterview.enhanced_skills
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.similarity_result) {
      const result = data.similarity_result;
      
      // Convert ML result to match existing format
      const matchDetails = result.matches.map(match => {
        const strength = match.match_strength;
        const score = Math.round(match.similarity_score * 100);
        
        let emoji = '🔥';
        if (strength === 'exact') emoji = '🎯';
        else if (strength === 'strong') emoji = '💪';
        else if (strength === 'moderate') emoji = '👍';
        else if (strength === 'weak') emoji = '⚠️';
        else emoji = '❌';
        
        return `${match.job_skill}: ${score}/100 ${emoji} (ML: ${match.candidate_skill})`;
      });
      
      console.log(`   ML Matching: ${result.overall_score.toFixed(1)}% overall, ${result.strong_matches}/${result.moderate_matches}/${result.weak_matches} matches`);
      
      return {
        score: Math.round(result.overall_score),
        details: matchDetails,
        matched: result.strong_matches + result.moderate_matches,
        total: result.job_skills_count,
        algorithm: 'ml_v3.0',
        coverage: result.coverage,
        ml_breakdown: {
          strong_matches: result.strong_matches,
          moderate_matches: result.moderate_matches,
          weak_matches: result.weak_matches
        }
      };
    }
  } catch (error) {
    console.error('ML similarity API call failed:', error);
    // Fallback to Phase 2 enhanced skills if ML fails
    if (candidateInterview.enhanced_skills) {
      return calculateSkillMatchFromVerifiedSkills(jobSkills, candidateInterview.enhanced_skills);
    }
  }
  
  // Final fallback
  return calculateLegacySkillMatch(jobSkills, candidateInterview);
}

// PHASE 2: Enhanced skills matching (fallback)
function calculateSkillMatchFromVerifiedSkills(jobSkills, enhancedSkills) {
  const verifiedSkills = enhancedSkills.verified_skills || [];
  
  let totalScore = 0;
  let matchDetails = [];
  let skillsMatched = 0;
  
  console.log(`   Using enhanced skills: ${verifiedSkills.length} verified skills`);
  
  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase().trim();
    let skillScore = 0;
    
    // Direct skill match
    const directMatch = verifiedSkills.find(skill => 
      skill.skill === jobSkillLower ||
      skill.skill.replace('_', ' ') === jobSkillLower ||
      skill.display_name.toLowerCase() === jobSkillLower
    );
    
    if (directMatch) {
      skillScore = Math.min(100, directMatch.score + 10);
      skillsMatched++;
      matchDetails.push(`${jobSkill}: ${skillScore}/100 (${directMatch.display_name} - exact match)`);
    } else {
      // Synonym match
      const synonymMatch = verifiedSkills.find(skill => 
        skill.synonyms && skill.synonyms.some(synonym => 
          synonym.toLowerCase().includes(jobSkillLower) || 
          jobSkillLower.includes(synonym.toLowerCase())
        )
      );
      
      if (synonymMatch) {
        skillScore = Math.round(synonymMatch.score * 0.9);
        skillsMatched++;
        matchDetails.push(`${jobSkill}: ${skillScore}/100 (${synonymMatch.display_name} via synonym)`);
      } else {
        matchDetails.push(`${jobSkill}: No match found`);
      }
    }
    
    totalScore += skillScore;
  }
  
  const averageScore = jobSkills.length > 0 ? Math.round(totalScore / jobSkills.length) : 0;
  
  return {
    score: averageScore,
    details: matchDetails,
    matched: skillsMatched,
    total: jobSkills.length,
    algorithm: 'enhanced_v2.0'
  };
}

// PHASE 1: Legacy skill matching (final fallback)
function calculateLegacySkillMatch(jobSkills, candidateInterview) {
  const matchingKeywords = candidateInterview.matching_keywords || [];
  const competencyScores = candidateInterview.competency_scores || {};
  const areasForImprovement = candidateInterview.areas_for_improvement || [];
  
  let totalScore = 0;
  let matchDetails = [];
  let skillsMatched = 0;
  
  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase().trim();
    let skillScore = 0;
    
    const directKeywordMatch = matchingKeywords.find(keyword => 
      keyword.toLowerCase() === jobSkillLower ||
      keyword.toLowerCase().includes(jobSkillLower) ||
      jobSkillLower.includes(keyword.toLowerCase())
    );
    
    if (directKeywordMatch) {
      skillScore = 90;
      skillsMatched++;
      matchDetails.push(`${jobSkill}: 90/100 (${directKeywordMatch} - legacy match)`);
    } else if (areasForImprovement.some(area => 
      area.toLowerCase().includes(jobSkillLower) || jobSkillLower.includes(area.toLowerCase())
    )) {
      skillScore = 65;
      skillsMatched++;
      matchDetails.push(`${jobSkill}: 65/100 (area for improvement)`);
    } else {
      const skillToCompetency = {
        'python': 'technical_skills', 'sql': 'technical_skills', 'excel': 'technical_skills',
        'tableau': 'technical_skills', 'power bi': 'technical_skills', 'autocad': 'technical_skills',
        'solidworks': 'technical_skills', 'revit': 'technical_skills'
      };
      
      const competencyKey = skillToCompetency[jobSkillLower];
      if (competencyKey && competencyScores[competencyKey]) {
        skillScore = Math.round(competencyScores[competencyKey] * 0.6);
        skillsMatched++;
        matchDetails.push(`${jobSkill}: ${skillScore}/100 (${competencyKey})`);
      } else {
        matchDetails.push(`${jobSkill}: No match found`);
      }
    }
    
    totalScore += skillScore;
  }
  
  const averageScore = jobSkills.length > 0 ? Math.round(totalScore / jobSkills.length) : 0;
  
  return {
    score: averageScore,
    details: matchDetails,
    matched: skillsMatched,
    total: jobSkills.length,
    algorithm: 'legacy_v1.0'
  };
}

// MAIN SKILL MATCHING FUNCTION - Now with ML integration
async function calculateAdvancedSkillMatch(jobSkills, candidateInterview) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 80, details: ['No specific skills required'], matched: 0, total: 0 };
  }
  
  if (!candidateInterview) {
    return { score: 0, details: ['No interview data'], matched: 0, total: jobSkills.length };
  }
  
  // PHASE 3: Try ML similarity first (if enhanced skills available)
  if (candidateInterview.enhanced_skills && candidateInterview.enhanced_skills.verified_skills) {
    console.log(`   Using ML similarity matching for ${candidateInterview.enhanced_skills.verified_skills.length} verified skills`);
    return await calculateMLSkillMatch(jobSkills, candidateInterview);
  }
  
  // PHASE 2: Fall back to enhanced skills without ML
  if (candidateInterview.enhanced_skills) {
    return calculateSkillMatchFromVerifiedSkills(jobSkills, candidateInterview.enhanced_skills);
  }
  
  // PHASE 1: Legacy fallback for old interviews
  return calculateLegacySkillMatch(jobSkills, candidateInterview);
}

// MAIN MATCHING FUNCTION - Updated to async for ML integration
async function calculateJobCandidateMatch(job, candidate, candidateInterview) {
  console.log(`\n🔍 MATCHING: ${candidate.email || candidate.name} for "${job.title}"`);
  
  let totalScore = 0;
  let matchDetails = [];
  
  // STEP 1: MANDATORY ROLE FILTERING (65% weight)
  const jobRole = standardizeRole(job.title);
  const candidateRole = candidateInterview?.role ? standardizeRole(candidateInterview.role) : null;
  
  console.log(`   Job: "${jobRole}", Candidate: "${candidateRole}"`);
  
  if (!candidateRole) {
    return {
      score: 0,
      matchDetails: ['❌ No candidate role data'],
      hasInterview: !!candidateInterview,
      verified: !!(candidate.linkedin || candidate.github)
    };
  }
  
  if (!rolesAreCompatible(jobRole, candidateRole)) {
    console.log(`   ❌ ROLE MISMATCH: ${candidateRole} ≠ ${jobRole}`);
    return {
      score: 0,
      matchDetails: [`❌ Role mismatch: Looking for ${jobRole}, candidate is ${candidateRole}`],
      hasInterview: !!candidateInterview,
      verified: !!(candidate.linkedin || candidate.github)
    };
  }
  
  // Role compatibility score
  const exactMatch = standardizeRole(jobRole) === standardizeRole(candidateRole);
  const roleScore = exactMatch ? 65 : 50;
  totalScore += roleScore;
  matchDetails.push(`✅ Role: ${candidateRole} ${exactMatch ? '(exact match)' : '(compatible)'} → ${roleScore}/65`);
  
  // STEP 2: ML-POWERED SKILL MATCHING (25% weight)
  const skillMatch = await calculateAdvancedSkillMatch(job.required_skills, candidateInterview);
  const skillScore = Math.round((skillMatch.score / 100) * 25);
  totalScore += skillScore;
  
  // Show algorithm info in match details
  const algorithmInfo = skillMatch.algorithm === 'ml_v3.0' ? ' 🤖 (ML-powered)' : 
                       skillMatch.algorithm === 'enhanced_v2.0' ? ' ⚡ (Enhanced)' : ' 📋 (Legacy)';
  matchDetails.push(`🔧 Skills: ${skillMatch.matched}/${skillMatch.total} matched → ${skillScore}/25${algorithmInfo}`);
  
  // Add top skill details
  if (skillMatch.details && skillMatch.details.length > 0) {
    matchDetails.push(...skillMatch.details.slice(0, 3));
  }
  
  // STEP 3: EXPERIENCE MATCHING (10% weight)
  const jobExp = parseInt(job.experience) || 0;
  const candidateExp = candidate.experience_years || 0;
  
  let expScore = 0;
  if (candidateExp >= jobExp) {
    expScore = 10;
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ✅ → 10/10`);
  } else if (candidateExp >= jobExp * 0.5) {
    expScore = 6;
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ⚠️ → 6/10`);
  } else {
    expScore = Math.max(2, Math.round((candidateExp / Math.max(1, jobExp)) * 10));
    matchDetails.push(`📅 Experience: ${candidateExp}/${jobExp} years ❌ → ${expScore}/10`);
  }
  totalScore += expScore;
  
  const finalScore = Math.min(100, Math.round(totalScore));
  
  console.log(`   🎯 FINAL SCORE: ${finalScore}% (Role:${roleScore} + Skills:${skillScore} + Exp:${expScore}) [${skillMatch.algorithm}]`);
  
  return {
    score: finalScore,
    matchDetails,
    hasInterview: !!candidateInterview,
    verified: !!(candidate.linkedin || candidate.github),
    breakdown: {
      role_score: roleScore,
      skill_score: skillScore,
      experience_score: expScore,
      role_compatible: true,
      algorithm_used: skillMatch.algorithm
    }
  };
}

// PHASE 4: Batch processing helper
async function processCandidateBatch(candidates, job, candidateInterviews, batchSize = 50) {
  const batches = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }
  
  const allMatches = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`   Processing batch ${i + 1}/${batches.length} (${batch.length} candidates)`);
    
    const batchMatches = await Promise.all(
      batch.map(async (candidate) => {
        const candidateInterview = candidateInterviews[candidate._id.toString()];
        
        // Use cached matching function
        const match = await calculateJobCandidateMatchCached(job, candidate, candidateInterview);
        
        return {
          id: candidate._id.toString(),
          name: candidate.name || candidate.fullName || candidate.email.split('@')[0],
          email: candidate.email,
          experience_years: candidate.experience_years || 0,
          score: match.score,
          matchDetails: match.matchDetails,
          verified: match.verified,
          hasInterview: match.hasInterview,
          linkedin: candidate.linkedin || null,
          github: candidate.github || null,
          interviewDate: candidateInterview?.completed_at || null,
          overallRating: candidateInterview?.overall_rating || null,
          role: candidateInterview?.role || 'Not specified',
          algorithmUsed: match.breakdown?.algorithm_used || 'unknown'
        };
      })
    );
    
    allMatches.push(...batchMatches);
    
    // Small delay between batches to prevent overwhelming the ML service
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return allMatches;
}

// MAIN OPTIMIZED HANDLER
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    const db = await connectToDatabase();
    const { recruiter_email } = req.query;

    if (!recruiter_email) {
      return res.status(400).json({ error: 'Recruiter email required' });
    }

    console.log(`🔍 [PHASE 4] Fetching optimized dashboard data for recruiter: ${recruiter_email}`);

    // Step 1: Find recruiter (with caching consideration)
    const recruiterCacheKey = `recruiter:${recruiter_email}`;
    let recruiter = candidateCache.get(recruiterCacheKey);
    
    if (!recruiter) {
      recruiter = await db.collection('recruiters').findOne({ email: recruiter_email });
      if (recruiter) {
        candidateCache.set(recruiterCacheKey, recruiter);
      }
    }
    
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Step 2: Get recruiter's posted jobs (optimized query)
    const jobs = await db.collection('jobs').find(
      { 
        recruiter_id: recruiter._id,
        is_active: { $ne: false } // Use index-friendly query
      }
    ).sort({ created_at: -1 }).toArray();

    console.log(`📋 Found ${jobs.length} active jobs for recruiter`);

    // Step 3: Get candidates and interviews (optimized with indexes)
    const [candidates, interviews] = await Promise.all([
      db.collection('candidates').find({}).toArray(),
      db.collection('interviews').find({ 
        status: 'completed' 
      }).sort({ completed_at: -1 }).toArray()
    ]);

    // Create candidate interview lookup map
    const candidateInterviews = {};
    interviews.forEach(interview => {
      const candidateId = interview.candidate_id.toString();
      candidateInterviews[candidateId] = interview;
    });

    console.log(`👥 Found ${candidates.length} candidates, ${interviews.length} completed interviews`);
    console.log(`⚡ Cache stats: Match(${matchCache.stats().size}) ML(${mlCache.stats().size}) Candidate(${candidateCache.stats().size})`);

    // Step 4: Process jobs with batch optimization
    const jobsWithMatches = await Promise.all(
      jobs.map(async (job, jobIndex) => {
        const jobStartTime = Date.now();
        console.log(`\n📋 [${jobIndex + 1}/${jobs.length}] Processing job: "${job.title}" with ${job.required_skills?.length || 0} skills`);
        
        // Use batch processing for large candidate pools
        const candidateMatches = await processCandidateBatch(
          candidates, 
          job, 
          candidateInterviews,
          50 // Batch size
        );

        const filteredMatches = candidateMatches
          .filter(candidate => candidate.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const jobProcessTime = Date.now() - jobStartTime;
        console.log(`   ✅ Job "${job.title}": ${filteredMatches.length} matches in ${jobProcessTime}ms`);

        return {
          id: job._id.toString(),
          title: job.title,
          location: job.location,
          type: job.type,
          mode: job.mode,
          visa_required: job.visa_required,
          required_skills: job.required_skills || [],
          experience_required: job.experience,
          salary_range: job.salary_range,
          description: job.description,
          is_active: job.is_active !== false,
          created_at: job.created_at,
          candidateMatches: filteredMatches,
          totalApplicants: filteredMatches.length,
          processingTime: jobProcessTime
        };
      })
    );

    // Step 5: Prepare optimized candidate pool
    const candidatePool = candidates
      .map(candidate => {
        const candidateInterview = candidateInterviews[candidate._id.toString()];
        if (!candidateInterview) return null;
        
        return {
          id: candidate._id.toString(),
          name: candidate.name || candidate.fullName || candidate.email.split('@')[0],
          email: candidate.email,
          experience_years: candidate.experience_years || 0,
          overallRating: candidateInterview.overall_rating || 0,
          role: candidateInterview.role || 'Not specified',
          verified: !!(candidate.linkedin || candidate.github),
          hasInterview: true,
          linkedin: candidate.linkedin || null,
          github: candidate.github || null,
          phone: candidate.phone || null,
          interviewDate: candidateInterview.completed_at || null,
          competencyScores: candidateInterview.competency_scores || {},
          professionalSummary: candidateInterview.professional_summary || 'No summary available'
        };
      })
      .filter(candidate => candidate !== null)
      .sort((a, b) => b.overallRating - a.overallRating);

    // Step 6: Calculate performance statistics
    const totalProcessingTime = Date.now() - startTime;
    const totalMatches = jobsWithMatches.reduce((sum, job) => sum + job.candidateMatches.length, 0);
    
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(job => job.is_active !== false).length;
    const totalCandidatesWithInterviews = interviews.length;
    const averageMatchScore = jobsWithMatches.reduce((sum, job) => {
      const avgScore = job.candidateMatches.length > 0 
        ? job.candidateMatches.reduce((s, c) => s + c.score, 0) / job.candidateMatches.length 
        : 0;
      return sum + avgScore;
    }, 0) / (jobsWithMatches.length || 1);

    const dashboardStats = {
      totalJobs,
      activeJobs,
      totalCandidatesWithInterviews,
      totalMatches,
      averageMatchScore: Math.round(averageMatchScore),
      topPerformingJob: jobsWithMatches.length > 0 
        ? jobsWithMatches.reduce((best, job) => 
            job.candidateMatches.length > (best.candidateMatches?.length || 0) ? job : best
          ).title
        : 'No jobs posted'
    };

    // Step 7: Performance metrics
    const performanceMetrics = {
      total_processing_time_ms: totalProcessingTime,
      average_job_processing_time_ms: Math.round(totalProcessingTime / Math.max(1, jobs.length)),
      candidates_processed: candidates.length,
      cache_hit_ratio: {
        match_cache_size: matchCache.stats().size,
        ml_cache_size: mlCache.stats().size,
        candidate_cache_size: candidateCache.stats().size
      },
      jobs_with_ml_matching: jobsWithMatches.filter(j => 
        j.candidateMatches.some(c => c.algorithmUsed === 'ml_v3.0_cached' || c.algorithmUsed === 'ml_v3.0')
      ).length
    };

    console.log(`\n✅ [PHASE 4] Optimized dashboard complete:`);
    console.log(`   Total time: ${totalProcessingTime}ms`);
    console.log(`   Jobs processed: ${totalJobs} (avg: ${performanceMetrics.average_job_processing_time_ms}ms each)`);
    console.log(`   Total matches found: ${totalMatches}`);
    console.log(`   Cache entries: Match(${matchCache.stats().size}) ML(${mlCache.stats().size})`);

    res.status(200).json({
      success: true,
      recruiter: {
        id: recruiter._id.toString(),
        name: recruiter.name,
        email: recruiter.email,
        company: recruiter.company
      },
      jobs: jobsWithMatches,
      stats: dashboardStats,
      candidatePool: candidatePool,
      performance: performanceMetrics,
      metadata: {
        algorithm_version: "v4.0_optimized_ml_cached",
        matching_weights: "65% role + 25% skills + 10% experience",
        ml_model: "SentenceTransformer all-MiniLM-L6-v2",
        optimizations_enabled: [
          "database_indexes",
          "in_memory_caching", 
          "batch_processing",
          "ml_result_caching"
        ],
        phase_4_complete: true,
        last_updated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Optimized recruiter dashboard API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message,
      processing_time_ms: Date.now() - startTime
    });
  }
}

//Cache management endpoint
export async function clearCaches() {
  matchCache.clear();
  candidateCache.clear();
  mlCache.clear();
  
  return {
    success: true,
    message: 'All caches cleared',
    timestamp: new Date()
  };
}