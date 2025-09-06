// pages/api/candidate/interview-data.js
// COMPLETE FIX: Queries qa_pairs collection for Q&A performance data

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'genhr';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedDb = client.db(DB_NAME);
    console.log(`✅ Connected to unified MongoDB: ${DB_NAME}`);
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Transform competency_scores into skill format if skill_ratings is missing
function createSkillsFromCompetencyScores(competencyScores) {
  if (!competencyScores) return [];
  
  return Object.entries(competencyScores).map(([competency, score]) => ({
    skill: competency.replace('_', ' '),
    category: 'competency',
    score: score,
    level: score >= 80 ? 'expert' : score >= 65 ? 'advanced' : score >= 50 ? 'intermediate' : 'beginner',
    confidence: score / 100,
    evidence_type: 'interview_assessment'
  }));
}

// Calculate overall grade from individual scores if overall_grade is 0
function calculateOverallGrade(qa) {
  if (qa.overall_grade && qa.overall_grade > 0) {
    return qa.overall_grade;
  }
  
  // If overall_grade is 0 but individual scores exist, calculate it
  if (qa.scores && typeof qa.scores === 'object') {
    const scoreValues = Object.values(qa.scores).filter(s => typeof s === 'number' && s > 0);
    if (scoreValues.length > 0) {
      // Convert 5-point scale to 100-point scale
      const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      return Math.round(avgScore * 20); // Convert to 100-point scale
    }
  }
  
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToDatabase();
    
    const { email, candidate_id } = req.query;
    
    if (!email && !candidate_id) {
      return res.status(400).json({ error: 'Email or candidate_id required' });
    }

    console.log(`🔍 Looking for candidate: ${email || candidate_id}`);

    let candidate;
    
    // Step 1: Get candidate info from unified database
    if (candidate_id) {
      candidate = await db.collection('candidates').findOne({ _id: new ObjectId(candidate_id) });
    } else {
      candidate = await db.collection('candidates').findOne({ email: email });
    }
    
    if (!candidate) {
      console.log(`❌ Candidate not found in genhr database: ${email}`);
      
      const allCandidates = await db.collection('candidates').find({}, { email: 1, name: 1 }).toArray();
      console.log('📋 Available candidates:', allCandidates.map(c => c.email));
      
      return res.status(404).json({ 
        error: 'Candidate not found',
        debug: `No candidate found with email: ${email}`,
        availableCandidates: allCandidates.map(c => c.email)
      });
    }

    console.log(`✅ Found candidate: ${candidate.name || candidate.fullName} (${candidate.email})`);

    // Step 2: Get candidate's latest interview
    const latestInterview = await db.collection('interviews').findOne(
      { candidate_id: new ObjectId(candidate._id) },
      { sort: { completed_at: -1 } }
    );

    if (!latestInterview) {
      console.log(`📝 No completed interview found for: ${candidate.email}`);
      return res.status(200).json({
        hasCompletedInterview: false,
        candidate: {
          name: candidate.name || candidate.fullName || candidate.email.split('@')[0],
          email: candidate.email,
          experience_years: candidate.experience_years || 0,
          education: candidate.education || null,
          certifications: candidate.certifications || [],
          linkedin: candidate.linkedin || null,
          github: candidate.github || null
        }
      });
    }

    console.log(`✅ Found interview for: ${candidate.email}`);

    // Step 3: Handle missing or empty skill_ratings by transforming competency_scores
    let verifiedSkills = [];
    let skillSummary = { total_skills: 0, expert_skills: 0, advanced_skills: 0, average_score: 0 };

    if (latestInterview.skill_ratings && latestInterview.skill_ratings.verified_skills && latestInterview.skill_ratings.verified_skills.length > 0) {
      // Use existing skill_ratings if available
      verifiedSkills = latestInterview.skill_ratings.verified_skills;
      skillSummary = latestInterview.skill_ratings.skill_summary || skillSummary;
      console.log('✅ Using existing skill_ratings data');
    } else if (latestInterview.competency_scores) {
      // Transform competency_scores into skills format
      console.log('🔄 Transforming competency_scores into skills format');
      verifiedSkills = createSkillsFromCompetencyScores(latestInterview.competency_scores);
      
      // Calculate skill summary from competency scores
      const scores = Object.values(latestInterview.competency_scores);
      skillSummary = {
        total_skills: scores.length,
        expert_skills: scores.filter(s => s >= 80).length,
        advanced_skills: scores.filter(s => s >= 65 && s < 80).length,
        average_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      };
    }

    // Step 4: LinkedIn/GitHub verification status
    const hasLinkedIn = !!(candidate.linkedin && candidate.linkedin.trim());
    const hasGitHub = !!(candidate.github && candidate.github.trim());
    const hasProfileVerification = hasLinkedIn || hasGitHub;

    // Step 5: Interview cooldown calculation
    const interviewDate = new Date(latestInterview.completed_at);
    const daysSinceInterview = Math.floor((new Date() - interviewDate) / (1000 * 60 * 60 * 24));
    const canRetakeInterview = daysSinceInterview >= 7;

    // Step 6: Get Q&A performance from separate qa_pairs collection
    console.log('🔍 Fetching Q&A pairs for interview:', latestInterview._id);

    const qaPairs = await db.collection('qa_pairs').find(
      { interview_id: new ObjectId(latestInterview._id) }
    ).sort({ asked_at: 1 }).toArray();

    console.log(`📊 Found ${qaPairs.length} Q&A pairs`);

    let qaPerformance = { total_questions: 0, average_grade: 0, questions_over_80: 0, total_time_taken: 0 };

    if (qaPairs.length > 0) {
      // Calculate overall grades, fixing any 0 grades from individual scores
      const processedGrades = qaPairs.map(qa => calculateOverallGrade(qa));
      const validGrades = processedGrades.filter(grade => grade > 0);
      
      qaPerformance = {
        total_questions: qaPairs.length,
        average_grade: validGrades.length > 0 ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length) : 0,
        questions_over_80: processedGrades.filter(g => g >= 80).length,
        total_time_taken: qaPairs.reduce((sum, qa) => sum + (qa.time_taken_sec || 0), 0),
        // Additional debug info
        all_grades: processedGrades,
        valid_grades: validGrades,
        zero_grades_count: processedGrades.filter(g => g === 0).length
      };

      console.log('📊 Q&A Performance calculated:', {
        total_questions: qaPerformance.total_questions,
        average_grade: qaPerformance.average_grade,
        all_grades: qaPerformance.all_grades,
        time_taken: qaPerformance.total_time_taken
      });
    } else {
      console.log('⚠️ No Q&A pairs found for interview');
      
      // Fallback: estimate from competency scores if no Q&A data found
      const competencyScores = Object.values(latestInterview.competency_scores || {});
      if (competencyScores.length > 0) {
        qaPerformance = {
          total_questions: competencyScores.length,
          average_grade: Math.round(competencyScores.reduce((a, b) => a + b, 0) / competencyScores.length),
          questions_over_80: competencyScores.filter(s => s >= 80).length,
          total_time_taken: latestInterview.interview_duration_minutes * 60 || 0
        };
        console.log('📊 Using competency scores as Q&A fallback:', qaPerformance);
      }
    }

    // Step 7: Build comprehensive response
    const responseData = {
      hasCompletedInterview: true,
      candidate: {
        id: candidate._id.toString(),
        name: candidate.name || candidate.fullName || candidate.email.split('@')[0],
        email: candidate.email,
        experience_years: candidate.experience_years || parseInt(candidate.experience) || 0,
        education: candidate.education || null,
        certifications: candidate.certifications || [],
        linkedin: candidate.linkedin || null,
        github: candidate.github || null
      },
      interview: {
        id: latestInterview._id.toString(),
        role: latestInterview.role || 'Data Scientist',
        professional_summary: latestInterview.professional_summary || 'Professional summary not available',
        overall_rating: latestInterview.overall_rating || 75,
        competency_scores: latestInterview.competency_scores || {},
        strengths: latestInterview.strengths || [],
        areas_for_improvement: latestInterview.areas_for_improvement || [],
        matching_keywords: latestInterview.matching_keywords || [],
        interview_date: latestInterview.completed_at || new Date(),
        verification_id: latestInterview._id.toString().slice(-12).toUpperCase(),
        interview_duration_minutes: latestInterview.interview_duration_minutes || 30
      },
      skills: {
        verified_skills: verifiedSkills,
        skill_summary: skillSummary
      },
      qa_performance: qaPerformance,
      verification_status: {
        linkedin_verified: hasLinkedIn,
        github_verified: hasGitHub,
        has_profile_verification: hasProfileVerification,
        verification_message: !hasProfileVerification 
          ? "Although the candidate performed well in the interview, LinkedIn and GitHub profiles are needed to verify practical expertise and validate claimed skills."
          : "Skills verified through interview performance and professional profiles.",
        profile_completeness: hasProfileVerification ? "complete" : "incomplete"
      },
      interview_eligibility: {
        can_retake_interview: canRetakeInterview,
        days_since_last_interview: daysSinceInterview,
        next_eligible_date: canRetakeInterview ? null : new Date(interviewDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cooldown_message: canRetakeInterview 
          ? "You are eligible to take another interview." 
          : `You can retake the interview in ${7 - daysSinceInterview} days.`
      }
    };

    console.log(`✅ Interview data prepared for ${candidate.email}`);
    console.log(`   Skills: ${skillSummary.total_skills} verified (avg: ${skillSummary.average_score})`);
    console.log(`   Q&A: ${qaPerformance.total_questions} questions, avg grade: ${qaPerformance.average_grade}`);
    console.log(`   Profile verification: ${hasProfileVerification ? 'Complete' : 'Incomplete'}`);
    console.log(`   Interview eligibility: ${canRetakeInterview ? 'Eligible' : `${7 - daysSinceInterview} days remaining`}`);
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      hasCompletedInterview: false 
    });
  }
}