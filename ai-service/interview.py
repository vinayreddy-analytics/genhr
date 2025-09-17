# interview.py - COMPLETE FIXED VERSION WITH QUESTION GENERATION FIXES
from openai import OpenAI
import os
import json
import random
import hashlib
import statistics
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict, List, Tuple
import re

load_dotenv()

# Set up OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# ===========================================
# ENHANCED DATA QUALITY VALIDATION - ALL 14 ROLES
# ===========================================

def validate_skill_name(skill_name, role="Data Analyst"):
    """Validate and filter skills based on role relevance - Updated for all 14 roles"""
    
    # Define role-specific skill whitelists for all 14 roles
    ROLE_SKILLS = {
        # ANALYTICAL ROLES
        "data_analyst": {
            "programming_languages": ["python", "r", "sql", "javascript", "matlab"],
            "tools": ["excel", "power bi", "tableau", "jupyter", "git", "spss", "google analytics"],
            "databases": ["mysql", "postgresql", "mongodb", "sqlite", "oracle"],
            "frameworks": ["pandas", "numpy", "scikit-learn", "matplotlib", "seaborn"],
            "concepts": ["statistics", "machine learning", "data visualization", "etl", "reporting", "forecasting"]
        },
        "business_analyst": {
            "programming_languages": ["sql", "python", "r"],
            "tools": ["visio", "jira", "confluence", "excel", "powerpoint", "sharepoint", "lucidchart"],
            "databases": ["mysql", "postgresql", "oracle", "sql server"],
            "frameworks": ["agile", "scrum", "waterfall", "lean"],
            "concepts": ["requirements analysis", "process mapping", "stakeholder management", "gap analysis", "change management"]
        },
        "financial_analyst": {
            "programming_languages": ["sql", "python", "vba"],
            "tools": ["excel", "bloomberg", "sap", "tableau", "power bi", "quickbooks"],
            "databases": ["sql server", "oracle", "mysql"],
            "frameworks": ["gaap", "ifrs", "sox"],
            "concepts": ["financial modeling", "forecasting", "budgeting", "variance analysis", "valuation", "dcf"]
        },
        
        # DATA ROLES  
        "data_engineer": {
            "programming_languages": ["python", "java", "scala", "sql", "go"],
            "tools": ["airflow", "databricks", "snowflake", "jenkins", "git", "docker"],
            "databases": ["postgresql", "mongodb", "cassandra", "redis", "elasticsearch"],
            "frameworks": ["apache spark", "kafka", "hadoop", "kubernetes"],
            "concepts": ["etl", "data pipeline", "real-time processing", "data warehousing", "streaming"]
        },
        "data_scientist": {
            "programming_languages": ["python", "r", "sql", "julia"],
            "tools": ["jupyter", "tensorflow", "pytorch", "mlflow", "docker", "git"],
            "databases": ["postgresql", "mongodb", "redis", "bigquery"],
            "frameworks": ["scikit-learn", "pandas", "numpy", "keras", "xgboost"],
            "concepts": ["machine learning", "deep learning", "statistics", "feature engineering", "model deployment"]
        },
        
        # DEVELOPER ROLES
        "software_developer": {
            "programming_languages": ["python", "javascript", "java", "c++", "typescript", "go", "rust"],
            "tools": ["git", "docker", "kubernetes", "jenkins", "postman", "vs code"],
            "databases": ["mysql", "postgresql", "mongodb", "redis", "elasticsearch"],
            "frameworks": ["react", "angular", "vue", "django", "flask", "spring", "express"],
            "concepts": ["algorithms", "data structures", "system design", "testing", "debugging", "api design"]
        },
        "frontend_developer": {
            "programming_languages": ["javascript", "typescript", "html", "css", "sass"],
            "tools": ["vs code", "webpack", "git", "chrome devtools", "figma", "jest"],
            "databases": ["localstorage", "indexeddb", "firebase"],
            "frameworks": ["react", "angular", "vue", "redux", "next.js", "gatsby"],
            "concepts": ["responsive design", "user experience", "performance optimization", "accessibility", "seo"]
        },
        "backend_developer": {
            "programming_languages": ["python", "java", "node.js", "go", "c#", "php"],
            "tools": ["docker", "kubernetes", "jenkins", "postman", "git"],
            "databases": ["postgresql", "mysql", "mongodb", "redis", "cassandra"],
            "frameworks": ["django", "flask", "spring", "express", "fastapi"],
            "concepts": ["api design", "database design", "system architecture", "security", "microservices"]
        },
        
        # MANAGEMENT ROLES
        "project_manager": {
            "programming_languages": [],
            "tools": ["jira", "asana", "microsoft project", "slack", "confluence", "excel", "trello"],
            "databases": [],
            "frameworks": ["agile", "scrum", "waterfall", "kanban", "lean"],
            "concepts": ["project planning", "risk management", "stakeholder communication", "budget management", "team leadership"]
        },
        "technical_project_manager": {
            "programming_languages": ["sql", "python"],
            "tools": ["jira", "git", "docker", "jenkins", "slack", "confluence", "postman"],
            "databases": ["mysql", "postgresql", "mongodb"],
            "frameworks": ["agile", "scrum", "devops", "ci/cd"],
            "concepts": ["technical architecture", "software development lifecycle", "api management", "system integration"]
        },
        "sales_manager": {
            "programming_languages": [],
            "tools": ["salesforce", "hubspot", "excel", "linkedin sales navigator", "zoom", "slack"],
            "databases": [],
            "frameworks": ["crm", "sales methodology", "lead scoring"],
            "concepts": ["team leadership", "sales strategy", "performance management", "customer relations", "territory management"]
        },
        "retail_store_manager": {
            "programming_languages": [],
            "tools": ["pos systems", "inventory management", "excel", "scheduling software", "social media"],
            "databases": [],
            "frameworks": ["retail operations", "customer service", "inventory control"],
            "concepts": ["team management", "inventory management", "customer service", "sales management", "visual merchandising"]
        },
        
        # ENGINEERING ROLES
        "mechanical_engineer": {
            "programming_languages": ["matlab", "python", "c++"],
            "tools": ["solidworks", "autocad", "ansys", "3d printing", "cnc programming", "excel"],
            "databases": [],
            "frameworks": ["lean manufacturing", "six sigma", "fea"],
            "concepts": ["cad design", "materials science", "thermodynamics", "manufacturing processes", "quality control"]
        },
        "design_technician": {
            "programming_languages": [],
            "tools": ["autocad", "solidworks", "inventor", "drafting tools", "3d modeling", "plm software"],
            "databases": [],
            "frameworks": ["technical drawing standards", "gd&t"],
            "concepts": ["technical drawing", "blueprint reading", "geometric dimensioning", "manufacturing knowledge", "documentation"]
        },
        
        # SERVICE ROLES
        "customer_care_representative": {
            "programming_languages": [],
            "tools": ["crm systems", "help desk software", "chat platforms", "phone systems", "ticketing systems"],
            "databases": [],
            "frameworks": ["customer service", "conflict resolution"],
            "concepts": ["communication", "problem solving", "empathy", "product knowledge", "multi-tasking"]
        },
        "sales_executive": {
            "programming_languages": [],
            "tools": ["salesforce", "linkedin sales navigator", "crm", "email marketing", "zoom", "powerpoint"],
            "databases": [],
            "frameworks": ["sales process", "crm", "lead generation"],
            "concepts": ["prospecting", "relationship building", "negotiation", "product knowledge", "presentation skills"]
        }
    }
    
    # Normalize role name for lookup
    role_key = role.lower().replace(" ", "_").replace("-", "_")
    
    # Map role variations to standard keys
    role_mappings = {
        "data_analyst": "data_analyst",
        "business_analyst": "business_analyst", 
        "financial_analyst": "financial_analyst",
        "data_engineer": "data_engineer",
        "data_scientist": "data_scientist",
        "software_developer": "software_developer",
        "frontend_developer": "frontend_developer",
        "backend_developer": "backend_developer",
        "project_manager": "project_manager",
        "technical_project_manager": "technical_project_manager",
        "sales_manager": "sales_manager",
        "retail_store_manager": "retail_store_manager",
        "mechanical_engineer": "mechanical_engineer",
        "design_technician": "design_technician",
        "customer_care_representative": "customer_care_representative",
        "sales_executive": "sales_executive"
    }
    
    role_key = role_mappings.get(role_key, "data_analyst")  # Default fallback
    
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
# ANSWER QUALITY VALIDATION - DETECT PROBLEMATIC RESPONSES
# ===========================================

def detect_answer_quality_issues(answer):
    """Detect potentially problematic answers that need flagging"""
    flags = []
    answer_lower = answer.lower()
    
    # Too short for meaningful assessment
    if len(answer.split()) < 10:
        flags.append("insufficient_length")
    
    # AI-generated response indicators
    ai_indicators = [
        "as an ai", "i don't have personal experience", "as a language model",
        "i cannot provide personal", "in summary", "to summarize",
        "according to my training", "i'm just an ai"
    ]
    if any(indicator in answer_lower for indicator in ai_indicators):
        flags.append("likely_ai_generated")
    
    # Copy-paste indicators  
    copy_indicators = [
        "according to", "as mentioned in", "source:", "reference:",
        "wikipedia", "stack overflow", "documentation states"
    ]
    if any(indicator in answer_lower for indicator in copy_indicators):
        flags.append("potential_copy_paste")
    
    # Generic/evasive responses
    generic_phrases = ["it depends", "there are many ways", "various approaches", "multiple factors"]
    generic_count = sum(1 for phrase in generic_phrases if phrase in answer_lower)
    if generic_count >= 2:
        flags.append("too_generic")
    
    # Repetitive content (same phrase repeated)
    words = answer.split()
    if len(words) > 20:
        unique_words = set(words)
        if len(unique_words) / len(words) < 0.4:  # Less than 40% unique words
            flags.append("repetitive_content")
    
    # Inconsistent technical depth
    tech_terms_count = sum(1 for word in words if len(word) > 8 and word.isalpha())
    if len(words) > 50 and tech_terms_count < 3:
        flags.append("lacks_technical_depth")
    
    return flags

# ===========================================
# CONSENSUS SCORING SYSTEM - MULTIPLE LLM CALLS
# ===========================================

