// pages/api/candidate/job-recommendations.js
// Shows jobs matched to candidate's skills and experience with application status

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
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Reverse matching: find jobs suitable for candidate
function calculateCandidateJobMatch(candidate, candidateInterview, job) {
  let score = 0;
  let matchDetails = [];

  // 1. Experience matching (30% weight)
  const jobExpRequired = parseInt(job.experience) || 0;
  const candidateExp = candidate.experience_years || 0;
  
  if (candidateExp >= jobExpRequired) {
    score += 30;
    matchDetails.push(`Experience: ${candidateExp}/${jobExpRequired} years ✓`);
  } else {
    const expScore = Math.max(0, (candidateExp / jobExpRequired) * 30);
    score += expScore;
    matchDetails.push(`Experience: ${candidateExp}/${jobExpRequired} years (${Math.round(expScore)}%)`);
  }

  // 2. Skills matching (50% weight) - Enhanced with partial matching
  if (job.required_skills && candidateInterview?.competency_scores) {
    const jobSkills = job.required_skills.map(s => s.toLowerCase().trim());
    const candidateSkills = Object.keys(candidateInterview.competency_scores);
    
    let skillMatches = 0;
    let totalSkillScore = 0;
    let skillMatchDetails = [];
    
    jobSkills.forEach(jobSkill => {
      const matchingSkill = candidateSkills.find(candidateSkill => 
        candidateSkill.toLowerCase().replace('_', ' ').includes(jobSkill) || 
        jobSkill.includes(candidateSkill.toLowerCase().replace('_', ' '))
      );
      
      if (matchingSkill) {
        skillMatches++;
        const skillScore = candidateInterview.competency_scores[matchingSkill] || 0;
        totalSkillScore += skillScore;
        skillMatchDetails.push(`${jobSkill}: ${skillScore}/100`);
      }
    });
    
    const skillMatchPercentage = jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 50 : 0;
    
    // Bonus for high skill scores
    const avgSkillScore = skillMatches > 0 ? totalSkillScore / skillMatches : 0;
    const skillBonus = avgSkillScore > 80 ? 5 : avgSkillScore > 65 ? 3 : 0;
    
    score += skillMatchPercentage + skillBonus;
    matchDetails.push(`Skills: ${skillMatches}/${jobSkills.length} matched (${Math.round(skillMatchPercentage)}%)`);
    if (skillBonus > 0) {
      matchDetails.push(`Skill Excellence Bonus: +${skillBonus} points`);
    }
    matchDetails.push(...skillMatchDetails);
  }

  // 3. Interview performance (20% weight)
  if (candidateInterview?.overall_rating) {
    const ratingScore = (candidateInterview.overall_rating / 100) * 20;
    score += ratingScore;
    matchDetails.push(`Interview Rating: ${candidateInterview.overall_rating}/100 (${Math.round(ratingScore)}%)`);
  }

  // 4. Location preference bonus (up to 5 points)
  if (candidate.job_preferences?.preferred_work_modes?.includes(job.mode)) {
    score += 3;
    matchDetails.push(`Work Mode Preference: ${job.mode} ✓ (+3 points)`);
  }

  return {
    score: Math.min(Math.round(score), 100), // Cap at 100
    matchDetails,
    hasInterview: !!candidateInterview,
    verified: !!(candidate.linkedin || candidate.github)
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

    // Step 4: Calculate match scores and filter
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
          interview_completed: match.hasInterview
        };
      })
      .filter(job => job.match_score >= (job.auto_match_threshold || 25)) // Only show decent matches
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
      good_matches: jobRecommendations.filter(job => job.match_score >= 65).length
    };

    console.log(`✅ Job recommendations prepared: ${jobRecommendations.length} jobs, avg score ${stats.avg_match_score}%`);

    res.status(200).json({
      success: true,
      candidate: {
        id: candidate._id.toString(),
        name: candidate.name,
        email: candidate.email,
        interview_score: candidateInterview.overall_rating,
        skills_count: Object.keys(candidateInterview.competency_scores || {}).length
      },
      recommendations: jobRecommendations,
      stats: stats,
      metadata: {
        last_updated: new Date(),
        algorithm_version: "v2.0",
        matching_criteria: "30% experience + 50% skills + 20% interview + location preferences"
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