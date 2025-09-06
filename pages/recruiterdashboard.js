import React, { useState, useEffect } from 'react';
import PostJobForm from '../components/PostJobForm';
import ProtectedRoute from "../components/ProtectedRoute";
import LogoutButton from "../components/LogoutButton";
import { getUserEmail, getUserType } from '../utils/auth';
import Link from 'next/link';

// Dashboard Components
import StatCard from '../components/Dashboard/StatCard';
import SectionCard from '../components/Dashboard/SectionCard';
import AlertCard from '../components/Dashboard/AlertCard';

import { 
  Briefcase, 
  Users, 
  BarChart3, 
  Trophy,
  Plus,
  Search,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  MoreVertical,
  ExternalLink,
  Star,
  Building,
  UserCheck,
  Phone,
  Mail,
  Award,
  Target,
  BookOpen,
  X,
  Calendar,
  TrendingDown
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [activeTab, setActiveTab] = useState('overview'); // overview, jobs, candidates
  
  // Interview modal states
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [loadingInterview, setLoadingInterview] = useState(false);

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

  // Fetch interview data for a candidate
  const fetchInterviewData = async (candidateEmail) => {
    setLoadingInterview(true);
    try {
      console.log(`Fetching interview data for: ${candidateEmail}`);
      const response = await fetch(`/api/candidate/interview-data?email=${candidateEmail}`);
      const data = await response.json();
      
      if (response.ok) {
        setInterviewData(data);
        setShowInterviewModal(true);
        console.log('Interview data loaded:', data);
      } else {
        alert('Failed to load interview data: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching interview data:', error);
      alert('Error loading interview data. Please try again.');
    } finally {
      setLoadingInterview(false);
    }
  };

  // Filter and sort candidates
  const filterAndSortCandidates = (candidates) => {
    let filtered = candidates;
    
    if (filter === 'verified') {
      filtered = candidates.filter(c => c.verified);
    } else if (filter === 'unverified') {
      filtered = candidates.filter(c => !c.verified);
    }
    
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
          <div className="text-center bg-white p-8 rounded-xl shadow-lg border">
            <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <div className="text-xl font-semibold text-gray-700 mb-2">Loading your dashboard...</div>
            <div className="text-sm text-gray-500">Fetching jobs and candidate matches</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg border max-w-md">
            <div className="text-xl font-semibold text-red-600 mb-2">Dashboard Error</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
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
        {/* Fixed Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">GenHR Recruiter Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {recruiter.name} • {recruiter.company}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-gray-700 truncate max-w-48">
                    {recruiter.email}
                  </div>
                  <div className="text-xs text-gray-500">Recruiter Account</div>
                </div>
                <div className="flex-shrink-0">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === 'jobs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Job Management
                </button>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === 'candidates'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Candidate Pool
                </button>
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  icon={Briefcase}
                  title="Active Jobs"
                  value={stats.activeJobs}
                  subtitle={`${stats.totalJobs} total posted`}
                  iconColor="blue"
                  clickable={true}
                  onClick={() => setActiveTab('jobs')}
                />
                
                <StatCard
                  icon={Users}
                  title="Interviewed Candidates"
                  value={stats.totalCandidatesWithInterviews}
                  subtitle="Available for matching"
                  iconColor="green"
                  clickable={true}
                  onClick={() => setActiveTab('candidates')}
                />
                
                <StatCard
                  icon={BarChart3}
                  title="Avg Match Score"
                  value={`${stats.averageMatchScore}%`}
                  subtitle="Across all jobs"
                  iconColor="purple"
                />
                
                <StatCard
                  icon={Trophy}
                  title="Top Performing Job"
                  value={stats.topPerformingJob || "No jobs posted"}
                  subtitle="Most candidate matches"
                  iconColor="orange"
                />
              </div>

              {/* Quick Actions */}
              <SectionCard title="Quick Actions" subtitle="Common tasks and shortcuts">
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowForm(true)}
                    className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Post New Job</h3>
                    <p className="text-sm text-gray-600">Create a new job posting</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('candidates')}
                    className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-green-50 hover:bg-green-100 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                      <Search className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Browse Candidates</h3>
                    <p className="text-sm text-gray-600">View available talent pool</p>
                  </button>

                  <Link href="/recruiter/applications">
                    <div className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-purple-50 hover:bg-purple-100 transition-all duration-200">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">View Analytics</h3>
                      <p className="text-sm text-gray-600">Application insights</p>
                    </div>
                  </Link>
                </div>
              </SectionCard>

              {/* Recent Activity */}
              <SectionCard title="Recent Activity" subtitle="Latest updates and notifications">
                {jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{job.title}</p>
                            <p className="text-sm text-gray-600">{job.candidateMatches.length} candidates matched</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Post Your First Job
                    </button>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <>
              {/* Job Form */}
              {showForm && (
                <div className="mb-8">
                  <SectionCard title="Post New Job" subtitle="Create a new job posting">
                    <PostJobForm onClose={() => setShowForm(false)} />
                  </SectionCard>
                </div>
              )}

              {/* Jobs Management */}
              <SectionCard 
                title={`Your Posted Jobs (${jobs.length})`} 
                subtitle="Manage your job postings and view candidate matches"
              >
                {!showForm && (
                  <div className="mb-6">
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Post New Job
                    </button>
                  </div>
                )}

                {jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
                    <p className="text-gray-600 mb-6">Post your first job to start finding great candidates</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Post Your First Job
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {jobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                        {/* Job Header */}
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <MapPin size={14} />
                                  <span>{job.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Briefcase size={14} />
                                  <span>{job.type}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Building size={14} />
                                  <span>{job.mode}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {job.required_skills.slice(0, 4).map((skill, index) => (
                                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                                {job.required_skills.length > 4 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    +{job.required_skills.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-6 text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {job.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Candidate Matches */}
                        <div className="p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium text-gray-900">
                              Candidate Matches ({job.candidateMatches.length})
                            </h4>
                          </div>

                          {job.candidateMatches.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="w-8 h-8 mx-auto mb-2" />
                              <p>No candidate matches found</p>
                              <p className="text-sm mt-1">Candidates with matching skills will appear here</p>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {job.candidateMatches.slice(0, 6).map((candidate) => (
                                <div 
                                  key={candidate.id} 
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer bg-white"
                                  onClick={() => setSelectedCandidate(candidate)}
                                >
                                  <div className="flex justify-between items-start mb-3">
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
                                      <div className="text-xs text-gray-500">Match</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {candidate.verified && (
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                        <CheckCircle size={10} className="inline mr-1" />
                                        Verified
                                      </span>
                                    )}
                                    {candidate.hasInterview && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                        <UserCheck size={10} className="inline mr-1" />
                                        Interviewed
                                      </span>
                                    )}
                                  </div>

                                  <button className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    View Profile →
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {job.candidateMatches.length > 6 && (
                            <div className="text-center mt-4">
                              <button 
                                onClick={() => setActiveTab('candidates')}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View All {job.candidateMatches.length} Matches →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* Candidates Tab */}
          {activeTab === 'candidates' && (
            <SectionCard title="Candidate Pool" subtitle="Browse and filter available candidates">
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Candidates</option>
                    <option value="verified">Verified Only</option>
                    <option value="unverified">Unverified</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="score">Sort by Match Score</option>
                    <option value="experience">Sort by Experience</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
              </div>

              {/* Placeholder for candidate pool - would need API to fetch all candidates */}
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Candidate Pool</h3>
                <p className="text-gray-600 mb-6">Browse candidates when you have active job postings</p>
                <p className="text-sm text-gray-500">
                  Candidates will appear here based on your job requirements and matching criteria
                </p>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedCandidate.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail size={14} />
                        <span className="text-sm">{selectedCandidate.email}</span>
                      </div>
                      {selectedCandidate.phone && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone size={14} />
                          <span className="text-sm">{selectedCandidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Match Score</h4>
                    <div className={`text-3xl font-bold ${
                      selectedCandidate.score >= 80 ? 'text-green-600' :
                      selectedCandidate.score >= 60 ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {selectedCandidate.score}%
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Experience</h4>
                    <div className="text-2xl font-semibold text-gray-800">{selectedCandidate.experience_years} years</div>
                  </div>
                </div>

                {selectedCandidate.matchDetails && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Match Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        {selectedCandidate.matchDetails.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <Mail size={14} />
                    <span>{selectedCandidate.email}</span>
                  </div>
                  
                  {selectedCandidate.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      <Phone size={14} />
                      <span>{selectedCandidate.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {selectedCandidate.linkedin && (
                    <a 
                      href={selectedCandidate.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition"
                    >
                      <ExternalLink size={14} />
                      LinkedIn Profile
                    </a>
                  )}
                  {selectedCandidate.github && (
                    <a 
                      href={selectedCandidate.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm font-medium flex items-center gap-2 transition"
                    >
                      <ExternalLink size={14} />
                      GitHub Profile
                    </a>
                  )}
                  {selectedCandidate.hasInterview && (
                    <button 
                      onClick={() => fetchInterviewData(selectedCandidate.email)}
                      disabled={loadingInterview}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loadingInterview ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Award size={14} />
                          View Interview Results
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interview Results Modal */}
        {showInterviewModal && interviewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Interview Results</h3>
                    <p className="text-gray-600">{interviewData.candidate.name} • {interviewData.interview.role}</p>
                  </div>
                  <button
                    onClick={() => setShowInterviewModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{interviewData.interview.overall_rating}</div>
                    <div className="text-sm text-gray-600">Overall Rating</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{interviewData.qa_performance.total_questions}</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{interviewData.qa_performance.average_grade}%</div>
                    <div className="text-sm text-gray-600">Avg Grade</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{Math.round(interviewData.qa_performance.total_time_taken / 60)}m</div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-500" />
                      <span className="text-gray-700">{interviewData.candidate.email}</span>
                    </div>
                    {interviewData.candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-gray-500" />
                        <span className="text-gray-700">{interviewData.candidate.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Summary */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Professional Summary</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{interviewData.interview.professional_summary}</p>
                  </div>
                </div>

                {/* Competency Scores */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Competency Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(interviewData.interview.competency_scores || {}).map(([competency, score]) => {
                      const roundedScore = Math.round(score * 10) / 10; // Round to 1 decimal place
                      return (
                        <div key={competency} className="bg-white border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900 capitalize">{competency.replace('_', ' ')}</span>
                            <span className={`font-bold ${
                              roundedScore >= 80 ? 'text-green-600' : 
                              roundedScore >= 65 ? 'text-blue-600' : 
                              roundedScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {roundedScore}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                roundedScore >= 80 ? 'bg-green-500' : 
                                roundedScore >= 65 ? 'bg-blue-500' : 
                                roundedScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${roundedScore}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tools and Technologies - Matching Candidate Resume Display */}
                {interviewData.interview.matching_keywords && interviewData.interview.matching_keywords.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-500" />
                      Tools and Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {interviewData.interview.matching_keywords.map((tool, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium uppercase">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Skills Assessment - Additional Technical Detail */}
                {interviewData.skills && interviewData.skills.verified_skills && interviewData.skills.verified_skills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-purple-500" />
                      Detailed Skills Assessment
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {interviewData.skills.verified_skills.map((skill, index) => {
                        const roundedScore = Math.round(skill.score * 10) / 10;
                        return (
                          <div key={index} className="bg-gray-50 border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900 text-sm capitalize">{skill.skill}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  skill.level === 'expert' ? 'bg-green-100 text-green-800' :
                                  skill.level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                                  skill.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {skill.level}
                                </span>
                                <span className={`text-xs font-bold ${
                                  roundedScore >= 80 ? 'text-green-600' : 
                                  roundedScore >= 65 ? 'text-blue-600' : 
                                  roundedScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {roundedScore}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  roundedScore >= 80 ? 'bg-green-500' : 
                                  roundedScore >= 65 ? 'bg-blue-500' : 
                                  roundedScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${roundedScore}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Skills Summary */}
                    <div className="mt-4 bg-purple-50 rounded-lg p-4">
                      <h5 className="font-medium text-purple-900 mb-2">Assessment Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{interviewData.skills.skill_summary.total_skills}</div>
                          <div className="text-purple-700">Total Skills</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">{interviewData.skills.skill_summary.expert_skills}</div>
                          <div className="text-purple-700">Expert Level</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{interviewData.skills.skill_summary.advanced_skills}</div>
                          <div className="text-purple-700">Advanced Level</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{Math.round(interviewData.skills.skill_summary.average_score * 10) / 10}%</div>
                          <div className="text-purple-700">Average Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strengths and Areas for Improvement */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-500" />
                      Strengths
                    </h4>
                    <div className="space-y-2">
                      {(interviewData.interview.strengths || []).map((strength, index) => (
                        <div key={index} className="bg-green-50 rounded-lg p-3 text-green-800 text-sm">
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-orange-500" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-2">
                      {(interviewData.interview.areas_for_improvement || []).map((area, index) => (
                        <div key={index} className="bg-orange-50 rounded-lg p-3 text-orange-800 text-sm">
                          {area}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Verification Status</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {interviewData.verification_status.linkedin_verified && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        LinkedIn Verified
                      </span>
                    )}
                    {interviewData.verification_status.github_verified && (
                      <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                        GitHub Verified
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      interviewData.verification_status.has_profile_verification 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {interviewData.verification_status.profile_completeness === 'complete' ? 'Fully Verified' : 'Partial Verification'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{interviewData.verification_status.verification_message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}