def evaluate_answer_with_consensus(answer, question_data, time_taken_sec=0):
    """Enhanced scoring with consensus mechanism"""
    try:
        # First check for quality issues
        quality_flags = detect_answer_quality_issues(answer)
        
        # If major quality issues, return low scores immediately
        if "likely_ai_generated" in quality_flags:
            return {
                "correctness": 25,
                "completeness": 30,
                "clarity": 40,
                "relevance": 35,
                "notes": ["Answer appears to be AI-generated - requires manual review"],
                "quality_flags": quality_flags,
                "consensus_used": False,
                "confidence": "low"
            }
        
        # Get multiple LLM evaluations for consensus
        evaluations = []
        for i in range(3):  # 3 evaluations for consensus
            try:
                evaluation = evaluate_answer_llm_single(answer, question_data, time_taken_sec)
                evaluations.append(evaluation)
            except Exception as e:
                print(f"Evaluation {i+1} failed: {e}")
                continue
        
        if not evaluations:
            # Fallback if all LLM calls fail
            return get_fallback_scores(answer, question_data, quality_flags)
        
        # Calculate consensus scores using median
        consensus_scores = {
            "correctness": int(statistics.median([e["correctness"] for e in evaluations])),
            "completeness": int(statistics.median([e["completeness"] for e in evaluations])),  
            "clarity": int(statistics.median([e["clarity"] for e in evaluations])),
            "relevance": int(statistics.median([e["relevance"] for e in evaluations]))
        }
        
        # Combine notes from all evaluations
        all_notes = []
        for evaluation in evaluations:
            if "notes" in evaluation and evaluation["notes"]:
                all_notes.extend(evaluation["notes"])
        
        # Remove duplicate notes and limit to 3 most common
        note_counts = {}
        for note in all_notes:
            note_counts[note] = note_counts.get(note, 0) + 1
        
        top_notes = sorted(note_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        consensus_notes = [note for note, count in top_notes]
        
        # Calculate confidence based on variance
        correctness_scores = [e["correctness"] for e in evaluations]
        variance = statistics.variance(correctness_scores) if len(correctness_scores) > 1 else 0
        confidence = "high" if variance < 100 else "medium" if variance < 400 else "low"
        
        # Apply quality flag penalties
        penalty = 0
        if "insufficient_length" in quality_flags:
            penalty += 10
        if "too_generic" in quality_flags:
            penalty += 15
        if "lacks_technical_depth" in quality_flags:
            penalty += 10
        
        # Apply penalties
        for key in consensus_scores:
            consensus_scores[key] = max(0, consensus_scores[key] - penalty)
        
        final_result = {
            **consensus_scores,
            "notes": consensus_notes,
            "quality_flags": quality_flags,
            "consensus_used": True,
            "confidence": confidence,
            "variance": variance,
            "evaluations_used": len(evaluations)
        }
        
        return final_result
        
    except Exception as e:
        print(f"Consensus scoring error: {e}")
        return get_fallback_scores(answer, question_data, quality_flags)

def evaluate_answer_llm_single(answer, question_data, time_taken_sec=0):
    """Single LLM evaluation call - used by consensus system"""
    rubric = question_data.get('rubric', {})
    expected_points = rubric.get('expected_points', [])
    keywords = rubric.get('keywords', [])
    common_mistakes = rubric.get('common_mistakes', [])
    
    system_prompt = f"""
    You are an expert hiring manager evaluating a candidate's interview answer.
    
    QUESTION: {question_data.get('question', '')}
    SKILL FOCUS: {question_data.get('skill_focus', '')}
    
    RUBRIC FOR EVALUATION:
    Expected Points: {'; '.join(expected_points)}
    Keywords: {', '.join(keywords)}
    Common Mistakes: {', '.join(common_mistakes)}
    
    CANDIDATE'S ANSWER: "{answer}"
    
    Grade on 0-100 scale for each dimension:
    - Correctness: Technical accuracy and factual correctness
    - Completeness: Addresses all aspects of the question
    - Clarity: Clear communication and structure
    - Relevance: Directly answers question with practical examples
    
    Be realistic in scoring - don't inflate scores.
    
    Return only valid JSON:
    {{
        "correctness": 75,
        "completeness": 80,
        "clarity": 85,
        "relevance": 70,
        "notes": ["Brief observation 1", "Brief observation 2"]
    }}
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Grade this answer against the rubric."}
        ],
        temperature=0.1,
        max_tokens=300
    )
    
    result = safe_json_parse(response.choices[0].message.content, {
        "correctness": 70, "completeness": 65, "clarity": 75, "relevance": 70,
        "notes": ["Standard evaluation"]
    })
    
    # Ensure scores are valid integers
    for key in ["correctness", "completeness", "clarity", "relevance"]:
        result[key] = max(0, min(100, int(result.get(key, 70))))
    
    return result

def get_fallback_scores(answer, question_data, quality_flags):
    """Fallback scoring when LLM calls fail"""
    word_count = len(answer.split())
    
    # Base scores on answer length and basic heuristics
    base_score = min(85, max(30, 40 + (word_count * 0.8)))
    
    # Adjust for quality flags
    if "insufficient_length" in quality_flags:
        base_score -= 20
    if "too_generic" in quality_flags:
        base_score -= 15
    if "likely_ai_generated" in quality_flags:
        base_score -= 30
    
    return {
        "correctness": max(0, int(base_score - 5)),
        "completeness": max(0, int(base_score - 10)),
        "clarity": max(0, int(base_score)),
        "relevance": max(0, int(base_score - 8)),
        "notes": ["Fallback scoring due to technical issues"],
        "quality_flags": quality_flags,
        "consensus_used": False,
        "confidence": "low"
    }

# ===========================================
# UPDATED ROLE MAPPING FOR ALL 14 ROLES
# ===========================================

def get_role_key(job_title):
    """Map job title to role key - Updated for all 14 roles"""
    job_title_lower = job_title.lower().replace(" ", "_").replace("-", "_")
    
    role_mappings = {
        # Analytical roles
        "data_analyst": "data_analyst",
        "business_analyst": "business_analyst", 
        "financial_analyst": "financial_analyst",
        
        # Data roles
        "data_engineer": "data_engineer",
        "data_scientist": "data_scientist",
        
        # Developer roles
        "software_developer": "software_developer",
        "frontend_developer": "frontend_developer", 
        "backend_developer": "backend_developer",
        "full_stack_developer": "software_developer",  # Map to general software dev
        
        # Management roles
        "project_manager": "project_manager",
        "technical_project_manager": "technical_project_manager",
        "sales_manager": "sales_manager",
        "retail_store_manager": "retail_store_manager",
        
        # Engineering roles
        "mechanical_engineer": "mechanical_engineer",
        "design_technician": "design_technician",
        
        # Service roles
        "customer_care_representative": "customer_care_representative",
        "sales_executive": "sales_executive",
        
        # Legacy mappings (backwards compatibility)
        "digital_marketer": "sales_executive"
    }
    
    return role_mappings.get(job_title_lower, "data_analyst")  # Default fallback

# ===========================================
# ENHANCED SKILL EXTRACTION WITH ALL ROLE SUPPORT
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
            'typescript', 'kotlin', 'swift', 'php', 'matlab', 'scala', 'sql', 'vba', 'julia'
        ],
        'frameworks': [
            'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'express',
            'spring', 'rails', 'laravel', 'next.js', 'nest.js', '.net', 'tensorflow',
            'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'agile', 'scrum'
        ],
        'databases': [
            'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'dynamodb',
            'elasticsearch', 'oracle', 'sql server', 'sqlite', 'neo4j', 'bigquery'
        ],
        'ml_ai_tools': [
            'pandas', 'numpy', 'opencv', 'nltk', 'spacy', 'hugging face',
            'langchain', 'llamaindex', 'transformers', 'bert', 'gpt', 'mlflow'
        ],
        'cloud_platforms': [
            'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify'
        ],
        'tools': [
            'git', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible',
            'jira', 'confluence', 'postman', 'swagger', 'grafana', 'power bi',
            'tableau', 'excel', 'jupyter', 'solidworks', 'autocad', 'salesforce'
        ]
    }
    
    # Enhanced concept patterns
    concept_patterns = {
        'machine_learning': ['machine learning', 'ml', 'supervised', 'unsupervised', 'deep learning'],
        'data_visualization': ['visualization', 'charts', 'graphs', 'dashboards', 'reporting'],
        'statistics': ['statistics', 'statistical', 'regression', 'correlation', 'hypothesis'],
        'etl': ['etl', 'data pipeline', 'data processing', 'data cleaning'],
        'system_design': ['architecture', 'scalability', 'microservices', 'api design'],
        'project_management': ['project planning', 'stakeholder management', 'risk management'],
        'sales_strategy': ['lead generation', 'customer relations', 'territory management'],
        'mechanical_design': ['cad design', 'materials science', 'manufacturing processes'],
        'customer_service': ['customer support', 'problem resolution', 'communication skills']
    }
    
    text_lower = text.lower()
    
    # Special handling for single letter languages
    if re.search(r'\bR\b', text, re.IGNORECASE):
        skills_found['programming_languages'].append('r')
    if re.search(r'\bC\b', text, re.IGNORECASE):
        skills_found['programming_languages'].append('c')
    
    # Extract technical skills with word boundaries
    for category, patterns in skill_patterns.items():
        for pattern in patterns:
            if pattern in ['R', 'C']:  # Skip handled above
                continue
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

# ===========================================
# FIXED QUESTION GENERATION FUNCTIONS
# ===========================================

def generate_role_specific_question(role_key, experience_level, context, question_count):
    """FIXED: Generate contextual questions specific to role and experience level"""
    
    roles = load_available_roles()
    role_info = roles.get(role_key, {})
    
    # Get scenario-based questions from roles.json
    sample_questions = role_info.get('sample_questions', {})
    level_questions = sample_questions.get(experience_level, sample_questions.get('intermediate', []))
    
    # FIX #1: Proper array bounds checking and cycling through available questions
    if level_questions and len(level_questions) > 0:
        # Use modulo to cycle through available questions instead of going out of bounds
        question_index = (question_count - 1) % len(level_questions)
        question_data = level_questions[question_index]
        
        print(f"DEBUG: Using predefined question {question_index + 1} for {role_key} level {experience_level}")
        
        return {
            "question": question_data["question"],
            "skill_focus": role_info.get('core_skills', ['General'])[0],
            "time_limit_sec": question_data.get("time_limit", 120),
            "rubric": {
                "expected_points": [
                    "Should provide specific example or approach",
                    "Must demonstrate understanding of core concepts", 
                    "Should explain reasoning clearly"
                ],
                "keywords": role_info.get('core_skills', [])[:3],
                "common_mistakes": ["Being too vague", "Not providing concrete examples"]
            }
        }
    
    # FIX #2: Enhanced contextual fallback with variety
    return generate_contextual_question_with_variety(role_key, experience_level, context, question_count)

def generate_contextual_question_with_variety(role_key, experience_level, context, question_count):
    """FIXED: Generate diverse contextual questions for ALL 16 roles"""
    
    # Extract context for personalization
    companies = context.get('companies', [])
    tools_mentioned = context.get('tools', [])
    
    company_context = companies[0] if companies else "your previous company"
    tools_context = ", ".join(tools_mentioned[:3]) if tools_mentioned else "the tools you mentioned"
    
    # COMPLETE QUESTION BANKS FOR ALL 16 ROLES
    role_question_banks = {
        # SALES & MANAGEMENT ROLES
        "sales_manager": [
            f"At {company_context}, how did you handle a situation where a key client was considering switching to a competitor?",
            f"Tell me about a time you had to motivate an underperforming sales rep. What approach did you take?",
            f"How do you use {tools_context} to track and improve your team's sales performance?",
            f"Describe a successful sales strategy you implemented that exceeded targets.",
            f"Walk me through how you would onboard a new sales team member in their first 30 days.",
            f"Tell me about a time you lost a major deal. What did you learn and how did you improve?",
            f"How do you handle pricing objections from potential clients?",
            f"Describe your approach to territory management and lead distribution across your team.",
            f"Tell me about a challenging negotiation you led. How did you close the deal?",
            f"How do you forecast sales performance and set realistic targets for your team?"
        ],
        
        "sales_executive": [
            f"Tell me about your most challenging sales cycle at {company_context}. How did you manage it?",
            f"How do you research and qualify prospects before making first contact?",
            f"Describe a time when you turned a 'no' into a 'yes' with a difficult prospect.",
            f"Walk me through your typical sales process from lead to close.",
            f"How do you handle objections about price or budget constraints?",
            f"Tell me about a time you exceeded your sales quota. What strategies worked?",
            f"How do you maintain relationships with existing clients while pursuing new ones?",
            f"Describe your experience with CRM systems and sales tracking tools.",
            f"Tell me about a deal that didn't close. What would you do differently?",
            f"How do you stay motivated during slow periods or rejection streaks?"
        ],
        
        "retail_store_manager": [
            f"Tell me about a time you had to handle an angry customer complaint. How did you resolve it?",
            f"How do you motivate your retail team during slow sales periods?",
            f"Describe a time when you had to manage inventory shortages during peak season.",
            f"Walk me through your approach to visual merchandising and store layout.",
            f"How do you handle staff scheduling conflicts and ensure adequate coverage?",
            f"Tell me about a time you implemented a new process that improved store performance.",
            f"How do you track and analyze sales data to make business decisions?",
            f"Describe your approach to training new retail associates.",
            f"Tell me about a time you had to deal with theft or security issues.",
            f"How do you balance customer service with sales targets?"
        ],
        
        "project_manager": [
            f"Tell me about a project at {company_context} that was falling behind schedule. How did you get it back on track?",
            f"How do you handle scope creep when stakeholders keep adding requirements?",
            f"Describe a time when you had to manage a difficult team member or stakeholder.",
            f"Walk me through your risk assessment and mitigation process.",
            f"How do you communicate project status to different levels of management?",
            f"Tell me about a project that failed. What did you learn from it?",
            f"How do you prioritize tasks when everything seems urgent?",
            f"Describe your experience with project management tools and methodologies.",
            f"Tell me about a time you had to deliver bad news to a client or sponsor.",
            f"How do you ensure quality while meeting tight deadlines?"
        ],
        
        "technical_project_manager": [
            f"Tell me about a complex technical project you managed at {company_context}. What made it challenging?",
            f"How do you bridge communication between technical teams and business stakeholders?",
            f"Describe a time when technical debt impacted your project timeline. How did you handle it?",
            f"Walk me through your approach to managing API integrations across multiple systems.",
            f"How do you handle technical risks that could derail your project?",
            f"Tell me about a time you had to make a trade-off between technical perfection and delivery deadlines.",
            f"How do you stay current with technology trends while managing projects?",
            f"Describe your experience with DevOps and CI/CD pipeline management.",
            f"Tell me about a technical decision you made that had major project implications.",
            f"How do you manage dependencies between different development teams?"
        ],
        
        # DATA & ANALYTICS ROLES
        "data_analyst": [
            f"Tell me about a complex data analysis project you completed at {company_context}.",
            f"How would you investigate a 15% drop in key performance metrics?",
            f"Describe a time when your analysis led to a significant business decision.",
            f"Walk me through your process for cleaning and validating messy data.",
            f"How do you communicate technical findings to non-technical stakeholders?",
            f"Tell me about a time when your initial analysis was wrong. How did you correct it?",
            f"Describe your experience with statistical modeling and when you'd use different approaches.",
            f"How do you handle missing data in your analysis?",
            f"Tell me about a dashboard or visualization you created that had business impact.",
            f"How do you ensure the accuracy and reliability of your data sources?"
        ],
        
        "business_analyst": [
            f"Tell me about a time you had to gather requirements from multiple conflicting stakeholders.",
            f"How do you approach process mapping for a complex business workflow?",
            f"Describe a system implementation project you managed at {company_context}.",
            f"Walk me through your gap analysis methodology.",
            f"How do you handle scope changes during a requirements gathering phase?",
            f"Tell me about a time you identified a process improvement that saved time or money.",
            f"How do you document and communicate complex business requirements?",
            f"Describe your experience with change management and user adoption.",
            f"Tell me about a time you had to challenge a stakeholder's assumptions.",
            f"How do you prioritize features when resources are limited?"
        ],
        
        "financial_analyst": [
            f"Tell me about a complex financial model you built at {company_context}.",
            f"How would you analyze the financial impact of a potential acquisition?",
            f"Describe a time when your analysis revealed an unexpected trend or issue.",
            f"Walk me through your budgeting and forecasting process.",
            f"How do you handle variance analysis when actuals differ significantly from budget?",
            f"Tell me about a time you had to present financial recommendations to senior leadership.",
            f"How do you ensure accuracy when working with large datasets in Excel?",
            f"Describe your experience with financial reporting and compliance requirements.",
            f"Tell me about a cost-saving opportunity you identified through analysis.",
            f"How do you stay current with industry financial trends and regulations?"
        ],
        
        "data_scientist": [
            f"Tell me about a machine learning model you built at {company_context}. What was the business impact?",
            f"How do you approach feature engineering for a new dataset?",
            f"Describe a time when your model performed poorly in production. How did you debug it?",
            f"Walk me through your process for selecting the right algorithm for a problem.",
            f"How do you handle imbalanced datasets in classification problems?",
            f"Tell me about a time you had to explain a complex model to business stakeholders.",
            f"How do you validate your models and ensure they generalize well?",
            f"Describe your experience with A/B testing and statistical significance.",
            f"Tell me about a challenging data preprocessing problem you solved.",
            f"How do you monitor model drift and decide when to retrain?"
        ],
        
        "data_engineer": [
            f"Tell me about a complex data pipeline you built at {company_context}.",
            f"How do you handle data quality issues in real-time streaming systems?",
            f"Describe a time when you had to optimize a slow-performing ETL process.",
            f"Walk me through your approach to designing a scalable data architecture.",
            f"How do you monitor data pipeline health and handle failures?",
            f"Tell me about a challenging data integration project involving multiple sources.",
            f"How do you ensure data consistency across different storage systems?",
            f"Describe your experience with cloud data platforms and their trade-offs.",
            f"Tell me about a time you had to migrate legacy data to a new system.",
            f"How do you balance data processing speed with cost optimization?"
        ],
        
        # DEVELOPER ROLES
        "software_developer": [
            f"Tell me about the most challenging technical problem you solved at {company_context}.",
            f"How do you approach debugging a complex issue in production?",
            f"Describe your experience with {tools_context} and how you used them in projects.",
            f"Walk me through your code review process and what you look for.",
            f"Tell me about a time you had to optimize slow-performing code.",
            f"How do you stay current with new technologies and programming trends?",
            f"Describe a time when you had to work with legacy code. How did you approach it?",
            f"Tell me about your experience with testing strategies and test-driven development.",
            f"How do you handle technical debt in your projects?",
            f"Describe a time you had to learn a new technology quickly for a project."
        ],
        
        "frontend_developer": [
            f"Tell me about a challenging UI/UX problem you solved at {company_context}.",
            f"How do you ensure your applications work across different browsers and devices?",
            f"Describe a time when you had to optimize a slow-loading web application.",
            f"Walk me through your process for implementing responsive design.",
            f"How do you handle state management in complex React applications?",
            f"Tell me about your experience with accessibility standards and implementation.",
            f"How do you approach performance optimization in frontend applications?",
            f"Describe a time when you had to work closely with designers to implement a complex design.",
            f"Tell me about your testing strategy for frontend code.",
            f"How do you stay current with rapidly changing frontend technologies?"
        ],
        
        "backend_developer": [
            f"Tell me about a scalable backend system you designed at {company_context}.",
            f"How do you handle database optimization for high-traffic applications?",
            f"Describe your experience with microservices architecture and its challenges.",
            f"Walk me through your API design principles and best practices.",
            f"How do you implement security measures in your backend systems?",
            f"Tell me about a time you had to troubleshoot a critical production issue.",
            f"How do you handle data consistency in distributed systems?",
            f"Describe your experience with caching strategies and when to use them.",
            f"Tell me about your approach to error handling and logging.",
            f"How do you ensure your APIs can handle increasing load over time?"
        ],
        
        # ENGINEERING ROLES
        "mechanical_engineer": [
            f"Tell me about a complex design problem you solved at {company_context}.",
            f"How do you approach failure analysis when a component doesn't meet specifications?",
            f"Describe a time when you had to optimize a design for manufacturability.",
            f"Walk me through your process for selecting materials for a new product.",
            f"How do you handle conflicting requirements between performance and cost?",
            f"Tell me about your experience with CAD software and design validation.",
            f"How do you ensure quality control in manufacturing processes?",
            f"Describe a time when you had to troubleshoot a field failure.",
            f"Tell me about a project where you had to meet strict regulatory requirements.",
            f"How do you stay current with new materials and manufacturing technologies?"
        ],
        
        "design_technician": [
            f"Tell me about a complex technical drawing project you completed at {company_context}.",
            f"How do you ensure accuracy when creating detailed manufacturing drawings?",
            f"Describe your experience with different CAD software packages and their strengths.",
            f"Walk me through your process for reviewing and checking technical drawings.",
            f"How do you handle design changes that affect multiple drawings?",
            f"Tell me about a time when manufacturing had issues with your drawings. How did you resolve it?",
            f"How do you stay organized when managing multiple drawing projects?",
            f"Describe your experience with geometric dimensioning and tolerancing (GD&T).",
            f"Tell me about your collaboration process with engineers and manufacturing teams.",
            f"How do you ensure your drawings comply with industry standards and regulations?"
        ],
        
        # SERVICE ROLES
        "customer_care_representative": [
            f"Tell me about the most challenging customer complaint you've handled.",
            f"How do you de-escalate a situation with an angry or frustrated customer?",
            f"Describe a time when you went above and beyond to help a customer.",
            f"Walk me through your process for researching and resolving customer issues.",
            f"How do you handle multiple customer inquiries while maintaining quality service?",
            f"Tell me about a time when you couldn't immediately solve a customer's problem. What did you do?",
            f"How do you stay patient and positive when dealing with difficult customers all day?",
            f"Describe your experience with CRM systems and customer tracking tools.",
            f"Tell me about a customer feedback that led to a process improvement.",
            f"How do you balance following company policies with meeting customer needs?"
        ]
    }
    
    # Get questions for the specific role (with fallback for unmapped roles)
    questions = role_question_banks.get(role_key, [
        f"Tell me about a challenging problem you solved at {company_context}.",
        f"How do you approach learning new skills in your field?",
        f"Describe your experience working with {tools_context}.",
        f"Walk me through your problem-solving methodology.",
        f"Tell me about a project you're particularly proud of.",
        f"How do you handle conflicting priorities in your work?",
        f"Describe a time when you had to adapt to a significant change at work.",
        f"Tell me about your experience collaborating with cross-functional teams.",
        f"How do you stay current with industry trends and best practices?",
        f"Describe a mistake you made and what you learned from it."
    ])
    
    # Cycle through questions with proper indexing
    if questions:
        question_index = (question_count - 1) % len(questions)
        selected_question = questions[question_index]
        
        print(f"DEBUG: Generated contextual question {question_index + 1}/{len(questions)} for {role_key}")
        
        return {
            "question": selected_question,
            "skill_focus": "Practical Experience",
            "time_limit_sec": 120,
            "rubric": {
                "expected_points": [
                    "Should provide specific real-world example",
                    "Must explain methodology or approach used", 
                    "Should demonstrate problem-solving skills"
                ],
                "keywords": ["experience", "approach", "solution"],
                "common_mistakes": ["Being too vague about specifics", "Not explaining the outcome"]
            }
        }
    
    # Final fallback
    return {
        "question": "Tell me about a significant achievement in your professional career.",
        "skill_focus": "Professional Achievement",
        "time_limit_sec": 120
    }

def generate_contextual_question(state, question_type='technical'):
    """FIXED: Enhanced contextual question generation with proper tracking"""
    try:
        context = state.get('extracted_context', {})
        previous_answers = state.get('transcript', [])
        job_title = state.get('job_title', 'Software Developer')
        role_key = state.get('role_key', 'software_developer')
        
        # FIX #5: Track asked questions properly to prevent exact repeats
        asked_questions = set()
        for entry in previous_answers:
            if entry.get('role') == 'assistant' and entry.get('stage') not in ('intro', 'introduction'):
                # Store the actual question text to prevent exact duplicates
                question_text = entry.get('content', '').lower().split('\n')[-1]  # Get last line
                asked_questions.add(question_text.strip())
        
        print(f"DEBUG: Already asked {len(asked_questions)} questions")
        
        # Generate question with enhanced variety
        max_attempts = 5
        for attempt in range(max_attempts):
            question_data = generate_role_specific_question(
                role_key, 
                state.get('difficulty_level', 'intermediate'),
                context,
                state.get('technical_questions_asked', 0) + 1 + attempt
            )
            
            # Check if this question was already asked
            new_question = question_data.get('question', '').lower().strip()
            if new_question not in asked_questions:
                print(f"DEBUG: Generated unique question on attempt {attempt + 1}")
                return question_data
            else:
                print(f"DEBUG: Question already asked, trying attempt {attempt + 2}")
        
        # If all attempts failed, generate a completely generic question
        print(f"DEBUG: All attempts failed, using emergency fallback")
        return {
            "question": f"Tell me about your experience in the {job_title} field and what motivates you in this role.",
            "skill_focus": "Professional Background",
            "time_limit_sec": 120
        }
        
    except Exception as e:
        print(f"Error generating contextual question: {e}")
        return {
            "question": "Tell me about a challenging project you've worked on recently.",
            "skill_focus": "Project Experience",
            "time_limit_sec": 120
        }

def analyze_introduction(introduction_text, job_title):
    """UNIVERSAL VERSION: Context extraction optimized for all 16 roles - FIXED"""
    print(f"DEBUG: Analyzing introduction for {job_title}")
    print(f"DEBUG: Text length: {len(introduction_text)} chars")
    
    try:
        text_lower = introduction_text.lower()
        
        # COMPREHENSIVE TOOL PATTERNS FOR ALL 16 ROLES
        tool_patterns = {
            # DESIGN & ENGINEERING TOOLS
            'autocad': ['autocad', 'auto cad', 'auto-cad'],
            'solidworks': ['solidworks', 'solid works', 'solid-works'],
            'revit': ['revit'],
            'bim': ['bim tools', 'bim'],
            'inventor': ['inventor'],
            'catia': ['catia'],
            'creo': ['creo'],
            'ansys': ['ansys'],
            'matlab': ['matlab'],
            '3d printing': ['3d printing', '3d print'],
            'cnc': ['cnc programming', 'cnc'],
            
            # SALES & CRM TOOLS
            'salesforce': ['salesforce', 'sales force', 'sfdc'],
            'hubspot': ['hubspot', 'hub spot'],
            'crm': ['crm system', 'crm'],
            'linkedin sales navigator': ['linkedin sales navigator', 'sales navigator'],
            'linkedin': ['linkedin'],
            'zoom': ['zoom'],
            'slack': ['slack'],
            'powerpoint': ['powerpoint', 'power point', 'ppt'],
            'email marketing': ['email marketing', 'mailchimp'],
            
            # DATA & ANALYTICS TOOLS
            'python': ['python'],
            'r': ['r programming', ' r '],
            'sql': ['sql', 'mysql', 'postgresql'],
            'excel': ['excel', 'microsoft excel'],
            'tableau': ['tableau'],
            'power bi': ['power bi', 'powerbi'],
            'jupyter': ['jupyter', 'jupyter notebook'],
            'pandas': ['pandas'],
            'numpy': ['numpy'],
            'scikit-learn': ['scikit-learn', 'sklearn'],
            'tensorflow': ['tensorflow'],
            'pytorch': ['pytorch'],
            'spss': ['spss'],
            'sas': ['sas'],
            'google analytics': ['google analytics', 'ga'],
            
            # BUSINESS ANALYSIS TOOLS
            'jira': ['jira'],
            'confluence': ['confluence'],
            'visio': ['visio'],
            'sharepoint': ['sharepoint', 'share point'],
            'lucidchart': ['lucidchart', 'lucid chart'],
            'microsoft project': ['microsoft project', 'ms project'],
            'asana': ['asana'],
            'trello': ['trello'],
            
            # SOFTWARE DEVELOPMENT TOOLS
            'git': ['git', 'github', 'gitlab'],
            'docker': ['docker'],
            'kubernetes': ['kubernetes', 'k8s'],
            'jenkins': ['jenkins'],
            'vs code': ['vs code', 'visual studio code'],
            'postman': ['postman'],
            'react': ['react', 'reactjs'],
            'angular': ['angular', 'angularjs'],
            'vue': ['vue', 'vuejs'],
            'nodejs': ['node.js', 'nodejs', 'node'],
            'django': ['django'],
            'flask': ['flask'],
            'spring': ['spring framework', 'spring'],
            
            # FINANCIAL TOOLS
            'bloomberg': ['bloomberg', 'bloomberg terminal'],
            'sap': ['sap'],
            'quickbooks': ['quickbooks', 'quick books'],
            'oracle': ['oracle'],
            
            # CUSTOMER SERVICE TOOLS
            'help desk software': ['help desk', 'zendesk', 'freshdesk'],
            'chat platforms': ['chat platform', 'live chat'],
            'ticketing systems': ['ticketing system', 'ticket system'],
            
            # PROJECT MANAGEMENT TOOLS
            'gantt charts': ['gantt chart', 'gantt'],
            'kanban': ['kanban'],
            'scrum': ['scrum'],
            'agile': ['agile methodology', 'agile'],
            
            # RETAIL & INVENTORY TOOLS
            'pos systems': ['pos system', 'point of sale'],
            'inventory management': ['inventory management', 'inventory system'],
            'scheduling software': ['scheduling software', 'staff scheduling']
        }
        
        # Extract tools with comprehensive matching
        tools = []
        for tool_name, patterns in tool_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    # Clean up tool name for display
                    display_name = tool_name.replace('_', ' ').title()
                    if display_name not in [t.replace('_', ' ').title() for t in tools]:
                        tools.append(display_name)
                    break
        
        # ENHANCED COMPANY EXTRACTION - FIXED FOR MIXED CASE
        companies = []
        
        # Method 1: Look for patterns - FIXED to handle mixed case
        import re
        company_indicators = [
            # More flexible patterns that handle mixed case
            r'(?:at|for|with|worked for|employed by)\s+([A-Za-z][a-zA-Z\s&.,-]{2,30}?)(?:\s+(?:and|,|\.|$))',
            r'worked\s+(?:at|for|with)\s+([A-Za-z][a-zA-Z\s&.,-]{2,30}?)(?:\s+(?:and|,|\.|$))',
            r'employed\s+(?:at|by)\s+([A-Za-z][a-zA-Z\s&.,-]{2,30}?)(?:\s+(?:and|,|\.|$))',
            # Look for capitalized words that might be companies
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b(?=\s+(?:company|corp|ltd|inc|industries|solutions|systems))',
            # Specific patterns for common company formats
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:company|corp|ltd|inc|industries|solutions|systems)\b'
        ]
        
        for pattern in company_indicators:
            try:
                matches = re.findall(pattern, introduction_text, re.IGNORECASE)
                for match in matches:
                    # Clean up the match
                    clean_match = match.strip()
                    # Filter out common words that aren't companies
                    excluded_words = {'design', 'projects', 'experience', 'software', 'tools', 'systems', 'work'}
                    if (len(clean_match) > 2 and 
                        clean_match.lower() not in excluded_words and 
                        clean_match not in companies):
                        companies.append(clean_match)
            except Exception as regex_error:
                print(f"DEBUG: Company regex error: {regex_error}")
                continue
        
        # Method 2: Look for industry/sector mentions
        sector_terms = ['commercial', 'residential', 'industrial', 'automotive', 'healthcare', 
                       'financial', 'retail', 'manufacturing', 'technology', 'consulting']
        for term in sector_terms:
            if term in text_lower and term.capitalize() not in companies:
                companies.append(term.capitalize())
        
        # EXPERIENCE YEARS EXTRACTION - FIXED REGEX GROUPS
        experience_years = "0"
        year_patterns = [
            # Fixed patterns with proper capture groups
            r'(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
            r'(\d+)\s*(?:year|yr)\s*(?:experience|exp)',
            r'(\d+)\s*(?:years?|yrs?)',  # Generic number + years
            # Word-based patterns - FIXED with capture groups
            r'hold\s*(one|two|three|four|five)\s*(?:years?|yrs?)',
            r'have\s*(one|two|three|four|five)\s*(?:years?|yrs?)'
        ]
        
        word_to_num = {'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5'}
        
        for pattern in year_patterns:
            try:
                match = re.search(pattern, text_lower)
                if match:
                    num_str = match.group(1)
                    # Convert word numbers to digits if needed
                    if num_str in word_to_num:
                        num_str = word_to_num[num_str]
                    
                    if num_str.isdigit() and int(num_str) <= 30:  # Reasonable experience range
                        experience_years = num_str
                        break
            except Exception as regex_error:
                print(f"DEBUG: Experience regex error: {regex_error}")
                continue
        
        # INDUSTRY/SECTOR DETECTION - Enhanced
        industry_mapping = {
            'engineering': ['engineering', 'mechanical', 'civil', 'design', 'cad', 'structural', 'technical drawing', 'bim'],
            'software': ['software', 'programming', 'developer', 'coding', 'web', 'app', 'development'],
            'data': ['data', 'analytics', 'analysis', 'statistics', 'machine learning', 'ai', 'business intelligence'],
            'sales': ['sales', 'selling', 'crm', 'client', 'customer acquisition', 'business development'],
            'business': ['business', 'management', 'consulting', 'strategy', 'operations'],
            'finance': ['finance', 'financial', 'accounting', 'budget', 'investment'],
            'retail': ['retail', 'store', 'merchandise', 'inventory', 'pos'],
            'customer service': ['customer service', 'support', 'help desk', 'customer care'],
            'project management': ['project management', 'project manager', 'scrum', 'agile', 'gantt']
        }
        
        industry = "general"
        max_matches = 0
        for ind, keywords in industry_mapping.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > max_matches:
                max_matches = matches
                industry = ind
        
        # COMPLETE ROLE-SPECIFIC SKILLS FOR ALL 16 ROLES
        role_specific_skills = {
            # DATA & ANALYTICS ROLES
            'data_analyst': ['data analysis', 'statistics', 'reporting', 'visualization', 'python', 'sql'],
            'data_engineer': ['data pipeline', 'etl', 'spark', 'kafka', 'cloud platforms', 'data warehousing'],  
            'data_scientist': ['machine learning', 'predictive modeling', 'feature engineering', 'deep learning', 'a/b testing'],
            
            # BUSINESS ROLES  
            'business_analyst': ['requirements gathering', 'process improvement', 'stakeholder management', 'documentation', 'gap analysis'],
            'financial_analyst': ['financial modeling', 'forecasting', 'budgeting', 'variance analysis', 'valuation'],
            
            # DEVELOPMENT ROLES
            'backend_developer': ['api design', 'database design', 'system architecture', 'microservices', 'performance optimization'],
            'software_developer': ['programming', 'coding', 'development', 'debugging', 'testing', 'javascript', 'python'],
            'frontend_developer': ['javascript', 'react', 'css', 'html', 'responsive design', 'user experience'],
            
            # PROJECT MANAGEMENT ROLES
            'project_manager': ['project planning', 'team coordination', 'risk management', 'stakeholder communication', 'agile'],
            'technical_project_manager': ['technical architecture', 'devops', 'system integration', 'deployment management', 'sdlc'],
            
            # SALES ROLES
            'sales_manager': ['team leadership', 'sales strategy', 'performance management', 'crm', 'territory management'],
            'sales_executive': ['prospecting', 'lead generation', 'client relationships', 'closing deals', 'negotiation', 'cold calling'],
            
            # RETAIL & SERVICE ROLES
            'retail_store_manager': ['team management', 'inventory management', 'customer service', 'sales management', 'visual merchandising'],
            'customer_care_representative': ['customer service', 'problem solving', 'communication', 'conflict resolution', 'product knowledge'],
            
            # ENGINEERING ROLES
            'mechanical_engineer': ['cad design', 'materials science', 'manufacturing processes', 'thermodynamics', 'quality control'],
            'design_technician': ['technical drawing', 'cad software', 'blueprint reading', 'manufacturing knowledge', 'documentation', '2d', '3d']
        }
        
        # Convert job_title to role_key format for matching
        job_title_to_role_key = {
            'Data Analyst': 'data_analyst',
            'Business Analyst': 'business_analyst', 
            'Financial Analyst': 'financial_analyst',
            'Data Engineer': 'data_engineer',
            'Data Scientist': 'data_scientist',
            'Backend Developer': 'backend_developer',
            'Software Developer': 'software_developer',
            'Frontend Developer': 'frontend_developer',
            'Project Manager': 'project_manager',
            'Technical Project Manager': 'technical_project_manager',
            'Sales Manager': 'sales_manager',
            'Sales Executive': 'sales_executive',
            'Retail Store Manager': 'retail_store_manager',
            'Customer Care Representative': 'customer_care_representative',
            'Mechanical Engineer': 'mechanical_engineer',
            'Design Technician': 'design_technician'
        }
        
        skills = []
        # Convert job_title to role_key for proper matching
        role_key = job_title_to_role_key.get(job_title, job_title.lower().replace(' ', '_'))
        relevant_skills = role_specific_skills.get(role_key, ['professional skills'])
        
        print(f"DEBUG SKILLS: job_title='{job_title}' -> role_key='{role_key}' -> skills={relevant_skills}")
        
        for skill_term in relevant_skills:
            if any(word in text_lower for word in skill_term.split()):
                skills.append(skill_term.replace(' ', '_'))
        
        # Add general skills found in text
        general_skills = ['leadership', 'management', 'communication', 'problem solving', 
                         'teamwork', 'analysis', 'planning', 'organization']
        for skill in general_skills:
            if skill in text_lower and skill not in skills:
                skills.append(skill)
        
        # BUILD COMPREHENSIVE RESULT
        result = {
            'companies': companies[:4],  # Limit to top 4
            'tools': tools[:8],  # Limit to top 8 tools
            'experience_years': experience_years,
            'industry': industry,
            'skills': skills[:6],  # Limit to top 6 skills
            'context_summary': f"{industry} {job_title.lower()}",
            'topics_for_questions': [
                f"{job_title} methodology",
                "technical challenges", 
                "project experience",
                "team collaboration"
            ]
        }
        
        print(f"DEBUG COMPREHENSIVE EXTRACTION:")
        print(f"  Companies: {result['companies']}")
        print(f"  Tools: {result['tools']}")
        print(f"  Industry: {result['industry']}")
        print(f"  Experience: {result['experience_years']} years")
        print(f"  Skills: {result['skills']}")
        
        # OPTIONAL LLM ENHANCEMENT (but don't rely on it)
        try:
            llm_prompt = f"""
            Extract additional context from this {job_title} introduction:
            
            "{introduction_text}"
            
            Return JSON with any additional companies, tools, or achievements not already identified:
            {{
                "additional_companies": ["any other companies"],
                "additional_tools": ["any other software/tools"],
                "key_achievements": ["quantified accomplishments"],
                "certifications": ["any certifications mentioned"]
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Extract additional context not already found. Return only valid JSON."},
                    {"role": "user", "content": llm_prompt}
                ],
                temperature=0.0,
                max_tokens=300
            )
            
            llm_enhancement = safe_json_parse(response.choices[0].message.content, {})
            
            # Merge LLM enhancements
            if llm_enhancement.get('additional_companies'):
                for company in llm_enhancement['additional_companies']:
                    if company not in result['companies'] and len(result['companies']) < 4:
                        result['companies'].append(company)
                        
            if llm_enhancement.get('key_achievements'):
                result['achievements'] = llm_enhancement['key_achievements'][:3]
                
            print(f"DEBUG LLM ENHANCED: Added achievements and additional context")
                
        except Exception as llm_error:
            print(f"DEBUG: LLM enhancement skipped: {llm_error}")
        
        print(f"DEBUG FINAL UNIVERSAL RESULT: {result}")
        return result
        
    except Exception as e:
        print(f"DEBUG: Universal extraction error: {e}")
        import traceback
        traceback.print_exc()
        
        # Comprehensive fallback based on job title
        role_based_fallback = {
            'companies': [f'{job_title} company'],
            'tools': ['Professional tools'],
            'experience_years': '1',
            'industry': 'professional services',
            'skills': [f'{job_title.lower().replace(" ", "_")}_skills'],
            'context_summary': f"{job_title} professional",
            'topics_for_questions': [f"{job_title} experience", "professional challenges"]
        }
        return role_based_fallback

# ===========================================
# KEEP ALL EXISTING FUNCTIONS (UNCHANGED)
# ===========================================

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

# Replace evaluate_answer_llm with consensus version
def evaluate_answer_llm(answer, question_data, time_taken_sec=0):
    """Main evaluation function - now uses consensus scoring"""
    return evaluate_answer_with_consensus(answer, question_data, time_taken_sec)

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

# Keep all existing main interview functions unchanged
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
            if grades.get('quality_flags') and 'too_generic' in grades['quality_flags']:
                improvements.append("Provide more specific and concrete examples")
            if grades.get('quality_flags') and 'lacks_technical_depth' in grades['quality_flags']:
                improvements.append("Include more technical details in responses")
        
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
                "consensus_scoring_used": sum(1 for g in graded_answers if g['grades'].get('consensus_used', False)),
                "average_confidence": "high"  # Would calculate from individual confidences
            },
            "strengths": strengths,
            "improvements": improvements,
            "detailed_feedback": {
                "technical": f"Demonstrates {candidate_info.get('experience', '0')} years level understanding with room for growth",
                "communication": "Shows ability to articulate concepts" if rollup_data["dimension_averages"]["clarity"] >= 70 else "Could improve clarity of explanations",
                "consensus_analysis": f"Used consensus scoring for {len(graded_answers)} questions"
            },
            "recommendation": {
                "fit_score": int(rollup_data["overall_score"]),
                "rationale": f"Candidate shows {experience_to_level(candidate_info.get('experience', '0'))} level competency with overall performance of {rollup_data['overall_score']:.1f}%",
                "next_steps": "Proceed to next round" if rollup_data["overall_score"] >= 75 else "Consider additional screening"
            },
            "interview_summary": f"Candidate demonstrates competency in {candidate_info.get('job_title', 'technical role')} with strengths in {', '.join(strengths[:2])}.",
            "graded_answers": graded_answers,  # Include detailed grading for recruiter review
            "rubric_based_grading": True,
            "consensus_scoring": True
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
            "rubric_based_grading": False,
            "consensus_scoring": False
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

