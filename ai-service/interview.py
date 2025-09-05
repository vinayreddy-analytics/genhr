# interview.py - COMPLETE FILE UPDATED FOR NORMALIZED SCHEMA
from openai import OpenAI
import os
import json
import random
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
import re

load_dotenv()

# Set up OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# ===========================================
# DATA QUALITY VALIDATION
# ===========================================

def validate_skill_name(skill_name, role="Data Analyst"):
    """Validate and filter skills based on role relevance"""
    
    # Define role-specific skill whitelists
    ROLE_SKILLS = {
        "data_analyst": {
            "programming_languages": ["python", "r", "sql", "javascript", "matlab"],
            "tools": ["excel", "power bi", "tableau", "jupyter", "git"],
            "databases": ["mysql", "postgresql", "mongodb", "sqlite", "oracle"],
            "frameworks": ["pandas", "numpy", "scikit-learn", "matplotlib", "seaborn"],
            "concepts": ["statistics", "machine learning", "data visualization", "etl", "reporting"]
        },
        "software_developer": {
            "programming_languages": ["python", "javascript", "java", "c++", "typescript", "go", "rust"],
            "tools": ["git", "docker", "kubernetes", "jenkins", "postman"],
            "databases": ["mysql", "postgresql", "mongodb", "redis", "elasticsearch"],
            "frameworks": ["react", "angular", "vue", "django", "flask", "spring", "express"],
            "concepts": ["algorithms", "data structures", "system design", "testing", "debugging"]
        }
    }
    
    role_key = role.lower().replace(" ", "_").replace("-", "_")
    if "data" in role_key and "analyst" in role_key:
        role_key = "data_analyst"
    elif "software" in role_key or "developer" in role_key:
        role_key = "software_developer"
    else:
        role_key = "data_analyst"  # Default
    
    skill_lower = skill_name.lower().strip()
    role_skills = ROLE_SKILLS.get(role_key, ROLE_SKILLS["data_analyst"])
    
    # Check if skill is in any category for this role
    for category, skills in role_skills.items():
        if skill_lower in skills:
            return True, category
    
    # If not found, mark as needs review
    return False, "unknown"

def clean_skill_data(skill_ratings, role="Data Analyst"):
    """Clean and validate skill ratings data"""
    cleaned_skills = []
    
    for skill_data in skill_ratings:
        skill_name = skill_data.get('skill', '').strip()
        if not skill_name:
            continue
            
        # Validate skill relevance
        is_valid, category = validate_skill_name(skill_name, role)
        
        # Clean score
        score = skill_data.get('score', 0)
        try:
            score = float(score)
            score = max(0, min(100, score))  # Clamp to 0-100
        except:
            score = 0
            
        # Determine level consistently  
        if score >= 90:
            level = "expert"
        elif score >= 70:
            level = "advanced"
        elif score >= 40:
            level = "intermediate"
        else:
            level = "beginner"
        
        cleaned_skill = {
            'skill': skill_name.lower(),
            'category': category if is_valid else 'unknown',
            'score': score,
            'level': level,
            'evidence': skill_data.get('evidence', '')[:200],  # Limit evidence length
            'validation_status': 'approved' if is_valid else 'needs_review'
        }
        
        cleaned_skills.append(cleaned_skill)
    
    return cleaned_skills

# ===========================================
# ENHANCED SKILL EXTRACTION
# ===========================================

def extract_skills_from_text(text, context_type='introduction'):
    """Extract specific skills mentioned in text with better validation"""
    skills_found = {
        'programming_languages': [],
        'frameworks': [],
        'databases': [],
        'ml_ai_tools': [],
        'cloud_platforms': [],
        'tools': [],
        'concepts': []
    }
    
    # Enhanced skill patterns with better detection
    skill_patterns = {
        'programming_languages': [
            'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 
            'typescript', 'kotlin', 'swift', 'php', 'matlab', 'scala', 'sql'
        ],
        'frameworks': [
            'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'express',
            'spring', 'rails', 'laravel', 'next.js', 'nest.js', '.net', 'tensorflow',
            'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy'
        ],
        'databases': [
            'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'dynamodb',
            'elasticsearch', 'oracle', 'sql server', 'sqlite', 'neo4j'
        ],
        'ml_ai_tools': [
            'pandas', 'numpy', 'opencv', 'nltk', 'spacy', 'hugging face',
            'langchain', 'llamaindex', 'transformers', 'bert', 'gpt'
        ],
        'cloud_platforms': [
            'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify'
        ],
        'tools': [
            'git', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible',
            'jira', 'confluence', 'postman', 'swagger', 'grafana', 'power bi',
            'tableau', 'excel', 'jupyter'
        ]
    }
    
    # Enhanced concept patterns
    concept_patterns = {
        'machine_learning': ['machine learning', 'ml', 'supervised', 'unsupervised', 'deep learning'],
        'data_visualization': ['visualization', 'charts', 'graphs', 'dashboards', 'reporting'],
        'statistics': ['statistics', 'statistical', 'regression', 'correlation', 'hypothesis'],
        'etl': ['etl', 'data pipeline', 'data processing', 'data cleaning'],
        'model_evaluation': ['precision', 'recall', 'f1', 'accuracy', 'roc', 'auc', 'cross validation'],
        'clustering': ['clustering', 'k-means', 'hierarchical', 'dbscan'],
        'optimization': ['optimization', 'performance tuning', 'efficiency'],
        'system_design': ['architecture', 'scalability', 'microservices', 'api design']
    }
    
    text_lower = text.lower()
    
    # Special handling for R language (single letter)
    if re.search(r'\bR\b', text, re.IGNORECASE):
        skills_found['programming_languages'].append('r')
    
    # Extract technical skills with word boundaries
    for category, patterns in skill_patterns.items():
        for pattern in patterns:
            if pattern == 'R':  # Skip R here as we handled it above
                continue
            # Use word boundaries for better matching
            if re.search(rf'\b{re.escape(pattern)}\b', text_lower):
                skills_found[category].append(pattern)
    
    # Extract concepts with context awareness
    for concept, indicators in concept_patterns.items():
        match_count = sum(1 for indicator in indicators if indicator in text_lower)
        if match_count > 0:
            skills_found['concepts'].append(concept)
    
    # Remove duplicates while preserving order
    for category in skills_found:
        skills_found[category] = list(dict.fromkeys(skills_found[category]))
    
    return skills_found

