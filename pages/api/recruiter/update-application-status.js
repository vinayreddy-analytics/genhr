// pages/api/recruiter/update-application-status.js
// Allows recruiters to update application status and add notes

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
      application_id,
      new_status, 
      recruiter_notes = "",
      recruiter_email
    } = req.body;

    console.log(`📝 Updating application ${application_id} status to: ${new_status}`);

    // Validate required fields
    if (!application_id || !new_status || !recruiter_email) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: application_id, new_status, recruiter_email' 
      });
    }

    // Validate status values
    const validStatuses = ['applied', 'viewed', 'interested', 'rejected', 'contacted', 'hired'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find recruiter to verify permissions
    const recruiter = await db.collection('recruiters').findOne({ 
      email: recruiter_email 
    });
    
    if (!recruiter) {
      return res.status(404).json({ 
        success: false,
        error: 'Recruiter not found' 
      });
    }

    // Find application and verify ownership
    const application = await db.collection('applications').findOne({
      _id: new ObjectId(application_id),
      recruiter_id: recruiter._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or access denied'
      });
    }

    // Prepare update data
    const updateData = {
      status: new_status,
      last_updated: new Date(),
      updated_at: new Date()
    };

    // Add recruiter notes if provided
    if (recruiter_notes.trim()) {
      updateData.recruiter_notes = recruiter_notes.trim();
    }

    // Mark as viewed if this is the first time recruiter is taking action
    if (!application.recruiter_viewed_at) {
      updateData.recruiter_viewed_at = new Date();
    }

    // Update application
    const updateResult = await db.collection('applications').updateOne(
      { _id: new ObjectId(application_id) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Update job statistics based on status change
    const job = await db.collection('jobs').findOne({ _id: application.job_id });
    
    if (job) {
      const updateJobStats = {};
      
      // Decrease new applications count if this was a new application
      if (!application.recruiter_viewed_at) {
        updateJobStats['$inc'] = { 'application_stats.new_applications': -1 };
      }

      // Update specific status counts
      if (new_status === 'interested') {
        updateJobStats['$inc'] = { 
          ...updateJobStats['$inc'],
          'application_stats.interested_count': 1 
        };
      } else if (new_status === 'contacted') {
        updateJobStats['$inc'] = { 
          ...updateJobStats['$inc'],
          'application_stats.contacted_count': 1 
        };
      }

      if (Object.keys(updateJobStats).length > 0) {
        await db.collection('jobs').updateOne(
          { _id: application.job_id },
          updateJobStats
        );
      }
    }

    // Get updated application with candidate details for response
    const updatedApplication = await db.collection('applications').findOne({
      _id: new ObjectId(application_id)
    });

    const candidate = await db.collection('candidates').findOne({
      _id: application.candidate_id
    });

    const jobDetails = await db.collection('jobs').findOne({
      _id: application.job_id
    });

    // Log the status change
    console.log(`✅ Application updated: ${candidate.name} -> ${jobDetails.title} (${application.status} → ${new_status})`);

    // Send response with updated application data
    res.status(200).json({
      success: true,
      message: `Application status updated to "${new_status}"`,
      application: {
        id: updatedApplication._id.toString(),
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        job_title: jobDetails.title,
        previous_status: application.status,
        new_status: updatedApplication.status,
        match_score: updatedApplication.match_score,
        applied_at: updatedApplication.applied_at,
        last_updated: updatedApplication.last_updated,
        recruiter_viewed_at: updatedApplication.recruiter_viewed_at,
        recruiter_notes: updatedApplication.recruiter_notes
      },
      next_actions: getNextActionSuggestions(new_status, updatedApplication.match_score)
    });

  } catch (error) {
    console.error('❌ Application status update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update application status',
      details: error.message 
    });
  }
}

// Helper function to suggest next actions based on status
function getNextActionSuggestions(status, matchScore) {
  switch (status) {
    case 'viewed':
      return [
        'Mark as "interested" if candidate looks promising',
        'Add notes about candidate strengths/concerns',
        'Review candidate\'s interview performance in detail'
      ];
    
    case 'interested':
      return [
        'Contact candidate to schedule interview',
        'Review candidate\'s LinkedIn/GitHub profiles',
        'Prepare interview questions based on their skills'
      ];
    
    case 'contacted':
      return [
        'Schedule interview or call',
        'Send additional job details if requested',
        'Set follow-up reminder'
      ];
    
    case 'rejected':
      return [
        'Consider providing feedback to candidate',
        'Review rejection reasons for future matching',
        'Archive application'
      ];
    
    case 'hired':
      return [
        'Update job status to filled',
        'Send welcome information',
        'Begin onboarding process'
      ];
    
    default:
      return ['Review application and determine next steps'];
  }
}