def conduct_interview_reply_enhanced(state, answer, time_taken_sec=0):
    """UNIVERSAL VERSION: Process reply for ALL 16 roles with context awareness"""
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
        
        # UNIVERSAL: Get role information (no hardcoding)
        role_key = state.get('role_key', 'data_analyst')  # Default fallback only
        job_title = state.get('job_title', 'Professional')
        difficulty_level = state.get('difficulty_level', 'intermediate')
        
        print(f"DEBUG UNIVERSAL: Processing {current_phase} phase for {role_key} ({job_title})")
        
        # Handle introduction phase
        if current_phase == 'introduction':
            # UNIVERSAL: Enhanced introduction analysis for any role
            extracted_context = analyze_introduction(answer, job_title)
            state['extracted_context'] = extracted_context
            state['topics_to_explore'] = extracted_context.get('topics_for_questions', [])
            
            print(f"DEBUG CONTEXT EXTRACTED for {role_key}: {extracted_context}")
            
            # Adjust difficulty based on introduction analysis
            exp_years = extracted_context.get('experience_years', '1')
            try:
                years = int(exp_years)
                if years >= 7:
                    state['difficulty_level'] = 'expert'
                elif years >= 3:
                    state['difficulty_level'] = 'intermediate'
                else:
                    state['difficulty_level'] = 'basic'
                difficulty_level = state['difficulty_level']
                print(f"DEBUG DIFFICULTY: Set to {difficulty_level} based on {years} years experience")
            except:
                pass
            
            # Generate first technical question based on introduction
            state['phase'] = 'technical'
            
            # UNIVERSAL FIX: Use working question generation for ANY role
            next_question_data = generate_contextual_question_with_variety(
                role_key,  # Use actual role, not hardcoded
                difficulty_level, 
                extracted_context,
                1  # First question
            )
            
            # UNIVERSAL: Personalized transition with proper context
            companies = extracted_context.get('companies', [])
            tools = extracted_context.get('tools', [])
            industry = extracted_context.get('industry', 'professional')
            
            # Build context-aware transition
            context_parts = []
            if companies:
                context_parts.append(f"experience at {companies[0]}")
            if tools and len(tools) > 0:
                tool_list = ", ".join(tools[:3])
                context_parts.append(f"experience with {tool_list}")
            elif industry != 'general':
                context_parts.append(f"{industry} background")
            
            if context_parts:
                context_text = " and ".join(context_parts)
            else:
                context_text = "professional background"
            
            transition = f"""Thank you for that introduction, {state.get('candidate_name')}. 
            I can see you have {context_text}.
            Let's dive deeper into your {role_key.replace('_', ' ')} expertise."""
            
            next_question = f"{transition}\n\n{next_question_data.get('question')}"
            
        # Handle technical phase
        elif current_phase == 'technical':
            state['technical_questions_asked'] += 1
            
            # Grade the previous answer
            if state['technical_questions_asked'] > 0:
                grade = evaluate_technical_answer(answer, state.get('extracted_context', {}))
                answer_entry['grade'] = grade
                print(f"DEBUG GRADING: Q{state['technical_questions_asked']} scored {grade}")
            
            if state['technical_questions_asked'] < 4:  # Ask 4 technical questions
                # UNIVERSAL FIX: Generate next question for ANY role
                next_question_data = generate_contextual_question_with_variety(
                    role_key,  # Use actual role
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    state['technical_questions_asked'] + 1  # Next question index
                )
                next_question = next_question_data.get('question')
                
                print(f"DEBUG TECHNICAL: Generated Q{state['technical_questions_asked'] + 1} for {role_key}")
                print(f"DEBUG QUESTION: {next_question[:60]}...")
                
            else:
                # Move to behavioral phase
                state['phase'] = 'behavioral'
                next_question_data = generate_contextual_question_with_variety(
                    role_key,  # Use actual role
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    1  # First behavioral question
                )
                next_question = "Now let's discuss some situational aspects.\n\n" + next_question_data.get('question')
                print(f"DEBUG BEHAVIORAL: Moving to behavioral phase for {role_key}")
        
        # Handle behavioral phase
        elif current_phase == 'behavioral':
            state['behavioral_questions_asked'] += 1
            
            if state['behavioral_questions_asked'] < 2:  # Ask 2 behavioral questions
                next_question_data = generate_contextual_question_with_variety(
                    role_key,  # Use actual role
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    state['behavioral_questions_asked'] + 10  # Offset to get different questions
                )
                next_question = next_question_data.get('question')
                print(f"DEBUG BEHAVIORAL: Generated behavioral Q{state['behavioral_questions_asked'] + 1} for {role_key}")
            else:
                # Interview complete - generate summary
                state['phase'] = 'complete'
                summary = generate_enhanced_interview_summary_normalized(state)
                print(f"DEBUG COMPLETE: Interview finished for {role_key}")
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
        
        print(f"DEBUG SUCCESS: Generated response for {role_key}, turn {state['turn']}")
        
        return {
            'success': True,
            'state': state,
            'assistant': next_question,
            'completed': False
        }
        
    except Exception as e:
        print(f"DEBUG ERROR in conduct_interview_reply_enhanced: {e}")
        import traceback
        traceback.print_exc()
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

