// components/Dashboard/SkillCard.js
import React from 'react';

const SkillCard = ({ skill, score, level, category, confidence, showProgress = true }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 65) return "text-blue-600"; 
    if (score >= 50) return "text-yellow-600";
    return "text-gray-600";
  };

  const getProgressColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 65) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'expert': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-gray-900 capitalize">{skill}</span>
        <div className="flex items-center space-x-2">
          {level && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(level)}`}>
              {level}
            </span>
          )}
          <span className={`font-bold text-lg ${getScoreColor(score)}`}>
            {typeof score === 'number' ? score.toFixed(1) : score}
          </span>
        </div>
      </div>
      
      {showProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
      
      <div className="flex justify-between text-xs text-gray-500">
        <span className="capitalize">{category?.replace('_', ' ') || 'Assessment'}</span>
        {confidence && (
          <span>Confidence: {Math.round(confidence * 100)}%</span>
        )}
      </div>
    </div>
  );
};

export default SkillCard;