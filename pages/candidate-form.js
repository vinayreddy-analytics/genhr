// Updated CandidateForm.jsx — removed location field & improved preferred cities UI
import { useState } from 'react';
import axios from 'axios';

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
    <div style={{ maxWidth: '700px', margin: '0 auto', fontFamily: 'Arial' }}>
      <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1000, paddingTop: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Candidate Form</h1>
        <div style={{ background: '#eee', height: '20px', borderRadius: '5px' }}>
          <div style={{ width: `${progress}%`, background: 'green', height: '100%', borderRadius: '5px', textAlign: 'center', color: 'white' }}>{progress}%</div>
        </div>
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2 style={{ color: 'green', fontSize: '24px' }}>✅ Thank you for submitting your details!</h2>
          <p>Our AI system will now analyze your profile and connect you to the most suitable roles.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} encType="multipart/form-data">

          {[
            ['Full Name', 'fullName'], ['Email', 'email'], ['Password', 'password', 'password'],
            ['Confirm Password', 'confirmPassword', 'password'], ['Job Title', 'jobTitle'],
            ['Preferred Role', 'preferredRole'],
            ['Total Experience (years)', 'experience'], ['Skills (e.g., Python, SQL)', 'skills'],
            ['Expected Salary (£)', 'expectedSalary'], ['Contact Email', 'contactEmail'],
            ['LinkedIn (optional)', 'linkedin'], ['GitHub (optional)', 'github'],
            ['Birth Year', 'birthYear', 'number'], ['Degree', 'degree'],
            ['University', 'university'], ['Graduation Year', 'graduationYear'],
            ['Previous HR Email (optional)', 'previousHrEmail']
          ].map(([label, name, type = 'text']) => (
            <div key={name} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>{label}:</label>
              <input
                name={name}
                type={type}
                value={form[name] || ''}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
          ))}

          {[['Job Type', 'jobType', ['Full-time', 'Part-time', 'Contract', 'Internship']],
            ['Skill Level (optional)', 'skillLevel', ['Beginner', 'Intermediate', 'Advanced']],
            ['Gender (optional)', 'gender', ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']],
            ['Sexuality (optional)', 'sexuality', ['Prefer not to say', 'Heterosexual', 'Homosexual', 'Bisexual', 'Asexual', 'Other']],
            ['Visa Status (optional)', 'visaStatus', ['Student Visa', 'Graduate Visa', 'Skilled Worker Visa', 'Dependent Visa', 'None']]
          ].map(([label, name, options]) => (
            <div key={name} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>{label}:</label>
              <select
                name={name}
                value={form[name] || ''}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              >
                <option value="">Select {label.toLowerCase()}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}

          {/* Current Location */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block' }}>Current City:</label>
            <input
              name="currentLocation"
              value={form.currentLocation || ''}
              onChange={handleChange}
              placeholder="E.g. London"
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Desired Locations */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Preferred Cities (up to 5):</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {form.desiredLocations.map((loc, i) => (
                <input
                  key={i}
                  name={`desiredLocation_${i}`}
                  placeholder={`City ${i + 1}`}
                  value={loc}
                  onChange={handleChange}
                  style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
              ))}
            </div>
            <small style={{ color: 'gray' }}>* Leave all blank if you're comfortable relocating anywhere in the UK.</small>
          </div>

          {/* Govt ID Upload */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block' }}>Govt ID Upload (optional):</label>
            <input type="file" name="govtId" accept=".pdf,image/*" onChange={handleChange} />
          </div>

          {/* Work Experience */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '30px', marginBottom: '10px' }}>Work Experience</h2>
            {form.workExperience.map((exp, index) => (
              <div key={index} style={{ marginBottom: '20px' }}>
                {[['Company', 'company'], ['Start Date', 'startDate', 'date'], ['End Date', 'endDate', 'date'], ['Reason for Gap (optional)', 'reasonForGap']].map(([label, name, type = 'text']) => (
                  <div key={name} style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block' }}>{label}:</label>
                    <input
                      type={type}
                      value={exp[name]}
                      onChange={e => handleChange(e, index, name)}
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <button type="button" onClick={addExperience} style={{ background: '#007bff', color: 'white', padding: '8px 16px', borderRadius: '5px', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>
              Add Experience
            </button>
          </div>

          {/* Consent Checkbox */}
          <div style={{ marginTop: '25px', marginBottom: '20px' }}>
            <label>
              <input
                type="checkbox"
                name="consent"
                checked={form.consent}
                onChange={handleChange}
              />{' '}
              I agree to the T&Cs, data usage, and confirm this AI interview reflects my honest responses.
            </label>
          </div>

          {/* Summary */}
          <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px', fontSize: '14px', color: '#333', marginBottom: '20px' }}>
            <p>{summary}</p>
            <p>Expected salary: £{form.expectedSalary || '--'}, Skills: {form.skills || '--'}</p>
          </div>

          <button type="submit" style={{ background: 'green', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none' }}>
            Submit
          </button>
        </form>
      )}
    </div>
  );
}


















