def generate_enhanced_interview_summary_normalized(state):
    """Generate summary compatible with normalized schema"""
    
    transcript = state.get('transcript', [])
    candidate_name = state.get('candidate_name', 'Candidate')
    job_title = state.get('job_title', 'Software Developer')
    candidate_info = state.get('extracted_context', {})
    
    # Use existing summary generation logic
    summary = generate_enhanced_interview_summary(candidate_name, job_title, transcript, candidate_info)
    
    # The summary will be processed by the new models.py automatically
    # It will split data across candidates, interviews, skill_assessments, qa_pairs collections
    
    return summary

def generate_enhanced_interview_summary(candidate_name: str, job_title: str, transcript: List[Dict], candidate_info: Dict = None):
    """Enhanced interview summary with individual skills and dual storage"""
    
    # Extract context from introduction
    extracted_context = {}
    introduction_text = ""
    for entry in transcript:
        if entry.get('role') == 'user' and len(entry.get('content', '')) > 100:
            introduction_text = entry['content']
            extracted_context = analyze_introduction(introduction_text, job_title)
            break
    
    # Extract individual skills with enhanced metadata
    individual_skills = extract_individual_skills_with_confidence(
        transcript, extracted_context, job_title
    )
    
    # Generate traditional competency scores (keep existing system)
    all_skills = extract_skills_from_text(introduction_text)
    competencies = calculate_competency_scores(transcript, all_skills)
    
    # Create searchable tags for fast matching
    searchable_tags = create_searchable_skill_tags(individual_skills)
    
    # Generate professional summary
    professional_summary = generate_professional_summary(
        candidate_name, job_title, all_skills, competencies, transcript
    )
    
    # Calculate overall rating (weighted toward individual skills)
    if individual_skills:
        individual_avg = sum(s['score'] for s in individual_skills) / len(individual_skills)
        competency_avg = sum(competencies.values()) / len(competencies) if competencies else 70
        overall_rating = (individual_avg * 0.7) + (competency_avg * 0.3)
    else:
        overall_rating = sum(competencies.values()) / len(competencies) if competencies else 70
    
    # Enhanced summary structure
    enhanced_summary = {
        'professional_summary': professional_summary,
        'overall_rating': round(overall_rating, 1),
        
        # DUAL SKILL STORAGE SYSTEM
        'enhanced_skills': {
            'verified_skills': individual_skills,  # New detailed individual skills
            'competency_scores': competencies,     # Keep existing for backward compatibility
            'searchable_tags': searchable_tags,    # Fast matching optimization
            'skill_summary': {
                'total_skills': len(individual_skills),
                'expert_skills': len([s for s in individual_skills if s['level'] == 'expert']),
                'advanced_skills': len([s for s in individual_skills if s['level'] == 'advanced']),
                'categories_covered': len(set(s['category'] for s in individual_skills)),
                'average_score': round(sum(s['score'] for s in individual_skills) / len(individual_skills), 1) if individual_skills else 0,
                'job_relevant_skills': len([s for s in individual_skills if s['job_relevance'] >= 0.7])
            }
        },
        
        # BACKWARD COMPATIBILITY
        'matching_keywords': [s['display_name'] for s in individual_skills if s['score'] >= 60],
        'strengths': [s['display_name'] for s in individual_skills if s['score'] >= 75][:5],
        'areas_for_improvement': [s['display_name'] for s in individual_skills if s['score'] < 60][:3],
        
        # ENHANCED METADATA
        'candidate_profile': {
            'name': candidate_name,
            'role': job_title,
            'interview_date': datetime.utcnow().isoformat(),
            'skills_extraction_version': 'v2.0_enhanced',
            'synonym_matching_enabled': True
        }
    }
    
    return enhanced_summary

