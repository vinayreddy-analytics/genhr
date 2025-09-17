# models.py - UPDATED WITH NORMALIZED SCHEMA
import os
import uuid
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient, ReturnDocument, IndexModel, ASCENDING, DESCENDING, TEXT
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection (local by default)
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME   = os.getenv('DB_NAME', 'genhr')

print(f"Connecting to: {MONGO_URI} (db={DB_NAME})")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
client.admin.command("ping")  # fail fast
print("✅ Connected to MongoDB")

db = client[DB_NAME]

# Collections - NORMALIZED SCHEMA
candidates_collection = db['candidates']
interviews_collection = db['interviews']
skill_assessments_collection = db['skill_assessments']
qa_pairs_collection = db['qa_pairs']
interview_sessions_collection = db['interview_sessions']

# ===========================================
# CREATE INDEXES FOR PERFORMANCE
# ===========================================

def setup_indexes():
    """Create all necessary indexes"""
    try:
        # Candidates collection
        candidates_collection.create_index([("email", ASCENDING)], unique=True)
        candidates_collection.create_index([("created_at", DESCENDING)])
        
        # Interviews collection  
        interviews_collection.create_index([("candidate_id", ASCENDING), ("created_at", DESCENDING)])
        interviews_collection.create_index([("role", ASCENDING), ("overall_rating", DESCENDING)])
        interviews_collection.create_index([("status", ASCENDING), ("completed_at", DESCENDING)])
        interviews_collection.create_index([("recruiter_viewed", ASCENDING)])
        interviews_collection.create_index([("session_id", ASCENDING)])
        
        # Skill assessments collection
        skill_assessments_collection.create_index([("interview_id", ASCENDING)])
        skill_assessments_collection.create_index([("skill", ASCENDING), ("level", ASCENDING)])
        skill_assessments_collection.create_index([("validation_status", ASCENDING)])
        skill_assessments_collection.create_index([("confidence", DESCENDING), ("relevance_to_role", DESCENDING)])
        
        # QA pairs collection
        qa_pairs_collection.create_index([("interview_id", ASCENDING)])
        qa_pairs_collection.create_index([("stage", ASCENDING), ("skill_focus", ASCENDING)])
        qa_pairs_collection.create_index([("overall_grade", DESCENDING)])
        
        # Interview sessions collection
        interview_sessions_collection.create_index([("candidate_id", ASCENDING)])
        interview_sessions_collection.create_index([("status", ASCENDING), ("expires_at", ASCENDING)])
        
        # Text indexes for search
        interviews_collection.create_index([("professional_summary", TEXT), ("matching_keywords", TEXT)])
        
        print("✅ All indexes created successfully")
        
    except Exception as e:
        print(f"⚠️ Index creation warning: {e}")

# Setup indexes on import
setup_indexes()

# ===========================================
# UTILITY FUNCTIONS
# ===========================================

def _oid(v):
    """Convert to ObjectId safely"""
    if isinstance(v, ObjectId):
        return v
    try:
        return ObjectId(str(v))
    except Exception:
        return None

def validate_skill_score(score):
    """Validate skill score is in valid range"""
    try:
        score = float(score)
        return max(0, min(100, score))  # Clamp to 0-100
    except:
        return 0

def determine_skill_level(score):
    """Convert score to level consistently"""
    if score >= 90:
        return "expert"
    elif score >= 70:
        return "advanced"  
    elif score >= 40:
        return "intermediate"
    else:
        return "beginner"

def calculate_confidence_score(evidence, mention_count, skill, role):
    """Calculate AI confidence in skill assessment"""
    confidence = 0.5  # Base confidence
    
    # Boost confidence based on evidence quality
    if "detailed explanation" in evidence:
        confidence += 0.2
    if "demonstrated practical" in evidence:
        confidence += 0.2
    if mention_count >= 3:
        confidence += 0.1
    elif mention_count >= 2:
        confidence += 0.05
        
    # Reduce confidence for vague evidence
    if "briefly mentioned" in evidence:
        confidence -= 0.3
    
    return min(1.0, max(0.0, confidence))

def calculate_role_relevance(skill, category, role):
    """Calculate how relevant a skill is to the target role"""
    role_lower = role.lower()
    skill_lower = skill.lower()
    
    # Data Analyst relevance mapping
    if "data analyst" in role_lower:
        high_relevance = ["python", "sql", "r", "excel", "power bi", "tableau", "pandas", "numpy"]
        medium_relevance = ["statistics", "machine learning", "visualization", "databases"]
        
        if skill_lower in high_relevance:
            return 0.9
        elif skill_lower in medium_relevance:
            return 0.7
        elif category in ["programming_languages", "tools", "databases"]:
            return 0.6
        else:
            return 0.3
    
    return 0.5  # Default relevance