def rate_skill_proficiency(skill, skill_category, full_transcript):
    """Enhanced skill rating with confidence scoring"""
    skill_lower = skill.lower()
    
    # Analyze mentions across transcript
    mentions = 0
    context_quality = []
    
    for entry in full_transcript:
        if entry.get('role') == 'user':
            content_lower = entry.get('content', '').lower()
            
            if skill_lower in content_lower:
                mentions += 1
                
                # Analyze context around mentions
                sentences = content_lower.split('.')
                for sentence in sentences:
                    if skill_lower in sentence:
                        word_count = len(sentence.split())
                        
                        # Quality indicators
                        quality_score = 0
                        if word_count > 15:  # Detailed explanation
                            quality_score += 2
                        if any(word in sentence for word in ['implemented', 'built', 'developed', 'created', 'designed']):
                            quality_score += 2  # Practical usage
                        if any(word in sentence for word in ['optimized', 'scaled', 'improved', 'enhanced']):
                            quality_score += 1  # Advanced usage
                        if any(word in sentence for word in ['problem', 'challenge', 'solution']):
                            quality_score += 1  # Problem-solving context
                        
                        context_quality.append(quality_score)
    
    # Calculate base score
    base_score = 30  # Minimum for any mention
    
    # Mention frequency bonus
    if mentions >= 3:
        base_score += 25
    elif mentions >= 2:
        base_score += 15
    elif mentions >= 1:
        base_score += 10
    
    # Context quality bonus
    avg_quality = sum(context_quality) / len(context_quality) if context_quality else 0
    base_score += min(35, avg_quality * 8)
    
    # Category-specific adjustments
    if skill_category in ['programming_languages', 'databases']:
        base_score += 5  # Core skills get slight boost
    elif skill_category == 'concepts':
        base_score -= 5   # Concepts are harder to demonstrate
    
    # Final score
    score = min(100, base_score)
    
    # Determine level
    if score >= 90:
        level = 'expert'
    elif score >= 70:
        level = 'advanced'
    elif score >= 55:
        level = 'intermediate'
    else:
        level = 'beginner'
    
    # Generate evidence
    evidence_parts = []
    if mentions > 0:
        evidence_parts.append(f"mentioned {mentions} time(s)")
    if avg_quality >= 2:
        evidence_parts.append("provided detailed explanation")
    if any(q >= 2 for q in context_quality):
        evidence_parts.append("demonstrated practical usage")
    if any(q >= 4 for q in context_quality):
        evidence_parts.append("showed advanced implementation")
    
    evidence = "; ".join(evidence_parts) if evidence_parts else "briefly mentioned"
    
    return score, level, evidence

def calculate_competency_scores(transcript, extracted_skills):
    """Calculate radar chart competency scores with better calibration"""
    competencies = {
        'technical_skills': 0,
        'problem_solving': 0,
        'communication': 0,
        'domain_knowledge': 0,
        'project_experience': 0
    }
    
    # Technical Skills - based on skill diversity and depth
    total_skills = sum(len(skills) for skills in extracted_skills.values())
    unique_categories = sum(1 for skills in extracted_skills.values() if len(skills) > 0)
    
    technical_base = min(85, 40 + (total_skills * 3) + (unique_categories * 5))
    competencies['technical_skills'] = technical_base
    
    # Problem Solving - enhanced detection
    problem_indicators = [
        'solved', 'challenge', 'approach', 'solution', 'debugged', 'optimized', 
        'improved', 'fixed', 'resolved', 'methodology', 'strategy', 'troubleshoot'
    ]
    
    ps_score = 0
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            for indicator in problem_indicators:
                if indicator in content:
                    ps_score += 1
    
    competencies['problem_solving'] = min(90, 35 + (ps_score * 4))
    
    # Communication - based on answer structure and clarity
    user_answers = [entry for entry in transcript if entry.get('role') == 'user']
    if user_answers:
        total_words = sum(len(entry.get('content', '').split()) for entry in user_answers)
        avg_answer_length = total_words / len(user_answers)
        
        # Structure indicators
        structure_score = 0
        for entry in user_answers:
            content = entry.get('content', '')
            if any(word in content.lower() for word in ['first', 'second', 'then', 'next', 'finally']):
                structure_score += 1
            if any(word in content.lower() for word in ['example', 'instance', 'specifically']):
                structure_score += 1
        
        communication_base = min(85, 50 + (avg_answer_length / 10) + (structure_score * 3))
        competencies['communication'] = communication_base
    else:
        competencies['communication'] = 50
    
    # Domain Knowledge - based on concepts and advanced terminology
    domain_indicators = ['architecture', 'scalability', 'best practices', 'methodology', 'framework']
    concept_count = len(extracted_skills.get('concepts', []))
    
    domain_score = 0
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            domain_score += sum(1 for indicator in domain_indicators if indicator in content)
    
    competencies['domain_knowledge'] = min(85, 40 + (concept_count * 8) + (domain_score * 3))
    
    # Project Experience - look for project and team indicators
    project_indicators = [
        'project', 'built', 'developed', 'launched', 'production', 'deployed',
        'team', 'collaborated', 'managed', 'led', 'worked with'
    ]
    
    project_score = 0
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            project_score += sum(1 for indicator in project_indicators if indicator in content)
    
    competencies['project_experience'] = min(85, 35 + (project_score * 3))
    
    return competencies

def generate_professional_summary(candidate_name, job_title, extracted_skills, competencies, transcript):
    """Generate professional summary with better context awareness"""
    
    # Extract key information
    all_skills = []
    for category, skills in extracted_skills.items():
        all_skills.extend(skills)
    
    top_skills = sorted(all_skills, key=lambda x: len([e for e in transcript 
                       if e.get('role') == 'user' and x in e.get('content', '').lower()]), 
                       reverse=True)[:8]
    
    # Get introduction for context
    introduction = ""
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '')
            if len(content) > 100:  # Likely the introduction
                introduction = content[:300]
                break
    
    prompt = f"""
    Generate a professional summary for a {job_title} candidate based on their interview performance.
    
    Candidate: {candidate_name}
    Role: {job_title}
    
    Demonstrated Skills: {', '.join(top_skills)}
    
    Competency Scores:
    - Technical Skills: {competencies['technical_skills']}/100
    - Problem Solving: {competencies['problem_solving']}/100  
    - Communication: {competencies['communication']}/100
    - Domain Knowledge: {competencies['domain_knowledge']}/100
    - Project Experience: {competencies['project_experience']}/100
    
    Introduction Context: {introduction}
    
    Requirements:
    1. 5-6 lines maximum
    2. Start with "{candidate_name} is a {job_title} with..."
    3. Highlight 3-4 strongest technical skills specifically
    4. Mention their competency level (junior/mid/senior based on scores)
    5. Include one standout achievement or strength from the interview
    6. End with their potential value proposition
    7. Be specific about technologies, not generic
    
    Write in professional, confident tone. Avoid buzzwords like "passionate" or "driven".
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional technical recruiter writing candidate summaries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=200
        )
        
        summary = response.choices[0].message.content.strip()
        
        # Ensure it's not too long
        lines = summary.split('\n')
        if len(lines) > 6:
            summary = '\n'.join(lines[:6])
            
        return summary
        
    except Exception as e:
        print(f"Error generating summary: {e}")
        # Enhanced fallback
        competency_level = "senior" if competencies['technical_skills'] >= 80 else "mid-level" if competencies['technical_skills'] >= 60 else "junior"
        
        return f"""{candidate_name} is a {competency_level} {job_title} with demonstrated expertise in {', '.join(top_skills[:3])}.
