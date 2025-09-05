import React, { useState, useEffect } from 'react';
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import LogoutButton from "../components/LogoutButton";
import { getUserEmail, getUserType } from '../utils/auth';

export default function CandidateDashboard() {
  const [showResume, setShowResume] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real interview data for the logged-in user
  useEffect(() => {
    async function fetchInterviewData() {
      try {
        setLoading(true);
        
        const userEmail = getUserEmail();
        const userType = getUserType();
        
        if (!userEmail) {
          setError('No user email found. Please log in again.');
          return;
        }

        if (userType !== 'candidate') {
          setError('Access denied. Candidate account required.');
          return;
        }

        console.log(`Fetching interview data for: ${userEmail}`);
        
        const response = await fetch(`/api/candidate/interview-data?email=${userEmail}`);
        const data = await response.json();
        
        if (response.ok) {
          setInterviewData(data);
          console.log('Interview data loaded:', data.hasCompletedInterview ? 'Interview found' : 'No interview yet');
        } else {
          setError(data.error || 'Failed to fetch interview data');
        }
      } catch (err) {
        setError('Failed to load interview data');
        console.error('Interview data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInterviewData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <ProtectedRoute requiredUserType="candidate">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-lg shadow border">
            <div className="text-xl font-semibold text-gray-700 mb-2">Loading your interview data...</div>
            <div className="text-sm text-gray-500">Connecting to MongoDB and fetching your results</div>
            <div className="mt-4">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show error state
  if (error) {
    return (
      <ProtectedRoute requiredUserType="candidate">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow border max-w-md">
            <div className="text-xl font-semibold text-red-600 mb-2">Unable to Load Data</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                Try Again
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full"
              >
                Re-login
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show no interview state for current user
  if (interviewData && !interviewData.hasCompletedInterview) {
    return (
      <ProtectedRoute requiredUserType="candidate">
        <div className="min-h-screen bg-gray-50 py-10 px-4">
          <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {interviewData.candidate.name}!
              </h1>
              <p className="text-gray-600">Complete your AI interview to unlock your personalized dashboard</p>
              <p className="text-sm text-gray-500 mt-2">Email: {interviewData.candidate.email}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/candidate/interview?mode=practice">
                <div className="border rounded-lg p-6 text-center hover:shadow cursor-pointer bg-blue-50 hover:bg-blue-100 transition">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="font-bold text-gray-900 mb-2">Practice Interview</h3>
                  <p className="text-sm text-gray-600">Get familiar with the format</p>
                  <div className="mt-3 text-blue-600 font-medium">Start Practice →</div>
                </div>
              </Link>

              <Link href="/candidate/interview">
                <div className="border rounded-lg p-6 text-center hover:shadow cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition">
                  <div className="text-4xl mb-4">🚀</div>
                  <h3 className="font-bold text-gray-900 mb-2">Batch AI Interview</h3>
                  <p className="text-sm text-gray-600">4 pre-generated questions</p>
                  <div className="mt-3 text-indigo-600 font-medium">Start Interview →</div>
                </div>
              </Link>

              <Link href="/candidate/ai-interview">
                <div className="border rounded-lg p-6 text-center hover:shadow cursor-pointer bg-purple-50 hover:bg-purple-100 transition">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="font-bold text-gray-900 mb-2">Conversational Interview</h3>
                  <p className="text-sm text-gray-600">Human-like experience</p>
                  <div className="mt-3 text-purple-600 font-medium">Start Conversation →</div>
                </div>
              </Link>
            </div>

            {/* Show candidate info if available */}
            {interviewData.candidate.education && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Your Profile</h3>
                <p className="text-sm text-gray-600">
                  {interviewData.candidate.education.degree} in {interviewData.candidate.education.field}
                  {interviewData.candidate.education.university && ` from ${interviewData.candidate.education.university}`}
                </p>
                <p className="text-sm text-gray-600">Experience: {interviewData.candidate.experience_years} years</p>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Main dashboard with real interview data for current user
  const { candidate, interview, skills, qa_performance, verification_status, interview_eligibility } = interviewData;

  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow border-b">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Welcome back, {candidate.name}!</h1>
              <p className="text-sm text-gray-500">Candidate Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">{candidate.email}</div>
                <div className="text-xs text-gray-500">
                  User authenticated ✓ | {skills.skill_summary.total_skills} skills verified
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {showResume ? (
            <div>
              <button 
                onClick={() => setShowResume(false)}
                className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </button>
              
              {/* ENHANCED RESUME SECTION WITH VERIFICATION STATUS */}
              <div className="bg-white rounded-lg shadow border p-8 mb-8">
                {/* Header */}
                <div className="border-b pb-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
                      <p className="text-xl text-gray-600 mb-2">{interview.role}</p>
                      <p className="text-gray-500">{candidate.email}</p>
                      {candidate.education && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {candidate.education.degree} in {candidate.education.field}
                          </p>
                          {candidate.education.university && (
                            <p className="text-sm text-gray-500">{candidate.education.university}</p>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-1">Experience: {candidate.experience_years} years</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-purple-600 text-white px-4 py-2 rounded-lg mb-2">
                        <div className="text-sm font-medium">GenHR Verified</div>
                        <div className="text-xs">AI Interview Completed</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Verified: {new Date(interview.interview_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        ID: {interview.verification_id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Verification Status */}
                {verification_status && (
                  <div className={`mb-8 p-4 rounded-lg border ${
                    verification_status.has_profile_verification 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        verification_status.has_profile_verification ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></span>
                      Skill Verification Status
                    </h3>
                    <p className={`text-sm ${
                      verification_status.has_profile_verification ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {verification_status.verification_message}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs">
                      <div className={`flex items-center ${
                        verification_status.linkedin_verified ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {verification_status.linkedin_verified ? '✓' : '○'} LinkedIn Profile
                      </div>
                      <div className={`flex items-center ${
                        verification_status.github_verified ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {verification_status.github_verified ? '✓' : '○'} GitHub Profile
                      </div>
                    </div>
                  </div>
                )}

                {/* Professional Summary */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-6 bg-purple-500 rounded mr-3"></span>
                    Professional Summary
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-gray-700 leading-relaxed">{interview.professional_summary}</p>
                  </div>
                </div>

                {/* Skills Section - ENHANCED WITH BETTER MESSAGING */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
                    Verified Skills ({skills.verified_skills.length} total)
                  </h3>
                  
                  {skills.verified_skills.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {skills.verified_skills.map((skill, index) => (
                        <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-gray-700 capitalize">{skill.skill}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                skill.level === 'expert' ? 'bg-green-100 text-green-800' :
                                skill.level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                                skill.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {skill.level}
                              </span>
                              <span className="font-bold text-gray-900">{skill.score}/100</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                skill.score >= 80 ? 'bg-green-500' :
                                skill.score >= 65 ? 'bg-blue-500' :
                                skill.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span className="capitalize">{skill.category?.replace('_', ' ') || 'Assessment'}</span>
                            <span>Confidence: {Math.round((skill.confidence || 0) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-center">
                        Skill verification in progress. Your competency scores are available in the section below.
                      </p>
                    </div>
                  )}
                </div>

                {/* Competency Scores - REAL DATA */}
                {interview.competency_scores && Object.keys(interview.competency_scores).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-1 h-6 bg-green-500 rounded mr-3"></span>
                      Competency Profile
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(interview.competency_scores).map(([competency, score]) => (
                        <div key={competency} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700 capitalize">
                              {competency.replace('_', ' ')}
                            </span>
                            <span className="font-bold text-gray-900">{score}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                score >= 80 ? 'bg-green-500' :
                                score >= 65 ? 'bg-purple-500' :
                                score >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interview Performance */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Performance Summary</h3>
                  <div className="grid md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{Math.round(interview.overall_rating)}/100</div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{skills.skill_summary.total_skills}</div>
                      <div className="text-sm text-gray-600">Skills Verified</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{skills.skill_summary.expert_skills + skills.skill_summary.advanced_skills}</div>
                      <div className="text-sm text-gray-600">Advanced+ Skills</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{qa_performance.average_grade}/100</div>
                      <div className="text-sm text-gray-600">Avg Q&A Score</div>
                    </div>
                  </div>
                </div>

                {/* Strengths and Areas for Improvement */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Strengths</h3>
                    <div className="space-y-3">
                      {interview.strengths.slice(0, 5).map((strength, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <span className="text-green-800 font-medium capitalize">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas for Growth</h3>
                    <div className="space-y-3">
                      {interview.areas_for_improvement.slice(0, 5).map((area, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <span className="text-yellow-800 font-medium capitalize">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* AI Interview Section with Cooldown Logic */}
              <div className="bg-white rounded-lg shadow border p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Interview Hub</h2>
                
                {interviewData && interviewData.hasCompletedInterview && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-green-800 mb-2">✅ Interview Completed!</h3>
                        <p className="text-sm text-green-700 mb-2">
                          Your AI interview has been completed and scored. View your personalized resume and skill verification.
                        </p>
                        <div className="text-xs text-green-600 space-y-1">
                          <div>Completed on {new Date(interviewData.interview.interview_date).toLocaleDateString()}</div>
                          <div>Overall Score: {Math.round(interviewData.interview.overall_rating)}/100</div>
                          <div>{interviewData.skills.skill_summary.total_skills} skills verified</div>
                          <div>Interview Duration: {interviewData.interview.interview_duration_minutes} minutes</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowResume(true)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition"
                      >
                        View My Results & Resume
                      </button>
                    </div>
                  </div>
                )}

                {/* Interview Cooldown Notice */}
                {interview_eligibility && !interview_eligibility.can_retake_interview && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-yellow-800 mb-2">Interview Cooldown Period</h3>
                    <p className="text-yellow-700 text-sm mb-2">
                      {interview_eligibility.cooldown_message}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Next available: {new Date(interview_eligibility.next_eligible_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                  <Link href="/candidate/interview?mode=practice">
                    <div className="border rounded-lg p-6 text-center hover:shadow cursor-pointer bg-blue-50 hover:bg-blue-100 transition">
                      <div className="text-4xl mb-4">📝</div>
                      <h3 className="font-bold text-gray-900 mb-2">Practice Interview</h3>
                      <p className="text-sm text-gray-600">Warm up with practice questions</p>
                      <div className="mt-3 text-blue-600 font-medium">Start Practice →</div>
                    </div>
                  </Link>

                  <div className={`border rounded-lg p-6 text-center ${
                    interview_eligibility?.can_retake_interview !== false 
                      ? 'hover:shadow cursor-pointer bg-indigo-50 hover:bg-indigo-100' 
                      : 'bg-gray-50 cursor-not-allowed opacity-60'
                  } transition`}>
                    {interview_eligibility?.can_retake_interview !== false ? (
                      <Link href="/candidate/interview">
                        <div>
                          <div className="text-4xl mb-4">🚀</div>
                          <h3 className="font-bold text-gray-900 mb-2">Batch AI Interview</h3>
                          <p className="text-sm text-gray-600">4 pre-generated questions</p>
                          <div className="mt-3 text-indigo-600 font-medium">Start Interview →</div>
                        </div>
                      </Link>
                    ) : (
                      <div>
                        <div className="text-4xl mb-4">🚀</div>
                        <h3 className="font-bold text-gray-500 mb-2">Batch AI Interview</h3>
                        <p className="text-sm text-gray-500">Available in {7 - interview_eligibility.days_since_last_interview} days</p>
                        <div className="mt-3 text-gray-500 font-medium">Cooldown Period</div>
                      </div>
                    )}
                  </div>

                  <div className={`border rounded-lg p-6 text-center ${
                    interview_eligibility?.can_retake_interview !== false 
                      ? 'hover:shadow cursor-pointer bg-purple-50 hover:bg-purple-100' 
                      : 'bg-gray-50 cursor-not-allowed opacity-60'
                  } transition`}>
                    {interview_eligibility?.can_retake_interview !== false ? (
                      <Link href="/candidate/ai-interview">
                        <div>
                          <div className="text-4xl mb-4">💬</div>
                          <h3 className="font-bold text-gray-900 mb-2">Conversational Interview</h3>
                          <p className="text-sm text-gray-600">Human-like experience</p>
                          <div className="mt-3 text-purple-600 font-medium">Start Conversation →</div>
                        </div>
                      </Link>
                    ) : (
                      <div>
                        <div className="text-4xl mb-4">💬</div>
                        <h3 className="font-bold text-gray-500 mb-2">Conversational Interview</h3>
                        <p className="text-sm text-gray-500">Available in {7 - interview_eligibility.days_since_last_interview} days</p>
                        <div className="mt-3 text-gray-500 font-medium">Cooldown Period</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Data Debug Section */}
              {interviewData && interviewData.hasCompletedInterview && (
                <div className="bg-white rounded-lg shadow border p-8 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Interview Data (Real-Time from MongoDB)</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 p-4 rounded border text-center">
                      <div className="text-xl font-bold text-purple-600">{Math.round(interviewData.interview.overall_rating)}</div>
                      <div className="text-sm text-gray-600">Overall Rating</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded border text-center">
                      <div className="text-xl font-bold text-green-600">{interviewData.skills.skill_summary.total_skills}</div>
                      <div className="text-sm text-gray-600">Skills Verified</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded border text-center">
                      <div className="text-xl font-bold text-blue-600">{interviewData.qa_performance.total_questions}</div>
                      <div className="text-sm text-gray-600">Questions Answered</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded border text-center">
                      <div className="text-xl font-bold text-orange-600">{Math.round(interviewData.skills.skill_summary.average_score)}</div>
                      <div className="text-sm text-gray-600">Avg Skill Score</div>
                    </div>
                  </div>
                  
                  {/* Enhanced Skills Preview with Verification Status */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">Skills & Verification Status</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        verification_status?.has_profile_verification 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {verification_status?.profile_completeness || 'Incomplete'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.verified_skills.slice(0, 8).map((skill, index) => (
                        <span 
                          key={index} 
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            skill.score >= 80 ? 'bg-green-100 text-green-800' :
                            skill.score >= 65 ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {skill.skill} ({skill.score})
                        </span>
                      ))}
                    </div>
                    {!verification_status?.has_profile_verification && (
                      <p className="text-xs text-yellow-700 mt-2">
                        💡 Add LinkedIn or GitHub profiles to enhance skill verification
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Job Matching Section - Phase 3 Placeholder */}
              <div className="bg-white rounded-lg shadow border p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Matching System</h2>
                <div className="text-center py-8 text-gray-500">
                  <div className="text-6xl mb-4">🔄</div>
                  <p className="text-lg font-semibold">Phase 3: Job Matching Algorithm</p>
                  <p className="text-sm mt-2">Will match your {skills?.skill_summary?.total_skills || 0} verified skills to available positions</p>
                  <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-md mx-auto">
                    <p className="text-xs text-blue-800">
                      Ready for job matching with real data from {candidate?.email}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}