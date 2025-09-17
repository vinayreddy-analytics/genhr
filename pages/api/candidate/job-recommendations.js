// pages/api/candidate/job-recommendations.js
// FIXED: Enhanced job recommendations with role filtering and proper skill matching

import { MongoClient, ObjectId } from 'mongodb';

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
    console.log(`✅ Connected to unified MongoDB: ${DB_NAME}`);
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// ENHANCED MATCHING ALGORITHM WITH ROLE FILTERING

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

// Enhanced skill matching that checks ALL possible skill sources
// Add these functions in job-recommendations.js (MISSING FUNCTIONS)

function calculateAdvancedSkillMatch(jobSkills, candidateInterview) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 80, details: ['No specific skills required'], matched: 0, total: 0 };
  }
  
  if (!candidateInterview) {
    return { score: 0, details: ['No interview data'], matched: 0, total: jobSkills.length };
  }
  
  // NEW: Try enhanced skills first (Phase 2)
  const enhancedSkills = candidateInterview.enhanced_skills;
  if (enhancedSkills && enhancedSkills.verified_skills) {
    return calculateSkillMatchFromVerifiedSkills(jobSkills, enhancedSkills);
  }
  
  // FALLBACK: Use old system for backward compatibility
  return calculateLegacySkillMatch(jobSkills, candidateInterview);
}

