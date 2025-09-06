// pages/api/candidate/apply-to-job.js
// Handles candidate applications to jobs with match score calculation

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

// Enhanced job-candidate matching (same logic as dashboard-data.js)
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
// 2. Skills matching (50% weight)
  let skillMatches = 0; // Move this outside the if block
  const jobSkills = job.required_skills ? job.required_skills.map(s => s.toLowerCase().trim()) : [];

  if (job.required_skills && candidateInterview?.competency_scores) {
    const candidateSkills = Object.keys(candidateInterview.competency_scores).map(s => s.toLowerCase().replace('_', ' '));
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
    experience_match: candidateExp >= jobExpRequired ? 30 : Math.max(0, (candidateExp / jobExpRequired) * 30),
    skills_match: job.required_skills && candidateInterview?.competency_scores ? 
      (jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 50 : 0) : 0,
    interview_match: candidateInterview?.overall_rating ? (candidateInterview.overall_rating / 100) * 20 : 0
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    
    const { 
      candidate_email,
      job_id, 
      candidate_message = ""
    } = req.body;

    console.log(`📤 Application request: ${candidate_email} -> Job ${job_id}`);

    // Validate required fields
    if (!candidate_email || !job_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: candidate_email, job_id' 
      });
    }

    // Find candidate
    const candidate = await db.collection('candidates').findOne({ 
      email: candidate_email 
    });
    
    if (!candidate) {
      return res.status(404).json({ 
        success: false,
        error: 'Candidate not found' 
      });
    }

    // Find job and validate it exists and is active
    const job = await db.collection('jobs').findOne({ 
      _id: new ObjectId(job_id),
      is_active: { $ne: false }
    });
    
    if (!job) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found or inactive' 
      });
    }

    // Check if candidate already applied to this job
    const existingApplication = await db.collection('applications').findOne({
      candidate_id: candidate._id,
      job_id: new ObjectId(job_id)
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        error: 'Already applied to this job',
        application: {
          applied_at: existingApplication.applied_at,
          status: existingApplication.status,
          match_score: existingApplication.match_score
        }
      });
    }

    // Get candidate's interview data for match calculation
    const candidateInterview = await db.collection('interviews').findOne({
      candidate_id: candidate._id,
      status: 'completed'
    });

    if (!candidateInterview) {
      return res.status(400).json({
        success: false,
        error: 'Complete an AI interview before applying to jobs'
      });
    }

    // Calculate match score
    const matchResult = calculateJobCandidateMatch(job, candidate, candidateInterview);

    // Create application document
    const application = {
      candidate_id: candidate._id,
      job_id: new ObjectId(job_id),
      recruiter_id: job.recruiter_id,
      
      applied_at: new Date(),
      match_score: matchResult.score,
      application_type: "candidate_applied",
      
      status: "applied",
      recruiter_viewed_at: null,
      last_updated: new Date(),
      
      recruiter_notes: "",
      candidate_message: candidate_message.trim(),
      
      match_details: {
        experience_match: Math.round(matchResult.experience_match),
        skills_match: Math.round(matchResult.skills_match),
        interview_match: Math.round(matchResult.interview_match),
        match_breakdown: matchResult.matchDetails
      },
      
      created_at: new Date(),
      updated_at: new Date()
    };

    // Save application
    const result = await db.collection('applications').insertOne(application);

    // Update job application stats
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(job_id) },
      { 
        $inc: { 
          'analytics.applications': 1,
          'application_stats.total_applications': 1,
          'application_stats.new_applications': 1
        },
        $set: { 'analytics.last_viewed': new Date() }
      }
    );

    // Update candidate application history
    await db.collection('candidates').updateOne(
      { _id: candidate._id },
      { 
        $inc: { 'application_history.total_applications': 1 },
        $set: { 
          'application_history.last_application_date': new Date(),
          'application_history.avg_match_score': matchResult.score // Simplified - should calculate actual average
        }
      }
    );

    console.log(`✅ Application submitted: ${candidate.name} applied to "${job.title}" (${matchResult.score}% match)`);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: result.insertedId,
        job_title: job.title,
        company: job.company || 'Company',
        match_score: matchResult.score,
        applied_at: application.applied_at,
        status: application.status,
        match_details: application.match_details
      }
    });

  } catch (error) {
    console.error('❌ Job application error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit application',
      details: error.message 
    });
  }
}