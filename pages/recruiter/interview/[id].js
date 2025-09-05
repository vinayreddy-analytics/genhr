// Detailed view of a single interview for recruiters
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function InterviewDetails() {
  const router = useRouter();
  const { id } = router.query;
  
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (id) {
      fetchInterviewDetails();
    }
  }, [id]);
  
  const fetchInterviewDetails = async () => {
    setLoading(true);
    try {
      // Try to fetch from AI service
      const response = await fetch(`/api/ai/recruiter/interview/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.interview) {
          setInterview(data.interview);
        }
      } else {
        // Use mock data for testing
        setInterview(getMockInterview());
      }
    } catch (error) {
      console.error('Failed to fetch interview details:', error);
      // Use mock data
      setInterview(getMockInterview());
    } finally {
      setLoading(false);
    }
  };
  
  // Mock data for testing
  const getMockInterview = () => ({
    _id: id,
    candidate_info: {
      email: 'john.doe@email.com',
      job_title: 'Data Analyst',
      skills: 'Python, SQL, Excel, Tableau, Machine Learning',
      experience: '3'
    },
    summary: {
      overall_score: 85,
      recommendation: 'Strong candidate with excellent technical skills and clear communication',
      ratings: {
        correctness: 88,
        completeness: 82,
        clarity: 90,
        relevance: 80
      }
    },
    qa_pairs: [
      {
        question: 'How would you handle missing data in a large dataset?',
        answer: 'I would first analyze the pattern of missing data to understand if it\'s random or systematic. For random missing data, I\'d use imputation techniques like mean/median for numerical data or mode for categorical. For systematic patterns, I might need to investigate the data collection process. If more than 50% of data is missing in a column, I\'d consider dropping it after assessing its importance.',
        skill_focus: 'Data Cleaning',
        score: 85
      },
      {
        question: 'Explain the difference between supervised and unsupervised learning',
        answer: 'Supervised learning uses labeled data where we know the output for training examples. It\'s used for classification and regression tasks. Examples include predicting house prices or classifying emails as spam. Unsupervised learning works with unlabeled data to find hidden patterns. It\'s used for clustering, dimensionality reduction, and anomaly detection. K-means clustering and PCA are common unsupervised techniques.',
        skill_focus: 'Machine Learning',
        score: 90
      },
      {
        question: 'How do you ensure your SQL queries are optimized for performance?',
        answer: 'I optimize SQL queries by using proper indexing on frequently queried columns, avoiding SELECT *, using JOINs instead of subqueries when possible, and analyzing query execution plans. I also partition large tables, use appropriate data types, and regularly update statistics. For complex queries, I break them into smaller CTEs for better readability and performance.',
        skill_focus: 'SQL',
        score: 82
      },
      {
        question: 'Tell me about a time you had to present complex data to non-technical stakeholders',
        answer: 'In my previous role, I needed to present customer churn analysis to the marketing team. I started by understanding their key concerns, then created simple visualizations using Tableau. I avoided technical jargon and focused on actionable insights. I used analogies to explain statistical concepts and provided clear recommendations. The presentation led to a new retention strategy that reduced churn by 15%.',
        skill_focus: 'Communication',
        score: 88
      }
    ],
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    interview_duration_minutes: 25,
    strengths: [
      'Strong understanding of data cleaning techniques',
      'Clear communication style',
      'Good practical examples',
      'Solid SQL optimization knowledge'
    ],
    improvements: [
      'Could elaborate more on machine learning algorithms',
      'Add more specific metrics in examples'
    ]
  });
  
  if (loading) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading interview details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  
  if (!interview) {
    return (
      <ProtectedRoute requiredUserType="recruiter">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">Interview not found</p>
            <Link href="/recruiter/interviews">
              <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                Back to Interviews
              </button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute requiredUserType="recruiter">
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-indigo-800">
                  Interview Details
                </h1>
                <p className="text-gray-600 mt-1">
                  {interview.candidate_info?.email}
                </p>
              </div>
              <Link href="/recruiter/interviews">
                <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                  Back to List
                </button>
              </Link>
            </div>
          </div>
          
          {/* Candidate Info */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Candidate Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{interview.candidate_info?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied Role</p>
                <p className="font-medium">{interview.candidate_info?.job_title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Experience</p>
                <p className="font-medium">{interview.candidate_info?.experience} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Skills</p>
                <p className="font-medium">{interview.candidate_info?.skills}</p>
              </div>
            </div>
          </div>
          
          {/* Assessment Results */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Assessment Results</h2>
            
            {/* Overall Score */}
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-indigo-600">
                {interview.summary?.overall_score || 0}
              </div>
              <p className="text-gray-600 mt-2">Overall Score</p>
            </div>
            
            {/* Score Breakdown */}
            {interview.summary?.ratings && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(interview.summary.ratings).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-semibold">{value}</div>
                    <p className="text-sm text-gray-600 capitalize">{key}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="font-semibold text-blue-800 mb-1">AI Recommendation</p>
              <p className="text-blue-700">{interview.summary?.recommendation}</p>
            </div>
          </div>
          
          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Strengths</h3>
              <ul className="space-y-2">
                {(interview.strengths || []).map((strength, idx) => (
                  <li key={idx} className="text-green-700 flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Areas to Improve</h3>
              <ul className="space-y-2">
                {(interview.improvements || []).map((improvement, idx) => (
                  <li key={idx} className="text-yellow-700 flex items-start">
                    <span className="mr-2">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Q&A Pairs */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Interview Questions & Answers</h2>
            <div className="space-y-6">
              {(interview.qa_pairs || []).map((qa, idx) => (
                <div key={idx} className="border-b pb-6 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Question {idx + 1}: {qa.question}
                    </h4>
                    {qa.score && (
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                        Score: {qa.score}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Focus: {qa.skill_focus}</p>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-gray-700">{qa.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition">
              Schedule Interview
            </button>
            <button className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition">
              Send to Hiring Manager
            </button>
            <button className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}