// pages/api/recruiter/application-management.js
// Fetches applications for recruiter's jobs with candidate details and filtering

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    const { 
      recruiter_email, 
      job_id = null, 
      status = null, 
      sort_by = 'newest', // newest, oldest, score_high, score_low
      limit = 50 
    } = req.query;

    if (!recruiter_email) {
      return res.status(400).json({ error: 'Recruiter email required' });
    }

    console.log(`📥 Fetching applications for recruiter: ${recruiter_email}`);

    // Step 1: Find recruiter
    const recruiter = await db.collection('recruiters').findOne({ 
      email: recruiter_email 
    });
    
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Step 2: Build query filter for applications
    let applicationFilter = { recruiter_id: recruiter._id };
    
    if (job_id) {
      applicationFilter.job_id = new ObjectId(job_id);
    }
    
    if (status) {
      applicationFilter.status = status;
    }

    // Step 3: Build sort criteria
    let sortCriteria = {};
    switch (sort_by) {
      case 'newest':
        sortCriteria = { applied_at: -1 };
        break;
      case 'oldest':
        sortCriteria = { applied_at: 1 };
        break;
      case 'score_high':
        sortCriteria = { match_score: -1, applied_at: -1 };
        break;
      case 'score_low':
        sortCriteria = { match_score: 1, applied_at: -1 };
        break;
      default:
        sortCriteria = { applied_at: -1 };
    }

    // Step 4: Get applications with pagination
    const applications = await db.collection('applications')
      .find(applicationFilter)
      .sort(sortCriteria)
      .limit(parseInt(limit))
      .toArray();

    console.log(`📄 Found ${applications.length} applications`);

    if (applications.length === 0) {
      return res.status(200).json({
        success: true,
        recruiter: {
          id: recruiter._id.toString(),
          name: recruiter.name,
          email: recruiter.email,
          company: recruiter.company
        },
        applications: [],
        jobs: [],
        stats: {
          total_applications: 0,
          new_applications: 0,
          by_status: {},
          avg_match_score: 0
        }
      });
    }

    // Step 5: Get candidate details for applications
    const candidateIds = applications.map(app => app.candidate_id);
    const candidates = await db.collection('candidates').find({
      _id: { $in: candidateIds }
    }).toArray();

    const candidateMap = {};
    candidates.forEach(candidate => {
      candidateMap[candidate._id.toString()] = candidate;
    });

    // Step 6: Get interview details for candidates
    const interviews = await db.collection('interviews').find({
      candidate_id: { $in: candidateIds },
      status: 'completed'
    }).toArray();

    const interviewMap = {};
    interviews.forEach(interview => {
      interviewMap[interview.candidate_id.toString()] = interview;
    });

    // Step 7: Get job details for applications
    const jobIds = [...new Set(applications.map(app => app.job_id.toString()))];
    const jobs = await db.collection('jobs').find({
      _id: { $in: jobIds.map(id => new ObjectId(id)) }
    }).toArray();

    const jobMap = {};
    jobs.forEach(job => {
      jobMap[job._id.toString()] = job;
    });

    // Step 8: Enrich applications with candidate and job data
    const enrichedApplications = applications.map(application => {
      const candidate = candidateMap[application.candidate_id.toString()];
      const interview = interviewMap[application.candidate_id.toString()];
      const job = jobMap[application.job_id.toString()];

      return {
        id: application._id.toString(),
        
        // Application Details
        applied_at: application.applied_at,
        status: application.status,
        match_score: application.match_score,
        application_type: application.application_type,
        recruiter_viewed_at: application.recruiter_viewed_at,
        last_updated: application.last_updated,
        
        // Candidate Information
        candidate: {
          id: candidate._id.toString(),
          name: candidate.name,
          email: candidate.email,
          experience_years: candidate.experience_years || 0,
          linkedin: candidate.linkedin || null,
          github: candidate.github || null,
          verified: !!(candidate.linkedin || candidate.github),
          
          // Interview Performance
          interview_score: interview?.overall_rating || null,
          interview_date: interview?.completed_at || null,
          top_skills: interview?.competency_scores ? 
            Object.entries(interview.competency_scores)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([skill, score]) => ({ skill: skill.replace('_', ' '), score }))
            : []
        },
        
        // Job Information
        job: {
          id: job._id.toString(),
          title: job.title,
          location: job.location,
          type: job.type,
          mode: job.mode,
          required_skills: job.required_skills || []
        },
        
        // Match Details
        match_details: application.match_details,
        candidate_message: application.candidate_message,
        recruiter_notes: application.recruiter_notes,
        
        // Computed Fields
        compatibility_level: 
          application.match_score >= 80 ? 'Excellent' :
          application.match_score >= 65 ? 'Very Good' :
          application.match_score >= 50 ? 'Good' :
          application.match_score >= 35 ? 'Fair' : 'Low',
        
        days_since_applied: Math.floor(
          (new Date() - new Date(application.applied_at)) / (1000 * 60 * 60 * 24)
        ),
        
        is_new: !application.recruiter_viewed_at,
        needs_attention: application.status === 'applied' && 
          Math.floor((new Date() - new Date(application.applied_at)) / (1000 * 60 * 60 * 24)) > 3
      };
    });

    // Step 9: Calculate comprehensive stats
    const stats = {
      total_applications: applications.length,
      new_applications: applications.filter(app => !app.recruiter_viewed_at).length,
      by_status: {},
      by_job: {},
      avg_match_score: applications.length > 0 ? 
        Math.round(applications.reduce((sum, app) => sum + app.match_score, 0) / applications.length) : 0,
      excellent_matches: applications.filter(app => app.match_score >= 80).length,
      good_matches: applications.filter(app => app.match_score >= 65).length,
      needs_attention: enrichedApplications.filter(app => app.needs_attention).length
    };

    // Count by status
    applications.forEach(app => {
      stats.by_status[app.status] = (stats.by_status[app.status] || 0) + 1;
    });

    // Count by job
    applications.forEach(app => {
      const jobTitle = jobMap[app.job_id.toString()]?.title || 'Unknown Job';
      stats.by_job[jobTitle] = (stats.by_job[jobTitle] || 0) + 1;
    });

    // Step 10: Prepare job summary for recruiter
    const jobSummaries = jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      location: job.location,
      application_count: applications.filter(app => app.job_id.toString() === job._id.toString()).length,
      new_applications: applications.filter(app => 
        app.job_id.toString() === job._id.toString() && !app.recruiter_viewed_at
      ).length,
      avg_match_score: (() => {
        const jobApplications = applications.filter(app => app.job_id.toString() === job._id.toString());
        return jobApplications.length > 0 ? 
          Math.round(jobApplications.reduce((sum, app) => sum + app.match_score, 0) / jobApplications.length) : 0;
      })(),
      created_at: job.created_at,
      is_active: job.is_active !== false
    }));

    console.log(`✅ Application management data prepared: ${applications.length} applications, ${stats.new_applications} new`);

    res.status(200).json({
      success: true,
      recruiter: {
        id: recruiter._id.toString(),
        name: recruiter.name,
        email: recruiter.email,
        company: recruiter.company
      },
      applications: enrichedApplications,
      jobs: jobSummaries,
      stats: stats,
      filters: {
        current_job_filter: job_id,
        current_status_filter: status,
        sort_by: sort_by,
        available_statuses: ['applied', 'viewed', 'interested', 'rejected', 'contacted', 'hired']
      },
      metadata: {
        last_updated: new Date(),
        total_count: applications.length,
        page_limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Application management API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch applications',
      details: error.message 
    });
  }
}