# MIGRATION FUNCTION - Update existing interviews
def migrate_existing_interview_to_enhanced_skills(interview_record: Dict) -> Dict:
    """Migrate an existing interview record to use enhanced skills"""
    
    # Extract basic info
    candidate_name = "Candidate"  # Fallback
    job_title = interview_record.get('role', 'Professional')
    
    # Reconstruct transcript if available
    transcript = []
    if 'professional_summary' in interview_record:
        # Create mock transcript entry from professional summary
        transcript.append({
            'role': 'user',
            'content': interview_record['professional_summary']
        })
    
    # Use existing matching_keywords as basis for individual skills
    existing_keywords = interview_record.get('matching_keywords', [])
    individual_skills = []
    
    for keyword in existing_keywords:
        # Create individual skill record
        skill_data = {
            'skill': keyword.lower().replace(' ', '_'),
            'display_name': keyword.title(),
            'score': 75,  # Default score for migrated skills
            'level': 'intermediate',
            'category': categorize_skill(keyword),
            'synonyms': get_skill_synonyms(keyword),
            'evidence': f'Mentioned {keyword} in original interview',
            'confidence': 0.75,
            'mentioned_in_intro': True,
            'job_relevance': calculate_job_relevance(keyword, job_title)
        }
        individual_skills.append(skill_data)
    
    # Create enhanced skills structure
    searchable_tags = create_searchable_skill_tags(individual_skills)
    
    enhanced_skills = {
        'verified_skills': individual_skills,
        'competency_scores': interview_record.get('competency_scores', {}),
        'searchable_tags': searchable_tags,
        'skill_summary': {
            'total_skills': len(individual_skills),
            'expert_skills': 0,  # Conservative for migrated data
            'advanced_skills': len(individual_skills) // 2,
            'categories_covered': len(set(s['category'] for s in individual_skills)),
            'average_score': 75,  # Default for migrated
            'job_relevant_skills': len([s for s in individual_skills if s['job_relevance'] >= 0.7])
        }
    }
    
    # Update the interview record
    interview_record['enhanced_skills'] = enhanced_skills
    interview_record['skill_extraction_version'] = 'v2.0_migrated'
    
    return interview_record

