// pages/api/recruiter/dashboard-data.js
// FIXED: Enhanced matching algorithm with role filtering and proper skill detection

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
    console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
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
function calculateEnhancedSkillMatch(jobSkills, candidateInterview) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 80, details: ['No specific skills required'], matched: 0, total: 0 };
  }
  
  if (!candidateInterview) {
    return { score: 0, details: ['No interview data'], matched: 0, total: jobSkills.length };
  }
  
  // Get all possible skill sources from candidate interview
  const matchingKeywords = candidateInterview.matching_keywords || [];
  const competencyScores = candidateInterview.competency_scores || {};
  const areasForImprovement = candidateInterview.areas_for_improvement || [];
  
  let totalScore = 0;
  let matchDetails = [];
  let skillsMatched = 0;
  
  console.log(`   Checking skills for candidate. Available keywords: ${matchingKeywords}, competencies: ${Object.keys(competencyScores)}`);
  
  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase().trim();
    let skillScore = 0;
    let matchSource = '';
    
    // Method 1: Direct match in matching_keywords (HIGHEST PRIORITY - this fixes Vamsi!)
    const directKeywordMatch = matchingKeywords.find(keyword => 
      keyword.toLowerCase() === jobSkillLower ||
      keyword.toLowerCase().includes(jobSkillLower) ||
      jobSkillLower.includes(keyword.toLowerCase())
    );
    
    if (directKeywordMatch) {
      skillScore = 90; // High score for direct skill match
      matchSource = 'exact match';
      skillsMatched++;
      matchDetails.push(`${jobSkill}: 90/100 (${directKeywordMatch} - exact match)`);
    }
    // Method 2: Check areas for improvement (candidate mentioned but needs work)
    else if (areasForImprovement.some(area => 
      area.toLowerCase().includes(jobSkillLower) || jobSkillLower.includes(area.toLowerCase())
    )) {
      skillScore = 65; // Lower but still positive score
      matchSource = 'area for improvement'; 
      skillsMatched++;
      matchDetails.push(`${jobSkill}: 65/100 (mentioned, needs development)`);
    }
    // Method 3: Map to competency categories (FALLBACK)
    else {
      const skillToCompetency = {
        'python': 'technical_skills',
        'sql': 'technical_skills',
        'excel': 'technical_skills', 
        'tableau': 'technical_skills',
        'power bi': 'technical_skills',
        'autocad': 'technical_skills',
        'solidworks': 'technical_skills', 
        'revit': 'technical_skills',
        'salesforce': 'technical_skills',
        'jira': 'technical_skills',
        'javascript': 'technical_skills',
        'react': 'technical_skills'
      };
      
      const competencyKey = skillToCompetency[jobSkillLower];
      if (competencyKey && competencyScores[competencyKey]) {
        skillScore = Math.round(competencyScores[competencyKey] * 0.6); // 60% of competency score
        matchSource = 'competency category';
        skillsMatched++;
        matchDetails.push(`${jobSkill}: ${skillScore}/100 (${competencyKey})`);
      } else {
        matchDetails.push(`${jobSkill}: No match found`);
      }
    }
    
    totalScore += skillScore;
    console.log(`   Skill "${jobSkill}": ${skillScore} points (${matchSource})`);
  }
  
  const averageScore = jobSkills.length > 0 ? Math.round(totalScore / jobSkills.length) : 0;
  
  return {
    score: averageScore,
    details: matchDetails,
    matched: skillsMatched,
    total: jobSkills.length
  };
}

