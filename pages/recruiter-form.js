import { useState } from 'react';

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
        
        // Redirect to dashboard
        window.location.href = '/recruiterdashboard';
      } else {
        alert(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting form.');
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2 style={{ color: 'green', fontSize: '24px' }}>✅ Account Created Successfully!</h2>
        <p>Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'Arial' }}>
      <h1>Recruiter Signup</h1>
      <p>Create your recruiter account to start posting jobs.</p>

      <div style={{ background: '#eee', height: '20px', borderRadius: '5px', marginBottom: '20px' }}>
        <div style={{
          width: `${progress}%`,
          background: 'green',
          height: '100%',
          borderRadius: '5px',
          textAlign: 'center',
          color: 'white'
        }}>{progress}%</div>
      </div>

      <form onSubmit={handleSubmit}>
        {[{ label: 'Full Name', name: 'recruiterName' },
          { label: 'Company Name', name: 'companyName' },
          { label: 'Work Email', name: 'email', type: 'email' },
          { label: 'Phone Number (optional)', name: 'phone' },
          { label: 'Password', name: 'password', type: 'password' },
          { label: 'Confirm Password', name: 'confirmPassword', type: 'password' }]
          .map(({ label, name, type = 'text' }) => (
            <div key={name} style={{ marginBottom: '15px' }}>
              <label>{label}</label><br />
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={label}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
        ))}

        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: 'green',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}