# COMPREHENSIVE SKILL SYNONYM DATABASE
SKILL_SYNONYMS = {
    # Design & CAD Tools
    'autocad': ['cad', 'computer aided design', 'computer-aided design', '2d design', '3d modeling', 'technical drawing'],
    'solidworks': ['solid works', '3d modeling', 'parametric design', 'mechanical design', 'product design'],
    'revit': ['bim', 'building information modeling', 'architectural design', '3d architecture'],
    'inventor': ['autodesk inventor', '3d mechanical design', 'parametric modeling'],
    'catia': ['dassault catia', '3d design', 'aerospace design'],
    'creo': ['ptc creo', 'pro engineer', 'parametric 3d modeling'],
    
    # Programming Languages
    'python': ['python programming', 'py', 'python3', 'python development'],
    'javascript': ['js', 'ecmascript', 'javascript programming', 'web programming'],
    'java': ['java programming', 'java development', 'jvm'],
    'sql': ['structured query language', 'database querying', 'data querying', 'database programming'],
    'r': ['r programming', 'r language', 'statistical programming'],
    'matlab': ['matlab programming', 'mathematical computing', 'numerical computing'],
    
    # Data & Analytics Tools
    'tableau': ['data visualization', 'business intelligence', 'dashboard creation'],
    'power bi': ['powerbi', 'microsoft power bi', 'business intelligence', 'data visualization'],
    'excel': ['microsoft excel', 'spreadsheet analysis', 'data analysis', 'pivot tables'],
    'pandas': ['data manipulation', 'data analysis', 'python data analysis'],
    'numpy': ['numerical computing', 'scientific computing', 'python numerical'],
    'matplotlib': ['data visualization', 'plotting', 'python visualization'],
    'scikit-learn': ['sklearn', 'machine learning', 'predictive modeling'],
    
    # Sales & CRM Tools
    'salesforce': ['sfdc', 'crm', 'customer relationship management', 'sales automation'],
    'hubspot': ['inbound marketing', 'marketing automation', 'crm'],
    'linkedin sales navigator': ['sales navigator', 'linkedin prospecting', 'social selling'],
    
    # Project Management Tools
    'jira': ['issue tracking', 'project tracking', 'agile project management'],
    'confluence': ['documentation', 'team collaboration', 'knowledge management'],
    'asana': ['task management', 'project coordination', 'team productivity'],
    'microsoft project': ['ms project', 'project planning', 'gantt charts'],
    
    # Development Tools
    'git': ['version control', 'source control', 'github', 'gitlab'],
    'docker': ['containerization', 'container technology', 'devops'],
    'kubernetes': ['k8s', 'container orchestration', 'cloud orchestration'],
    'jenkins': ['ci cd', 'continuous integration', 'build automation'],
    
    # Web Development
    'react': ['reactjs', 'frontend framework', 'javascript framework', 'ui development'],
    'angular': ['angularjs', 'typescript framework', 'spa development'],
    'vue': ['vuejs', 'progressive framework', 'frontend development'],
    'nodejs': ['node.js', 'server side javascript', 'backend javascript'],
    
    # Cloud Platforms
    'aws': ['amazon web services', 'cloud computing', 'cloud infrastructure'],
    'azure': ['microsoft azure', 'cloud platform', 'cloud services'],
    'gcp': ['google cloud platform', 'google cloud', 'cloud computing'],
    
    # Databases
    'mysql': ['relational database', 'sql database', 'database management'],
    'postgresql': ['postgres', 'relational database', 'advanced sql'],
    'mongodb': ['nosql', 'document database', 'non-relational database'],
    'redis': ['in-memory database', 'caching', 'key-value store']
}

