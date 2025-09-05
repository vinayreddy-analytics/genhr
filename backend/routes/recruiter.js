import express from 'express';
import Recruiter from '../models/Recruiter.js';
import Job from '../models/Job.js';  // Add this import

const router = express.Router();

// Existing recruiter signup route
router.post('/', async (req, res) => {
  try {
    const recruiter = new Recruiter(req.body);
    await recruiter.save();
    res.status(201).json({ message: 'Recruiter saved' });
  } catch (error) {
    console.error('Error saving recruiter:', error.message);
    res.status(500).json({ error: 'Error saving recruiter' });
  }
});

// NEW: Job posting route
router.post('/jobs', async (req, res) => {
  try {
    console.log('Received job data:', req.body);
    
    // For now, we'll use a dummy recruiter ID since we don't have authentication yet
    // Later we'll get this from JWT token
    const recruiters = await Recruiter.find();
    const recruiterId = recruiters[0]?._id; // Use the first recruiter for now
    
    if (!recruiterId) {
      return res.status(400).json({ error: 'No recruiter found' });
    }
    
    const jobData = {
      ...req.body,
      recruiterId: recruiterId
    };
    
    const job = new Job(jobData);
    await job.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Job posted successfully!',
      jobId: job._id 
    });
    
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error posting job' 
    });
  }
});

export default router;




