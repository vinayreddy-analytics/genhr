import express from 'express';
import multer from 'multer';
import Candidate from '../models/Candidate.js';

const router = express.Router();

// Set up file upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('govtId'), async (req, res) => {
  try {
    console.log('Received data:', req.body); // Debug log
    
    // Handle JSON stringified arrays
    const candidateData = { ...req.body };
    
    // Parse stringified arrays back to objects
    if (candidateData.workExperience) {
      candidateData.workExperience = JSON.parse(candidateData.workExperience);
    }
    if (candidateData.desiredLocations) {
      candidateData.desiredLocations = JSON.parse(candidateData.desiredLocations);
    }
    
    // Handle file upload
    if (req.file) {
      candidateData.govtId = req.file.path;
    }
    
    // Convert string "true"/"false" to boolean for consent
    if (candidateData.consent) {
      candidateData.consent = candidateData.consent === 'true';
    }
    
    console.log('Processed data:', candidateData); // Debug log
    
    const candidate = new Candidate(candidateData);
    await candidate.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Candidate data saved successfully',
      candidateId: candidate._id
    });
    
  } catch (error) {
    console.error('Error saving candidate:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;





