import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  // Basic Info - EXACT field names from your form
  fullName: String,
  email: String,
  
  // Job Info - EXACT field names from your form
  jobTitle: String,
  preferredRole: String,
  experience: String,
  skills: String,
  expectedSalary: String,
  contactEmail: String,
  
  // Personal Info - EXACT field names from your form
  linkedin: String,
  github: String,
  birthYear: String,
  degree: String,
  university: String,
  graduationYear: String,
  previousHrEmail: String,
  
  // Dropdowns - EXACT field names from your form
  jobType: String,
  skillLevel: String,
  gender: String,
  sexuality: String,
  visaStatus: String,
  
  // Location - EXACT field names from your form
  currentLocation: String,
  desiredLocations: [String],
  
  // Work Experience - EXACT structure from your form
  workExperience: [{
    company: String,
    startDate: String,
    endDate: String,
    reasonForGap: String
  }],
  
  // File Upload - EXACT field name from your form
  govtId: String,
  
  // Consent - Added missing field
  consent: Boolean,
  
  // NEW: Link to User account
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if model exists before creating
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
export default Candidate;