# ===========================================
# CANDIDATE MODEL
# ===========================================

class Candidate:
    """Manages candidate records"""
    
    @staticmethod
    def create_or_update(email, name, education=None, certifications=None, experience_years=None):
        """Create or update candidate record"""
        
        # Try to find existing candidate
        existing = candidates_collection.find_one({"email": email})
        
        candidate_data = {
            "name": name,
            "email": email,
            "experience_years": int(experience_years) if experience_years and str(experience_years).isdigit() else 0,
            "updated_at": datetime.utcnow()
        }
        
        if education:
            candidate_data["education"] = education
        if certifications:
            candidate_data["certifications"] = certifications
            
        if existing:
            # Update existing
            candidates_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": candidate_data}
            )
            print(f"CANDIDATE UPDATE -> {email}")
            return existing["_id"]
        else:
            # Create new
            candidate_data["created_at"] = datetime.utcnow()
            candidate_data["pii_consent"] = {
                "accepted_at": datetime.utcnow(),
                "region": "UK",
                "retention_days": 730
            }
            
            result = candidates_collection.insert_one(candidate_data)
            print(f"CANDIDATE CREATE -> {email}")
            return result.inserted_id

    @staticmethod
    def get_by_id(candidate_id):
        """Get candidate by ID"""
        oid = _oid(candidate_id)
        if not oid:
            return None
        return candidates_collection.find_one({"_id": oid})

    @staticmethod
    def get_by_email(email):
        """Get candidate by email"""
        return candidates_collection.find_one({"email": email})

# ===========================================
# SKILL ASSESSMENT MODEL  
# ===========================================

class SkillAssessment:
    """Manages individual skill assessments"""
    
    @staticmethod
    def create_assessments(interview_id, skill_ratings, role="Data Analyst"):
        """Create skill assessment records with validation"""
        if not skill_ratings:
            return []
            
        assessment_ids = []
        
        for skill_data in skill_ratings:
            skill = skill_data.get('skill', '').lower().strip()
            if not skill:
                continue
                
            # Validate and clean data
            score = validate_skill_score(skill_data.get('score', 0))
            level = determine_skill_level(score)
            evidence = skill_data.get('evidence', '')
            
            # Calculate confidence and relevance
            mention_count = len([x for x in ['mentioned', 'time(s)'] if x in evidence])
            confidence = calculate_confidence_score(evidence, mention_count, skill, role)
            relevance = calculate_role_relevance(skill, skill_data.get('category', ''), role)
            
            # Determine validation status
            validation_status = "approved"
            if confidence < 0.4 or (score > 80 and confidence < 0.6):
                validation_status = "flagged"
            elif relevance < 0.3 and score > 70:
                validation_status = "needs_review"
                
            assessment_data = {
                "interview_id": _oid(interview_id),
                "skill": skill,
                "category": skill_data.get('category', 'unknown'),
                "score": score,
                "level": level,
                "confidence": round(confidence, 2),
                "evidence_type": "detailed_explanation" if "detailed explanation" in evidence else "basic_mention",
                "evidence_text": evidence[:200],  # Limit evidence length
                "mention_count": mention_count,
                "relevance_to_role": round(relevance, 2),
                "validation_status": validation_status,
                "created_at": datetime.utcnow()
            }
            
            result = skill_assessments_collection.insert_one(assessment_data)
            assessment_ids.append(result.inserted_id)
            
        print(f"SKILL_ASSESSMENTS CREATE -> {len(assessment_ids)} skills for interview {interview_id}")
        return assessment_ids

    @staticmethod
    def get_by_interview(interview_id):
        """Get all skill assessments for an interview"""
        oid = _oid(interview_id)
        if not oid:
            return []
        return list(skill_assessments_collection.find({"interview_id": oid}))

    @staticmethod
    def get_validated_skills(interview_id):
        """Get only validated (approved) skills"""
        oid = _oid(interview_id)
        if not oid:
            return []
        return list(skill_assessments_collection.find({
            "interview_id": oid, 
            "validation_status": "approved"
        }).sort("score", -1))

# ===========================================
# QA PAIRS MODEL
# ===========================================