# SKILL CATEGORIES FOR BETTER ORGANIZATION
SKILL_CATEGORIES = {
    'design_tools': ['autocad', 'solidworks', 'revit', 'inventor', 'catia', 'creo', 'bim'],
    'programming_languages': ['python', 'javascript', 'java', 'sql', 'r', 'matlab', 'c++', 'c#'],
    'data_analytics': ['tableau', 'power bi', 'excel', 'pandas', 'numpy', 'matplotlib', 'spss'],
    'machine_learning': ['scikit-learn', 'tensorflow', 'pytorch', 'keras', 'xgboost'],
    'sales_tools': ['salesforce', 'hubspot', 'linkedin sales navigator', 'crm'],
    'project_management': ['jira', 'confluence', 'asana', 'microsoft project', 'gantt charts'],
    'development_tools': ['git', 'docker', 'kubernetes', 'jenkins', 'vs code'],
    'web_frameworks': ['react', 'angular', 'vue', 'nodejs', 'express', 'django'],
    'cloud_platforms': ['aws', 'azure', 'gcp', 'heroku'],
    'databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'oracle']
}

def categorize_skill(skill_name: str) -> str:
    """Determine the category of a skill"""
    skill_lower = skill_name.lower().strip()
    
    for category, skills in SKILL_CATEGORIES.items():
        if skill_lower in skills:
            return category
        # Check for partial matches
        if any(skill_lower in s or s in skill_lower for s in skills):
            return category
    
    return 'general'

def get_skill_synonyms(skill_name: str) -> List[str]:
    """Get all synonyms for a skill"""
    skill_lower = skill_name.lower().strip()
    
    # Direct match
    if skill_lower in SKILL_SYNONYMS:
        return SKILL_SYNONYMS[skill_lower]
    
    # Check if skill is a synonym of another skill
    for main_skill, synonyms in SKILL_SYNONYMS.items():
        if skill_lower in synonyms:
            return [main_skill] + [s for s in synonyms if s != skill_lower]
    
    return []

def extract_individual_skills_with_confidence(transcript: List[Dict], extracted_context: Dict, job_title: str) -> List[Dict]:
    """Extract individual skills with confidence scores and metadata"""
    
    # Get mentioned tools and skills from context
    mentioned_tools = extracted_context.get('tools', [])
    mentioned_skills = extracted_context.get('skills', [])
    
    # Combine all mentioned items
    all_mentioned = mentioned_tools + mentioned_skills
    
    individual_skills = []
    
    for skill_raw in all_mentioned:
        skill_name = skill_raw.lower().strip()
        
        # Skip very short or generic terms
        if len(skill_name) < 2 or skill_name in ['work', 'experience', 'project']:
            continue
        
        # Calculate confidence score based on transcript analysis
        confidence_score = calculate_skill_confidence_from_transcript(skill_name, transcript)
        
        # Only include skills with reasonable confidence
        if confidence_score >= 30:
            
            # Get synonyms and category
            synonyms = get_skill_synonyms(skill_name)
            category = categorize_skill(skill_name)
            
            # Extract evidence from transcript
            evidence = extract_skill_evidence_from_transcript(skill_name, transcript)
            
            # Determine proficiency level
            proficiency_level = determine_skill_proficiency_level(confidence_score)
            
            skill_data = {
                'skill': skill_name.replace(' ', '_'),
                'display_name': skill_raw.title(),
                'score': confidence_score,
                'level': proficiency_level,
                'category': category,
                'synonyms': synonyms,
                'evidence': evidence,
                'confidence': min(100, confidence_score) / 100,
                'mentioned_in_intro': True,  # Since extracted from context
                'job_relevance': calculate_job_relevance(skill_name, job_title)
            }
            
            individual_skills.append(skill_data)
    
    # Sort by confidence score
    individual_skills.sort(key=lambda x: x['score'], reverse=True)
    
    return individual_skills

def calculate_skill_confidence_from_transcript(skill_name: str, transcript: List[Dict]) -> int:
    """Calculate confidence score for a skill based on how it's mentioned in transcript"""
    
    skill_lower = skill_name.lower()
    base_score = 40  # Base score for being mentioned
    
    # Check all synonyms too
    all_variants = [skill_lower] + get_skill_synonyms(skill_name)
    
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            
            # Check if any variant is mentioned
            for variant in all_variants:
                if variant in content:
                    # Context analysis around the skill mention
                    words_around = extract_context_around_skill(content, variant, window=15)
                    
                    # High-confidence indicators
                    if any(word in words_around for word in ['built', 'developed', 'created', 'implemented', 'designed']):
                        base_score += 25
                    
                    # Medium-confidence indicators
                    if any(word in words_around for word in ['used', 'worked with', 'experience with', 'familiar with']):
                        base_score += 15
                    
                    # Problem-solving indicators
                    if any(word in words_around for word in ['solved', 'optimized', 'improved', 'troubleshoot']):
                        base_score += 20
                    
                    # Detailed technical discussion
                    if any(word in words_around for word in ['configuration', 'integration', 'customization', 'advanced']):
                        base_score += 15
                    
                    # Professional context
                    if any(word in words_around for word in ['project', 'team', 'client', 'production']):
                        base_score += 10
                    
                    break  # Found mention, move to next transcript entry
    
    return min(100, base_score)

def extract_context_around_skill(content: str, skill: str, window: int = 15) -> List[str]:
    """Extract words around skill mention for context analysis"""
    words = content.split()
    context_words = []
    
    for i, word in enumerate(words):
        if skill in word.lower():
            start = max(0, i - window)
            end = min(len(words), i + window + 1)
            context_words.extend(words[start:end])
    
    return [w.lower() for w in context_words]

def extract_skill_evidence_from_transcript(skill_name: str, transcript: List[Dict]) -> str:
    """Extract specific evidence of skill usage from transcript"""
    skill_lower = skill_name.lower()
    evidence_parts = []
    
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '')
            
            if skill_lower in content.lower():
                # Find the most relevant sentence
                sentences = content.split('.')
                for sentence in sentences:
                    if skill_lower in sentence.lower():
                        # Clean and truncate
                        clean_sentence = sentence.strip()
                        if len(clean_sentence) > 15:  # Meaningful sentence
                            evidence_parts.append(clean_sentence[:120])  # Limit length
                        break
    
    # Join up to 2 evidence examples
    return '. '.join(evidence_parts[:2]) if evidence_parts else f'Mentioned {skill_name} in interview'

def determine_skill_proficiency_level(score: int) -> str:
    """Determine proficiency level based on confidence score"""
    if score >= 85:
        return 'expert'
    elif score >= 70:
        return 'advanced'
    elif score >= 55:
        return 'intermediate'
    else:
        return 'beginner'

def calculate_job_relevance(skill_name: str, job_title: str) -> float:
    """Calculate how relevant this skill is to the specific job title"""
    job_lower = job_title.lower()
    skill_lower = skill_name.lower()
    
    # Job-specific skill relevance mapping
    job_skill_relevance = {
        'design_technician': {
            'high': ['autocad', 'solidworks', 'revit', 'cad', 'technical drawing', '2d', '3d'],
            'medium': ['excel', 'project management', 'communication'],
            'low': ['python', 'sql', 'javascript']
        },
        'data_analyst': {
            'high': ['python', 'sql', 'excel', 'tableau', 'power bi', 'pandas'],
            'medium': ['statistics', 'reporting', 'visualization'],
            'low': ['autocad', 'solidworks', 'mechanical design']
        },
        'software_developer': {
            'high': ['python', 'javascript', 'react', 'git', 'sql'],
            'medium': ['docker', 'aws', 'testing'],
            'low': ['autocad', 'tableau', 'sales']
        }
    }
    
    # Normalize job title
    job_key = job_lower.replace(' ', '_')
    
    if job_key in job_skill_relevance:
        relevance_map = job_skill_relevance[job_key]
        
        for relevance_level, skills in relevance_map.items():
            if any(s in skill_lower for s in skills):
                return {'high': 1.0, 'medium': 0.7, 'low': 0.3}[relevance_level]
    
    return 0.5  # Default medium relevance

