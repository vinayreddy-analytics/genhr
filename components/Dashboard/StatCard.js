// components/Dashboard/StatCard.js
import React from 'react';

const StatCard = ({ icon: Icon, title, value, subtitle, iconColor = "blue", clickable = false, onClick }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600", 
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-50 text-indigo-600",
    red: "bg-red-50 text-red-600"
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 ${
        clickable ? 'hover:shadow-md hover:border-gray-200 cursor-pointer' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${colorClasses[iconColor]}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;