class QAPair:
    """Manages interview Q&A pairs"""
    
    @staticmethod
    def create_qa_pairs(interview_id, transcript):
        """Extract and save Q&A pairs from transcript"""
        if not transcript:
            return []
            
        qa_ids = []
        current_question = None
        
        for entry in transcript:
            if entry.get('role') == 'assistant' and entry.get('stage') not in ('intro', 'introduction'):
                current_question = {
                    "interview_id": _oid(interview_id),
                    "stage": entry.get('stage', 'technical'),
                    "skill_focus": entry.get('skill_focus', ''),
                    "question": entry.get('content', ''),
                    "time_limit_sec": entry.get('time_limit_sec', 120),
                    "asked_at": QAPair._parse_timestamp(entry.get('timestamp'))
                }
                
            elif entry.get('role') == 'user' and current_question:
                # Complete the Q&A pair
                current_question.update({
                    "answer": entry.get('content', ''),
                    "time_taken_sec": entry.get('time_taken_sec', 0),
                    "overall_grade": entry.get('grade', 0),
                    "answered_at": QAPair._parse_timestamp(entry.get('timestamp')),
                    "created_at": datetime.utcnow()
                })
                
                # Calculate answer quality scores
                answer_text = current_question["answer"]
                current_question["scores"] = QAPair._calculate_answer_scores(answer_text)
                current_question["answer_metrics"] = QAPair._calculate_answer_metrics(answer_text)
                
                result = qa_pairs_collection.insert_one(current_question)
                qa_ids.append(result.inserted_id)
                current_question = None
                
        print(f"QA_PAIRS CREATE -> {len(qa_ids)} pairs for interview {interview_id}")
        return qa_ids

    @staticmethod
    def _parse_timestamp(timestamp_str):
        """Parse timestamp string to datetime"""
        if not timestamp_str:
            return datetime.utcnow()
        try:
            # Handle ISO format with or without 'Z'
            if isinstance(timestamp_str, str):
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1] + '+00:00'
                return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            return timestamp_str
        except:
            return datetime.utcnow()

    @staticmethod
    def _calculate_answer_scores(answer_text):
        """Calculate answer quality scores (0-5 scale)"""
        # Basic scoring logic - can be enhanced with NLP
        word_count = len(answer_text.split())
        
        clarity = 3  # Default
        if word_count > 50:
            clarity += 1
        if any(word in answer_text.lower() for word in ['however', 'therefore', 'because', 'specifically']):
            clarity += 0.5
            
        specificity = 3  # Default  
        if any(word in answer_text.lower() for word in ['example', 'instance', 'specifically', 'particular']):
            specificity += 1
            
        technical_depth = 3  # Default
        technical_terms = ['algorithm', 'model', 'data', 'analysis', 'method', 'technique']
        technical_count = sum(1 for term in technical_terms if term in answer_text.lower())
        if technical_count >= 3:
            technical_depth += 1
            
        return {
            "clarity": min(5, clarity),
            "specificity": min(5, specificity), 
            "technical_depth": min(5, technical_depth),
            "structure": 3,  # Default - would need more complex analysis
            "impact_demonstration": 3  # Default - would need more complex analysis
        }

    @staticmethod
    def _calculate_answer_metrics(answer_text):
        """Calculate answer text metrics"""
        words = answer_text.split()
        return {
            "word_count": len(words),
            "technical_terms_used": [],  # Would extract with NLP
            "action_verbs_count": 0,     # Would count with NLP
            "passive_voice_ratio": 0.0   # Would calculate with NLP
        }

    @staticmethod
    def get_by_interview(interview_id):
        """Get all Q&A pairs for an interview"""
        oid = _oid(interview_id)
        if not oid:
            return []
        return list(qa_pairs_collection.find({"interview_id": oid}).sort("asked_at", 1))

# ===========================================
# INTERVIEW SESSION MODEL (UPDATED)
# ===========================================

