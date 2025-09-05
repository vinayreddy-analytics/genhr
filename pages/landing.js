"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  background: "linear-gradient(to bottom right, #f0fdf4, #ffffff)",
  padding: "2rem",
  textAlign: "center"
}}>


<div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
  <span style={{
    fontSize: "2rem",
    color: "#4f46e5"
  }}>🤖</span>
  <h1 style={{
    fontSize: "2.5rem",
    fontWeight: "800",
    color: "#4f46e5"
  }}>
    Gen<span style={{ color: "#10b981" }}>HR</span>
  </h1>
</div>

      {/* Main Heading */}
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#4f46e5" }}>
        Intelligent Hiring. Zero Resumes. Perfect Matches.
      </h1>
      <p style={{ margin: "1rem auto", maxWidth: "700px", fontSize: "1.2rem", color: "#555" }}>
        Let AI analyze skills, verify experience, and deliver pre-qualified talent directly to you — streamlined, smart, and bias-free.
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
        <Link href="/recruiter-form">
          <button style={{ backgroundColor: "#4f46e5", color: "white", padding: "0.75rem 1.5rem", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>
            I'm a Recruiter
          </button>
        </Link>
        <Link href="/candidate-form">
          <button style={{ backgroundColor: "#4f46e5", color: "white", padding: "0.75rem 1.5rem", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>
            I'm a Candidate
          </button>
        </Link>
      </div>
<div style={{ textAlign: 'center', marginTop: '20px' }}>
  <a href="/login" style={{
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '5px',
    marginTop: '10px'
  }}>
    Already have an account? Sign In
  </a>
</div>

      {/* How It Works */}
      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827" }}>How GenHR Works</h2>
        <p style={{ maxWidth: "700px", margin: "1rem auto", fontSize: "1.1rem", color: "#555" }}>
          Our intelligent system eliminates traditional resume screening and focuses on what really matters — skills and compatibility.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", marginTop: "2rem" }}>
          <div style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "8px", width: "250px" }}>
            <div style={{ backgroundColor: "#4f46e5", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 1rem auto" }}>
              1
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Smart Profile Creation</h3>
            <p>Answer key questions and let AI understand your skills and requirements automatically.</p>
          </div>

          <div style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "8px", width: "250px" }}>
            <div style={{ backgroundColor: "#4f46e5", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 1rem auto" }}>
              2
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>AI-Powered Matching</h3>
            <p>Our advanced algorithms analyze compatibility and match recruiters with ideal candidates.</p>
          </div>

          <div style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "8px", width: "250px" }}>
            <div style={{ backgroundColor: "#4f46e5", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 1rem auto" }}>
              3
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Seamless Connection</h3>
            <p>Get connected directly with verified matches and track your recruitment progress.</p>
          </div>
        </div>
      </section>

      {/* Chat bot placeholder */}
      <div style={{ position: "fixed", bottom: "20px", right: "20px" }}>
        <button style={{ backgroundColor: "#4f46e5", border: "none", borderRadius: "50%", width: "60px", height: "60px", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>
          💬
        </button>
      </div>
    </main>
  );
}

































