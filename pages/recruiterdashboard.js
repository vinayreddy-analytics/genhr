import React, { useState, useEffect } from 'react';
import PostJobForm from '../components/PostJobForm';
import ProtectedRoute from "../components/ProtectedRoute";
import LogoutButton from "../components/LogoutButton";
import { getUserEmail, getUserType } from '../utils/auth';

export default function RecruiterDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filter, setFilter] = useState('all'); // all, verified, unverified
  const [sortBy, setSortBy] = useState('score'); // score, experience, name

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        const userEmail = getUserEmail();
        const userType = getUserType();
        
        if (!userEmail || userType !== 'recruiter') {
          setError('Access denied. Recruiter account required.');
          return;
        }

        console.log(`Fetching recruiter dashboard for: ${userEmail}`);
        
        const response = await fetch(`/api/recruiter/dashboard-data?recruiter_email=${userEmail}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setDashboardData(data);
          console.log('Dashboard data loaded:', data);
        } else {
          setError(data.error || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Filter and sort candidates
  const filterAndSortCandidates = (candidates) => {
    let filtered = candidates;
    
    // Apply filter
    if (filter === 'verified') {
      filtered = candidates.filter(c => c.verified);
    } else if (filter === 'unverified') {
      filtered = candidates.filter(c => !c.verified);
    }
    
    // Apply sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'experience':
          return b.experience_years - a.experience_years;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.score - a.score;
      }
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-lg shadow border">
            <div className="text-xl font-semibold text-gray-700 mb-2">Loading your dashboard...</div>
            <div className="text-sm text-gray-500">Fetching jobs and candidate matches</div>
            <div className="mt-4">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow border max-w-md">
            <div className="text-xl font-semibold text-red-600 mb-2">Dashboard Error</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const { recruiter, jobs, stats } = dashboardData;

  return (
    <ProtectedRoute requiredUserType="recruiter">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GenHR Recruiter Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {recruiter.name} • {recruiter.company}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">{recruiter.email}</div>
                <div className="text-xs text-gray-500">Recruiter Account ✓</div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Dashboard Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="text-2xl font-bold text-blue-600">{stats.activeJobs}</div>
              <div className="text-sm text-gray-600">Active Jobs</div>
              <div className="text-xs text-gray-500">{stats.totalJobs} total posted</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="text-2xl font-bold text-green-600">{stats.totalCandidatesWithInterviews}</div>
              <div className="text-sm text-gray-600">Interviewed Candidates</div>
              <div className="text-xs text-gray-500">Available for matching</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="text-2xl font-bold text-purple-600">{stats.averageMatchScore}%</div>
              <div className="text-sm text-gray-600">Avg Match Score</div>
              <div className="text-xs text-gray-500">Across all jobs</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="text-2xl font-bold text-orange-600">🏆</div>
              <div className="text-sm text-gray-600">Top Performing</div>
              <div className="text-xs text-gray-500">{stats.topPerformingJob}</div>
            </div>
          </div>

          {/* Post Job Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
            >
              {showForm ? 'Close Job Form' : '+ Post New Job'}
            </button>
          </div>

          {/* Job Form */}
          {showForm && (
            <div className="mb-8">
              <PostJobForm onClose={() => setShowForm(false)} />
            </div>
          )}

          {/* Jobs List */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Posted Jobs ({jobs.length})</h2>
            
            {jobs.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow border text-center">
                <div className="text-gray-500">No jobs posted yet</div>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Post Your First Job
                </button>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow border overflow-hidden">
                  {/* Job Header */}
                  <div className="p-6 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>📍 {job.location}</span>
                          <span>💼 {job.type}</span>
                          <span>🏠 {job.mode}</span>
                          <span>🛂 Visa: {job.visa_required ? 'Required' : 'Not Required'}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Required Skills: </span>
                          <span className="text-sm text-gray-700">{job.required_skills.join(', ')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Posted {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Matches */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900">
                        Top Candidate Matches ({job.candidateMatches.length})
                      </h4>
                      
                      {job.candidateMatches.length > 0 && (
                        <div className="flex gap-2">
                          <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="all">All Candidates</option>
                            <option value="verified">Verified Only</option>
                            <option value="unverified">Unverified</option>
                          </select>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="score">Sort by Match Score</option>
                            <option value="experience">Sort by Experience</option>
                            <option value="name">Sort by Name</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {job.candidateMatches.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-lg mb-2">🔍</div>
                        <div>No candidate matches found</div>
                        <div className="text-sm mt-1">Candidates with matching skills will appear here</div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filterAndSortCandidates(job.candidateMatches).slice(0, 6).map((candidate) => (
                          <div 
                            key={candidate.id} 
                            className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                            onClick={() => setSelectedCandidate(candidate)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-gray-900">{candidate.name}</div>
                                <div className="text-sm text-gray-500">{candidate.experience_years} years exp</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${
                                  candidate.score >= 80 ? 'text-green-600' :
                                  candidate.score >= 60 ? 'text-blue-600' :
                                  candidate.score >= 40 ? 'text-yellow-600' : 'text-gray-600'
                                }`}>
                                  {candidate.score}%
                                </div>
                                <div className="text-xs text-gray-500">Match Score</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              {candidate.verified && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ Verified</span>
                              )}
                              {candidate.hasInterview && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">🎯 Interviewed</span>
                              )}
                              {candidate.linkedin && (
                                <span className="text-blue-600">💼</span>
                              )}
                              {candidate.github && (
                                <span className="text-gray-700">⚡</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {job.candidateMatches.length > 6 && (
                      <div className="text-center mt-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View All {job.candidateMatches.length} Matches →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedCandidate.name}</h3>
                    <p className="text-gray-600">{selectedCandidate.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Match Score</h4>
                    <div className={`text-3xl font-bold ${
                      selectedCandidate.score >= 80 ? 'text-green-600' :
                      selectedCandidate.score >= 60 ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {selectedCandidate.score}%
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Experience</h4>
                    <div className="text-xl">{selectedCandidate.experience_years} years</div>
                  </div>
                </div>

                {selectedCandidate.matchDetails && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Match Details</h4>
                    <ul className="space-y-1 text-sm">
                      {selectedCandidate.matchDetails.map((detail, index) => (
                        <li key={index} className="text-gray-700">• {detail}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  {selectedCandidate.linkedin && (
                    <a href={selectedCandidate.linkedin} target="_blank" rel="noopener noreferrer"
                       className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      View LinkedIn
                    </a>
                  )}
                  {selectedCandidate.github && (
                    <a href={selectedCandidate.github} target="_blank" rel="noopener noreferrer"
                       className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm">
                      View GitHub
                    </a>
                  )}
                  {selectedCandidate.hasInterview && (
                    <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">
                      View Interview Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}