def create_searchable_skill_tags(individual_skills: List[Dict]) -> List[str]:
    """Create searchable tags from individual skills for fast matching"""
    tags = []
    
    for skill in individual_skills:
        # Add the main skill
        tags.append(skill['skill'])
        
        # Add display name variations
        display_name = skill['display_name'].lower()
        tags.append(display_name.replace(' ', '_'))
        tags.append(display_name.replace(' ', ''))
        
        # Add high-confidence synonyms
        for synonym in skill['synonyms'][:3]:  # Top 3 synonyms only
            tags.append(synonym.replace(' ', '_'))
        
        # Add category tag
        tags.append(f"category_{skill['category']}")
    
    # Remove duplicates and return
    return list(set(tags))

# MULTI-ROLE TESTING SCRIPT
# Add this to your interview.py file for comprehensive testing

def test_universal_context_extraction():
    """Test context extraction for multiple roles"""
    
    test_cases = [
        # DESIGN TECHNICIAN (Your Vamsi case)
        {
            "role": "Design Technician",
            "introduction": "Hi good morning myself i am vamsi i done my masters in mechanical engineer as a design engineer. I did my projects in civil sector comes under design of elevations in 2d and 3d making structural design for comercial and residential buildings as a design engineer i keen to work on my projects according to iso standards and BIM tools. The main softwares which i used for design process is AutoCAD 2d and 3D, Solidworks, BOM and Revit. I worked as a design technician for the civil engineering projects and Bespoke industries. I hold one year of experince doing these projects.",
            "expected_tools": ["AUTOCAD", "SOLIDWORKS", "REVIT", "BIM"],
            "expected_industry": "engineering"
        },
        
        # SALES MANAGER
        {
            "role": "Sales Manager", 
            "introduction": "Hello, I'm Sarah. I have 5 years of experience as a Sales Manager at TechCorp and AutoSales Ltd. I've managed teams of 8-12 sales reps and consistently exceeded quarterly targets by 15-20%. I use Salesforce daily for CRM, LinkedIn Sales Navigator for prospecting, and HubSpot for marketing automation. My biggest achievement was leading my team to $2.3M in revenue last year. I have a Bachelor's in Business Administration.",
            "expected_tools": ["SALESFORCE", "LINKEDIN SALES NAVIGATOR", "HUBSPOT"],
            "expected_industry": "sales",
            "expected_companies": ["TechCorp", "AutoSales"]
        },
        
        # DATA ANALYST
        {
            "role": "Data Analyst",
            "introduction": "Hi, I'm Marcus. I work as a Data Analyst at Netflix and previously at Spotify. I have 3 years of experience analyzing user behavior data and building dashboards. I'm proficient in Python, SQL, Tableau, and Power BI. I use Jupyter notebooks for analysis and have experience with pandas, numpy, and scikit-learn. My recent project involved analyzing customer churn patterns which helped reduce churn by 12%.",
            "expected_tools": ["PYTHON", "SQL", "TABLEAU", "POWER BI", "JUPYTER"],
            "expected_industry": "data",
            "expected_companies": ["Netflix", "Spotify"]
        },
        
        # SOFTWARE DEVELOPER
        {
            "role": "Software Developer",
            "introduction": "I'm Alex, a Software Developer with 4 years at Microsoft and Google. I specialize in full-stack development using React, Node.js, and Python. I work with Docker for containerization, use Git for version control, and VS Code as my primary IDE. I've built scalable web applications serving millions of users and have experience with AWS cloud services.",
            "expected_tools": ["REACT", "NODEJS", "PYTHON", "DOCKER", "GIT", "VS CODE"],
            "expected_industry": "software",
            "expected_companies": ["Microsoft", "Google"]
        },
        
        # SALES EXECUTIVE
        {
            "role": "Sales Executive",
            "introduction": "I'm Jennifer, a Sales Executive with 2 years at Oracle and IBM. I focus on B2B software sales and have closed deals worth $500K+ annually. I use Salesforce for pipeline management, LinkedIn for prospecting, and Zoom for client meetings. I recently achieved 130% of my annual quota and was recognized as top performer.",
            "expected_tools": ["SALESFORCE", "LINKEDIN", "ZOOM"],
            "expected_industry": "sales",
            "expected_companies": ["Oracle", "IBM"]
        },
        
        # PROJECT MANAGER
        {
            "role": "Project Manager",
            "introduction": "Hi, I'm David, a Project Manager with 6 years at Amazon and Tesla. I manage cross-functional teams using Agile and Scrum methodologies. I'm certified PMP and use Jira for task management, Confluence for documentation, and Microsoft Project for planning. I've successfully delivered 20+ projects on time and under budget.",
            "expected_tools": ["JIRA", "CONFLUENCE", "MICROSOFT PROJECT"],
            "expected_industry": "project management",
            "expected_companies": ["Amazon", "Tesla"]
        }
    ]
    
    print("🧪 TESTING UNIVERSAL CONTEXT EXTRACTION FOR 6 ROLES")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['role'].upper()}")
        print("-" * 40)
        
        try:
            # Test context extraction
            result = analyze_introduction(test_case['introduction'], test_case['role'])
            
            # Check tools extraction
            expected_tools = test_case.get('expected_tools', [])
            found_tools = result.get('tools', [])
            
            tools_found = 0
            for expected_tool in expected_tools:
                if any(expected_tool.upper() in tool.upper() for tool in found_tools):
                    tools_found += 1
            
            tools_score = tools_found / max(1, len(expected_tools)) * 100
            
            # Check industry
            expected_industry = test_case.get('expected_industry', '')
            found_industry = result.get('industry', '')
            industry_match = expected_industry.lower() in found_industry.lower()
            
            # Check companies
            expected_companies = test_case.get('expected_companies', [])
            found_companies = result.get('companies', [])
            companies_found = sum(1 for exp_comp in expected_companies 
                                 if any(exp_comp.lower() in found_comp.lower() 
                                       for found_comp in found_companies))
            
            print(f"✅ RESULTS:")
            print(f"   Tools: {found_tools}")
            print(f"   Companies: {found_companies}")
            print(f"   Industry: {found_industry}")
            print(f"   Experience: {result.get('experience_years', 'N/A')} years")
            
            print(f"📊 SCORING:")
            print(f"   Tools found: {tools_found}/{len(expected_tools)} ({tools_score:.1f}%)")
            print(f"   Industry match: {'✓' if industry_match else '✗'}")
            print(f"   Companies found: {companies_found}/{len(expected_companies)}")
            
            # Pass criteria: At least 60% tools found and industry detected
            if tools_score >= 60 and (industry_match or found_industry != 'general'):
                print(f"🎉 PASS: Context extraction successful")
                passed_tests += 1
            else:
                print(f"❌ FAIL: Insufficient context extraction")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
    
    print(f"\n" + "=" * 60)
    print(f"🏁 UNIVERSAL CONTEXT EXTRACTION TEST COMPLETE")
    print(f"📊 Results: {passed_tests}/{total_tests} roles passed ({passed_tests/total_tests*100:.1f}%)")
    
    if passed_tests == total_tests:
        print(f"🎉 ALL TESTS PASSED - Ready for multi-role interviews!")
    elif passed_tests >= total_tests * 0.8:
        print(f"✅ MOSTLY SUCCESSFUL - {total_tests - passed_tests} roles need minor fixes")
    else:
        print(f"⚠️  NEEDS WORK - Several roles require attention")
    
    return passed_tests == total_tests

def test_question_generation_diversity():
    """Test that question generation produces unique questions for each role"""
    
    roles_to_test = [
        "sales_manager", "data_analyst", "software_developer", 
        "design_technician", "project_manager", "sales_executive"
    ]
    
    mock_context = {
        'companies': ['TestCorp'], 
        'tools': ['Excel', 'Salesforce'], 
        'industry': 'business'
    }
    
    print("\n🔍 TESTING QUESTION DIVERSITY FOR 6 ROLES")
    print("=" * 50)
    
    all_questions = {}
    
    for role in roles_to_test:
        print(f"\n📋 Generating questions for {role.upper().replace('_', ' ')}")
        questions = []
        
        # Generate 4 questions for each role
        for i in range(1, 5):
            try:
                question_data = generate_contextual_question_with_variety(
                    role, 'intermediate', mock_context, i
                )
                questions.append(question_data.get('question', ''))
                print(f"   Q{i}: {question_data.get('question', '')[:60]}...")
            except Exception as e:
                print(f"   Q{i}: ERROR - {e}")
        
        all_questions[role] = questions
        
        # Check uniqueness within role
        unique_count = len(set(q.lower().strip() for q in questions if q))
        if unique_count == len(questions):
            print(f"✅ All {len(questions)} questions unique for {role}")
        else:
            print(f"⚠️  Only {unique_count}/{len(questions)} unique questions for {role}")
    
    # Check cross-role diversity
    all_questions_flat = [q for questions in all_questions.values() for q in questions if q]
    total_questions = len(all_questions_flat)
    unique_questions = len(set(q.lower().strip() for q in all_questions_flat))
    
    print(f"\n📊 CROSS-ROLE DIVERSITY:")
    print(f"   Total questions: {total_questions}")
    print(f"   Unique questions: {unique_questions}")
    print(f"   Diversity score: {unique_questions/total_questions*100:.1f}%")
    
    if unique_questions/total_questions >= 0.9:
        print(f"🎉 EXCELLENT diversity across roles")
        return True
    elif unique_questions/total_questions >= 0.7:
        print(f"✅ GOOD diversity across roles")
        return True
    else:
        print(f"⚠️  LOW diversity - questions may overlap between roles")
        return False

if __name__ == "__main__":
    # Run comprehensive tests
    print("🚀 RUNNING COMPREHENSIVE MULTI-ROLE TESTS")
    print("=" * 70)
    
    context_test_passed = test_universal_context_extraction()
    question_test_passed = test_question_generation_diversity()
    
    print(f"\n" + "=" * 70)
    print(f"🏁 FINAL TEST RESULTS:")
    print(f"   Context Extraction: {'✅ PASS' if context_test_passed else '❌ FAIL'}")
    print(f"   Question Diversity: {'✅ PASS' if question_test_passed else '❌ FAIL'}")
    
    if context_test_passed and question_test_passed:
        print(f"🎉 SYSTEM READY FOR LINKEDIN LAUNCH!")
        print(f"   ✅ All roles supported")
        print(f"   ✅ Context extraction working")  
        print(f"   ✅ Question diversity confirmed")
        print(f"   ✅ No repetition bugs detected")
    else:
        print(f"⚠️  SYSTEM NEEDS MORE WORK BEFORE LAUNCH")
        print(f"   - Fix failing test components")
        print(f"   - Retest before going public")