// MAIN ENHANCED MATCHING FUNCTION
function calculateJobCandidateMatch(job, candidate, candidateInterview) {
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
  const roleScore = exactMatch ? 65 : 50; // 65 for exact, 50 for compatible
  totalScore += roleScore;
  matchDetails.push(`✅ Role: ${candidateRole} ${exactMatch ? '(exact match)' : '(compatible)'} → ${roleScore}/65`);
  
  // STEP 2: ENHANCED SKILL MATCHING (25% weight)
  const skillMatch = calculateAdvancedSkillMatch(job.required_skills, candidateInterview);
  const skillScore = Math.round((skillMatch.score / 100) * 25);
  totalScore += skillScore;
  matchDetails.push(`🔧 Skills: ${skillMatch.matched}/${skillMatch.total} matched → ${skillScore}/25`);
  
  // Add top 3 skill details
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
  
  console.log(`   🎯 FINAL SCORE: ${finalScore}% (Role:${roleScore} + Skills:${skillScore} + Exp:${expScore})`);
  
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
// SPECIFIC UPDATE FOR: pages/api/recruiter/dashboard-data.js
// Add these functions AFTER your existing calculateJobCandidateMatch function

// ENHANCED SKILL MATCHING WITH SYNONYM SUPPORT
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
  // This is your EXISTING skill matching logic - copy it exactly from your current calculateJobCandidateMatch function
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



export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    const { recruiter_email } = req.query;

    if (!recruiter_email) {
      return res.status(400).json({ error: 'Recruiter email required' });
    }

    console.log(`🔍 Fetching dashboard data for recruiter: ${recruiter_email}`);

    // Step 1: Find recruiter
    const recruiter = await db.collection('recruiters').findOne({ email: recruiter_email });
    
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Step 2: Get recruiter's posted jobs
    const jobs = await db.collection('jobs').find(
      { recruiter_id: recruiter._id }
    ).sort({ created_at: -1 }).toArray();

    console.log(`📋 Found ${jobs.length} jobs for recruiter`);

    // Step 3: Get all candidates with interviews for matching
    const candidates = await db.collection('candidates').find({}).toArray();
    const interviews = await db.collection('interviews').find({ status: 'completed' }).toArray();

    // Create a map of candidate interviews
    const candidateInterviews = {};
    interviews.forEach(interview => {
      const candidateId = interview.candidate_id.toString();
      candidateInterviews[candidateId] = interview;
    });

    console.log(`👥 Found ${candidates.length} candidates, ${interviews.length} completed interviews`);

    // Step 4: Calculate matches for each job using ENHANCED algorithm
    const jobsWithMatches = jobs.map(job => {
      const candidateMatches = candidates
        .map(candidate => {
          const candidateInterview = candidateInterviews[candidate._id.toString()];
          const match = calculateJobCandidateMatch(job, candidate, candidateInterview);
          
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
            role: candidateInterview?.role || 'Not specified'
          };
        })
        .filter(candidate => candidate.score > 0) // Only show compatible role candidates
        .sort((a, b) => b.score - a.score) // Sort by match score
        .slice(0, 10); // Top 10 matches

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
        candidateMatches: candidateMatches,
        totalApplicants: candidateMatches.length
      };
    });

    // Step 5: Prepare candidate pool data (all candidates with interviews)
    const candidatePool = candidates
      .map(candidate => {
        const candidateInterview = candidateInterviews[candidate._id.toString()];
        if (!candidateInterview) return null; // Only include interviewed candidates
        
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
      .filter(candidate => candidate !== null) // Remove null entries
      .sort((a, b) => b.overallRating - a.overallRating); // Sort by interview rating

    // Step 6: Calculate dashboard statistics
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
      averageMatchScore: Math.round(averageMatchScore),
      topPerformingJob: jobsWithMatches.length > 0 
        ? jobsWithMatches.reduce((best, job) => 
            job.candidateMatches.length > (best.candidateMatches?.length || 0) ? job : best
          ).title
        : 'No jobs posted'
    };

    console.log(`✅ Dashboard data prepared: ${totalJobs} jobs, ${totalCandidatesWithInterviews} candidates`);

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
      metadata: {
        algorithm_version: "v2.0_enhanced_with_role_filtering",
        matching_weights: "65% role + 25% skills + 10% experience",
        last_updated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Recruiter dashboard API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message 
    });
  }
}