Shows strong technical proficiency with {competencies['technical_skills']}/100 competency score in core technologies.
Exhibits solid problem-solving abilities ({competencies['problem_solving']}/100) and effective communication skills ({competencies['communication']}/100).
Has practical experience implementing solutions and working with modern development frameworks.
Demonstrates {competencies['domain_knowledge']}/100 domain knowledge and {competencies['project_experience']}/100 project experience.
Well-positioned to contribute effectively in {job_title} roles requiring technical depth and practical application."""

def experience_to_level(experience_years):
    """Convert numeric experience to skill level"""
    try:
        years = float(experience_years)
        if years < 1:
            return "basic"
        elif years <= 2:
            return "intermediate"
        elif years <= 5:
            return "advanced"
        else:
            return "expert"
    except (ValueError, TypeError):
        return "basic"

ROLES_PATH = Path(__file__).with_name("roles.json")

def load_available_roles():
    """Load job roles from roles.json with clear errors"""
    try:
        with ROLES_PATH.open("r", encoding="utf-8") as f:
            roles = json.load(f)
        if not isinstance(roles, dict) or not roles:
            raise ValueError("roles.json is empty or not a JSON object")
        return roles
    except Exception as e:
        print(f"[roles] Failed to load roles.json: {e} -- path={ROLES_PATH.resolve()}")
        return {}

def get_role_key(job_title):
    """Map job title to role key"""
    job_title_lower = job_title.lower().replace(" ", "_").replace("-", "_")
    
    role_mappings = {
        "data_analyst": "data_analyst",
        "data_scientist": "data_analyst", 
        "business_analyst": "data_analyst",
        "software_developer": "software_developer",
        "frontend_developer": "frontend_developer",
        "backend_developer": "software_developer",
        "full_stack_developer": "software_developer",
        "data_engineer": "data_engineer",
        "digital_marketer": "digital_marketer"
    }
    
    return role_mappings.get(job_title_lower, "data_analyst")

def safe_json_parse(text, fallback):
    """Enhanced JSON parsing with multiple cleaning strategies"""
    try:
        # Clean the text - remove markdown formatting and extra text
        cleaned = text.strip()
        
        # Remove markdown code blocks
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        
        # Remove any text before the first {
        start_brace = cleaned.find('{')
        if start_brace != -1:
            cleaned = cleaned[start_brace:]
        
        # Remove any text after the last }
        end_brace = cleaned.rfind('}')
        if end_brace != -1:
            cleaned = cleaned[:end_brace + 1]
        
        cleaned = cleaned.strip()
        
        # Try to parse
        parsed = json.loads(cleaned)
        return parsed
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"JSON parsing failed: {e}")
        print(f"Raw text (first 200 chars): {text[:200]}...")
        return fallback

def calculate_question_timers(level, stage):
    """Calculate time limits for each question based on difficulty level and stage"""
    # Time mapping in seconds
    time_mapping = {
        "intro": 300,  # 5 minutes for introduction
        "basic": {"technical": 90, "behavioral": 120, "scenario": 105},
        "intermediate": {"technical": 105, "behavioral": 120, "scenario": 120}, 
        "expert": {"technical": 120, "behavioral": 120, "scenario": 135}
    }
    
    if stage == "intro":
        return time_mapping["intro"]
    
    stage_key = stage if stage in ["technical", "behavioral", "scenario"] else "technical"
    return time_mapping.get(level, time_mapping["intermediate"])[stage_key]

def evaluate_answer_llm(answer, question_data, time_taken_sec=0):
    """LLM-based grading of candidate answer against rubric"""
    try:
        rubric = question_data.get('rubric', {})
        expected_points = rubric.get('expected_points', [])
        keywords = rubric.get('keywords', [])
        common_mistakes = rubric.get('common_mistakes', [])
        time_limit = question_data.get('time_limit_sec', 120)
        
        # Enhanced grading prompt with rubric-based evaluation
        system_prompt = f"""
        You are an expert hiring manager evaluating a candidate's interview answer.
        
        QUESTION: {question_data.get('question', '')}
        SKILL FOCUS: {question_data.get('skill_focus', '')}
        
        RUBRIC FOR EVALUATION:
        Expected Points (strong answer should include):
        {chr(10).join([f"- {point}" for point in expected_points])}
        
        Keywords to listen for: {', '.join(keywords)}
        Common mistakes to watch for: {', '.join(common_mistakes)}
        
        CANDIDATE'S ANSWER: "{answer}"
        
        EVALUATION CRITERIA (0-100 scale each):
        - Correctness: Technical accuracy, factual correctness
        - Completeness: Addresses all aspects, covers expected points
        - Clarity: Clear communication, well-structured explanation
        - Relevance: Practical examples, directly answers the question
        
        GRADING INSTRUCTIONS:
        - Compare answer to expected points in rubric
        - Check for keywords and technical accuracy
        - Note any common mistakes made
        - Score honestly - don't inflate scores
        - Provide 2-3 short notes like a real hiring manager would
        
        OUTPUT ONLY VALID JSON. No text before or after JSON.
        
        EXACT JSON SCHEMA:
        {{
            "correctness": 85,
            "completeness": 78,
            "clarity": 92,
            "relevance": 80,
            "notes": [
                "Shows good understanding of core concepts",
                "Could have provided a more specific example",
                "Clear communication style"
            ],
            "off_topic": false,
            "hand_wavey": false,
            "rubric_points_covered": 3,
            "keywords_mentioned": 2,
            "common_mistakes_made": 0
        }}
        """
        
        # Call OpenAI for grading
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Grade this answer against the rubric"}
            ],
            temperature=0.1,  # Low temperature for consistent grading
            max_tokens=400
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Fallback grading based on answer length and basic heuristics
        fallback_grades = {
            "correctness": min(85, max(40, len(answer.split()) * 3)),
            "completeness": min(80, max(35, len(answer.split()) * 2.5)),
            "clarity": min(90, max(50, 100 - (answer.count('um') + answer.count('uh')) * 10)),
            "relevance": min(85, max(45, 70 + (len([kw for kw in keywords if kw.lower() in answer.lower()]) * 5))),
            "notes": [
                "Answer provided with reasonable length",
                "Shows attempt to address the question",
                "Could benefit from more specific examples"
            ],
            "off_topic": len(answer.split()) < 5,
            "hand_wavey": answer.lower().count('maybe') + answer.lower().count('probably') > 2,
            "rubric_points_covered": min(len(expected_points), max(1, len(answer.split()) // 15)),
            "keywords_mentioned": len([kw for kw in keywords if kw.lower() in answer.lower()]),
            "common_mistakes_made": 0
        }
        
        # Parse with fallback
        grades = safe_json_parse(response_text, fallback_grades)
        
        # Ensure all scores are 0-100 and required fields exist
        for key in ["correctness", "completeness", "clarity", "relevance"]:
            if key not in grades:
                grades[key] = fallback_grades[key]
            grades[key] = max(0, min(100, int(grades[key])))
        
        # Apply timing penalty to correctness only
        if time_taken_sec > time_limit:
            penalty = min(10, ((time_taken_sec - time_limit) / time_limit) * 10)
            grades["correctness"] = max(0, grades["correctness"] - penalty)
            grades["timing_penalty_applied"] = penalty
        else:
            grades["timing_penalty_applied"] = 0
        
        # Ensure other required fields
        if "notes" not in grades or not grades["notes"]:
            grades["notes"] = fallback_grades["notes"]
        if "off_topic" not in grades:
            grades["off_topic"] = fallback_grades["off_topic"]
        if "hand_wavey" not in grades:
            grades["hand_wavey"] = fallback_grades["hand_wavey"]
        
        return grades
        
    except Exception as e:
        print(f"LLM grading error: {str(e)}")
        # Return basic fallback scores
        return {
            "correctness": 70,
            "completeness": 65,
            "clarity": 75,
            "relevance": 70,
            "notes": ["Answer evaluated with basic scoring due to technical issue"],
            "off_topic": False,
            "hand_wavey": False,
            "timing_penalty_applied": 0,
            "rubric_points_covered": 1,
            "keywords_mentioned": 0,
            "common_mistakes_made": 0
        }

def determine_next_difficulty(correctness_score):
    """Determine next question difficulty based on correctness score"""
    if correctness_score >= 80:
        return "harder"
    elif correctness_score <= 50:
        return "easier"
    else:
        return "same"

def _rollup_scores(transcript):
    """Calculate final scores from all graded answers in transcript"""
    try:
        graded_answers = []
        skill_scores = {}
        
        # Extract all graded answers from transcript
        for entry in transcript:
            if entry.get('role') == 'user' and entry.get('grades'):
                graded_answers.append(entry)
                
                # Track skill-specific scores
                skill_focus = entry.get('question_data', {}).get('skill_focus', 'General')
                if skill_focus not in skill_scores:
                    skill_scores[skill_focus] = []
                
                grades = entry['grades']
                # Average the four dimensions for this skill
                avg_score = (grades['correctness'] + grades['completeness'] + 
                           grades['clarity'] + grades['relevance']) / 4
                skill_scores[skill_focus].append(avg_score)
        
        if not graded_answers:
            return {
                "overall_score": 70,
                "dimension_averages": {"correctness": 70, "completeness": 70, "clarity": 70, "relevance": 70},
                "computed_skill_scores": {"General": 70},
                "total_questions": 0
            }
        
        # Calculate dimension averages
        dimension_totals = {"correctness": 0, "completeness": 0, "clarity": 0, "relevance": 0}
        for answer in graded_answers:
            grades = answer['grades']
            for dim in dimension_totals:
                dimension_totals[dim] += grades.get(dim, 0)
        
        dimension_averages = {dim: total / len(graded_answers) for dim, total in dimension_totals.items()}
        
        # Calculate weighted overall score
        overall_score = (
            dimension_averages['correctness'] * 0.40 +
            dimension_averages['completeness'] * 0.25 +
            dimension_averages['clarity'] * 0.20 +
            dimension_averages['relevance'] * 0.15
        )
        
        # Calculate skill-specific scores
        computed_skill_scores = {}
        for skill, scores in skill_scores.items():
            computed_skill_scores[skill] = sum(scores) / len(scores)
        
        return {
            "overall_score": round(overall_score, 1),
            "dimension_averages": {k: round(v, 1) for k, v in dimension_averages.items()},
            "computed_skill_scores": {k: round(v, 1) for k, v in computed_skill_scores.items()},
            "total_questions": len(graded_answers)
        }
        
    except Exception as e:
        print(f"Score rollup error: {str(e)}")
        return {
            "overall_score": 70,
            "dimension_averages": {"correctness": 70, "completeness": 70, "clarity": 70, "relevance": 70},
            "computed_skill_scores": {"General": 70},
            "total_questions": 0
        }

def conduct_interview(candidate_info):
    """Enhanced interview generation with rubrics and human-style grading"""
    try:
        # Extract candidate information
        skills = candidate_info.get('skills', 'General skills')
        experience = candidate_info.get('experience', '0')
        job_title = candidate_info.get('job_title', 'Software Developer')
        
        # Determine experience level
        level = experience_to_level(experience)
        
        # Load role information
        roles = load_available_roles()
        role_key = get_role_key(job_title)
        role_info = roles.get(role_key, {})
        
        # Get role-specific skills
        core_skills = role_info.get('core_skills', ['Technical Skills'])
        
        # Enhanced system prompt with rubric requirements
        system_prompt = f"""
        You are an expert technical recruiter creating an interview with detailed rubrics for a {level} level {job_title} candidate.
        
        CANDIDATE PROFILE:
        - Role: {job_title}
        - Experience Level: {level} ({experience} years)
        - Skills: {skills}
        - Core Role Skills: {', '.join(core_skills[:5])}
        
        REQUIREMENTS:
        1. Generate exactly 4 questions: 3 technical + 1 behavioral
        2. Questions must match {level} difficulty level
        3. Each question needs a detailed rubric for human-style grading
        4. Focus on practical scenarios from their skill set
        5. Include specific timing for each question
        
        RUBRIC REQUIREMENTS for each question:
        - expected_points: 3-6 short bullets of what a strong answer should include
        - keywords: 3-5 technical terms to listen for (optional)
        - common_mistakes: 2-4 pitfalls candidates often make (optional)
        
        TIME ALLOCATIONS:
        - Technical questions: {calculate_question_timers(level, 'technical')} seconds each
        - Behavioral questions: {calculate_question_timers(level, 'behavioral')} seconds each
        
        OUTPUT REQUIREMENTS:
        - Return ONLY valid JSON
        - No text before or after JSON
        - Follow exact schema below
        
        EXACT JSON SCHEMA:
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "specific technical question here",
                    "skill_focus": "one of: {', '.join(core_skills[:3])}",
                    "topic_tag": "short-tag-like-sql-joins",
                    "stage": "technical",
                    "difficulty_next": "same",
                    "next": "continue",
                    "time_limit_sec": {calculate_question_timers(level, 'technical')},
                    "rubric": {{
                        "expected_points": [
                            "Should explain core concept clearly",
                            "Must provide practical example",
                            "Should mention best practices"
                        ],
                        "keywords": ["keyword1", "keyword2", "keyword3"],
                        "common_mistakes": [
                            "Not considering edge cases",
                            "Overly theoretical without examples"
                        ]
                    }}
                }}
            ],
            "interview_context": "Technical assessment for {level} level {job_title}",
            "introduction_time_sec": {calculate_question_timers(level, 'intro')},
            "interview_total_time_estimate": {calculate_question_timers(level, 'intro') + (3 * calculate_question_timers(level, 'technical')) + calculate_question_timers(level, 'behavioral')},
            "experience_level": "{level}",
            "grading_instructions": {{
                "rubric_based": true,
                "dimensions": ["correctness", "completeness", "clarity", "relevance"],
                "timing_penalty_max": 10,
                "difficulty_adaptation": true
            }}
        }}
        """
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate {level}-level interview with detailed rubrics for {job_title} candidate"}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Enhanced fallback with proper rubrics
        fallback_interview = {
            "questions": [
                {
                    "id": 1,
                    "question": f"Describe your experience with {core_skills[0] if core_skills else 'technical skills'} and how you've applied it in projects",
                    "skill_focus": core_skills[0] if core_skills else "Technical Skills",
                    "topic_tag": "experience-application",
                    "stage": "technical",
                    "difficulty_next": "same",
                    "next": "continue",
                    "time_limit_sec": calculate_question_timers(level, 'technical'),
                    "rubric": {
                        "expected_points": [
                            "Should provide specific examples from real projects",
                            "Must explain technical approach used",
                            "Should mention challenges overcome"
                        ],
                        "keywords": [core_skills[0] if core_skills else "technical", "project", "implementation"],
                        "common_mistakes": [
                            "Being too vague about technical details",
                            "Not providing concrete examples"
                        ]
                    }
                }
            ],
            "interview_context": f"Technical assessment for {level} level {job_title}",
            "introduction_time_sec": calculate_question_timers(level, 'intro'),
            "interview_total_time_estimate": calculate_question_timers(level, 'intro') + (3 * calculate_question_timers(level, 'technical')) + calculate_question_timers(level, 'behavioral'),
            "experience_level": level,
            "grading_instructions": {
                "rubric_based": True,
                "dimensions": ["correctness", "completeness", "clarity", "relevance"],
                "timing_penalty_max": 10,
                "difficulty_adaptation": True
            }
        }
        
        # Parse with enhanced fallback
        interview_data = safe_json_parse(response_text, fallback_interview)
        
        # Validate and ensure required fields
        if not interview_data.get('questions') or len(interview_data['questions']) < 3:
            print("Invalid questions format, using fallback")
            return fallback_interview
        
        # Ensure all questions have required rubric structure
        for question in interview_data['questions']:
            if 'rubric' not in question or not question['rubric']:
                question['rubric'] = {
                    "expected_points": ["Should provide clear explanation", "Must include relevant examples"],
                    "keywords": ["technical", "practical"],
                    "common_mistakes": ["Being too vague"]
                }
            
        return interview_data
        
    except Exception as e:
        print(f"Interview generation error: {str(e)}")
        raise Exception(f"Failed to generate interview questions: {str(e)}")

def start_skill_assessment(answers, candidate_info):
    """Enhanced skill assessment with rubric-based grading and rollup scores"""
    try:
        # Grade each answer using LLM evaluation
        graded_answers = []
        
        for answer_data in answers:
            # Extract question and answer information
            question = answer_data.get('question', '')
            answer = answer_data.get('answer', '')
            time_taken = answer_data.get('time_taken_sec', 0)
            
            # Create question data structure for grading
            question_data = {
                'question': question,
                'skill_focus': answer_data.get('skill_focus', 'General'),
                'time_limit_sec': answer_data.get('time_limit_sec', 120),
                'rubric': answer_data.get('rubric', {
                    'expected_points': ['Should provide clear explanation'],
                    'keywords': ['relevant', 'practical'],
                    'common_mistakes': ['Being too vague']
                })
            }
            
            # Grade the answer
            grades = evaluate_answer_llm(answer, question_data, time_taken)
            
            graded_answers.append({
                'question': question,
                'answer': answer,
                'grades': grades,
                'question_data': question_data,
                'time_taken_sec': time_taken
            })
        
        # Calculate rollup scores
        rollup_data = _rollup_scores(graded_answers)
        
        # Extract detailed feedback from graded answers
        all_notes = []
        strengths = []
        improvements = []
        
        for graded in graded_answers:
            notes = graded['grades'].get('notes', [])
            all_notes.extend(notes)
            
            # Extract strengths and improvements based on scores
            grades = graded['grades']
            if grades['correctness'] >= 80:
                strengths.append(f"Strong {graded['question_data']['skill_focus']} knowledge")
            if grades['clarity'] >= 85:
                strengths.append("Clear communication style")
            if grades['off_topic']:
                improvements.append("Stay focused on the specific question asked")
            if grades['hand_wavey']:
                improvements.append("Provide more specific and concrete examples")
        
        # Remove duplicates and limit length
        strengths = list(set(strengths))[:4]
        improvements = list(set(improvements))[:4]
        
        if not strengths:
            strengths = ["Shows understanding of core concepts", "Completed all questions"]
        if not improvements:
            improvements = ["Continue developing technical depth", "Practice providing more specific examples"]
        
        # Build comprehensive assessment result
        assessment_result = {
            "overall_score": rollup_data["overall_score"],
            "skill_scores": rollup_data["computed_skill_scores"],
            "scoring_breakdown": rollup_data["dimension_averages"],
            "timing_performance": {
                "questions_graded": len(graded_answers),
                "timing_penalties_applied": sum(1 for g in graded_answers if g['grades'].get('timing_penalty_applied', 0) > 0),
                "average_timing_penalty": sum(g['grades'].get('timing_penalty_applied', 0) for g in graded_answers) / len(graded_answers) if graded_answers else 0
            },
            "strengths": strengths,
            "improvements": improvements,
            "detailed_feedback": {
                "technical": f"Demonstrates {candidate_info.get('experience', '0')} years level understanding with room for growth",
                "communication": "Shows ability to articulate concepts" if rollup_data["dimension_averages"]["clarity"] >= 70 else "Could improve clarity of explanations",
                "rubric_analysis": f"Covered {sum(g['grades'].get('rubric_points_covered', 0) for g in graded_answers)} expected points across all questions"
            },
            "recommendation": {
                "fit_score": int(rollup_data["overall_score"]),
                "rationale": f"Candidate shows {experience_to_level(candidate_info.get('experience', '0'))} level competency with overall performance of {rollup_data['overall_score']:.1f}%",
                "next_steps": "Proceed to next round" if rollup_data["overall_score"] >= 75 else "Consider additional screening"
            },
            "interview_summary": f"Candidate demonstrates competency in {candidate_info.get('job_title', 'technical role')} with strengths in {', '.join(strengths[:2])}.",
            "graded_answers": graded_answers,  # Include detailed grading for recruiter review
            "rubric_based_grading": True
        }
        
        return assessment_result
        
    except Exception as e:
        print(f"Enhanced assessment error: {str(e)}")
        # Return fallback assessment
        return {
            "overall_score": 70,
            "skill_scores": {"General": 70},
            "scoring_breakdown": {"correctness": 70, "completeness": 65, "clarity": 75, "relevance": 70},
            "strengths": ["Completed the assessment"],
            "improvements": ["Continue developing skills"],
            "recommendation": {"fit_score": 70, "rationale": "Shows potential", "next_steps": "Further evaluation needed"},
            "interview_summary": "Assessment completed with basic scoring",
            "rubric_based_grading": False
        }

def conduct_interview_start(candidate_info):
    """Start dynamic interview with enhanced grading capabilities"""
    try:
        job_title = candidate_info.get('job_title', 'Data Analyst')
        level = experience_to_level(candidate_info.get('experience', '0'))
        role_key = get_role_key(job_title)
        
        state = {
            'role_key': role_key,
            'level': level,
            'asked_skills': [],
            'asked_topics': [],
            'transcript': [
                {
                    'role': 'assistant',
                    'content': f"Hello! Welcome to your {job_title} interview. Please take up to 5 minutes to introduce yourself and tell me what drew you to this field.",
                    'stage': 'intro',
                    'time_limit_sec': calculate_question_timers(level, 'intro'),
                    'timestamp': datetime.utcnow().isoformat()
                }
            ],
            'turn': 1,
            'session_id': None,
            'difficulty_level': level,
            'graded_answers': [],  # Track graded answers for final rollup
            'current_phase': 'introduction'
        }
        
        return {
            'success': True,
            'state': state
        }
        
    except Exception as e:
        raise Exception(f"Failed to start enhanced interview: {str(e)}")

def conduct_interview_reply(state, answer, time_taken_sec=0):
    """Process reply with enhanced grading and dynamic difficulty"""
    try:
        # Get the last assistant question for grading context
        last_question = None
        for entry in reversed(state['transcript']):
            if entry['role'] == 'assistant' and entry.get('stage') != 'intro':
                last_question = entry
                break
        
        # Add candidate answer to transcript
        answer_entry = {
            'role': 'user',
            'content': answer,
            'time_taken_sec': time_taken_sec,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Grade the answer if we have a previous question
        if last_question and last_question.get('stage') != 'intro':
            question_data = {
                'question': last_question.get('content', ''),
                'skill_focus': last_question.get('skill_focus', 'General'),
                'time_limit_sec': last_question.get('time_limit_sec', 120),
                'rubric': last_question.get('rubric', {})
            }
            
            grades = evaluate_answer_llm(answer, question_data, time_taken_sec)
            answer_entry['grades'] = grades
            answer_entry['question_data'] = question_data
            
            # Determine next difficulty based on correctness
            next_difficulty = determine_next_difficulty(grades['correctness'])
            state['next_difficulty'] = next_difficulty
        
        state['transcript'].append(answer_entry)
        
        # Check if we should end the interview
        question_count = len([t for t in state['transcript'] if t['role'] == 'assistant' and t.get('stage') != 'intro'])
        if question_count >= 6:
            return finalize_interview_enhanced(state)
        
        # Generate next question (simplified for this implementation)
        next_question = "Based on your previous answer, can you elaborate on a specific challenge you've faced in this area?"
        
        state['transcript'].append({
            'role': 'assistant',
            'content': next_question,
            'stage': 'technical',
            'skill_focus': 'Problem Solving',
            'time_limit_sec': calculate_question_timers(state['level'], 'technical'),
            'timestamp': datetime.utcnow().isoformat(),
            'rubric': {
                'expected_points': ['Should describe specific challenge', 'Must explain approach taken', 'Should mention outcome'],
                'keywords': ['challenge', 'solution', 'approach'],
                'common_mistakes': ['Being too vague', 'Not explaining the solution']
            }
        })
        
        state['turn'] += 1
        
        return {
            'success': True,
            'state': state,
            'assistant': next_question,
            'completed': False,
            'summary': None
        }
        
    except Exception as e:
        raise Exception(f"Failed to process enhanced interview reply: {str(e)}")

def finalize_interview_enhanced(state):
    """Finalize interview with enhanced scoring rollup"""
    try:
        # Calculate rollup scores from transcript
        rollup_data = _rollup_scores(state['transcript'])
        
        summary = {
            "summary": f"Candidate completed interview with overall score of {rollup_data['overall_score']:.1f}%",
            "ratings": rollup_data["dimension_averages"],
            "recommendation": f"{int(rollup_data['overall_score'])} - {'Strong performance' if rollup_data['overall_score'] >= 80 else 'Acceptable performance' if rollup_data['overall_score'] >= 70 else 'Needs improvement'}",
            "skill_breakdown": rollup_data["computed_skill_scores"],
            "total_questions": rollup_data["total_questions"],
            "rubric_based": True
        }
        
        return {
            'success': True,
            'state': state,
            'completed': True,
            'summary': summary
        }
        
    except Exception as e:
        return {
            'success': True,
            'state': state,
            'completed': True,
            'summary': {"summary": "Interview completed", "ratings": {"overall": 70}, "recommendation": "70 - Further evaluation needed"}
        }

def conduct_interview_start_enhanced(candidate_info):
    """Start a conversational interview with introduction phase"""
    try:
        job_title = candidate_info.get('job_title', 'Software Developer')
        name = candidate_info.get('name', 'Candidate')
        experience = candidate_info.get('experience', '0')
        level = experience_to_level(experience)
        
        # Initial state for conversational interview
        state = {
            'candidate_name': name,
            'role_key': get_role_key(job_title),
            'job_title': job_title,
            'level': level,
            'experience_years': experience,
            'phase': 'introduction',  # introduction -> technical -> behavioral -> complete
            'question_count': 0,
            'technical_questions_asked': 0,
            'behavioral_questions_asked': 0,
            'extracted_context': {},  # Will store info from introduction
            'topics_to_explore': [],  # Topics to ask about from introduction
            'difficulty_level': level,
            'transcript': [
                {
                    'role': 'assistant',
                    'content': f"""Hello {name}! Welcome to your interview for the {job_title} position. 
                    
