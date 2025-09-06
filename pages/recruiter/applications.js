import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from "../../components/ProtectedRoute";
import LogoutButton from "../../components/LogoutButton";
import { getUserEmail, getUserType } from '../../utils/auth';

export default function RecruiterApplications() {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filter, setFilter] = useState('all'); // all, applied, viewed, interested, rejected
  const [sortBy, setSortBy] = useState('newest');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [recruiterNotes, setRecruiterNotes] = useState('');

  // Fetch applications
  useEffect(() => {
    async function fetchApplications() {
      try {
        setLoading(true);
        
        const userEmail = getUserEmail();
        const userType = getUserType();
        
        if (!userEmail || userType !== 'recruiter') {
          setError('Access denied. Recruiter account required.');
          return;
        }

        console.log(`Fetching applications for recruiter: ${userEmail}`);
        
        const queryParams = new URLSearchParams({
          recruiter_email: userEmail,
          sort_by: sortBy,
          limit: 50
        });

        if (filter !== 'all') {
          queryParams.append('status', filter);
        }
        
        const response = await fetch(`/api/recruiter/application-management?${queryParams}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setApplications(data.applications);
          setJobs(data.jobs);
          setStats(data.stats);
          console.log(`Loaded ${data.applications.length} applications`);
        } else {
          setError(data.error || 'Failed to fetch applications');
        }
      } catch (err) {
        setError('Failed to load applications');
        console.error('Applications fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [filter, sortBy]);

  // Update application status
  const handleStatusUpdate = async (applicationId, newStatus) => {
    setUpdatingStatus(applicationId);
    
    try {
      const userEmail = getUserEmail();
      
      const response = await fetch('/api/recruiter/update-application-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          new_status: newStatus,
          recruiter_notes: recruiterNotes.trim(),
          recruiter_email: userEmail
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update application in the list
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { 
                ...app, 
                status: newStatus, 
                recruiter_viewed_at: new Date(),
                is_new: false,
                recruiter_notes: recruiterNotes.trim()
              }
            : app
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          new_applications: Math.max(0, prev.new_applications - 1),
          by_status: {
            ...prev.by_status,
            [newStatus]: (prev.by_status[newStatus] || 0) + 1
          }
        }));
        
        alert(`Application status updated to "${newStatus}"`);
        setSelectedApplication(null);
        setRecruiterNotes('');
      } else {
        alert(`Failed to update status: ${result.error}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update application status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied': return 'text-blue-600 bg-blue-100';
      case 'viewed': return 'text-purple-600 bg-purple-100';
      case 'interested': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'contacted': return 'text-orange-600 bg-orange-100';
      case 'hired': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-purple-600';
    if (score >= 35) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  if (loading) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Applications</h3>
            <p className="text-gray-600">Fetching candidate applications and job data...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠</span>
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Applications</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredUserType="recruiter">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Application Management</h1>
                <p className="text-gray-600 mt-1">Manage candidate applications and hiring pipeline</p>
                <Link href="/recruiterdashboard">
                  <span className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer mt-2 inline-block">
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
                <div className="text-2xl font-bold text-blue-600">{stats.total_applications}</div>
                <div className="text-sm text-gray-600">Total Applications</div>
                <div className="text-xs text-gray-500">All time received</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-green-600">{stats.new_applications}</div>
                <div className="text-sm text-gray-600">New Applications</div>
                <div className="text-xs text-gray-500">Unviewed applications</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-purple-600">{stats.excellent_matches}</div>
                <div className="text-sm text-gray-600">Excellent Matches</div>
                <div className="text-xs text-gray-500">80%+ compatibility</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-2xl font-bold text-orange-600">{stats.avg_match_score}%</div>
                <div className="text-sm text-gray-600">Avg Match Score</div>
                <div className="text-xs text-gray-500">Application quality</div>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Applications</option>
                  <option value="applied">New Applications</option>
                  <option value="viewed">Viewed</option>
                  <option value="interested">Interested</option>
                  <option value="contacted">Contacted</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="score_high">Highest Match Score</option>
                  <option value="score_low">Lowest Match Score</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-500">
                Showing {filteredApplications.length} of {applications.length} applications
              </div>
            </div>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'No candidates have applied to your jobs yet. Share your job postings to attract applicants.'
                  : `No applications with status "${filter}". Try adjusting your filters.`
                }
              </p>
              <Link href="/recruiterdashboard">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div key={application.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{application.candidate.name}</h3>
                          {application.is_new && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              NEW
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="text-gray-600 mb-2">
                          Applied to: <span className="font-medium text-gray-900">{application.job.title}</span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                          <span>📧 {application.candidate.email}</span>
                          <span>💼 {application.candidate.experience_years} years experience</span>
                          <span>📅 Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                          <span>⏱️ {application.days_since_applied} days ago</span>
                        </div>

                        {application.candidate_message && (
                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Application Message:</div>
                            <div className="text-sm text-gray-600">"{application.candidate_message}"</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-6">
                        <div className={`text-3xl font-bold ${getCompatibilityColor(application.match_score)}`}>
                          {application.match_score}%
                        </div>
                        <div className="text-sm text-gray-500">Match Score</div>
                        <div className="text-xs text-gray-400 mt-1">{application.compatibility_level}</div>
                      </div>
                    </div>

                    {/* Skills and Verification */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-2">
                        {application.candidate.top_skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {skill.skill}: {skill.score}/100
                          </span>
                        ))}
                        {application.candidate.verified && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            ✓ Profile Verified
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Interview Score: {application.candidate.interview_score}/100
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        View Details & Manage
                      </button>
                      
                      {application.candidate.linkedin && (
                        <a href={application.candidate.linkedin} target="_blank" rel="noopener noreferrer"
                           className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition text-sm font-medium">
                          LinkedIn
                        </a>
                      )}
                      
                      {application.candidate.github && (
                        <a href={application.candidate.github} target="_blank" rel="noopener noreferrer"
                           className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
                          GitHub
                        </a>
                      )}

                      {application.status === 'applied' && (
                        <button
                          onClick={() => handleStatusUpdate(application.id, 'interested')}
                          disabled={updatingStatus === application.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:bg-gray-400"
                        >
                          Mark Interested
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedApplication.candidate.name}</h3>
                    <p className="text-gray-600">Applied to {selectedApplication.job.title}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedApplication(null);
                      setRecruiterNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xl p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Match Details */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Match Analysis</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm">
                      {selectedApplication.match_details.match_breakdown.map((detail, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2 mt-1">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Status Management */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Update Application Status</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {['viewed', 'interested', 'contacted', 'rejected', 'hired'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(selectedApplication.id, status)}
                        disabled={updatingStatus === selectedApplication.id}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                          selectedApplication.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:bg-gray-400`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Notes (Optional)
                  </label>
                  <textarea
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes about this candidate or application..."
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Application ID: {selectedApplication.id} • 
                  Applied: {new Date(selectedApplication.applied_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}