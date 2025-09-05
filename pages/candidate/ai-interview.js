// Conversational AI Interview - Your actual vision
// Save as: pages/candidate/ai-interview.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import InterviewTimer from '../../components/InterviewTimer';
import { getUserEmail } from '../../utils/auth';

export default function AIInterviewConversational() {
  const router = useRouter();
  const [stage, setStage] = useState('setup'); // setup, introduction, interview, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Interview state
  const [interviewState, setInterviewState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isIntroduction, setIsIntroduction] = useState(true);
  
  // Candidate info
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: getUserEmail() || '',
    job_title: '',
    experience: '',
    skills: ''
  });
  
  // Start the conversational interview
  const startInterview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/interview/dynamic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_info: candidateInfo })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInterviewState(data.state);
        setTranscript(data.state.transcript);
        // The first message should be the introduction request
        setCurrentQuestion(data.state.transcript[0].content);
        setStage('introduction');
        setStartTime(Date.now());
      } else {
        setError('Failed to start interview');
      }
    } catch (err) {
      setError('Failed to connect to AI service');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Submit answer and get next question
  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    setLoading(true);
    
    try {
      const response = await fetch('/api/ai/interview/dynamic/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: interviewState,
          answer: currentAnswer,
          time_taken_sec: timeTaken
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInterviewState(data.state);
        setTranscript(data.state.transcript);
        
        if (data.completed) {
          setStage('complete');
        } else {
          // Get the next question
          setCurrentQuestion(data.assistant);
          setCurrentAnswer('');
          setQuestionCount(prev => prev + 1);
          setStartTime(Date.now());
          
          // After introduction, move to main interview
          if (isIntroduction) {
            setIsIntroduction(false);
            setStage('interview');
          }
        }
      } else {
        setError('Failed to process answer');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle timer expiry
  const handleTimeUp = () => {
    if (isIntroduction) {
      // Auto-submit introduction after 6 minutes
      submitAnswer();
    }
  };
  
  // Calculate appropriate time limit
  const getTimeLimit = () => {
    if (isIntroduction) return 360; // 6 minutes for introduction
    return 120; // 2 minutes for other questions
  };
  
  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-indigo-800">
              🤖 AI Conversational Interview
            </h1>
            <p className="text-gray-600 mt-2">
              {stage === 'setup' && 'Prepare for your interview'}
              {stage === 'introduction' && 'Tell us about yourself'}
              {stage === 'interview' && `Question ${questionCount} - ${isIntroduction ? 'Introduction' : 'Interview'}`}
              {stage === 'complete' && 'Interview Complete!'}
            </p>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {/* Setup Stage */}
          {stage === 'setup' && (
            <div className="bg-white shadow-lg rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Interview Setup</h2>
              <p className="text-gray-600 mb-6">
                This is a conversational interview. You'll start with a 6-minute introduction about yourself, 
                then I'll ask follow-up questions based on your experience.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                    value={candidateInfo.name}
                    onChange={(e) => setCandidateInfo({...candidateInfo, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Applying For
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={candidateInfo.job_title}
                    onChange={(e) => setCandidateInfo({...candidateInfo, job_title: e.target.value})}
                  >
                    <option value="">Select a position...</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="3"
                    min="0"
                    max="30"
                    value={candidateInfo.experience}
                    onChange={(e) => setCandidateInfo({...candidateInfo, experience: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Skills (AI will learn from your introduction)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Python, SQL, Machine Learning, AWS..."
                    value={candidateInfo.skills}
                    onChange={(e) => setCandidateInfo({...candidateInfo, skills: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Interview Format:</h3>
                <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
                  <li>6-minute introduction about yourself</li>
                  <li>4-5 technical questions based on your experience</li>
                  <li>2-3 behavioral questions</li>
                  <li>Questions adapt to your expertise level</li>
                </ol>
              </div>
              
              <button
                onClick={startInterview}
                disabled={loading || !candidateInfo.name || !candidateInfo.job_title || !candidateInfo.experience}
                className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Starting Interview...' : 'Begin Interview'}
              </button>
            </div>
          )}
          
          {/* Introduction Stage */}
          {stage === 'introduction' && (
            <div className="bg-white shadow-lg rounded-lg p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                
                {/* Timer for introduction */}
                <InterviewTimer
                  timeLimit={360} // 6 minutes
                  onTimeUp={handleTimeUp}
                  isActive={true}
                  questionNumber={0}
                />
              </div>
              
              <div className="mb-6">
                <div className="bg-indigo-50 p-6 rounded-lg mb-4">
                  <p className="text-gray-800 text-lg">{currentQuestion}</p>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  💡 Tip: Cover your education, experience, key projects, tools you've used, and any relevant certifications.
                </p>
                
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="12"
                  placeholder="Start with your background, education, then move to your professional experience, key projects, technologies you've worked with, and any certifications or achievements..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    {currentAnswer.length} characters | {currentAnswer.split(' ').filter(w => w).length} words
                  </p>
                  <p className="text-sm text-gray-500">
                    Recommended: 200-400 words
                  </p>
                </div>
              </div>
              
              <button
                onClick={submitAnswer}
                disabled={loading || currentAnswer.length < 50}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-all"
              >
                {loading ? 'Processing...' : 'Submit Introduction'}
              </button>
            </div>
          )}
          
          {/* Main Interview Stage */}
          {stage === 'interview' && (
            <div className="bg-white shadow-lg rounded-lg p-8">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Question {questionCount}
                  </h2>
                  <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                    Follow-up Question
                  </span>
                </div>
                
                {/* Timer for regular questions */}
                <InterviewTimer
                  timeLimit={120} // 2 minutes
                  onTimeUp={() => {}}
                  isActive={true}
                  questionNumber={questionCount}
                />
              </div>
              
              <div className="mb-6">
                <div className="bg-gray-50 p-6 rounded-lg mb-4">
                  <p className="text-gray-800">{currentQuestion}</p>
                </div>
                
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="8"
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />
                
                <p className="text-sm text-gray-500 mt-2">
                  {currentAnswer.length} characters
                </p>
              </div>
              
              <button
                onClick={submitAnswer}
                disabled={loading || !currentAnswer.trim()}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-all"
              >
                {loading ? 'Processing...' : 'Submit Answer'}
              </button>
            </div>
          )}
          
          {/* Complete Stage */}
          {stage === 'complete' && interviewState?.summary && (
            <div className="space-y-6">
              <div className="bg-white shadow-lg rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Interview Complete!
                </h2>
                <p className="text-gray-600">
                  Your responses have been analyzed by our AI interviewer.
                </p>
              </div>
              
              <div className="bg-white shadow-lg rounded-lg p-8">
                <h3 className="text-xl font-semibold mb-4">Interview Summary</h3>
                <p className="text-gray-700">{interviewState.summary.summary}</p>
                
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <p className="font-semibold text-indigo-800">Overall Assessment</p>
                  <p className="text-indigo-700 mt-2">{interviewState.summary.recommendation}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/candidate-dashboard')}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}