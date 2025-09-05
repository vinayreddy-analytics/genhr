// pages/api/recruiter/post-job.js
// Handles job posting to unified database with proper skill parsing

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    
    const { 
      title, 
      location, 
      mode, 
      type, 
      visa, 
      skills, 
      experience, 
      salary, 
      description,
      recruiter_email 
    } = req.body;

    console.log('📝 Job posting request:', { title, recruiter_email });

    // Validate required fields
    if (!title || !location || !recruiter_email) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: title, location, recruiter_email' 
      });
    }

    // Find recruiter
    const recruiter = await db.collection('recruiters').findOne({ 
      email: recruiter_email 
    });
    
    if (!recruiter) {
      return res.status(404).json({ 
        success: false,
        error: 'Recruiter not found' 
      });
    }

    // Parse skills string into array
    const skillsArray = skills ? 
      skills.split(',').map(skill => skill.trim().toLowerCase()).filter(skill => skill) : 
      [];

    // Create job document
    const jobData = {
      title: title.trim(),
      location: location.trim(),
      mode: mode || 'Onsite',
      type: type || 'Full-time',
      visa_required: visa === 'Yes',
      required_skills: skillsArray,
      experience: experience || '0',
      salary_range: salary || null,
      description: description || '',
      recruiter_id: recruiter._id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      
      // For Phase 3 job matching algorithm
      matching_criteria: {
        min_experience_years: parseInt(experience) || 0,
        location_flexible: mode !== 'Onsite',
        skill_weight: 0.5, // 50% weight for skills in matching
        experience_weight: 0.3, // 30% weight for experience
        interview_weight: 0.2 // 20% weight for interview performance
      },
      
      // Analytics tracking
      analytics: {
        views: 0,
        applications: 0,
        matches_generated: 0,
        last_viewed: null
      }
    };

    // Save job to database
    const result = await db.collection('jobs').insertOne(jobData);
    
    console.log('✅ Job posted successfully:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job: {
        id: result.insertedId,
        title: jobData.title,
        location: jobData.location,
        required_skills: jobData.required_skills
      }
    });

  } catch (error) {
    console.error('❌ Job posting error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to post job',
      details: error.message 
    });
  }
}