I'd like to start by getting to know you better. Please take the next few minutes to introduce yourself. 

Tell me about:
- Your educational background
- Your professional experience and key projects
- The technologies and tools you've worked with
- Any relevant certifications or achievements
- What interests you about the {job_title} role

Please be specific about the projects you've worked on and the impact you've made. Take your time - you have up to 6 minutes.""",
                    'stage': 'introduction',
                    'time_limit_sec': 360,
                    'timestamp': datetime.utcnow().isoformat()
                }
            ],
            'turn': 1,
            'session_id': hashlib.md5(f"{name}_{datetime.utcnow()}".encode()).hexdigest()
        }
        
        return {
            'success': True,
            'state': state
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def analyze_introduction(introduction_text, job_title):
    """Analyze the introduction to extract context for follow-up questions"""
    try:
        analysis_prompt = f"""
        Analyze this candidate introduction for a {job_title} position and extract key information.
        
        Introduction: "{introduction_text}"
        
        Extract and return in JSON format:
        {{
            "education": {{
                "degree": "extracted degree",
                "field": "field of study",
                "university": "university name if mentioned"
            }},
            "experience": {{
                "total_years": "number",
                "companies": ["list of companies mentioned"],
                "roles": ["previous roles mentioned"]
            }},
            "projects": [
                {{
                    "name": "project name or description",
                    "technologies": ["tech used"],
                    "impact": "business impact or results"
                }}
            ],
            "technical_skills": {{
                "programming_languages": ["languages mentioned"],
                "frameworks": ["frameworks mentioned"],
                "databases": ["databases mentioned"],
                "tools": ["tools mentioned"],
                "cloud": ["cloud platforms mentioned"]
            }},
            "certifications": ["list of certifications"],
            "expertise_areas": ["main areas of expertise based on introduction"],
            "topics_for_deep_dive": ["3-5 specific topics to ask technical questions about"],
            "experience_level": "junior/mid/senior based on content",
            "red_flags": ["any concerns or gaps"],
            "strengths": ["identified strengths"]
        }}
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer analyzing candidate introductions."},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.3,
            max_tokens=800
        )
        
        analysis = safe_json_parse(response.choices[0].message.content, {})
        return analysis
        
    except Exception as e:
        print(f"Error analyzing introduction: {e}")
        return {}

