// pages/api/recruiter/dashboard-data.js
// Fetches real recruiter dashboard data with job postings and candidate matches

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

// Basic job matching algorithm - will enhance this in Phase 3
function calculateJobCandidateMatch(job, candidate, candidateInterview) {
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

  // 2. Skills matching (50% weight)
  if (job.required_skills && candidateInterview?.competency_scores) {
    const jobSkills = job.required_skills.map(s => s.toLowerCase().trim());
    const candidateSkills = Object.keys(candidateInterview.competency_scores).map(s => s.toLowerCase().replace('_', ' '));
    
    let skillMatches = 0;
    let skillMatchDetails = [];
    
    jobSkills.forEach(jobSkill => {
      const matchingSkill = candidateSkills.find(candidateSkill => 
        candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill)
      );
      
      if (matchingSkill) {
        skillMatches++;
        const skillKey = Object.keys(candidateInterview.competency_scores).find(key => 
          key.toLowerCase().replace('_', ' ').includes(jobSkill)
        );
        const skillScore = candidateInterview.competency_scores[skillKey] || 0;
        skillMatchDetails.push(`${jobSkill}: ${skillScore}/100`);
      }
    });
    
    const skillMatchPercentage = jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 50 : 0;
    score += skillMatchPercentage;
    matchDetails.push(`Skills: ${skillMatches}/${jobSkills.length} matched (${Math.round(skillMatchPercentage)}%)`);
    matchDetails.push(...skillMatchDetails);
  }

  // 3. Overall interview rating (20% weight)
  if (candidateInterview?.overall_rating) {
    const ratingScore = (candidateInterview.overall_rating / 100) * 20;
    score += ratingScore;
    matchDetails.push(`Interview Rating: ${candidateInterview.overall_rating}/100 (${Math.round(ratingScore)}%)`);
  }

  return {
    score: Math.round(score),
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

    // Step 4: Calculate matches for each job
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
            overallRating: candidateInterview?.overall_rating || null
          };
        })
        .filter(candidate => candidate.score > 20) // Only show candidates with >20% match
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

    // Step 5: Calculate dashboard statistics
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
      stats: dashboardStats
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