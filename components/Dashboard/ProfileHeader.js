// components/Dashboard/ProfileHeader.js
import React from 'react';
import { User, Mail, Clock, Shield } from 'lucide-react';

const ProfileHeader = ({ name, role, email, experience, score, verified = false }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {name}!</h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-gray-600">
                <Mail size={16} className="mr-1" />
                <span className="text-sm">{email}</span>
              </div>
              {role && (
                <div className="flex items-center text-gray-600">
                  <User size={16} className="mr-1" />
                  <span className="text-sm font-medium">{role}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1">
              {experience && (
                <div className="flex items-center text-gray-500">
                  <Clock size={14} className="mr-1" />
                  <span className="text-xs">{experience} years experience</span>
                </div>
              )}
              {verified && (
                <div className="flex items-center text-green-600">
                  <Shield size={14} className="mr-1" />
                  <span className="text-xs">User authenticated ✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {score && (
          <div className="text-center bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="text-2xl font-bold text-green-600">{score}/100</div>
            <div className="text-xs text-green-700 font-medium">Profile Score</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;