def generate_contextual_question(state, question_type='technical'):
    """Generate follow-up questions based on the introduction context"""
    try:
        context = state.get('extracted_context', {})
        previous_answers = state.get('transcript', [])
        job_title = state.get('job_title', 'Software Developer')
        asked_questions = []
        for entry in previous_answers:
            if entry.get('role') == 'assistant' and entry.get('stage') != 'introduction':
                asked_questions.append(entry.get('content', '').lower())
        
        if question_type == 'technical':
            # Generate technical question based on what they mentioned
            skills = context.get('technical_skills', {})
            projects = context.get('projects', [])
            topics = context.get('topics_for_deep_dive', [])
            
            prompt = f"""
            You are interviewing a {job_title} candidate. Based on their introduction, they mentioned:
            - Skills: {skills}
            - Projects: {projects}
            - Areas to explore: {topics}
            
            Questions already asked in this interview:
            {asked_questions}
            
            Generate ONE technical follow-up question that:
            1. Relates directly to something specific they mentioned
            2. Tests their depth of knowledge
            3. Is appropriate for their experience level ({state.get('difficulty_level')})
            4. Asks about real-world application or problem-solving
            5. MUST BE DIFFERENT from any question already asked
            
            DO NOT ask about:
            - Anything that's already been covered
            - The same topic with slightly different wording
            
            Examples of good follow-up questions:
            - "You mentioned working with [specific tech] in [specific project]. How did you handle [specific challenge]?"
            - "Can you walk me through how you implemented [specific feature] using [technology they mentioned]?"
            - "What was your approach to [specific problem] in your [project name] project?"
            
            Return JSON:
            {{
                "question": "the question",
                "skill_focus": "specific skill being tested",
                "context_reference": "what from their introduction this relates to",
                "difficulty": "easy/medium/hard",
                "expected_topics": ["topics a good answer should cover"]
            }}
            """
            
        else:  # behavioral
            prompt = f"""
            Based on the candidate's background as a {job_title} with experience in:
            {context.get('experience', {})}
            
            Generate ONE behavioral question that relates to their experience level.
            
            Return JSON:
            {{
                "question": "the behavioral question",
                "skill_focus": "soft skill being assessed",
                "difficulty": "medium"
            }}
            """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a senior technical interviewer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        question_data = safe_json_parse(response.choices[0].message.content, {})
        return question_data
        
    except Exception as e:
        print(f"Error generating contextual question: {e}")
        # Fallback question
        return {
            "question": f"Tell me about a challenging technical problem you've solved in your work.",
            "skill_focus": "Problem Solving",
            "difficulty": "medium"
        }