class InterviewSession:
    """Manages interview sessions in MongoDB"""

    @staticmethod
    def create_session(candidate_info, initial_state):
        """Create a new interview session"""
        # Create or update candidate record first
        candidate_id = None
        if candidate_info and candidate_info.get('email'):
            candidate_id = Candidate.create_or_update(
                email=candidate_info.get('email'),
                name=candidate_info.get('name', ''),
                experience_years=candidate_info.get('experience', '0')
            )

        doc = {
            'candidate_id': candidate_id,  # Link to candidates collection
            'candidate_info': candidate_info or {},
            'state': initial_state or {},
            'status': 'in_progress',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'total_questions': 0,
            'completion_percentage': 0,
            'completed_at': None,
            'expires_at': datetime.utcnow() + timedelta(hours=2)  # Auto-expire sessions
        }

        res = interview_sessions_collection.insert_one(doc)
        out = interview_sessions_collection.find_one({'_id': res.inserted_id})
        out['_id'] = str(out['_id'])
        print("SESSION CREATE ->", DB_NAME, "interview_sessions", out['_id'])
        return out

    @staticmethod
    def update_session(session_id, state, status=None):
        """Update interview session state"""
        sid = _oid(session_id)
        if not sid:
            raise ValueError("Invalid session_id")

        # Count only non-introduction assistant questions
        q_count = len([
            t for t in state.get('transcript', [])
            if t.get('role') == 'assistant' and t.get('stage') not in ('intro', 'introduction')
        ])

        update_data = {
            'state': state,
            'updated_at': datetime.utcnow(),
            'total_questions': q_count
        }

        if status:
            update_data['status'] = status

        if status == 'completed':
            update_data['completion_percentage'] = 100
            update_data['completed_at'] = datetime.utcnow()

        doc = interview_sessions_collection.find_one_and_update(
            {'_id': sid},
            {'$set': update_data},
            return_document=ReturnDocument.AFTER
        )
        print("SESSION UPDATE ->", DB_NAME, "interview_sessions", str(sid), "status:", status or "in_progress")
        return doc

    @staticmethod
    def get_session(session_id):
        """Get interview session by ID"""
        sid = _oid(session_id)
        if not sid:
            return None
        session = interview_sessions_collection.find_one({'_id': sid})
        if session:
            session['_id'] = str(session['_id'])
        return session

# ===========================================
# MAIN INTERVIEW MODEL - UPDATED
# ===========================================

