// Main interview page where candidates answer AI-generated questions
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import InterviewTimer from '../../components/InterviewTimer';
import aiClient from '../../lib/aiClient';
import { getUserEmail, getAuthHeaders } from '../../utils/auth';

export default function InterviewPage() {
  const router = useRouter();
  
  // Interview state
  const [stage, setStage] = useState('setup'); // setup, questions, assessment, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Candidate info
  const [candidateInfo, setCandidateInfo] = useState({
    skills: '',
    job_title: '',
    experience: ''
  });
  
  // Questions and answers
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);
  
  // Assessment results
  const [assessment, setAssessment] = useState(null);
  
  // Get user email on mount
  useEffect(() => {
    const email = getUserEmail();
    if (email) {
      setCandidateInfo(prev => ({ ...prev, email }));
    }
  }, []);
  
  // Start interview
  const handleStartInterview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiClient.startInterview(candidateInfo);
      
      if (response.success) {
        setQuestions(response.interview_data.questions);
        setStage('questions');
        setStartTime(Date.now());
      } else {
        setError(response.error || 'Failed to start interview');
      }
    } catch (err) {
      setError('Failed to connect to AI service. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle answer submission for current question
  const handleSubmitAnswer = () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const currentQuestion = questions[currentQuestionIndex];
    
    // Save answer with all metadata
    const answerData = {
      question: currentQuestion.question,
      answer: currentAnswer || '(No answer provided)',
      skill_focus: currentQuestion.skill_focus,
      time_taken_sec: timeTaken,
      time_limit_sec: currentQuestion.time_limit_sec,
      rubric: currentQuestion.rubric
    };
    
    setAnswers([...answers, answerData]);
    
    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
      setStartTime(Date.now());
    } else {
      // All questions answered, get assessment
      submitForAssessment([...answers, answerData]);
    }
  };
  
  // Handle time up
  const handleTimeUp = () => {
    console.log('Time is up for question', currentQuestionIndex + 1);
    handleSubmitAnswer(); // Auto-submit with whatever is typed
  };
  
  // Submit all answers for assessment
  const submitForAssessment = async (allAnswers) => {
    setStage('assessment');
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiClient.assessInterview(candidateInfo, allAnswers);
      
      if (response.success) {
        setAssessment(response.assessment);
        setStage('complete');
        
        // Save to backend
        await saveInterviewResults(response.assessment);
      } else {
        setError(response.error || 'Failed to assess interview');
      }
    } catch (err) {
      setError('Failed to get assessment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Save interview results to backend
  const saveInterviewResults = async (assessmentData) => {
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          candidateInfo,
          assessment: assessmentData,
          completedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to save interview results');
      }
    } catch (err) {
      console.error('Error saving results:', err);
    }
  };
  
  // Render based on stage
  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-indigo-800">
              🤖 AI Interview Assessment
            </h1>
            <p className="text-gray-600 mt-2">
              {stage === 'setup' && 'Please fill in your details to begin'}
              {stage === 'questions' && `Question ${currentQuestionIndex + 1} of ${questions.length}`}
              {stage === 'assessment' && 'Analyzing your responses...'}
              {stage === 'complete' && 'Interview Complete!'}
            </p>
          </div>
          
          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          {/* Setup Stage */}
          {stage === 'setup' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Candidate Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title / Role
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={candidateInfo.job_title}
                    onChange={(e) => setCandidateInfo({...candidateInfo, job_title: e.target.value})}
                  >
                    <option value="">Select a role...</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Python, SQL, Excel, Machine Learning"
                    value={candidateInfo.skills}
                    onChange={(e) => setCandidateInfo({...candidateInfo, skills: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 3"
                    min="0"
                    max="30"
                    value={candidateInfo.experience}
                    onChange={(e) => setCandidateInfo({...candidateInfo, experience: e.target.value})}
                  />
                </div>
              </div>
              
              <button
                onClick={handleStartInterview}
                disabled={loading || !candidateInfo.job_title || !candidateInfo.skills || !candidateInfo.experience}
                className="mt-6 w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Starting Interview...' : 'Start Interview'}
              </button>
            </div>
          )}
          
          {/* Questions Stage */}
          {stage === 'questions' && questions.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                {/* Progress bar */}
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{currentQuestionIndex + 1} / {questions.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Timer */}
              <InterviewTimer
                timeLimit={questions[currentQuestionIndex].time_limit_sec}
                onTimeUp={handleTimeUp}
                isActive={true}
                questionNumber={currentQuestionIndex}
              />
              
              {/* Question */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Question {currentQuestionIndex + 1}
                </h3>
                <p className="text-gray-700 mb-2">
                  {questions[currentQuestionIndex].question}
                </p>
                <p className="text-sm text-gray-500">
                  Focus Area: {questions[currentQuestionIndex].skill_focus}
                </p>
              </div>
              
              {/* Answer textarea */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="8"
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {currentAnswer.length} characters
                </p>
              </div>
              
              {/* Submit button */}
              <button
                onClick={handleSubmitAnswer}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Submit Interview'}
              </button>
            </div>
          )}
          
          {/* Assessment Stage */}
          {stage === 'assessment' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Analyzing your responses...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Complete Stage - Show Results */}
          {stage === 'complete' && assessment && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Overall Performance</h2>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-indigo-600">
                      {assessment.overall_score}
                    </div>
                    <p className="text-gray-600 mt-2">out of 100</p>
                  </div>
                </div>
              </div>
              
              {/* Scoring Breakdown */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Scoring Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(assessment.scoring_breakdown || {}).map(([key, value]) => (
                    <div key={key} className="border rounded p-3">
                      <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-xl font-semibold">{value.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {(assessment.strengths || []).map((strength, idx) => (
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
                    {(assessment.improvements || []).map((improvement, idx) => (
                      <li key={idx} className="text-yellow-700 flex items-start">
                        <span className="mr-2">→</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Summary */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Interview Summary</h3>
                <p className="text-gray-700">{assessment.interview_summary}</p>
                
                {assessment.recommendation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded">
                    <p className="text-sm font-semibold text-blue-800">Recommendation</p>
                    <p className="text-blue-700 mt-1">{assessment.recommendation.rationale}</p>
                    <p className="text-sm text-blue-600 mt-2">Next Steps: {assessment.recommendation.next_steps}</p>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/candidate-dashboard')}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition"
                >
                  Take Another Interview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}