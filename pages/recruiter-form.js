import { useState } from 'react';
import Link from 'next/link';

export default function RecruiterForm() {
  const [formData, setFormData] = useState({
    recruiterName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const requiredFields = ['recruiterName', 'companyName', 'email', 'password', 'confirmPassword'];
  const filled = requiredFields.filter(f => formData[f].trim() !== '').length;
  const progress = Math.round((filled / requiredFields.length) * 100);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          userType: 'recruiter',
          profileData: {
            recruiterName: formData.recruiterName,
            companyName: formData.companyName,
            email: formData.email,
            phone: formData.phone,
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Recruiter registered successfully:', result);
        
        // Store the token (auto-login after signup)
        localStorage.setItem('token', result.token);
        localStorage.setItem('userType', result.user.userType);
        localStorage.setItem('userEmail', result.user.email);
        
        setSubmitted(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/recruiterdashboard';
        }, 2000);
      } else {
        alert(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting form. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Logo and Back Link */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-6">
            <span className="text-xl">←</span>
            <span className="font-medium">Back to Home</span>
          </Link>
          
          <div className="mb-6 flex items-center justify-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gen
              </span>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                HR
              </span>
            </h1>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Join as a Recruiter</h2>
          <p className="text-gray-600 text-lg">Create your account and start finding perfect candidates with AI</p>
        </div>

        {/* Progress Bar - Sticky */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-50 rounded-xl p-4 mb-8 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Registration Progress</span>
            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Account Created Successfully!</h2>
            <p className="text-gray-600 text-lg mb-6">Welcome to GenHR! You can now start posting jobs and finding the best candidates with AI.</p>
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Company Information Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">1</span>
                Company Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name:</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter your company name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Full Name:</label>
                  <input
                    type="text"
                    name="recruiterName"
                    value={formData.recruiterName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">2</span>
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="recruiter@company.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (optional):</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+44 20 1234 5678"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Security Information Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</span>
                Account Security
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password:</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Features Highlight */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What you'll get with GenHR:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">🎯</span>
                  </div>
                  <span className="text-gray-700">AI-powered candidate matching</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">📊</span>
                  </div>
                  <span className="text-gray-700">Advanced analytics dashboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">⚡</span>
                  </div>
                  <span className="text-gray-700">Automated screening process</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">🔍</span>
                  </div>
                  <span className="text-gray-700">Skills-based talent discovery</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button 
                type="submit" 
                className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={progress < 100}
              >
                Create Recruiter Account
              </button>
              <p className="text-sm text-gray-500 mt-4">Start finding the perfect candidates with AI-powered matching</p>
              
              <div className="mt-6">
                <Link href="/candidate-form" className="text-indigo-600 hover:text-indigo-700 transition-colors">
                  Looking to join as a candidate instead?
                </Link>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}