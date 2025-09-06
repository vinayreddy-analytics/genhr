import React, { useState, useEffect } from 'react';
import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";
import LogoutButton from "../components/LogoutButton";
import { getUserEmail, getUserType } from '../utils/auth';

// Dashboard Components
import StatCard from '../components/Dashboard/StatCard';
import SectionCard from '../components/Dashboard/SectionCard';
import SkillCard from '../components/Dashboard/SkillCard';
import AlertCard from '../components/Dashboard/AlertCard';
import ProfileHeader from '../components/Dashboard/ProfileHeader';

import { 
  CheckCircle, 
  Target, 
  Clock, 
  Calendar,
  BarChart3,
  User,
  Github,
  Linkedin,
  Play,
  RotateCcw,
  Briefcase,
  TrendingUp,
  Award,
  MessageSquare
} from 'lucide-react';

export default function CandidateDashboard() {
  const [showResume, setShowResume] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSkillCategory, setSelectedSkillCategory] = useState('all');

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
          <div className="text-center bg-white p-8 rounded-xl shadow-lg border">
            <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <div className="text-xl font-semibold text-gray-700 mb-2">Loading your interview data...</div>
            <div className="text-sm text-gray-500">Connecting to MongoDB and fetching your results</div>
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
          <div className="text-center p-8 bg-white rounded-xl shadow-lg border max-w-md">
            <div className="text-xl font-semibold text-red-600 mb-2">Unable to Load Data</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 w-full transition"
              >
                Try Again
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 w-full transition"
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
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProfileHeader 
              name={interviewData.candidate.name}
              email={interviewData.candidate.email}
              role={interviewData.candidate.education?.degree + " Graduate" || "Job Seeker"}
              experience={interviewData.candidate.experience_years}
              verified={true}
            />

            <div className="mt-8">
              <SectionCard 
                title="Complete Your AI Interview" 
                subtitle="Unlock your personalized dashboard and job recommendations"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <Link href="/candidate/interview?mode=practice">
                    <div className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-blue-50 hover:bg-blue-100 transition-all duration-200">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                        <Play className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Practice Interview</h3>
                      <p className="text-sm text-gray-600 mb-3">Get familiar with the format</p>
                      <div className="text-blue-600 font-medium">Start Practice →</div>
                    </div>
                  </Link>

                  <Link href="/candidate/interview">
                    <div className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-all duration-200">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
                        <Target className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Batch AI Interview</h3>
                      <p className="text-sm text-gray-600 mb-3">4 pre-generated questions</p>
                      <div className="text-indigo-600 font-medium">Start Interview →</div>
                    </div>
                  </Link>

                  <Link href="/candidate/ai-interview">
                    <div className="group border border-gray-200 rounded-lg p-6 text-center hover:shadow-md cursor-pointer bg-purple-50 hover:bg-purple-100 transition-all duration-200">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Conversational Interview</h3>
                      <p className="text-sm text-gray-600 mb-3">Human-like experience</p>
                      <div className="text-purple-600 font-medium">Start Conversation →</div>
                    </div>
                  </Link>
                </div>

                {interviewData.candidate.education && (
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-medium text-gray-900 mb-2">Your Profile</h3>
                    <p className="text-sm text-gray-600">
                      {interviewData.candidate.education.degree} in {interviewData.candidate.education.field}
                      {interviewData.candidate.education.university && ` from ${interviewData.candidate.education.university}`}
                    </p>
                    <p className="text-sm text-gray-600">Experience: {interviewData.candidate.experience_years} years</p>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Main dashboard with real interview data for current user
  const { candidate, interview, skills, qa_performance, verification_status, interview_eligibility } = interviewData;

  const getSkillsByCategory = (category) => {
    if (category === 'all') return skills.verified_skills;
    return skills.verified_skills.filter(skill => skill.category === category);
  };

  const skillCategories = ['all', ...new Set(skills.verified_skills.map(skill => skill.category).filter(Boolean))];

  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header with better spacing */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900">Candidate Dashboard</h1>
                <p className="text-sm text-gray-500">Your AI-powered career insights</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-gray-700 truncate max-w-48">
                    {candidate.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {skills.skill_summary.total_skills} skills verified
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showResume ? (
            <div>
              <button 
                onClick={() => setShowResume(false)}
                className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition"
              >
                ← Back to Dashboard
              </button>
              
              <SectionCard title="AI-Generated Professional Resume" subtitle="Based on your interview performance and verified skills">
                {/* Header */}
                <div className="border-b border-gray-200 pb-6 mb-6">
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

                {/* Skills Section */}
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
                              <span className="font-bold text-gray-900">{typeof skill.score === 'number' ? skill.score.toFixed(1) : skill.score}/100</span>
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

                {/* Tools & Technologies Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-1 h-6 bg-orange-500 rounded mr-3"></span>
                    Tools and Technologies
                  </h3>
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    {interview.matching_keywords && interview.matching_keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {interview.matching_keywords.map((tool, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                          >
                            {tool.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">No tools specified</p>
                    )}
                  </div>
                </div>

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
              </SectionCard>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <ProfileHeader 
                name={candidate.name}
                role={interview.role}
                email={candidate.email}
                experience={candidate.experience_years}
                score={Math.round(interview.overall_rating)}
                verified={true}
              />

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <StatCard
                  icon={CheckCircle}
                  title="Interview Status"
                  value="Completed"
                  subtitle={new Date(interview.interview_date).toLocaleDateString()}
                  iconColor="green"
                />
                
                <StatCard
                  icon={Target}
                  title="Skills Verified"
                  value={skills.skill_summary.total_skills}
                  subtitle="Technical + Soft skills"
                  iconColor="blue"
                  clickable={true}
                  onClick={() => setSelectedSkillCategory('all')}
                />
                
                <StatCard
                  icon={Clock}
                  title="Interview Duration"
                  value={`${interview.interview_duration_minutes} min`}
                  subtitle="Optimal length"
                  iconColor="purple"
                />
                
                <StatCard
                  icon={Calendar}
                  title="Next Available"
                  value={interview_eligibility?.can_retake_interview ? "Available" : new Date(interview_eligibility?.next_eligible_date).toLocaleDateString()}
                  subtitle={interview_eligibility?.can_retake_interview ? "Ready now" : "Cooldown period"}
                  iconColor={interview_eligibility?.can_retake_interview ? "green" : "orange"}
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6 mt-8">
                {/* Left Column - 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Interview Results */}
                  <SectionCard title="AI Interview Results" subtitle="Your personalized assessment and verified skills">
                    <AlertCard
                      type="success"
                      title="Interview Completed Successfully!"
                      message="Your AI interview has been completed and scored. View your personalized resume and skill verification."
                      onAction={() => setShowResume(true)}
                      actionText="View My Results & Resume"
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                      <div className="bg-gray-50 rounded-lg p-6 text-center border">
                        <div className="text-sm text-gray-600 mb-2">Overall Score</div>
                        <div className="text-3xl font-bold text-gray-900">{Math.round(interview.overall_rating)}/100</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 text-center border">
                        <div className="text-sm text-gray-600 mb-2">Skills Verified</div>
                        <div className="text-3xl font-bold text-gray-900">{skills.skill_summary.total_skills}</div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Professional Summary */}
                  <SectionCard title="Professional Summary" subtitle="AI-generated based on your interview performance">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">{interview.professional_summary}</p>
                    </div>
                  </SectionCard>

                  {/* Verified Skills */}
                  <SectionCard title={`Verified Skills (${getSkillsByCategory(selectedSkillCategory).length})`} subtitle="Skills confirmed through AI interview">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {skillCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedSkillCategory(category)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                            selectedSkillCategory === category
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {category === 'all' ? 'All Skills' : category.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {getSkillsByCategory(selectedSkillCategory).map((skill, index) => (
                        <SkillCard
                          key={index}
                          skill={skill.skill}
                          score={skill.score}
                          level={skill.level}
                          category={skill.category}
                          confidence={skill.confidence}
                        />
                      ))}
                    </div>
                  </SectionCard>
                </div>

                {/* Right Column - 1/3 width */}
                <div className="space-y-6">
                  {/* Skill Verification Status */}
                  <SectionCard title="Skill Verification" subtitle="Profile verification progress">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Linkedin size={16} className="text-blue-600" />
                          <span className="font-medium">LinkedIn Profile</span>
                        </div>
                        <span className="text-orange-600 text-sm">⚠ Not Connected</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Github size={16} className="text-gray-700" />
                          <span className="font-medium">GitHub Profile</span>
                        </div>
                        <span className="text-orange-600 text-sm">⚠ Not Connected</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-4">Connect your profiles to verify practical expertise and validate claimed skills.</p>
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
                        Connect Profiles
                      </button>
                    </div>
                  </SectionCard>

                  {/* Quick Performance Stats */}
                  <SectionCard title="Performance Overview" subtitle="Key metrics from your interview">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Technical Skills</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="w-4/5 h-2 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium">82%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Problem Solving</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="w-3/5 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium">65%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Communication</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="w-4/5 h-2 bg-purple-500 rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium">82%</span>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Quick Actions */}
                  <SectionCard title="Quick Actions">
                    <div className="space-y-3">
                      <Link href="/candidate/interview?mode=practice">
                        <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2">
                          <Target size={16} />
                          Practice Interview
                        </button>
                      </Link>
                      
                      <button 
                        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                          interview_eligibility?.can_retake_interview 
                            ? 'bg-gray-600 text-white hover:bg-gray-700' 
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!interview_eligibility?.can_retake_interview}
                      >
                        <RotateCcw size={16} />
                        Retake Interview
                      </button>
                      
                      {!interview_eligibility?.can_retake_interview && (
                        <p className="text-center text-xs text-gray-500">
                          Available in {7 - interview_eligibility?.days_since_last_interview} days
                        </p>
                      )}
                      
                      <Link href="/candidate/job-matches">
                        <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2">
                          <Briefcase size={16} />
                          View Job Matches
                        </button>
                      </Link>
                    </div>
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}