function calculateSkillMatchFromVerifiedSkills(jobSkills, enhancedSkills) {
  const verifiedSkills = enhancedSkills.verified_skills || [];
  const searchableTags = enhancedSkills.searchable_tags || [];
  
  let totalScore = 0;
  let matchDetails = [];
  let skillsMatched = 0;
  
  console.log(`   Using enhanced skills: ${verifiedSkills.length} verified skills`);
  
  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase().trim();
    let skillScore = 0;
    let matchType = '';
    
    // METHOD 1: Direct skill match (HIGHEST PRIORITY - 100% score)
    const directMatch = verifiedSkills.find(skill => 
      skill.skill === jobSkillLower ||
      skill.skill.replace('_', ' ') === jobSkillLower ||
      skill.display_name.toLowerCase() === jobSkillLower
    );
    
    if (directMatch) {
      skillScore = Math.min(100, directMatch.score + 10);
      matchType = 'exact match';
      skillsMatched++;
      matchDetails.push(`${jobSkill}: ${skillScore}/100 (${directMatch.display_name} - exact match)`);
    }
    // METHOD 2: Synonym match
    else {
      const synonymMatch = verifiedSkills.find(skill => 
        skill.synonyms && skill.synonyms.some(synonym => 
          synonym.toLowerCase().includes(jobSkillLower) || 
          jobSkillLower.includes(synonym.toLowerCase())
        )
      );
      
      if (synonymMatch) {
        skillScore = Math.round(synonymMatch.score * 0.9);
        matchType = 'synonym match';
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

// ENHANCED: Reverse matching - find jobs suitable for candidate
function calculateCandidateJobMatch(candidate, candidateInterview, job) {
  console.log(`\n🔍 JOB MATCH: "${job.title}" for ${candidate.email}`);
  
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
    console.log(`   ❌ ROLE MISMATCH for job: ${candidateRole} ≠ ${jobRole}`);
    return {
      score: 0,
      matchDetails: [`❌ Role mismatch: Your role (${candidateRole}) doesn't match this ${jobRole} position`],
      hasInterview: !!candidateInterview,
      verified: !!(candidate.linkedin || candidate.github)
    };
  }
  
  // Role compatibility score
  const exactMatch = standardizeRole(jobRole) === standardizeRole(candidateRole);
  const roleScore = exactMatch ? 65 : 50; // 65 for exact, 50 for compatible
  totalScore += roleScore;
  matchDetails.push(`✅ Role match: ${exactMatch ? 'Perfect' : 'Compatible'} → ${roleScore}/65`);
  
  // STEP 2: ENHANCED SKILL MATCHING (25% weight)
  const skillMatch = calculateAdvancedSkillMatch(job.required_skills, candidateInterview);
  const skillScore = Math.round((skillMatch.score / 100) * 25);
  totalScore += skillScore;
  matchDetails.push(`🔧 Skills: ${skillMatch.matched}/${skillMatch.total} matched → ${skillScore}/25`);
  
  // Add skill details (limited to top 3 for UI)
  if (skillMatch.details.length > 0) {
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
  
  console.log(`   🎯 JOB SCORE: ${finalScore}% for "${job.title}" (Role:${roleScore} + Skills:${skillScore} + Exp:${expScore})`);
  
  return {
    score: finalScore,
    matchDetails,
    hasInterview: !!candidateInterview,
    verified: !!(candidate.linkedin || candidate.github),
    breakdown: {
      role_score: roleScore,
      skill_score: skillScore,
      experience_score: expScore,
      role_compatible: true
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    const { candidate_email, limit = 20 } = req.query;

    if (!candidate_email) {
      return res.status(400).json({ error: 'Candidate email required' });
    }

    console.log(`🔍 Fetching job recommendations for: ${candidate_email}`);

    // Step 1: Find candidate and their interview
    const candidate = await db.collection('candidates').findOne({ 
      email: candidate_email 
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidateInterview = await db.collection('interviews').findOne({
      candidate_id: candidate._id,
      status: 'completed'
    });

    if (!candidateInterview) {
      return res.status(400).json({
        error: 'Complete an AI interview to receive job recommendations',
        hasInterview: false
      });
    }

    console.log(`👤 Candidate: ${candidate.email}, Role: ${candidateInterview.role}`);

    // Step 2: Get all active jobs
    const jobs = await db.collection('jobs').find({
      is_active: { $ne: false },
      matching_enabled: { $ne: false }
    }).toArray();

    console.log(`📋 Found ${jobs.length} active jobs for matching`);

    // Step 3: Get candidate's existing applications
    const existingApplications = await db.collection('applications').find({
      candidate_id: candidate._id
    }).toArray();

    const appliedJobIds = new Set(existingApplications.map(app => app.job_id.toString()));

    // Step 4: Calculate match scores using ENHANCED algorithm and filter
    const jobRecommendations = jobs
      .map(job => {
        const match = calculateCandidateJobMatch(candidate, candidateInterview, job);
        const hasApplied = appliedJobIds.has(job._id.toString());
        const application = hasApplied ? 
          existingApplications.find(app => app.job_id.toString() === job._id.toString()) : null;
        
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
          created_at: job.created_at,
          recruiter_id: job.recruiter_id,
          
          // Matching Information
          match_score: match.score,
          match_details: match.matchDetails,
          compatibility_level: 
            match.score >= 80 ? 'Excellent' :
            match.score >= 65 ? 'Very Good' :
            match.score >= 50 ? 'Good' :
            match.score >= 35 ? 'Fair' : 'Low',
          
          // Application Status
          application_status: hasApplied ? application.status : null,
          applied_at: hasApplied ? application.applied_at : null,
          can_apply: !hasApplied,
          
          // Metadata
          verified_candidate: match.verified,
          interview_completed: match.hasInterview,
          role_compatible: match.score > 0 // Only role-compatible jobs get >0 score
        };
      })
      .filter(job => job.match_score > 0) // Only show role-compatible jobs (major improvement!)
      .filter(job => job.match_score >= 25) // Minimum quality threshold
      .sort((a, b) => {
        // Sort by: non-applied jobs first, then by match score
        if (a.can_apply && !b.can_apply) return -1;
        if (!a.can_apply && b.can_apply) return 1;
        return b.match_score - a.match_score;
      })
      .slice(0, parseInt(limit));

    // Step 5: Get recruiter details for jobs
    const recruiterIds = [...new Set(jobRecommendations.map(job => job.recruiter_id))];
    const recruiters = await db.collection('recruiters').find({
      _id: { $in: recruiterIds.map(id => new ObjectId(id)) }
    }).toArray();

    const recruiterMap = {};
    recruiters.forEach(recruiter => {
      recruiterMap[recruiter._id.toString()] = {
        name: recruiter.name,
        company: recruiter.company
      };
    });

    // Add recruiter info to jobs
    jobRecommendations.forEach(job => {
      const recruiterInfo = recruiterMap[job.recruiter_id.toString()];
      job.company = recruiterInfo?.company || 'Company';
      job.recruiter_name = recruiterInfo?.name || 'Recruiter';
    });

    // Step 6: Calculate recommendation stats
    const stats = {
      total_jobs_available: jobs.length,
      recommended_jobs: jobRecommendations.length,
      already_applied: existingApplications.length,
      new_recommendations: jobRecommendations.filter(job => job.can_apply).length,
      avg_match_score: jobRecommendations.length > 0 ? 
        Math.round(jobRecommendations.reduce((sum, job) => sum + job.match_score, 0) / jobRecommendations.length) : 0,
      excellent_matches: jobRecommendations.filter(job => job.match_score >= 80).length,
      good_matches: jobRecommendations.filter(job => job.match_score >= 65).length,
      role_compatible_jobs: jobRecommendations.length // All returned jobs are role-compatible
    };

    console.log(`✅ Job recommendations prepared: ${jobRecommendations.length} role-compatible jobs, avg score ${stats.avg_match_score}%`);

    res.status(200).json({
      success: true,
      candidate: {
        id: candidate._id.toString(),
        name: candidate.name,
        email: candidate.email,
        role: candidateInterview.role,
        interview_score: candidateInterview.overall_rating,
        skills_count: (candidateInterview.matching_keywords || []).length,
        verified_skills: candidateInterview.matching_keywords || []
      },
      recommendations: jobRecommendations,
      stats: stats,
      metadata: {
        last_updated: new Date(),
        algorithm_version: "v2.0_enhanced_role_filtering",
        matching_criteria: "65% role compatibility + 25% skills + 10% experience",
        role_filtering_enabled: true,
        skill_sources: ["matching_keywords", "areas_for_improvement", "competency_scores"]
      }
    });

  } catch (error) {
    console.error('❌ Job recommendations API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job recommendations',
      details: error.message 
    });
  }
}