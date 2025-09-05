import mongoose from 'mongoose';

const recruiterSchema = new mongoose.Schema({
  recruiterName: String,
  companyName: String,
  email: { type: String, required: true },
  phone: String,
  
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
const Recruiter = mongoose.models.Recruiter || mongoose.model('Recruiter', recruiterSchema);
export default Recruiter;