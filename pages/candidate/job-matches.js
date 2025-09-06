import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from "../../components/ProtectedRoute";
import LogoutButton from "../../components/LogoutButton";
import { getUserEmail, getUserType } from '../../utils/auth';

export default function CandidateJobMatches() {
  const [jobRecommendations, setJobRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyingTo, setApplyingTo] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch job recommendations
  useEffect(() => {
    async function fetchJobRecommendations() {
      try {
        setLoading(true);
        
        const userEmail = getUserEmail();
        const userType = getUserType();
        
        if (!userEmail || userType !== 'candidate') {
          setError('Access denied. Candidate account required.');
          return;
        }

        console.log(`Fetching job recommendations for: ${userEmail}`);
        
        const response = await fetch(`/api/candidate/job-recommendations?candidate_email=${userEmail}&limit=20`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setJobRecommendations(data.recommendations);
          setCandidateData(data.candidate);
          setStats(data.stats);
          console.log(`Loaded ${data.recommendations.length} job recommendations`);
        } else {
          setError(data.error || 'Failed to fetch job recommendations');
        }
      } catch (err) {
        setError('Failed to load job recommendations');
        console.error('Job recommendations fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobRecommendations();
  }, []);

  // Apply to job function
  const handleApplyToJob = async (jobId, jobTitle) => {
    if (!applicationMessage.trim()) {
      alert('Please write a brief message about your interest in this role.');
      return;
    }

    setApplyingTo(jobId);
    
    try {
      const userEmail = getUserEmail();
      
      const response = await fetch('/api/candidate/apply-to-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_email: userEmail,
          job_id: jobId,
          candidate_message: applicationMessage
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Application submitted successfully to "${jobTitle}"! Match score: ${result.application.match_score}%`);
        
        // Update job in the list to show as applied
        setJobRecommendations(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, can_apply: false, application_status: 'applied', applied_at: new Date() }
            : job
        ));
        
        // Close modal and reset
        setShowApplicationModal(null);
        setApplicationMessage('');
      } else {
        alert(`Application failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Application error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setApplyingTo(null);
    }
  };

  const getCompatibilityColor = (level) => {
    switch (level) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Very Good': return 'text-blue-600 bg-blue-100';
      case 'Good': return 'text-purple-600 bg-purple-100';
      case 'Fair': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied': return 'text-blue-600 bg-blue-100';
      case 'viewed': return 'text-purple-600 bg-purple-100';
      case 'interested': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'contacted': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredUserType="candidate">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Finding Your Perfect Jobs</h3>
            <p className="text-gray-600">Analyzing your skills and matching with available positions...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredUserType="candidate">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠</span>
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to Load Job Matches</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full transition"
              >
                Try Again
              </button>
              <Link href="/candidate-dashboard">
                <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 w-full transition">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Job Matches for You</h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-gray-600">AI-powered job recommendations</p>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Interview Score: {candidateData?.interview_score}/100
                  </span>
                </div>
                <Link href="/candidate-dashboard">
                  <span className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                    ← Back to Dashboard
                  </span>
                </Link>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-blue-600">{stats.recommended_jobs}</div>
                <div className="text-sm text-gray-600">Jobs Matched</div>
                <div className="text-xs text-gray-500">From {stats.total_jobs_available} available</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-green-600">{stats.excellent_matches}</div>
                <div className="text-sm text-gray-600">Excellent Matches</div>
                <div className="text-xs text-gray-500">80%+ compatibility</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-purple-600">{stats.already_applied}</div>
                <div className="text-sm text-gray-600">Already Applied</div>
                <div className="text-xs text-gray-500">Applications submitted</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-orange-600">{stats.avg_match_score}%</div>
                <div className="text-sm text-gray-600">Avg Match Score</div>
                <div className="text-xs text-gray-500">Based on your skills</div>
              </div>
            </div>
          )}

          {/* Job Recommendations */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Recommended Jobs ({jobRecommendations.length})
              </h2>
              <div className="text-sm text-gray-500">
                Sorted by compatibility • Updated in real-time
              </div>
            </div>

            {jobRecommendations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Job Matches Found</h3>
                <p className="text-gray-600 mb-6">
                  No jobs currently match your skills and preferences. Check back later as new jobs are posted daily.
                </p>
                <Link href="/candidate-dashboard">
                  <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                    Back to Dashboard
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobRecommendations.map((job) => (
                  <div key={job.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
                    {/* Job Header */}
                    <div className="p-6 border-b">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                          <p className="text-gray-600 font-medium">{job.company}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                            <span>📍 {job.location}</span>
                            <span>💼 {job.type}</span>
                            <span>🏠 {job.mode}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            job.match_score >= 80 ? 'text-green-600' :
                            job.match_score >= 65 ? 'text-blue-600' :
                            job.match_score >= 50 ? 'text-purple-600' : 'text-gray-600'
                          }`}>
                            {job.match_score}%
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${getCompatibilityColor(job.compatibility_level)}`}>
                            {job.compatibility_level}
                          </div>
                        </div>
                      </div>

                      {/* Required Skills */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Required Skills:</div>
                        <div className="flex flex-wrap gap-2">
                          {job.required_skills.slice(0, 6).map((skill, index) => (
                            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {job.required_skills.length > 6 && (
                            <span className="text-gray-500 text-xs">+{job.required_skills.length - 6} more</span>
                          )}
                        </div>
                      </div>

                      {/* Application Status or Apply Button */}
                      <div className="flex justify-between items-center">
                        {job.can_apply ? (
                          <button
                            onClick={() => setShowApplicationModal(job.id)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                            disabled={applyingTo === job.id}
                          >
                            {applyingTo === job.id ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Applying...
                              </>
                            ) : (
                              <>
                                📤 Apply Now
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(job.application_status)}`}>
                              {job.application_status === 'applied' ? '✓ Applied' : job.application_status}
                            </span>
                            {job.applied_at && (
                              <span className="text-xs text-gray-500">
                                Applied {new Date(job.applied_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Experience: {job.experience_required} years</div>
                          {job.salary_range && (
                            <div className="text-sm text-gray-500">{job.salary_range}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="p-6 bg-gray-50">
                      <h4 className="font-medium text-gray-900 mb-2">Why You're a Good Match:</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {job.match_details.slice(0, 3).map((detail, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs text-gray-500 mt-3">
                        Posted {new Date(job.created_at).toLocaleDateString()} • 
                        Visa: {job.visa_required ? ' Required' : ' Not Required'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Application Modal */}
        {showApplicationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Apply to Job</h3>
                <p className="text-gray-600 mt-1">
                  {jobRecommendations.find(job => job.id === showApplicationModal)?.title}
                </p>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you interested in this role? *
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your interest, relevant experience, or what excites you about this opportunity..."
                  required
                />
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      const job = jobRecommendations.find(j => j.id === showApplicationModal);
                      handleApplyToJob(showApplicationModal, job.title);
                    }}
                    disabled={!applicationMessage.trim() || applyingTo}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                  >
                    Submit Application
                  </button>
                  <button
                    onClick={() => {
                      setShowApplicationModal(null);
                      setApplicationMessage('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}