class Interview:
    """Manages completed interviews - UPDATED FOR NORMALIZED SCHEMA"""

    @staticmethod
    def save_completed_interview(session_data, summary):
        """Save completed interview using normalized schema"""
        if not session_data:
            raise ValueError("session_data required")

        print("🔍 MODELS DEBUG: Saving interview with summary keys:", list(summary.keys()))
        
        if 'enhanced_skills' in summary:
            enhanced = summary['enhanced_skills']
            print(f"✅ Enhanced skills in summary: {len(enhanced.get('verified_skills', []))} skills")
        else:
            print("❌ No enhanced_skills in summary!")

        transcript = session_data.get('state', {}).get('transcript', [])
        candidate_info = session_data.get('candidate_info', {})
        candidate_id = session_data.get('candidate_id')

        # Create or update candidate if not exists
        if not candidate_id and candidate_info.get('email'):
            candidate_id = Candidate.create_or_update(
                email=candidate_info.get('email'),
                name=candidate_info.get('name', ''),
                education=summary.get('background', {}).get('education'),
                certifications=summary.get('background', {}).get('certifications'),
                experience_years=candidate_info.get('experience', '0')
            )

        # Create main interview record - FIXED: Include enhanced_skills
        interview_data = {
            'candidate_id': candidate_id,
            'session_id': session_data['_id'],  # Keep string for UI compatibility
            'role': candidate_info.get('job_title', 'Unknown'),
            'status': 'completed',
            
            # Core Results - FIXED: Include enhanced_skills from Phase 2
            'professional_summary': summary.get('professional_summary', ''),
            'overall_rating': float(summary.get('overall_rating', 0)),
            'competency_scores': summary.get('competency_scores', {}),
            
            # 🔧 PHASE 2 FIX: Add enhanced_skills field
            'enhanced_skills': summary.get('enhanced_skills', {}),
            
            # Business Intelligence Fields
            'strengths': summary.get('strengths', [])[:5],  # Limit to top 5
            'areas_for_improvement': summary.get('areas_for_improvement', [])[:3],  # Limit to top 3
            'matching_keywords': summary.get('matching_keywords', [])[:15],  # Limit keywords
            
            # Metadata & Versioning
            'pipeline_version': "v1.4.0",
            'model_version': "gpt-4o-mini-2025-08", 
            'scoring_rubric_version': "genhr_v1.0",
            
            # Timing
            'interview_duration_minutes': len([t for t in transcript if t.get('role') == 'assistant' and t.get('stage') != 'introduction']) * 2,
            'created_at': session_data.get('created_at', datetime.utcnow()),
            'completed_at': datetime.utcnow(),
            
            # Recruiter fields
            'recruiter_viewed': False,
            'recruiter_notes': '',
            'recruiter_card': f"{candidate_info.get('name', 'Candidate')} • {candidate_info.get('job_title', 'Role')} • {', '.join(summary.get('strengths', [])[:3])} • {int(summary.get('overall_rating', 0))}/100"
        }

        print("🔍 MODELS DEBUG: Final doc keys being saved:", list(interview_data.keys()))
        if 'enhanced_skills' in interview_data:
            print("✅ enhanced_skills will be saved")
        else:
            print("❌ enhanced_skills missing from final doc!")

        # Insert main interview record
        interview_result = interviews_collection.insert_one(interview_data)
        interview_id = interview_result.inserted_id
        print(f"INTERVIEW CREATE -> {interview_id}")

        # Create skill assessments (separate collection)
        skill_ratings = summary.get('skill_ratings', [])
        if skill_ratings:
            SkillAssessment.create_assessments(
                interview_id, 
                skill_ratings, 
                candidate_info.get('job_title', 'Data Analyst')
            )

        # Create Q&A pairs (separate collection)  
        if transcript:
            QAPair.create_qa_pairs(interview_id, transcript)

        print(f"FINALIZE COMPLETE -> Interview {interview_id} saved with normalized schema")
        return str(interview_id)

    @staticmethod
    def get_interviews_for_role(job_title=None, limit=50):
        """Get completed interviews with candidate info (for recruiters)"""
        query = {'status': 'completed'}
        if job_title:
            query['role'] = {'$regex': job_title, '$options': 'i'}

        interviews = list(
            interviews_collection.find(query).sort('completed_at', -1).limit(int(limit))
        )
        
        # Enrich with candidate data
        for interview in interviews:
            interview['_id'] = str(interview['_id'])
            
            # Get candidate info
            if interview.get('candidate_id'):
                candidate = Candidate.get_by_id(interview['candidate_id'])
                if candidate:
                    interview['candidate_info'] = {
                        'name': candidate.get('name'),
                        'email': candidate.get('email'),
                        'education': candidate.get('education'),
                        'experience_years': candidate.get('experience_years')
                    }

        return interviews

    @staticmethod
    def get_interview_details(interview_id):
        """Get full interview details with skills and Q&A"""
        oid = _oid(interview_id)
        if not oid:
            return None
            
        # Get main interview
        interview = interviews_collection.find_one({'_id': oid})
        if not interview:
            return None
            
        interview['_id'] = str(interview['_id'])
        
        # Get candidate info
        if interview.get('candidate_id'):
            candidate = Candidate.get_by_id(interview['candidate_id'])
            if candidate:
                interview['candidate_info'] = {
                    'name': candidate.get('name'),
                    'email': candidate.get('email'),
                    'education': candidate.get('education'),
                    'certifications': candidate.get('certifications'),
                    'experience_years': candidate.get('experience_years')
                }

        # Get skill assessments
        skills = SkillAssessment.get_validated_skills(oid)
        interview['skill_assessments'] = skills
        
        # Get Q&A pairs
        qa_pairs = QAPair.get_by_interview(oid)
        interview['qa_pairs'] = qa_pairs
        
        # Mark as viewed by recruiter
        interviews_collection.update_one(
            {'_id': oid},
            {'$set': {'recruiter_viewed': True, 'viewed_at': datetime.utcnow()}}
        )
        
        return interview

    @staticmethod  
    def get_candidate_skills_summary(candidate_id):
        """Get aggregated skills across all interviews for a candidate"""
        oid = _oid(candidate_id)
        if not oid:
            return {}
            
        # Get all interviews for this candidate
        interviews = list(interviews_collection.find({'candidate_id': oid}))
        if not interviews:
            return {}
            
        # Aggregate skills from all interviews
        all_skills = {}
        for interview in interviews:
            interview_skills = SkillAssessment.get_validated_skills(interview['_id'])
            for skill in interview_skills:
                skill_name = skill['skill']
                if skill_name not in all_skills or skill['score'] > all_skills[skill_name]['score']:
                    all_skills[skill_name] = skill
                    
        return {
            'candidate_id': str(candidate_id),
            'total_interviews': len(interviews),
            'unique_skills': len(all_skills),
            'top_skills': sorted(all_skills.values(), key=lambda x: x['score'], reverse=True)[:10],
            'latest_interview': max(interviews, key=lambda x: x['completed_at'])['completed_at'] if interviews else None
        }