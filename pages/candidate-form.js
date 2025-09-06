// Updated CandidateForm.jsx — Modern styling to match landing page
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function CandidateForm() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    preferredRole: '',
    jobType: '',
    experience: '',
    skills: '',
    skillLevel: '',
    contactEmail: '',
    linkedin: '',
    github: '',
    expectedSalary: '',
    birthYear: '',
    degree: '',
    university: '',
    graduationYear: '',
    gender: '',
    sexuality: '',
    visaStatus: '',
    previousHrEmail: '',
    govtId: null,
    consent: false,
    currentLocation: '',
    desiredLocations: ['', '', '', '', ''],
    workExperience: [
      {
        company: '',
        startDate: '',
        endDate: '',
        reasonForGap: ''
      }
    ]
  });

  const [submitted, setSubmitted] = useState(false);

  const requiredFields = [
    'fullName', 'email', 'password', 'confirmPassword', 'jobTitle', 'preferredRole',
    'jobType', 'experience', 'skills', 'contactEmail', 'expectedSalary',
    'birthYear', 'degree', 'university', 'graduationYear'
  ];

  const completedCount = requiredFields.filter(field => form[field]?.toString().trim() !== '').length;
  const isConsentGiven = form.consent === true;
  const progress = Math.round(((completedCount + (isConsentGiven ? 1 : 0)) / (requiredFields.length + 1)) * 100) || 0;

  const handleChange = (e, index, fieldName) => {
    if (typeof index === 'number') {
      const updatedExperience = [...form.workExperience];
      updatedExperience[index][fieldName] = e.target.value;
      setForm({ ...form, workExperience: updatedExperience });
    } else if (e.target.name === 'govtId') {
      setForm({ ...form, govtId: e.target.files[0] });
    } else if (e.target.name === 'consent') {
      setForm({ ...form, consent: e.target.checked });
    } else if (e.target.name.startsWith('desiredLocation')) {
      const idx = Number(e.target.name.split('_')[1]);
      const updatedLocations = [...form.desiredLocations];
      updatedLocations[idx] = e.target.value;
      setForm({ ...form, desiredLocations: updatedLocations });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const addExperience = () => {
    setForm({
      ...form,
      workExperience: [...form.workExperience, { company: '', startDate: '', endDate: '', reasonForGap: '' }]
    });
  };

const handleSubmit = async e => {
  e.preventDefault();
  try {
    // First, register the user account
    const authData = {
      email: form.email,
      password: form.password,
      userType: 'candidate',
      profileData: {
        fullName: form.fullName,
        contactEmail: form.contactEmail,
        jobTitle: form.jobTitle,
        preferredRole: form.preferredRole,
        experience: form.experience,
        skills: form.skills,
        expectedSalary: form.expectedSalary,
        linkedin: form.linkedin,
        github: form.github,
        birthYear: form.birthYear,
        degree: form.degree,
        university: form.university,
        graduationYear: form.graduationYear,
        previousHrEmail: form.previousHrEmail,
        jobType: form.jobType,
        skillLevel: form.skillLevel,
        gender: form.gender,
        sexuality: form.sexuality,
        visaStatus: form.visaStatus,
        currentLocation: form.currentLocation,
        desiredLocations: form.desiredLocations,
        workExperience: form.workExperience,
        consent: form.consent
      }
    };

    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    });

    const result = await response.json();

    if (result.success) {
      console.log('Candidate registered successfully:', result);
      
      // Store the token (auto-login after signup)
      localStorage.setItem('token', result.token);
      localStorage.setItem('userType', result.user.userType);
      localStorage.setItem('userEmail', result.user.email);
      
      // Handle file upload separately if there's a government ID
      if (form.govtId) {
        const fileData = new FormData();
        fileData.append('govtId', form.govtId);
        fileData.append('userId', result.user.id);
        
        // Upload file to a separate endpoint (we can create this later)
        try {
          await axios.post('http://localhost:5000/api/candidates/upload', fileData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (fileError) {
          console.log('File upload failed, but registration succeeded');
        }
      }
      
      setSubmitted(true);
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/candidate-dashboard';
      }, 2000);
      
    } else {
      alert(result.message || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error submitting form. Please try again.');
  }
};

  const summary = `${form.fullName || '[Name]'} is looking for a ${form.jobTitle || '[Role]'} with ${form.experience || '0'} years of experience.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Join as a Candidate</h2>
          <p className="text-gray-600 text-lg">Complete your profile and let AI find your perfect role</p>
        </div>

        {/* Progress Bar - Sticky */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-50 rounded-xl p-4 mb-8 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
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
            <h2 className="text-2xl font-bold text-green-600 mb-4">Thank you for submitting your details!</h2>
            <p className="text-gray-600 text-lg mb-6">Our AI system will now analyze your profile and connect you to the most suitable roles.</p>
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">

            {/* Personal Information Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">1</span>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  ['Full Name', 'fullName'], 
                  ['Email', 'email', 'email'], 
                  ['Password', 'password', 'password'],
                  ['Confirm Password', 'confirmPassword', 'password'],
                  ['Contact Email', 'contactEmail', 'email'],
                  ['Birth Year', 'birthYear', 'number']
                ].map(([label, name, type = 'text']) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}:</label>
                    <input
                      name={name}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                      placeholder={`Enter your ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">2</span>
                Professional Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  ['Current Job Title', 'jobTitle'], 
                  ['Preferred Role', 'preferredRole'],
                  ['Total Experience (years)', 'experience', 'number'], 
                  ['Expected Salary (£)', 'expectedSalary', 'number']
                ].map(([label, name, type = 'text']) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}:</label>
                    <input
                      name={name}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                      placeholder={`Enter your ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills (e.g., Python, SQL, React):</label>
                <textarea
                  name="skills"
                  value={form.skills || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  placeholder="List your key skills separated by commas"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {[
                  ['Job Type', 'jobType', ['Full-time', 'Part-time', 'Contract', 'Internship']],
                  ['Skill Level', 'skillLevel', ['Beginner', 'Intermediate', 'Advanced']],
                  ['Visa Status', 'visaStatus', ['Student Visa', 'Graduate Visa', 'Skilled Worker Visa', 'Dependent Visa', 'UK Citizen', 'None']]
                ].map(([label, name, options]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}:</label>
                    <select
                      name={name}
                      value={form[name] || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    >
                      <option value="">Select {label.toLowerCase()}</option>
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</span>
                Education
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  ['Degree', 'degree'], 
                  ['University', 'university'],
                  ['Graduation Year', 'graduationYear', 'number']
                ].map(([label, name, type = 'text']) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}:</label>
                    <input
                      name={name}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                      placeholder={`Enter your ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Location Preferences */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">4</span>
                Location Preferences
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Current City:</label>
                <input
                  name="currentLocation"
                  value={form.currentLocation || ''}
                  onChange={handleChange}
                  placeholder="E.g. London, Manchester, Birmingham"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Cities (up to 5):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {form.desiredLocations.map((loc, i) => (
                    <input
                      key={i}
                      name={`desiredLocation_${i}`}
                      placeholder={`City ${i + 1}`}
                      value={loc}
                      onChange={handleChange}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">Leave blank if you're open to relocating anywhere in the UK</p>
              </div>
            </div>

            {/* Work Experience Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">5</span>
                Work Experience
              </h3>
              
              {form.workExperience.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6 mb-6 bg-gray-50">
                  <h4 className="font-semibold text-gray-800 mb-4">Experience {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['Company', 'company'], 
                      ['Start Date', 'startDate', 'date'], 
                      ['End Date', 'endDate', 'date']
                    ].map(([label, name, type = 'text']) => (
                      <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label}:</label>
                        <input
                          type={type}
                          value={exp[name]}
                          onChange={e => handleChange(e, index, name)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Gap (optional):</label>
                    <input
                      type="text"
                      value={exp.reasonForGap}
                      onChange={e => handleChange(e, index, 'reasonForGap')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                      placeholder="E.g. Career break, study, travel"
                    />
                  </div>
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={addExperience} 
                className="flex items-center gap-2 px-6 py-3 bg-indigo-100 text-indigo-700 font-medium rounded-xl hover:bg-indigo-200 transition-colors duration-200"
              >
                <span className="text-xl">+</span>
                Add Another Experience
              </button>
            </div>

            {/* Optional Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">6</span>
                Optional Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn Profile:</label>
                  <input
                    name="linkedin"
                    value={form.linkedin || ''}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Profile:</label>
                  <input
                    name="github"
                    value={form.github || ''}
                    onChange={handleChange}
                    placeholder="https://github.com/yourusername"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous HR Email:</label>
                  <input
                    name="previousHrEmail"
                    value={form.previousHrEmail || ''}
                    onChange={handleChange}
                    placeholder="hr@previouscompany.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Government ID Upload:</label>
                  <input 
                    type="file" 
                    name="govtId" 
                    accept=".pdf,image/*" 
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {[
                  ['Gender', 'gender', ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']],
                  ['Sexuality', 'sexuality', ['Prefer not to say', 'Heterosexual', 'Homosexual', 'Bisexual', 'Asexual', 'Other']]
                ].map(([label, name, options]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label} (optional):</label>
                    <select
                      name={name}
                      value={form[name] || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                    >
                      <option value="">Select {label.toLowerCase()}</option>
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Summary</h3>
              <div className="bg-white rounded-xl p-4 mb-4">
                <p className="text-gray-700">{summary}</p>
                <p className="text-gray-600 mt-2">Expected salary: £{form.expectedSalary || '--'} • Skills: {form.skills || 'Not specified'}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700">
                  I agree to the Terms & Conditions, data usage policy, and confirm this AI interview reflects my honest responses.
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button 
                type="submit" 
                className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-lg"
              >
                Complete Registration
              </button>
              <p className="text-sm text-gray-500 mt-4">Your profile will be analyzed by AI to find the best matches</p>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}