import { useState } from 'react';
import { getUserEmail } from '../utils/auth';

export default function PostJobForm({ onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    mode: '',
    type: '',
    visa: '',
    skills: '',
    experience: '',
    salary: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const recruiterEmail = getUserEmail();
      if (!recruiterEmail) {
        throw new Error('No recruiter email found. Please log in again.');
      }

      // Updated to use our new Next.js API with enhanced schema
      const response = await fetch('/api/recruiter/post-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recruiter_email: recruiterEmail // Required by new API
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Job posted successfully:', result);
        alert(`Job "${result.job.title}" posted successfully! Ready to receive applications.`);
        
        // Reset form
        setFormData({
          title: '',
          location: '',
          mode: '',
          type: '',
          visa: '',
          skills: '',
          experience: '',
          salary: '',
          description: '',
        });
        
        onClose(); // Close form after successful submission
        
        // Refresh the dashboard to show new job
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to post job');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      alert(`Error posting job: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6 mt-6 border">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        📝 Post a New Job
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Post a job to start receiving AI-verified candidate applications with compatibility scores
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="title"
          placeholder="Job Title (e.g., Frontend Developer)"
          value={formData.title}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <input
          type="text"
          name="location"
          placeholder="Location (e.g., Manchester)"
          value={formData.location}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <select
          name="mode"
          value={formData.mode}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select Work Mode</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Onsite">Onsite</option>
        </select>

        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Job Type</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Temporary">Temporary</option>
          <option value="Internship">Internship</option>
        </select>

        <select
          name="visa"
          value={formData.visa}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Visa Sponsorship?</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <input
          type="text"
          name="skills"
          placeholder="Required Skills (e.g., Python, React, SQL)"
          value={formData.skills}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <input
          type="text"
          name="experience"
          placeholder="Experience Required (e.g., 3 years)"
          value={formData.experience}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />

        <input
          type="text"
          name="salary"
          placeholder="Salary Range (e.g., £40k–£60k)"
          value={formData.salary}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <textarea
          name="description"
          placeholder="Describe the role, tools, expectations, team setup..."
          value={formData.description}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent col-span-1 md:col-span-2"
          rows={4}
          required
        ></textarea>

        <div className="col-span-1 md:col-span-2 flex justify-between mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Posting Job...
              </>
            ) : (
              <>
                📌 Post Job
              </>
            )}
          </button>
          <button
            type="button"
            className="text-gray-600 hover:text-gray-800 px-4 py-2 font-medium transition"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          ✨ Enhanced with AI matching: Your job will automatically match with candidates based on skills, experience, and interview performance
        </p>
      </div>
    </div>
  );
}