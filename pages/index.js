import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(to bottom right, #f0f4f8, #ffffff)',
      minHeight: '100vh',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Logo & Tagline */}
      <h1 style={{ fontSize: '3.5em', marginBottom: '10px', color: '#333' }}>
        Gen<span style={{ color: '#007bff' }}>HR</span>
      </h1>
      <p style={{ fontSize: '1.3em', color: '#555', maxWidth: '600px', textAlign: 'center', marginBottom: '30px' }}>
        Revolutionizing recruitment with AI-powered matching that connects the right talent with the right opportunities.
      </p>
      <ul style={{ color: '#444', listStyle: 'none', padding: 0, marginBottom: '40px' }}>
        <li>✓ Smart candidate matching</li>
        <li>✓ Streamlined hiring process</li>
        <li>✓ Real-time analytics</li>
      </ul>

      {/* Illustration */}
      <img 
        src="https://via.placeholder.com/600x300?text=Hiring+Illustration"
        alt="Hiring illustration"
        style={{ marginBottom: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
      />

      {/* Choose path */}
      <h2 style={{ marginBottom: '10px' }}>Choose Your Path</h2>
      <p style={{ marginBottom: '30px', color: '#555' }}>
        Get started with the account type that best describes you
      </p>

      {/* Cards */}
      <div style={{
        display: 'flex',
        gap: '50px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <Link href="/candidate-form">
          <div style={{
            background: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '30px',
            width: '280px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ fontSize: '3em', marginBottom: '10px', color: '#28a745' }}>👤</div>
            <h3 style={{ color: '#28a745' }}>I'm a Candidate</h3>
            <p style={{ color: '#555' }}>
              Looking for your next career opportunity? Join our platform to find roles that match your skills.
            </p>
            <button style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>Get Started as Candidate</button>
          </div>
        </Link>

        <Link href="/recruiter-form">
          <div style={{
            background: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '30px',
            width: '280px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ fontSize: '3em', marginBottom: '10px', color: '#007bff' }}>🏢</div>
            <h3 style={{ color: '#007bff' }}>I'm a Recruiter</h3>
            <p style={{ color: '#555' }}>
              Find the best candidates for your roles with our AI-powered matching system.
            </p>
            <button style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>Get Started as Recruiter</button>
          </div>
        </Link>
      </div>
    </div>
  );
}








