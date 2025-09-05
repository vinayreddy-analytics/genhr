// Recruiter page to view all completed interviews
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { getAuthHeaders } from '../../utils/auth';

export default function RecruiterInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchInterviews();
  }, []);
  
  const fetchInterviews = async () => {
    setLoading(true);
    try {
      // Try to fetch from AI service first
      const response = await fetch('/api/ai/recruiter/interviews');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.interviews) {
          setInterviews(data.interviews);
        }
      } else {
        // Fallback to mock data for testing
        setInterviews(getMockInterviews());
      }
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
      // Use mock data for testing
      setInterviews(getMockInterviews());
    } finally {
      setLoading(false);
    }
  };
  
  // Mock data for testing
  const getMockInterviews = () => [
    {
      _id: '1',
      candidate_info: {
        email: 'john.doe@email.com',
        job_title: 'Data Analyst',
        skills: 'Python, SQL, Excel',
        experience: '3'
      },
      summary: {
        overall_score: 85,
        recommendation: 'Strong candidate for Data Analyst position'
      },
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      recruiter_viewed: false
    },
    {
      _id: '2',
      candidate_info: {
        email: 'jane.smith@email.com',
        job_title: 'Software Developer',
        skills: 'JavaScript, React, Node.js',
        experience: '5'
      },
      summary: {
        overall_score: 72,
        recommendation: 'Good technical skills, needs improvement in system design'
      },
      completed_at: new Date(Date.now() - 172800000).toISOString(),
      recruiter_viewed: true
    },
    {
      _id: '3',
      candidate_info: {
        email: 'mike.wilson@email.com',
        job_title: 'Frontend Developer',
        skills: 'React, CSS, TypeScript',
        experience: '2'
      },
      summary: {
        overall_score: 68,
        recommendation: 'Junior level candidate with potential'
      },
      completed_at: new Date(Date.now() - 259200000).toISOString(),
      recruiter_viewed: true
    }
  ];
  
  // Filter interviews
  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !interview.recruiter_viewed;
    if (filter === 'high') return interview.summary?.overall_score >= 80;
    if (filter === 'data_analyst') return interview.candidate_info?.job_title === 'Data Analyst';
    if (filter === 'software_developer') return interview.candidate_info?.job_title === 'Software Developer';
    if (filter === 'frontend_developer') return interview.candidate_info?.job_title === 'Frontend Developer';
    return true;
  });
  
  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <ProtectedRoute requiredUserType="recruiter">
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-indigo-800">
                  📋 Completed Interviews
                </h1>
                <p className="text-gray-600 mt-1">
                  Review AI-assessed candidate interviews
                </p>
              </div>
              <Link href="/recruiterdashboard">
                <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                All ({interviews.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded ${filter === 'unread' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Unread ({interviews.filter(i => !i.recruiter_viewed).length})
              </button>
              <button
                onClick={() => setFilter('high')}
                className={`px-4 py-2 rounded ${filter === 'high' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                High Score (80+)
              </button>
              <div className="border-l mx-2"></div>
              <button
                onClick={() => setFilter('data_analyst')}
                className={`px-4 py-2 rounded ${filter === 'data_analyst' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Data Analyst
              </button>
              <button
                onClick={() => setFilter('software_developer')}
                className={`px-4 py-2 rounded ${filter === 'software_developer' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Software Developer
              </button>
              <button
                onClick={() => setFilter('frontend_developer')}
                className={`px-4 py-2 rounded ${filter === 'frontend_developer' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Frontend Developer
              </button>
            </div>
          </div>
          
          {/* Interview List */}
          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading interviews...</p>
              </div>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center text-gray-500">
                <p className="text-xl">No interviews found</p>
                <p className="mt-2">Interviews will appear here once candidates complete them</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInterviews.map((interview) => (
                <Link key={interview._id} href={`/recruiter/interview/${interview._id}`}>
                  <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {interview.candidate_info?.email || 'Unknown Candidate'}
                          </h3>
                          {!interview.recruiter_viewed && (
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">NEW</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Role:</span>
                            <span className="ml-2 font-medium">{interview.candidate_info?.job_title}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Experience:</span>
                            <span className="ml-2 font-medium">{interview.candidate_info?.experience} years</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Completed:</span>
                            <span className="ml-2">{formatDate(interview.completed_at)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            {interview.summary?.recommendation || 'No recommendation available'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-center ml-6">
                        <div className={`text-3xl font-bold ${getScoreColor(interview.summary?.overall_score || 0)}`}>
                          {interview.summary?.overall_score || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Score</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}