def conduct_interview_reply_enhanced(state, answer, time_taken_sec=0):
    """Process reply in conversational interview with context awareness"""
    try:
        # Add answer to transcript
        answer_entry = {
            'role': 'user',
            'content': answer,
            'time_taken_sec': time_taken_sec,
            'timestamp': datetime.utcnow().isoformat()
        }
        state['transcript'].append(answer_entry)
        
        current_phase = state.get('phase', 'introduction')
        
        # Handle introduction phase
        if current_phase == 'introduction':
            # Analyze the introduction to extract context
            extracted_context = analyze_introduction(answer, state.get('job_title'))
            state['extracted_context'] = extracted_context
            state['topics_to_explore'] = extracted_context.get('topics_for_deep_dive', [])
            
            # Adjust difficulty based on introduction analysis
            exp_level = extracted_context.get('experience_level', 'mid')
            if exp_level == 'senior':
                state['difficulty_level'] = 'expert'
            elif exp_level == 'junior':
                state['difficulty_level'] = 'basic'
            else:
                state['difficulty_level'] = 'intermediate'
            
            # Generate first technical question based on introduction
            state['phase'] = 'technical'
            next_question_data = generate_contextual_question(state, 'technical')
            
            # Personalized transition
            transition = f"""Thank you for that introduction, {state.get('candidate_name')}. 
            I can see you have experience with {', '.join(extracted_context.get('technical_skills', {}).get('programming_languages', ['various technologies'])[:3])}.
            Let's dive deeper into your technical expertise."""
            
            next_question = f"{transition}\n\n{next_question_data.get('question')}"
            
        # Handle technical phase
        elif current_phase == 'technical':
            state['technical_questions_asked'] += 1
            
            # Grade the previous answer if context suggests it
            if state['technical_questions_asked'] > 0:
                # Simple grading based on answer length and keywords
                grade = evaluate_technical_answer(answer, state.get('extracted_context', {}))
                answer_entry['grade'] = grade
            
            if state['technical_questions_asked'] < 4:  # Ask 4 technical questions
                # Generate next technical question based on context
                next_question_data = generate_contextual_question(state, 'technical')
                next_question = next_question_data.get('question')
            else:
                # Move to behavioral phase
                state['phase'] = 'behavioral'
                next_question_data = generate_contextual_question(state, 'behavioral')
                next_question = "Now let's discuss some situational aspects.\n\n" + next_question_data.get('question')
        
        # Handle behavioral phase
        elif current_phase == 'behavioral':
            state['behavioral_questions_asked'] += 1
            
            if state['behavioral_questions_asked'] < 2:  # Ask 2 behavioral questions
                next_question_data = generate_contextual_question(state, 'behavioral')
                next_question = next_question_data.get('question')
            else:
                # Interview complete - generate summary using NORMALIZED SCHEMA
                state['phase'] = 'complete'
                summary = generate_interview_summary_normalized(state)
                return {
                    'success': True,
                    'state': state,
                    'completed': True,
                    'summary': summary
                }
        
        # Add next question to transcript
        state['transcript'].append({
            'role': 'assistant',
            'content': next_question,
            'stage': current_phase,
            'skill_focus': next_question_data.get('skill_focus', 'General'),
            'time_limit_sec': 120,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        state['turn'] += 1
        state['question_count'] += 1
        
        return {
            'success': True,
            'state': state,
            'assistant': next_question,
            'completed': False
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def evaluate_technical_answer(answer, context):
    """Quick evaluation of technical answer"""
    score = 50  # Base score
    
    # Check answer length
    word_count = len(answer.split())
    if word_count > 50:
        score += 10
    if word_count > 100:
        score += 10
    
    # Check for technical keywords from their stated skills
    tech_skills = context.get('technical_skills', {})
    all_skills = []
    for skill_list in tech_skills.values():
        if isinstance(skill_list, list):
            all_skills.extend(skill_list)
    
    mentioned_skills = sum(1 for skill in all_skills if skill.lower() in answer.lower())
    score += min(20, mentioned_skills * 5)
    
    # Check for problem-solving indicators
    problem_solving_words = ['solution', 'approach', 'implemented', 'resolved', 'optimized', 'improved']
    ps_count = sum(1 for word in problem_solving_words if word in answer.lower())
    score += min(10, ps_count * 3)
    
    return min(100, score)

# ===========================================
# UPDATED SUMMARY GENERATION - WORKS WITH NORMALIZED SCHEMA
# ===========================================

def generate_interview_summary_normalized(state):
    """Generate summary compatible with normalized schema"""
    
    transcript = state.get('transcript', [])
    candidate_name = state.get('candidate_name', 'Candidate')
    job_title = state.get('job_title', 'Software Developer')
    candidate_info = state.get('extracted_context', {})
    
    # Use existing summary generation logic
    summary = generate_interview_summary(candidate_name, job_title, transcript, candidate_info)
    
    # The summary will be processed by the new models.py automatically
    # It will split data across candidates, interviews, skill_assessments, qa_pairs collections
    
    return summary

def generate_interview_summary(candidate_name, job_title, transcript, candidate_info=None):
    """Generate comprehensive interview summary with cleaned, validated data"""
    
    # Extract skills from all user responses
    all_skills = {}
    for entry in transcript:
        if entry.get('role') == 'user':
            extracted = extract_skills_from_text(entry.get('content', ''))
            for category, skills in extracted.items():
                if category not in all_skills:
                    all_skills[category] = []
                all_skills[category].extend(skills)
    
    # Remove duplicates
    for category in all_skills:
        all_skills[category] = list(dict.fromkeys(all_skills[category]))
    
    # Rate each skill with validation
    skill_ratings = []
    for category, skills in all_skills.items():
        for skill in skills:
            score, level, evidence = rate_skill_proficiency(skill, category, transcript)
            
            skill_data = {
                'skill': skill,
                'category': category,
                'score': score,
                'level': level,
                'evidence': evidence
            }
            skill_ratings.append(skill_data)
    
    # Clean and validate skills
    skill_ratings = clean_skill_data(skill_ratings, job_title)
    
    # Sort by score and filter low-confidence skills
    skill_ratings.sort(key=lambda x: x['score'], reverse=True)
    skill_ratings = [s for s in skill_ratings if s['score'] >= 35]  # Filter very low scores
    
    # Calculate competency scores
    competencies = calculate_competency_scores(transcript, all_skills)
    
    # Generate professional summary
    professional_summary = generate_professional_summary(
        candidate_name, job_title, all_skills, competencies, transcript
    )
    
    # Build strengths and improvements with validation
    approved_skills = [s for s in skill_ratings if s['validation_status'] == 'approved']
    strengths = [s['skill'] for s in approved_skills if s['score'] >= 70][:5]
    improvements = [s['skill'] for s in skill_ratings if s['score'] < 60 and s['validation_status'] == 'approved'][:3]
    
    if not strengths:
        strengths = ["Technical communication", "Problem-solving approach"]
    if not improvements:
        improvements = ["Continue developing technical depth", "Gain more hands-on experience"]
    
    # Calculate overall rating with proper weighting
    overall_rating = (
        competencies['technical_skills'] * 0.30 +
        competencies['problem_solving'] * 0.25 +
        competencies['communication'] * 0.20 +
        competencies['domain_knowledge'] * 0.15 +
        competencies['project_experience'] * 0.10
    )
    
    # Experience level determination
    experience_years = 0
    if candidate_info:
        try:
            experience_years = int(candidate_info.get('experience', {}).get('total_years', '0'))
        except:
            experience_years = 0
    
    if experience_years >= 5 or overall_rating >= 80:
        experience_level = "senior"
    elif experience_years >= 2 or overall_rating >= 65:
        experience_level = "intermediate"
    else:
        experience_level = "junior"
    
    # Build final summary with quality controls
    summary = {
        'professional_summary': professional_summary,
        'skill_ratings': skill_ratings,  # Now cleaned and validated
        'competency_scores': competencies,
        'demonstrated_expertise': [s for s in skill_ratings if s['category'] == 'concepts' and s['validation_status'] == 'approved'],
        'technical_skills': [s for s in skill_ratings if s['category'] != 'concepts' and s['validation_status'] == 'approved'],
        'strengths': strengths,
        'areas_for_improvement': improvements,
        'overall_rating': round(overall_rating, 1),
        'candidate_profile': {
            'name': candidate_name,
            'role': job_title,
            'experience_level': experience_level,
            'interview_date': datetime.utcnow().isoformat(),
            'verified_skills_count': len(approved_skills),
            'top_skills': approved_skills[:10]  # Top 10 approved skills
        },
        'background': {
            'education': candidate_info.get('education') if candidate_info else None,
            'experience': {
                'total_years': experience_years,
                'companies': candidate_info.get('experience', {}).get('companies', []) if candidate_info else [],
                'roles': candidate_info.get('experience', {}).get('roles', []) if candidate_info else []
            },
            'certifications': candidate_info.get('certifications', []) if candidate_info else []
        },
        'matching_keywords': [s['skill'] for s in approved_skills],
        'quality_metrics': {
            'total_skills_found': len(skill_ratings),
            'approved_skills': len(approved_skills),
            'flagged_skills': len([s for s in skill_ratings if s['validation_status'] != 'approved']),
            'confidence_score': len(approved_skills) / max(1, len(skill_ratings)),
            'data_quality': 'high' if len(approved_skills) >= 5 else 'medium' if len(approved_skills) >= 3 else 'low'
        }
    }
    
    print(f"SUMMARY GENERATED: {len(skill_ratings)} skills, {len(approved_skills)} approved, overall rating: {overall_rating:.1f}")
    
    return summary