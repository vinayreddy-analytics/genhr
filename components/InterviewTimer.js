// Timer component that counts down and triggers callback when time is up
import { useState, useEffect, useRef } from 'react';

export default function InterviewTimer({ 
  timeLimit, 
  onTimeUp, 
  isActive, 
  questionNumber 
}) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const intervalRef = useRef(null);
  
  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit, questionNumber]);
  
  // Handle countdown
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, onTimeUp]);
  
  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate percentage for progress bar
  const percentage = (timeLeft / timeLimit) * 100;
  
  // Determine color based on time left
  const getColor = () => {
    if (percentage > 50) return 'bg-green-600';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-600';
  };
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
        <span className={`text-lg font-bold ${percentage < 25 ? 'text-red-600' : 'text-gray-800'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {timeLeft === 0 && (
        <p className="text-red-600 text-sm mt-2 font-semibold">
          ⏰ Time's up! Your answer has been auto-submitted.
        </p>
      )}
    </div>
  );
}