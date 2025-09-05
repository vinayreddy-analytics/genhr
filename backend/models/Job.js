import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // Basic Job Info
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['Remote', 'Hybrid', 'Onsite'],
    required: true
  },
  type: {
    type: String,
    enum: ['Full-Time', 'Contract', 'Temporary', 'Internship'],
    required: true
  },
  visa: {
    type: String,
    enum: ['Yes', 'No'],
    required: true
  },
  skills: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    required: true
  },
  salary: String,
  description: {
    type: String,
    required: true
  },
  
  // Auto-generated fields
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Job = mongoose.model('Job', jobSchema);
export default Job;