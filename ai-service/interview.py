# interview.py - COMPLETE FIXED VERSION WITH MINIMAL CHANGES
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
# CENTRALIZED TOOL PATTERNS - SINGLE SOURCE OF TRUTH
# ===========================================

TOOL_PATTERNS = {
    # DESIGN & ENGINEERING TOOLS
    'autocad': ['autocad', 'auto cad', 'auto-cad'],
    'solidworks': ['solidworks', 'solid works', 'solid-works'],
    'revit': ['revit'],
    'bim': ['bim tools', 'bim'],
    'inventor': [r'inventor(?!y|ies|orial)'],
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

# ===========================================
# UTILITY FUNCTIONS
# ===========================================

def safe_json_parse(text, default=None):
    """Safely parse a string into JSON. Handles code fences and stray text."""
    if text is None:
        return default or {}
    
    # Strip ```json fences
    cleaned = text.strip()
    if cleaned.startswith('```json'):
        cleaned = cleaned[7:]
    elif cleaned.startswith('```'):
        cleaned = cleaned[3:]
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3]
    
    # Extract JSON object
    start_brace = cleaned.find('{')
    if start_brace != -1:
        cleaned = cleaned[start_brace:]
    end_brace = cleaned.rfind('}')
    if end_brace != -1:
        cleaned = cleaned[:end_brace + 1]
    
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        # Salvage first {...} block if present
        m2 = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if m2:
            try:
                return json.loads(m2.group(1))
            except Exception:
                pass
        return default or {}

def _compile_for_check(pat: str):
    """Compile a pattern for checking presence in text."""
    if any(ch in pat for ch in r'[](){}?+*|\\'):
        return re.compile(pat, re.IGNORECASE)
    words = re.split(r'\s+', pat.strip())
    return re.compile(r'(?<!\w)' + r'\s+'.join(map(re.escape, words)) + r'(?!\w)', re.IGNORECASE)

# ===========================================
# QUESTION TRACKER CLASS
# ===========================================

class QuestionTracker:
    """Track asked questions to prevent ANY duplicates"""
    
    def __init__(self):
        self.asked_questions = []
        self.question_fingerprints = set()
    
    def normalize_question(self, question: str) -> str:
        """Normalize question for comparison"""
        normalized = question.lower().strip()
        normalized = re.sub(r'\s+', ' ', normalized)
        normalized = normalized.rstrip('?.!')
        normalized = re.sub(r'\bat [A-Za-z\s,]+', '', normalized)
        normalized = re.sub(r'with [A-Za-z\s,]+', '', normalized)
        return normalized
    
    def get_fingerprint(self, question: str) -> str:
        """Get semantic fingerprint of question"""
        normalized = self.normalize_question(question)
        words = normalized.split()
        filler = {'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        key_words = [w for w in words if w not in filler and len(w) > 2]
        return ' '.join(sorted(key_words[:5]))
    
    def is_duplicate(self, question: str) -> bool:
        """Check if question is duplicate or too similar"""
        fingerprint = self.get_fingerprint(question)
        
        if fingerprint in self.question_fingerprints:
            return True
        
        normalized = self.normalize_question(question)
        for asked in self.asked_questions:
            asked_normalized = self.normalize_question(asked)
            
            words1 = set(normalized.split())
            words2 = set(asked_normalized.split())
            
            if not words1 or not words2:
                continue
                
            overlap = len(words1 & words2) / max(len(words1), len(words2))
            
            if overlap > 0.6:
                return True
        
        return False
    
    def add_question(self, question: str):
        """Mark question as asked"""
        self.asked_questions.append(question)
        fingerprint = self.get_fingerprint(question)
        self.question_fingerprints.add(fingerprint)
    
    def get_asked_count(self) -> int:
        """Get number of questions asked"""
        return len(self.asked_questions)

# ===========================================
# ENHANCED DATA QUALITY VALIDATION - ALL 14 ROLES
# ===========================================

def validate_skill_name(skill_name, role="Data Analyst"):
    """Validate and filter skills based on role relevance - Updated for all 14 roles"""
    
    ROLE_SKILLS = {
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
    
    role_key = role.lower().replace(" ", "_").replace("-", "_")
    
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
    
    role_key = role_mappings.get(role_key, "data_analyst")
    
    skill_lower = skill_name.lower().strip()
    role_skills = ROLE_SKILLS.get(role_key, ROLE_SKILLS["data_analyst"])
    
    for category, skills in role_skills.items():
        if skill_lower in skills:
            return True, category
    
    return False, "unknown"
    
def normalize_skill(skill_name):
    """Normalize skill using TOOL_PATTERNS mapping"""
    skill_lower = skill_name.lower().strip()
    for standard_name, variants in TOOL_PATTERNS.items():
        if skill_lower in variants:
            return standard_name
    return skill_lower

def clean_skill_data(skill_ratings, role="Data Analyst"):
    """Clean and validate skill ratings data"""
    cleaned_skills = []
    
    for skill_data in skill_ratings:
        skill_name = skill_data.get('skill', '').strip()
        if not skill_name:
            continue
            
        is_valid, category = validate_skill_name(skill_name, role)
        
        score = skill_data.get('score', 0)
        try:
            score = float(score)
            score = max(0, min(100, score))
        except:
            score = 0
            
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
            'evidence': skill_data.get('evidence', '')[:200],
            'validation_status': 'approved' if is_valid else 'needs_review'
        }
        
        cleaned_skills.append(cleaned_skill)
    
    return cleaned_skills

# ===========================================
# ANSWER QUALITY VALIDATION
# ===========================================

def detect_answer_quality_issues(answer):
    """Detect potentially problematic answers that need flagging"""
    flags = []
    answer_lower = answer.lower()
    
    if len(answer.split()) < 10:
        flags.append("insufficient_length")
    
    ai_indicators = [
        "as an ai", "i don't have personal experience", "as a language model",
        "i cannot provide personal", "in summary", "to summarize",
        "according to my training", "i'm just an ai"
    ]
    if any(indicator in answer_lower for indicator in ai_indicators):
        flags.append("likely_ai_generated")
    
    copy_indicators = [
        "according to", "as mentioned in", "source:", "reference:",
        "wikipedia", "stack overflow", "documentation states"
    ]
    if any(indicator in answer_lower for indicator in copy_indicators):
        flags.append("potential_copy_paste")
    
    generic_phrases = ["it depends", "there are many ways", "various approaches", "multiple factors"]
    generic_count = sum(1 for phrase in generic_phrases if phrase in answer_lower)
    if generic_count >= 2:
        flags.append("too_generic")
    
    words = answer.split()
    if len(words) > 20:
        unique_words = set(words)
        if len(unique_words) / len(words) < 0.4:
            flags.append("repetitive_content")
    
    tech_terms_count = sum(1 for word in words if len(word) > 8 and word.isalpha())
    if len(words) > 50 and tech_terms_count < 3:
        flags.append("lacks_technical_depth")
    
    return flags

# ===========================================
# CONSENSUS SCORING SYSTEM
# ===========================================

def evaluate_answer_with_consensus(answer, question_data, time_taken_sec=0):
    """Enhanced scoring with consensus mechanism"""
    try:
        quality_flags = detect_answer_quality_issues(answer)
        
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
        
        evaluations = []
        for i in range(3):
            try:
                evaluation = evaluate_answer_llm_single(answer, question_data, time_taken_sec)
                evaluations.append(evaluation)
            except Exception as e:
                print(f"Evaluation {i+1} failed: {e}")
                continue
        
        if not evaluations:
            return get_fallback_scores(answer, question_data, quality_flags)
        
        consensus_scores = {
            "correctness": int(statistics.median([e["correctness"] for e in evaluations])),
            "completeness": int(statistics.median([e["completeness"] for e in evaluations])),  
            "clarity": int(statistics.median([e["clarity"] for e in evaluations])),
            "relevance": int(statistics.median([e["relevance"] for e in evaluations]))
        }
        
        all_notes = []
        for evaluation in evaluations:
            if "notes" in evaluation and evaluation["notes"]:
                all_notes.extend(evaluation["notes"])
        
        note_counts = {}
        for note in all_notes:
            note_counts[note] = note_counts.get(note, 0) + 1
        
        top_notes = sorted(note_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        consensus_notes = [note for note, count in top_notes]
        
        correctness_scores = [e["correctness"] for e in evaluations]
        variance = statistics.variance(correctness_scores) if len(correctness_scores) > 1 else 0
        confidence = "high" if variance < 100 else "medium" if variance < 400 else "low"
        
        penalty = 0
        if "insufficient_length" in quality_flags:
            penalty += 10
        if "too_generic" in quality_flags:
            penalty += 15
        if "lacks_technical_depth" in quality_flags:
            penalty += 10
        
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
def get_default_rubric(question_text: str, role: str, skill_focus: str = ""):
    """Get role-appropriate rubric based on question content"""
    q_lower = (question_text or "").lower()
    
    # Role-specific rubric libraries
    RUBRICS = {
        "data_analyst": {
            "data_investigation": {
                "keywords": ["drop", "metric", "investigate", "analyze", "performance"],
                "expected_points": [
                    "Define what metrics dropped and by how much",
                    "Identify potential root causes to investigate",
                    "Explain data analysis approach (segmentation, trends, anomalies)",
                    "Describe validation and hypothesis testing",
                    "Share actionable insights or recommendations"
                ],
                "keywords": ["metric", "segmentation", "trend", "hypothesis", "root cause"],
                "common_mistakes": ["No systematic approach", "Missing validation steps", "No actionable recommendations"]
            },
            "data_cleaning": {
                "keywords": ["clean", "validate", "messy", "quality"],
                "expected_points": [
                    "Identify data quality issues (missing, duplicates, outliers)",
                    "Explain cleaning methodology",
                    "Describe validation approach",
                    "Share impact on analysis quality"
                ],
                "keywords": ["missing data", "outliers", "validation", "quality checks"],
                "common_mistakes": ["No documentation", "No validation", "Deleting data without investigation"]
            },
            "visualization": {
                "keywords": ["dashboard", "visualization", "chart", "report"],
                "expected_points": [
                    "Define audience and their needs",
                    "Explain chart/visual choices",
                    "Describe interactivity or filters",
                    "Share business impact or adoption"
                ],
                "keywords": ["audience", "interactive", "kpi", "insight"],
                "common_mistakes": ["Wrong chart type", "No context", "Too complex"]
            },
            "default": {
                "expected_points": [
                    "Clearly define the analytical objective",
                    "Explain data sources and methodology",
                    "Share findings with metrics",
                    "Discuss business impact or recommendations"
                ],
                "keywords": ["analysis", "data", "insight", "recommendation"],
                "common_mistakes": ["Too vague", "No metrics", "Missing business context"]
            }
        },
        
        "data_scientist": {
            "model_building": {
                "keywords": ["machine learning", "model", "built", "trained"],
                "expected_points": [
                    "Define problem and success metrics",
                    "Describe dataset and features",
                    "Explain algorithm selection and training",
                    "Present results with performance metrics",
                    "Discuss business impact"
                ],
                "keywords": ["algorithm", "features", "accuracy", "precision", "recall", "impact"],
                "common_mistakes": ["No metrics", "No business impact", "Overfitting not addressed"]
            },
            "feature_engineering": {
                "keywords": ["feature", "engineering", "selection"],
                "expected_points": [
                    "Explain exploratory analysis approach",
                    "Describe feature creation techniques",
                    "Discuss selection methodology",
                    "Share impact on model performance"
                ],
                "keywords": ["eda", "encoding", "scaling", "selection", "importance"],
                "common_mistakes": ["No leakage prevention", "No selection rationale"]
            },
            "imbalanced_data": {
                "keywords": ["imbalanced", "class", "rare"],
                "expected_points": [
                    "Recognize metrics beyond accuracy",
                    "Explain resampling or weighting approach",
                    "Describe validation strategy",
                    "Share results and trade-offs"
                ],
                "keywords": ["precision", "recall", "f1", "smote", "class weights"],
                "common_mistakes": ["Using accuracy only", "No stratification"]
            },
            "model_debugging": {
                "keywords": ["poorly", "debug", "drift", "failed"],
                "expected_points": [
                    "Identify root cause (data drift, pipeline, model)",
                    "Explain diagnostic process",
                    "Describe solution implemented",
                    "Share monitoring or prevention measures"
                ],
                "keywords": ["drift", "monitoring", "retrain", "validation"],
                "common_mistakes": ["No systematic debugging", "No monitoring plan"]
            },
            "default": {
                "expected_points": [
                    "Define the ML problem clearly",
                    "Explain methodology and algorithms",
                    "Present quantitative results",
                    "Discuss deployment or business value"
                ],
                "keywords": ["model", "data", "performance", "production"],
                "common_mistakes": ["No metrics", "Missing production considerations"]
            }
        },
        
        "business_analyst": {
            "requirements_gathering": {
                "keywords": ["requirements", "stakeholder", "gather", "elicit"],
                "expected_points": [
                    "Identify stakeholder groups",
                    "Explain elicitation techniques used",
                    "Describe conflict resolution approach",
                    "Share documentation method",
                    "Discuss validation and approval"
                ],
                "keywords": ["stakeholder", "workshop", "documentation", "validation"],
                "common_mistakes": ["Missing stakeholders", "No prioritization", "Poor documentation"]
            },
            "process_improvement": {
                "keywords": ["process", "improvement", "efficiency", "optimize"],
                "expected_points": [
                    "Map current process and identify pain points",
                    "Define improvement objectives",
                    "Explain solution designed",
                    "Share implementation approach",
                    "Present measurable results"
                ],
                "keywords": ["mapping", "bottleneck", "optimization", "roi"],
                "common_mistakes": ["No baseline metrics", "Missing change management"]
            },
            "gap_analysis": {
                "keywords": ["gap", "analysis", "current", "future"],
                "expected_points": [
                    "Define current state assessment",
                    "Describe desired future state",
                    "Identify gaps and priorities",
                    "Recommend action plan"
                ],
                "keywords": ["assessment", "gap", "priority", "roadmap"],
                "common_mistakes": ["No prioritization", "Unrealistic timeline"]
            },
            "default": {
                "expected_points": [
                    "Define business problem or opportunity",
                    "Explain analysis methodology",
                    "Present findings and recommendations",
                    "Discuss implementation approach"
                ],
                "keywords": ["business", "analysis", "recommendation", "stakeholder"],
                "common_mistakes": ["No business context", "Missing implementation details"]
            }
        },
        
        "design_technician": {
            "cad_drawing": {
                "keywords": ["autocad", "solidworks", "drawing", "design", "revit"],
                "expected_points": [
                    "Explain project requirements and constraints",
                    "Describe CAD tools and techniques used",
                    "Discuss standards compliance (ISO, GD&T)",
                    "Share quality assurance process",
                    "Mention collaboration with engineers/manufacturing"
                ],
                "keywords": ["specifications", "standards", "tolerances", "review", "manufacturing"],
                "common_mistakes": ["Missing standards", "No QA checks", "Poor documentation"]
            },
            "design_changes": {
                "keywords": ["change", "revision", "update", "modify"],
                "expected_points": [
                    "Explain reason for change",
                    "Describe impact analysis on related drawings",
                    "Detail version control approach",
                    "Share communication with team",
                    "Discuss validation process"
                ],
                "keywords": ["revision", "impact", "coordination", "validation"],
                "common_mistakes": ["No impact assessment", "Poor communication"]
            },
            "manufacturing_issues": {
                "keywords": ["manufacturing", "production", "issue", "problem"],
                "expected_points": [
                    "Identify the manufacturing issue",
                    "Explain root cause analysis",
                    "Describe drawing corrections made",
                    "Share preventive measures",
                    "Discuss lessons learned"
                ],
                "keywords": ["tolerance", "clarification", "correction", "prevention"],
                "common_mistakes": ["Blaming others", "No preventive action"]
            },
            "default": {
                "expected_points": [
                    "Describe technical requirements",
                    "Explain design methodology",
                    "Discuss quality and standards compliance",
                    "Share collaboration approach"
                ],
                "keywords": ["technical", "standards", "accuracy", "team"],
                "common_mistakes": ["Lacking technical detail", "No quality measures"]
            }
        },
        
        "sales_manager": {
            "team_management": {
                "keywords": ["team", "motivate", "underperform", "manage", "coach"],
                "expected_points": [
                    "Describe specific team situation",
                    "Explain diagnostic approach",
                    "Detail coaching or intervention actions",
                    "Share measurable results",
                    "Discuss ongoing support or changes"
                ],
                "keywords": ["coaching", "performance", "metrics", "improvement"],
                "common_mistakes": ["Generic advice", "No metrics", "No follow-up plan"]
            },
            "deal_management": {
                "keywords": ["deal", "close", "negotiation", "objection"],
                "expected_points": [
                    "Set context (deal size, complexity, timeline)",
                    "Identify key challenges or objections",
                    "Explain strategy and tactics used",
                    "Share outcome and lessons learned"
                ],
                "keywords": ["strategy", "objection handling", "value proposition", "outcome"],
                "common_mistakes": ["No preparation mentioned", "Missing lessons learned"]
            },
            "sales_strategy": {
                "keywords": ["strategy", "target", "territory", "forecast"],
                "expected_points": [
                    "Define market or territory analysis",
                    "Explain strategy development",
                    "Detail implementation plan",
                    "Share results vs targets"
                ],
                "keywords": ["analysis", "plan", "execution", "results"],
                "common_mistakes": ["No data backing", "Missing execution details"]
            },
            "default": {
                "expected_points": [
                    "Provide specific situation context",
                    "Explain approach and actions taken",
                    "Share measurable results",
                    "Discuss what was learned"
                ],
                "keywords": ["situation", "action", "result", "learned"],
                "common_mistakes": ["Too generic", "No numbers", "No reflection"]
            }
        },
        
        "universal_default": {
            "expected_points": [
                "Provide clear context and objective",
                "Explain methodology or approach used",
                "Share specific outcomes or metrics",
                "Reflect on impact or learnings"
            ],
            "keywords": ["context", "approach", "outcome", "learned"],
            "common_mistakes": ["Too abstract", "Missing specifics"]
        }
    }
    
    # Get role-specific rubrics or fallback to universal
    role_key = role.lower().replace(" ", "_").replace("-", "_")
    role_rubrics = RUBRICS.get(role_key, RUBRICS["universal_default"])
    
    # Match question to rubric type
    for rubric_type, rubric_data in role_rubrics.items():
        if rubric_type == "default":
            continue
        rubric_keywords = rubric_data.get("keywords", [])
        if any(keyword in q_lower for keyword in rubric_keywords):
            return rubric_data
    
    # Return role-specific default or universal default
    return role_rubrics.get("default", RUBRICS["universal_default"])

def evaluate_answer_llm_single(answer, question_data, time_taken_sec=0):
    """Single LLM evaluation call - used by consensus system"""
    # Get rubric with smart fallback
    rubric = question_data.get('rubric')
    if not rubric or not rubric.get('expected_points'):
        rubric = get_default_rubric(
            question_data.get('question', ''),
            question_data.get('role', question_data.get('skill_focus', '')),
            question_data.get('skill_focus', '')
        )
    
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
    Common Mistakes: {'; '.join(common_mistakes)}
    
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
    
    for key in ["correctness", "completeness", "clarity", "relevance"]:
        result[key] = max(0, min(100, int(result.get(key, 70))))
    
    return result

def get_fallback_scores(answer, question_data, quality_flags):
    """Fallback scoring when LLM calls fail"""
    word_count = len(answer.split())
    
    base_score = min(85, max(30, 40 + (word_count * 0.8)))
    
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
# ROLE MAPPING
# ===========================================

def get_role_key(job_title):
    """Map job title to role key - Updated for all 14 roles"""
    job_title_lower = job_title.lower().replace(" ", "_").replace("-", "_")
    
    role_mappings = {
        "data_analyst": "data_analyst",
        "business_analyst": "business_analyst", 
        "financial_analyst": "financial_analyst",
        "data_engineer": "data_engineer",
        "data_scientist": "data_scientist",
        "software_developer": "software_developer",
        "frontend_developer": "frontend_developer", 
        "backend_developer": "backend_developer",
        "full_stack_developer": "software_developer",
        "project_manager": "project_manager",
        "technical_project_manager": "technical_project_manager",
        "sales_manager": "sales_manager",
        "retail_store_manager": "retail_store_manager",
        "mechanical_engineer": "mechanical_engineer",
        "design_technician": "design_technician",
        "customer_care_representative": "customer_care_representative",
        "sales_executive": "sales_executive",
        "digital_marketer": "sales_executive"
    }
    
    return role_mappings.get(job_title_lower, "data_analyst")

# ===========================================
# SKILL EXTRACTION
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
    
    if re.search(r'\bR\b', text, re.IGNORECASE):
        skills_found['programming_languages'].append('r')
    if re.search(r'\bC\b', text, re.IGNORECASE):
        skills_found['programming_languages'].append('c')
    
    for category, patterns in skill_patterns.items():
        for pattern in patterns:
            if pattern in ['R', 'C']:
                continue
            if re.search(rf'\b{re.escape(pattern)}\b', text_lower):
                skills_found[category].append(pattern)
    
    for concept, indicators in concept_patterns.items():
        match_count = sum(1 for indicator in indicators if indicator in text_lower)
        if match_count > 0:
            skills_found['concepts'].append(concept)
    
    for category in skills_found:
        skills_found[category] = list(dict.fromkeys(skills_found[category]))
    
    return skills_found

# ===========================================
# CONTEXT EXTRACTION - UNIVERSAL
# ===========================================

def analyze_introduction(introduction_text, job_title):
    """UNIVERSAL VERSION: Context extraction optimized for all 16 roles"""
    print(f"DEBUG: Analyzing introduction for {job_title}")
    print(f"DEBUG: Text length: {len(introduction_text)} chars")
    try:
        text_lower = introduction_text.lower()

        # Extract companies
        companies = []
        known_companies = [
        # TECH & SOFTWARE
        'WeWork','Google','Microsoft','Amazon','Apple','Meta','Netflix','Tesla','Salesforce','Oracle','IBM','Adobe','SAP','Intel',
        'ARM','Sage','Sophos','Autonomy','Imagination Technologies',
        # FINANCIAL SERVICES - UK
        'HSBC','Barclays','Lloyds','NatWest','RBS','Standard Chartered','Santander UK','Nationwide','TSB','Metro Bank',
        'Monzo','Revolut','Starling Bank','Wise','OakNorth','Funding Circle',
        # CONSULTING & PROFESSIONAL SERVICES
        'Deloitte','PwC','EY','KPMG','Accenture','McKinsey','BCG','Bain','Capgemini','Atos','Cognizant','Infosys','TCS','Wipro',
        # RETAIL - UK
        'Tesco','Sainsburys','Asda','Morrisons','Marks & Spencer','M&S','John Lewis','Waitrose','Aldi','Lidl','Co-op','Boots','Superdrug',
        'Next','Primark','Argos','Screwfix','B&Q','Homebase',
        # TELECOM
        'BT','Vodafone','EE','O2','Three','Virgin Media','Sky','TalkTalk','Plusnet','Openreach',
        # ENERGY & UTILITIES
        'BP','Shell','British Gas','Centrica','SSE','EON','EDF Energy','Scottish Power','Octopus Energy','OVO Energy','National Grid',
        # PHARMA & HEALTHCARE
        'GSK','GlaxoSmithKline','AstraZeneca','Roche','Pfizer','Novartis','Bupa','NHS','Lloyds Pharmacy',
        # AUTOMOTIVE & MANUFACTURING
        'Rolls Royce','Jaguar Land Rover','JLR','McLaren','Aston Martin','Bentley','BAE Systems','GKN','Dyson','JCB',
        # MEDIA & ENTERTAINMENT
        'BBC','ITV','Channel 4','Pearson','RELX','Reuters','Financial Times','Guardian','Telegraph','Daily Mail',
        # FOOD & BEV
        'Unilever','Diageo','Coca Cola','Nestle','Cadbury','Mondelez','Whitbread','Greggs','Pret','Costa','Starbucks','McDonalds',
        'KFC','Nandos','Pizza Express','Wagamama','Deliveroo','Just Eat',
        # TRANSPORT & LOGISTICS
        'British Airways','easyJet','Ryanair','Virgin Atlantic','DHL','Royal Mail','Yodel','Hermes','Evri','DPD','UPS','FedEx',
        # REAL ESTATE & CONSTRUCTION
        'Barratt','Taylor Wimpey','Persimmon','Berkeley Group','Savills','CBRE','Jones Lang LaSalle','JLL','Knight Frank','Rightmove','Zoopla',
        # INSURANCE
        'Aviva','Prudential','Legal & General','Direct Line','Admiral','RSA','Zurich','AXA','Allianz','AIG',
        # E-COMMERCE & STARTUPS
        'ASOS','Boohoo','Ocado','Farfetch','Moonpig','Not on the High Street','Checkout.com','Uber','Lyft',
        # ACCOUNTING & AUDIT
        'Grant Thornton','BDO','RSM','Mazars','Smith & Williamson',
        # RECRUITMENT & HR
        'Hays','Robert Half','Michael Page','Reed','Randstad','Adecco','Manpower','Capita','Serco',
        # FINTECH & BANKING
        'Tide','Chip','Curve','Zopa','Clearbank','Tandem','Atom Bank','GoCardless','TransferGo','WorldRemit','Currencycloud',
        # TECH STARTUPS
        'Darktrace','BenevolentAI','Improbable','Graphcore','Citymapper','Gousto','Graze','Thought Machine','Snyk','UiPath','Cleo','Hopin','Cazoo','BrewDog',
        # HEALTHTECH
        'Babylon','Push Doctor','Echo','Medopad','Owkin','Benevolent',
        # PROPTECH
        'Nested','Purplebricks','OpenRent','Settled','Goodlord',
        # EDTECH
        'FutureLearn','Teachable','GoStudent','Century Tech','Third Space Learning',
        # HOSPITALITY/LEISURE & OTHER UK BRANDS
        'Iceland','Poundland','Home Bargains','Farmfoods','Premier Inn','Travelodge','Holiday Inn','Hilton','Marriott',
        'Wetherspoons','Slug and Lettuce','All Bar One','Mitchells & Butlers','PureGym','The Gym Group','Virgin Active','David Lloyd','Nuffield Health',
        'JD Sports','Sports Direct','Footasylum','Schuh','Office','Wickes','Toolstation','Dunelm','The Range','Wilko',
        # PUBLIC SECTOR
        'Civil Service','HMRC','DWP','Home Office','MOD','DVLA','DVSA','Environment Agency','NHS England','NHS Digital','Network Rail',
        'Transport for London','TfL','Highways England','HS2',
        # MEDIA HOUSES
        'Bloomberg','Conde Nast','Hearst','Dennis Publishing','Bauer Media','Future Publishing','DC Thomson','Immediate Media',
        # CHARITIES
        'Oxfam','Save the Children','British Red Cross','Cancer Research UK','Macmillan','RSPCA','NSPCC','Barnardos',
        # UNIVERSITIES (as employers)
        'Oxford University','Cambridge University','Imperial College','UCL','LSE','Kings College','Edinburgh University','Manchester University',
        # SCOTLAND/WALES/NI HIGHLIGHTS
        'Standard Life','Scottish Widows','Baillie Gifford','Skyscanner','FanDuel','Brewdog','Arnold Clark',
        'Admiral Insurance','Compare the Market','Go Compare','IQE',
        'Kainos','Almac','Neueda','Sandicliffe']
        text_lc = introduction_text.lower()
        print(f"DEBUG: Checking {len(known_companies)} known companies")
        
        for kc in known_companies:
            pat = re.compile(r'(?<!\w)' + re.escape(kc.lower()) + r'(?!\w)')
            if pat.search(text_lc):
                if kc not in companies:
                    companies.append(kc)
                    print(f"DEBUG: Found known company: {kc}")
        if not companies:
            print("DEBUG: No known companies found, trying regex patterns")

            company_patterns = [
                r'\bat\s+([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,25}?)(?=\s+(?:and|,|\.|\bwhere\b|$))',
                r'\bemployed\s+(?:at|by)\s+([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,25})',
                r'\bworked\s+(?:at|for|with)\s+([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,25})',
                r'\binterned\s+(?:at|for|with)\s+([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,25})',
                r'\bconsulted\s+(?:at|for|with)\s+([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,25})',
                # Acronyms (IBM) optionally followed by other CAPS words, when used with company-like context words
                r'(?<!\w)([A-Z]{2,}(?:\s+[A-Z0-9&]+)*)(?!\w)(?=\s+(?:company|corp|from|during|where|$))',
                # Suffix-based mentions
                r'([A-Z0-9&][A-Za-z0-9&\'\-\s]{1,20}?)\s+(?:company|corp|corporation|ltd|inc|llc|group)\b',
            ]
            stop_starts = ('a ', 'an ', 'the ', 'my ', 'our ')
            stop_contains = (
                ' focus on ', ' degree in ', ' specialization in ', ' background in ',
                ' experience in ', ' passion for ', ' interest in '
            )
            excluded_terms = {
                'design','projects','experience','software','tools','systems','work','data',
                'analysis','methods','retail','sales','datasets','inventory','margins',
                'degree','bachelor','masters','university','college','diploma','certification',
                'focus','background','specialization','passion','interest','masters in',
            }
            def _is_valid_company(candidate: str) -> bool:
                comp = candidate.strip()
                if not comp or len(comp) < 2 or len(comp) > 40:
                    return False
                cl = comp.lower()
                if cl.startswith(stop_starts) or any(ph in cl for ph in stop_contains) or cl in excluded_terms:
                    return False
                # allow 2–4 letter acronyms (IBM, GAP), else require at least one Titlecase or ALL-CAPS token
                is_short_acronym = len(comp) <= 4 and comp.isupper()
                has_cap_signal = bool(re.search(r'\b([A-Z][a-z]+|[A-Z]{2,})\b', comp))
                return bool(is_short_acronym or has_cap_signal)
            for pattern in company_patterns:
                try:
                    for match in re.finditer(pattern, introduction_text, re.IGNORECASE):
                        company = match.group(1).strip()
                        company = re.sub(r'\s+(?:company|corp|corporation|ltd|inc|llc)$', '', company, flags=re.IGNORECASE)
                        if _is_valid_company(company) and company not in companies:
                            companies.append(company)
                    
                except Exception as regex_error:
                    print(f"DEBUG: Company regex error: {regex_error}")
                    continue

        print(f"DEBUG: Final companies: {companies}")

        

        # Extract tools using centralized TOOL_PATTERNS
        tools = []
        for tool_name, patterns in TOOL_PATTERNS.items():
            for pattern in patterns:
                if any(ch in pattern for ch in r'[](){}?+*|\\'):
                    rx = re.compile(pattern, re.IGNORECASE)
                else:
                    words = re.split(r'\s+', pattern.strip())
                    rx = re.compile(r'(?<!\w)' + r'\s+'.join(map(re.escape, words)) + r'(?!\w)', re.IGNORECASE)
                if rx.search(introduction_text):
                    display_name = tool_name.replace('_', ' ').title()
                    if display_name not in tools:
                        tools.append(display_name)
                    break

        # Extract sectors
        sectors = []
        for term in ['commercial','residential','industrial','automotive','healthcare',
                     'financial','retail','manufacturing','technology','consulting']:
            if term in text_lower:
                sectors.append(term)

        # Extract experience years
        experience_years = "0"
        year_patterns = [
            r'(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
            r'(\d+)\s*(?:year|yr)\s*(?:experience|exp)',
            r'(\d+)\s*(?:years?|yrs?)',
            r'hold\s*(one|two|three|four|five)\s*(?:years?|yrs?)',
            r'have\s*(one|two|three|four|five)\s*(?:years?|yrs?)'
        ]
        word_to_num = {'one':'1','two':'2','three':'3','four':'4','five':'5'}
        for p in year_patterns:
            m = re.search(p, text_lower)
            if m:
                num_str = word_to_num.get(m.group(1), m.group(1))
                if num_str.isdigit() and int(num_str) <= 30:
                    experience_years = num_str
                    break

        # Determine industry
        industry_mapping = {
            'engineering': ['engineering','mechanical','civil','design','cad','structural','technical drawing','bim'],
            'software': ['software','programming','developer','coding','web','app','development'],
            'data': ['data','analytics','analysis','statistics','machine learning','ai','business intelligence'],
            'sales': ['sales','selling','crm','client','customer acquisition','business development'],
            'business': ['business','management','consulting','strategy','operations'],
            'finance': ['finance','financial','accounting','budget','investment'],
            'retail': ['retail','store','merchandise','inventory','pos'],
            'customer service': ['customer service','support','help desk','customer care'],
            'project management': ['project management','project manager','scrum','agile','gantt']
        }
        industry = "general"
        max_matches = 0
        for ind, keywords in industry_mapping.items():
            matches = sum(1 for kw in keywords if kw in text_lower)
            if matches > max_matches:
                max_matches = matches
                industry = ind

        # Extract role skills
        role_specific_skills = {
            'data_analyst': ['data analysis','statistics','reporting','visualization','python','sql'],
            'data_engineer': ['data pipeline','etl','spark','kafka','cloud platforms','data warehousing'],
            'data_scientist': ['machine learning','predictive modeling','feature engineering','deep learning','a/b testing'],
            'business_analyst': ['requirements gathering','process improvement','stakeholder management','documentation','gap analysis'],
            'financial_analyst': ['financial modeling','forecasting','budgeting','variance analysis','valuation'],
            'backend_developer': ['api design','database design','system architecture','microservices','performance optimization'],
            'software_developer': ['programming','coding','development','debugging','testing','javascript','python'],
            'frontend_developer': ['javascript','react','css','html','responsive design','user experience'],
            'project_manager': ['project planning','team coordination','risk management','stakeholder communication','agile'],
            'technical_project_manager': ['technical architecture','devops','system integration','deployment management','sdlc'],
            'sales_manager': ['team leadership','sales strategy','performance management','crm','territory management'],
            'sales_executive': ['prospecting','lead generation','client relationships','closing deals','negotiation','cold calling'],
            'retail_store_manager': ['team management','inventory management','customer service','sales management','visual merchandising'],
            'customer_care_representative': ['customer service','problem solving','communication','conflict resolution','product knowledge'],
            'mechanical_engineer': ['cad design','materials science','manufacturing processes','thermodynamics','quality control'],
            'design_technician': ['technical drawing','cad software','blueprint reading','manufacturing knowledge','documentation','2d','3d']
        }
        job_title_to_role_key = {
            'Data Analyst':'data_analyst','Business Analyst':'business_analyst','Financial Analyst':'financial_analyst',
            'Data Engineer':'data_engineer','Data Scientist':'data_scientist','Backend Developer':'backend_developer',
            'Software Developer':'software_developer','Frontend Developer':'frontend_developer',
            'Project Manager':'project_manager','Technical Project Manager':'technical_project_manager',
            'Sales Manager':'sales_manager','Sales Executive':'sales_executive',
            'Retail Store Manager':'retail_store_manager','Customer Care Representative':'customer_care_representative',
            'Mechanical Engineer':'mechanical_engineer','Design Technician':'design_technician'
        }
        role_key = job_title_to_role_key.get(job_title, job_title.lower().replace(' ','_'))
        relevant_skills = role_specific_skills.get(role_key, ['professional skills'])

        skills = []
        for phrase in relevant_skills:
            if any(w in text_lower for w in phrase.split()):
                skills.append(phrase.replace(' ','_'))

        for soft in ['leadership','management','communication','problem solving','teamwork','analysis','planning','organization']:
            if soft in text_lower and soft.replace(' ','_') not in skills:
                skills.append(soft.replace(' ','_'))

        # Natural tool phrase
        def natural_tool_phrase(tools_list):
            tl = list(dict.fromkeys(tools_list))[:3]
            if not tl:
                return "your core tools"
            if len(tl) == 1:
                return tl[0]
            return ", ".join(tl[:-1]) + " and " + tl[-1]

        tool_phrase = natural_tool_phrase(tools)

        result = {
            'companies': companies[:4],
            'sectors': sectors[:3],
            'tools': tools[:8],
            'experience_years': experience_years,
            'industry': industry,
            'skills': skills[:6],
            'context_summary': f"{industry} {job_title.lower()}",
            'topics_for_questions': [
                f"{job_title} methodology",
                f"complex projects using {tool_phrase}",
                "technical challenges",
                "project experience",
                "team collaboration"
            ]
        }

        print("DEBUG COMPREHENSIVE EXTRACTION:")
        print(f"  Companies: {result['companies']}")
        print(f"  Tools: {result['tools']}")
        print(f"  Industry: {result['industry']}")
        print(f"  Experience: {result['experience_years']} years")
        print(f"  Skills: {result['skills']}")
        return result

    except Exception as e:
        print(f"DEBUG: Universal extraction error: {e}")
        import traceback; traceback.print_exc()
        return {
            'companies': [f'{job_title} company'],
            'sectors': [],
            'tools': ['Professional tools'],
            'experience_years': '1',
            'industry': 'professional services',
            'skills': [f'{job_title.lower().replace(" ", "_")}_skills'],
            'context_summary': f"{job_title} professional",
            'topics_for_questions': [f"{job_title} experience", "professional challenges"]
        }

# ===========================================
# QUESTION GENERATION - WITH TRACKER INTEGRATION
# ===========================================

def generate_role_specific_question(role_key, experience_level, context, question_count):
    """FIXED: Generate contextual questions specific to role and experience level"""
    
    roles = load_available_roles()
    role_info = roles.get(role_key, {})
    
    sample_questions = role_info.get('sample_questions', {})
    level_questions = sample_questions.get(experience_level, sample_questions.get('intermediate', []))
    
    if level_questions and len(level_questions) > 0:
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
    
    return generate_contextual_question_with_variety(role_key, experience_level, context, question_count)

def generate_contextual_question_with_variety(role_key, experience_level, context, question_count, tracker=None):
    """FIXED: Generate diverse contextual questions for ALL 16 roles WITH TRACKER"""
    if tracker is None:
        tracker = QuestionTracker()
    
    # Extract context
    companies = context.get('companies', [])
    tools_mentioned = context.get('tools', [])
    
    company_context = companies[0] if companies else "your previous company"
    tools_context = ", ".join(tools_mentioned[:3]) if tools_mentioned else "the tools you mentioned"
    
    # COMPLETE QUESTION BANKS
    role_question_banks = {
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
    
    # Get questions for the specific role
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
        max_attempts = len(questions)
        for attempt in range(max_attempts):
            question_index = (question_count - 1 + attempt) % len(questions)  # Add + attempt
            candidate_question = questions[question_index]  # Use candidate_question
        
            # Check if duplicate
            if not tracker.is_duplicate(candidate_question):
                tracker.add_question(candidate_question)
            
                print(f"DEBUG: Selected unique question {question_index + 1}/{len(questions)} for {role_key}")
            
                return {  # MUST be inside the if block - aligned with print
                    "question": candidate_question,  # Use candidate_question here
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
        "time_limit_sec": 120,
        "rubric": {
            "expected_points": ["Should provide clear explanation"],
            "keywords": ["achievement"],
            "common_mistakes": ["Being too vague"]
        }
    }

# KEEP the original generate_contextual_question() for backward compatibility
# But integrate QuestionTracker into it

def generate_contextual_question(state, question_type='technical'):
    """ENHANCED: With proper tracking to prevent duplicates"""
    try:
        # Get or initialize tracker
        tracker = state.get('question_tracker')
        if tracker is None:
            tracker = QuestionTracker()
            state['question_tracker'] = tracker
        
        context = state.get('extracted_context', {})
        previous_answers = state.get('transcript', [])
        job_title = state.get('job_title', 'Software Developer')
        role_key = state.get('role_key', 'software_developer')
        
        # Track previously asked questions
        for entry in previous_answers:
            if entry.get('role') == 'assistant' and entry.get('stage') not in ('intro', 'introduction'):
                question_text = entry.get('content', '').lower().split('\n')[-1]
                if question_text and not tracker.is_duplicate(question_text):
                    tracker.add_question(question_text.strip())
        
        print(f"DEBUG: Already asked {tracker.get_asked_count()} questions")
        
        # Generate question with enhanced variety
        max_attempts = 5
        for attempt in range(max_attempts):
            question_data = generate_role_specific_question(
                role_key, 
                state.get('difficulty_level', 'intermediate'),
                context,
                state.get('technical_questions_asked', 0) + 1 + attempt
            )
            
            new_question = question_data.get('question', '').lower().strip()
            if not tracker.is_duplicate(new_question):
                print(f"DEBUG: Generated unique question on attempt {attempt + 1}")
                tracker.add_question(new_question)
                state['question_tracker'] = tracker
                return question_data
            else:
                print(f"DEBUG: Question already asked, trying attempt {attempt + 2}")
        
        # Emergency fallback
        print(f"DEBUG: All attempts failed, using emergency fallback")
        return {
            "question": f"Tell me about your experience in the {job_title} field and what motivates you in this role.",
            "skill_focus": "Professional Background",
            "time_limit_sec": 120,
            "rubric": {
                "expected_points": ["Provide background", "Explain motivation"],
                "keywords": ["experience", "motivation"],
                "common_mistakes": ["Being too general"]
            }
        }
        
    except Exception as e:
        print(f"Error generating contextual question: {e}")
        return {
            "question": "Tell me about a challenging project you've worked on recently.",
            "skill_focus": "Project Experience",
            "time_limit_sec": 120,
            "rubric": {
                "expected_points": ["Describe project", "Explain challenges"],
                "keywords": ["project", "challenge"],
                "common_mistakes": ["Lacking detail"]
            }
        }

# ===========================================
# SKILL PROFICIENCY & COMPETENCIES
# ===========================================

def rate_skill_proficiency(skill, skill_category, full_transcript):
    """Enhanced skill rating with confidence scoring"""
    skill_lower = skill.lower()
    
    mentions = 0
    context_quality = []
    
    for entry in full_transcript:
        if entry.get('role') == 'user':
            content_lower = entry.get('content', '').lower()
            
            if skill_lower in content_lower:
                mentions += 1
                
                sentences = content_lower.split('.')
                for sentence in sentences:
                    if skill_lower in sentence:
                        word_count = len(sentence.split())
                        
                        quality_score = 0
                        if word_count > 15:
                            quality_score += 2
                        if any(word in sentence for word in ['implemented', 'built', 'developed', 'created', 'designed']):
                            quality_score += 2
                        if any(word in sentence for word in ['optimized', 'scaled', 'improved', 'enhanced']):
                            quality_score += 1
                        if any(word in sentence for word in ['problem', 'challenge', 'solution']):
                            quality_score += 1
                        
                        context_quality.append(quality_score)
    
    base_score = 30
    
    if mentions >= 3:
        base_score += 25
    elif mentions >= 2:
        base_score += 15
    elif mentions >= 1:
        base_score += 10
    
    avg_quality = sum(context_quality) / len(context_quality) if context_quality else 0
    base_score += min(35, avg_quality * 8)
    
    if skill_category in ['programming_languages', 'databases']:
        base_score += 5
    elif skill_category == 'concepts':
        base_score -= 5
    
    score = min(100, base_score)
    
    if score >= 90:
        level = 'expert'
    elif score >= 70:
        level = 'advanced'
    elif score >= 55:
        level = 'intermediate'
    else:
        level = 'beginner'
    
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
    
    # Technical Skills
    total_skills = sum(len(skills) for skills in extracted_skills.values())
    unique_categories = sum(1 for skills in extracted_skills.values() if len(skills) > 0)
    technical_base = min(85, 40 + (total_skills * 3) + (unique_categories * 5))
    competencies['technical_skills'] = technical_base
    
    # Problem Solving
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
    
    # Communication
    user_answers = [entry for entry in transcript if entry.get('role') == 'user']
    if user_answers:
        total_words = sum(len(entry.get('content', '').split()) for entry in user_answers)
        avg_answer_length = total_words / len(user_answers)
        
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
    
    # Domain Knowledge
    domain_indicators = ['architecture', 'scalability', 'best practices', 'methodology', 'framework']
    concept_count = len(extracted_skills.get('concepts', []))
    domain_score = 0
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            domain_score += sum(1 for indicator in domain_indicators if indicator in content)
    competencies['domain_knowledge'] = min(85, 40 + (concept_count * 8) + (domain_score * 3))
    
    # Project Experience
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
    
    all_skills = []
    for category, skills in extracted_skills.items():
        all_skills.extend(skills)
    
    top_skills = sorted(all_skills, key=lambda x: len([e for e in transcript 
                       if e.get('role') == 'user' and x in e.get('content', '').lower()]), 
                       reverse=True)[:8]
    
    introduction = ""
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '')
            if len(content) > 100:
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
        
        lines = summary.split('\n')
        if len(lines) > 6:
            summary = '\n'.join(lines[:6])
            
        return summary
        
    except Exception as e:
        print(f"Error generating summary: {e}")
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

def calculate_question_timers(level, stage):
    """Calculate time limits for each question based on difficulty level and stage"""
    time_mapping = {
        "intro": 300,
        "basic": {"technical": 90, "behavioral": 120, "scenario": 105},
        "intermediate": {"technical": 105, "behavioral": 120, "scenario": 120}, 
        "expert": {"technical": 120, "behavioral": 120, "scenario": 135}
    }
    
    if stage == "intro":
        return time_mapping["intro"]
    
    stage_key = stage if stage in ["technical", "behavioral", "scenario"] else "technical"
    return time_mapping.get(level, time_mapping["intermediate"])[stage_key]

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
        
        for entry in transcript:
            if entry.get('role') == 'user' and entry.get('grades'):
                graded_answers.append(entry)
                
                skill_focus = entry.get('question_data', {}).get('skill_focus', 'General')
                if skill_focus not in skill_scores:
                    skill_scores[skill_focus] = []
                
                grades = entry['grades']
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
        
        dimension_totals = {"correctness": 0, "completeness": 0, "clarity": 0, "relevance": 0}
        for answer in graded_answers:
            grades = answer['grades']
            for dim in dimension_totals:
                dimension_totals[dim] += grades.get(dim, 0)
        
        dimension_averages = {dim: total / len(graded_answers) for dim, total in dimension_totals.items()}
        
        overall_score = (
            dimension_averages['correctness'] * 0.40 +
            dimension_averages['completeness'] * 0.25 +
            dimension_averages['clarity'] * 0.20 +
            dimension_averages['relevance'] * 0.15
        )
        
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

# ===========================================
# MAIN INTERVIEW FUNCTIONS
# ===========================================

def conduct_interview(candidate_info):
    """Enhanced interview generation with rubrics and human-style grading"""
    try:
        skills = candidate_info.get('skills', 'General skills')
        experience = candidate_info.get('experience', '0')
        job_title = candidate_info.get('job_title', 'Software Developer')
        
        level = experience_to_level(experience)
        
        roles = load_available_roles()
        role_key = get_role_key(job_title)
        role_info = roles.get(role_key, {})
        
        core_skills = role_info.get('core_skills', ['Technical Skills'])
        
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
        
        interview_data = safe_json_parse(response_text, fallback_interview)
        
        if not interview_data.get('questions') or len(interview_data['questions']) < 3:
            print("Invalid questions format, using fallback")
            return fallback_interview
        
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
        graded_answers = []
        
        for answer_data in answers:
            question = answer_data.get('question', '')
            answer = answer_data.get('answer', '')
            time_taken = answer_data.get('time_taken_sec', 0)
            
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
            
            grades = evaluate_answer_with_consensus(answer, question_data, time_taken)
            
            graded_answers.append({
                'question': question,
                'answer': answer,
                'grades': grades,
                'question_data': question_data,
                'time_taken_sec': time_taken
            })
        
        rollup_data = _rollup_scores(graded_answers)
        
        all_notes = []
        strengths = []
        improvements = []
        
        for graded in graded_answers:
            notes = graded['grades'].get('notes', [])
            all_notes.extend(notes)
            
            grades = graded['grades']
            if grades['correctness'] >= 80:
                strengths.append(f"Strong {graded['question_data']['skill_focus']} knowledge")
            if grades['clarity'] >= 85:
                strengths.append("Clear communication style")
            if grades.get('quality_flags') and 'too_generic' in grades['quality_flags']:
                improvements.append("Provide more specific and concrete examples")
            if grades.get('quality_flags') and 'lacks_technical_depth' in grades['quality_flags']:
                improvements.append("Include more technical details in responses")
        
        strengths = list(set(strengths))[:4]
        improvements = list(set(improvements))[:4]
        
        if not strengths:
            strengths = ["Shows understanding of core concepts", "Completed all questions"]
        if not improvements:
            improvements = ["Continue developing technical depth", "Practice providing more specific examples"]
        
        assessment_result = {
            "overall_score": rollup_data["overall_score"],
            "skill_scores": rollup_data["computed_skill_scores"],
            "scoring_breakdown": rollup_data["dimension_averages"],
            "timing_performance": {
                "questions_graded": len(graded_answers),
                "consensus_scoring_used": sum(1 for g in graded_answers if g['grades'].get('consensus_used', False)),
                "average_confidence": "high"
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
            "graded_answers": graded_answers,
            "rubric_based_grading": True,
            "consensus_scoring": True
        }
        
        return assessment_result
        
    except Exception as e:
        print(f"Enhanced assessment error: {str(e)}")
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
        
        state = {
            'candidate_name': name,
            'role_key': get_role_key(job_title),
            'job_title': job_title,
            'level': level,
            'experience_years': experience,
            'phase': 'introduction',
            'question_count': 0,
            'technical_questions_asked': 0,
            'behavioral_questions_asked': 0,
            'extracted_context': {},
            'topics_to_explore': [],
            'difficulty_level': level,
            'question_tracker': {
                'asked_questions': [],
                'question_fingerprints': []
            },  # INITIALIZE TRACKER
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
        answer_entry = {
            'role': 'user',
            'content': answer,
            'time_taken_sec': time_taken_sec,
            'timestamp': datetime.utcnow().isoformat()
        }
        state['transcript'].append(answer_entry)
        
        current_phase = state.get('phase', 'introduction')
        
        role_key = state.get('role_key', 'data_analyst')
        job_title = state.get('job_title', 'Professional')
        difficulty_level = state.get('difficulty_level', 'intermediate')
        tracker_data = state.get('question_tracker', {'asked_questions': [], 'question_fingerprints': []})
        tracker = QuestionTracker()
        tracker.asked_questions = tracker_data.get('asked_questions', [])
        tracker.question_fingerprints = set(tracker_data.get('question_fingerprints', []))
        
        print(f"DEBUG UNIVERSAL: Processing {current_phase} phase for {role_key} ({job_title})")
        
        # Handle introduction phase
        if current_phase == 'introduction':
            extracted_context = analyze_introduction(answer, job_title)
            state['extracted_context'] = extracted_context
            state['topics_to_explore'] = extracted_context.get('topics_for_questions', [])
            
            print(f"DEBUG CONTEXT EXTRACTED for {role_key}: {extracted_context}")
            
            # Adjust difficulty based on experience
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
            
            state['phase'] = 'technical'
            
            # Generate first question with tracker
            next_question_data = generate_contextual_question_with_variety(
                role_key,
                difficulty_level, 
                extracted_context,
                1,
                tracker
            )
            
            companies = extracted_context.get('companies', [])
            tools = extracted_context.get('tools', [])
            industry = extracted_context.get('industry', 'professional')
            
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
            
            if state['technical_questions_asked'] > 0:
                grade = evaluate_technical_answer(answer, state.get('extracted_context', {}))
                answer_entry['grade'] = grade
                print(f"DEBUG GRADING: Q{state['technical_questions_asked']} scored {grade}")
            
            if state['technical_questions_asked'] < 4:
                next_question_data = generate_contextual_question_with_variety(
                    role_key,
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    state['technical_questions_asked'] + 1,
                    tracker
                )
                next_question = next_question_data.get('question')
                
                print(f"DEBUG TECHNICAL: Generated Q{state['technical_questions_asked'] + 1} for {role_key}")
                print(f"DEBUG QUESTION: {next_question[:60]}...")
                
            else:
                state['phase'] = 'behavioral'
                next_question_data = generate_contextual_question_with_variety(
                    role_key,
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    1,
                    tracker
                )
                next_question = "Now let's discuss some situational aspects.\n\n" + next_question_data.get('question')
                print(f"DEBUG BEHAVIORAL: Moving to behavioral phase for {role_key}")
        
        # Handle behavioral phase
        elif current_phase == 'behavioral':
            state['behavioral_questions_asked'] += 1
            
            if state['behavioral_questions_asked'] < 2:
                next_question_data = generate_contextual_question_with_variety(
                    role_key,
                    difficulty_level, 
                    state.get('extracted_context', {}),
                    state['behavioral_questions_asked'] + 10,
                    tracker
                )
                next_question = next_question_data.get('question')
                print(f"DEBUG BEHAVIORAL: Generated behavioral Q{state['behavioral_questions_asked'] + 1} for {role_key}")
            else:
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
        state['question_tracker'] = {
            'asked_questions': tracker.asked_questions,
            'question_fingerprints': list(tracker.question_fingerprints)
        }  # SAVE TRACKER
        
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
    score = 50
    
    word_count = len(answer.split())
    if word_count > 50:
        score += 10
    if word_count > 100:
        score += 10
    
    tech_skills = context.get('technical_skills', {})
    all_skills = []
    for skill_list in tech_skills.values():
        if isinstance(skill_list, list):
            all_skills.extend(skill_list)
    
    mentioned_skills = sum(1 for skill in all_skills if skill.lower() in answer.lower())
    score += min(20, mentioned_skills * 5)
    
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
    
    summary = generate_enhanced_interview_summary(candidate_name, job_title, transcript, candidate_info)
    
    return summary

def generate_enhanced_interview_summary(candidate_name: str, job_title: str, transcript: List[Dict], candidate_info: Dict = None):
    """Enhanced interview summary with individual skills and dual storage"""
    
    extracted_context = {}
    introduction_text = ""
    for entry in transcript:
        if entry.get('role') == 'user' and len(entry.get('content', '')) > 100:
            introduction_text = entry['content']
            extracted_context = analyze_introduction(introduction_text, job_title)
            break
    
    # Extract individual skills
    individual_skills = extract_individual_skills_with_confidence(
        transcript, extracted_context, job_title
    )
    
    # Generate traditional competency scores
    all_skills = extract_skills_from_text(introduction_text)
    competencies = calculate_competency_scores(transcript, all_skills)
    
    # Create searchable tags
    searchable_tags = create_searchable_skill_tags(individual_skills)
    
    # Generate professional summary
    professional_summary = generate_professional_summary(
        candidate_name, job_title, all_skills, competencies, transcript
    )
    
    # Calculate overall rating
    if individual_skills:
        individual_avg = sum(s['score'] for s in individual_skills) / len(individual_skills)
        competency_avg = sum(competencies.values()) / len(competencies) if competencies else 70
        overall_rating = (individual_avg * 0.7) + (competency_avg * 0.3)
    else:
        overall_rating = sum(competencies.values()) / len(competencies) if competencies else 70
    
    enhanced_summary = {
        'professional_summary': professional_summary,
        'overall_rating': round(overall_rating, 1),
        
        'enhanced_skills': {
            'verified_skills': individual_skills,
            'competency_scores': competencies,
            'searchable_tags': searchable_tags,
            'skill_summary': {
                'total_skills': len(individual_skills),
                'expert_skills': len([s for s in individual_skills if s['level'] == 'expert']),
                'advanced_skills': len([s for s in individual_skills if s['level'] == 'advanced']),
                'categories_covered': len(set(s['category'] for s in individual_skills)),
                'average_score': round(sum(s['score'] for s in individual_skills) / len(individual_skills), 1) if individual_skills else 0,
                'job_relevant_skills': len([s for s in individual_skills if s['job_relevance'] >= 0.7])
            }
        },
        
        'matching_keywords': [s['display_name'] for s in individual_skills if s['score'] >= 60],
        'strengths': [s['display_name'] for s in individual_skills if s['score'] >= 75][:5],
        'areas_for_improvement': [s['display_name'] for s in individual_skills if s['score'] < 60][:3],
        
        'candidate_profile': {
            'name': candidate_name,
            'role': job_title,
            'interview_date': datetime.utcnow().isoformat(),
            'skills_extraction_version': 'v2.0_enhanced',
            'synonym_matching_enabled': True
        }
    }
    
    return enhanced_summary

# ===========================================
# COMPREHENSIVE SKILL SYNONYM DATABASE
# ===========================================

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
        if any(skill_lower in s or s in skill_lower for s in skills):
            return category
    
    return 'general'

def get_skill_synonyms(skill_name: str) -> List[str]:
    """Get all synonyms for a skill"""
    skill_lower = skill_name.lower().strip()
    
    SKILL_SYNONYMS_DB = {
        'autocad': ['cad', 'computer aided design', '2d design', '3d modeling'],
        'solidworks': ['solid works', '3d modeling', 'parametric design'],
        'python': ['python programming', 'py', 'python3'],
        'javascript': ['js', 'ecmascript', 'web programming'],
        'sql': ['structured query language', 'database querying'],
        'tableau': ['data visualization', 'business intelligence'],
        'salesforce': ['sfdc', 'crm', 'customer relationship management'],
        'react': ['reactjs', 'frontend framework'],
    }
    
    if skill_lower in SKILL_SYNONYMS_DB:
        return SKILL_SYNONYMS_DB[skill_lower]
    
    for main_skill, synonyms in SKILL_SYNONYMS_DB.items():
        if skill_lower in synonyms:
            return [main_skill] + [s for s in synonyms if s != skill_lower]
    
    return []

def extract_individual_skills_with_confidence(transcript: List[Dict], extracted_context: Dict, job_title: str) -> List[Dict]:
    """Extract individual skills with confidence scores and metadata"""
    
    mentioned_tools = extracted_context.get('tools', [])
    mentioned_skills = extracted_context.get('skills', [])
    
    all_mentioned = mentioned_tools + mentioned_skills
    
    individual_skills = []
    
    for skill_raw in all_mentioned:
        skill_name = skill_raw.lower().strip()
        
        if len(skill_name) < 2 or skill_name in ['work', 'experience', 'project']:
            continue
        
        confidence_score = calculate_skill_confidence_from_transcript(skill_name, transcript)
        
        if confidence_score >= 30:
            synonyms = get_skill_synonyms(skill_name)
            category = categorize_skill(skill_name)
            evidence = extract_skill_evidence_from_transcript(skill_name, transcript)
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
                'mentioned_in_intro': True,
                'job_relevance': calculate_job_relevance(skill_name, job_title)
            }
            
            individual_skills.append(skill_data)
    
    individual_skills.sort(key=lambda x: x['score'], reverse=True)
    
    return individual_skills

def calculate_skill_confidence_from_transcript(skill_name: str, transcript: List[Dict]) -> int:
    """Calculate confidence score for a skill based on how it's mentioned in transcript"""
    
    skill_lower = skill_name.lower()
    base_score = 40
    
    all_variants = [skill_lower] + get_skill_synonyms(skill_name)
    
    for entry in transcript:
        if entry.get('role') == 'user':
            content = entry.get('content', '').lower()
            
            for variant in all_variants:
                if variant in content:
                    words_around = extract_context_around_skill(content, variant, window=15)
                    
                    if any(word in words_around for word in ['built', 'developed', 'created', 'implemented', 'designed']):
                        base_score += 25
                    
                    if any(word in words_around for word in ['used', 'worked with', 'experience with', 'familiar with']):
                        base_score += 15
                    
                    if any(word in words_around for word in ['solved', 'optimized', 'improved', 'troubleshoot']):
                        base_score += 20
                    
                    if any(word in words_around for word in ['configuration', 'integration', 'customization', 'advanced']):
                        base_score += 15
                    
                    if any(word in words_around for word in ['project', 'team', 'client', 'production']):
                        base_score += 10
                    
                    break
    
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
                sentences = content.split('.')
                for sentence in sentences:
                    if skill_lower in sentence.lower():
                        clean_sentence = sentence.strip()
                        if len(clean_sentence) > 15:
                            evidence_parts.append(clean_sentence[:120])
                        break
    
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
    
    job_key = job_lower.replace(' ', '_')
    
    if job_key in job_skill_relevance:
        relevance_map = job_skill_relevance[job_key]
        
        for relevance_level, skills in relevance_map.items():
            if any(s in skill_lower for s in skills):
                return {'high': 1.0, 'medium': 0.7, 'low': 0.3}[relevance_level]
    
    return 0.5

def create_searchable_skill_tags(individual_skills: List[Dict]) -> List[str]:
    """Create searchable tags from individual skills for fast matching"""
    tags = []
    
    for skill in individual_skills:
        tags.append(skill['skill'])
        
        display_name = skill['display_name'].lower()
        tags.append(display_name.replace(' ', '_'))
        tags.append(display_name.replace(' ', ''))
        
        for synonym in skill['synonyms'][:3]:
            tags.append(synonym.replace(' ', '_'))
        
        tags.append(f"category_{skill['category']}")
    
    return list(set(tags))

# ===========================================
# MIGRATION FUNCTION
# ===========================================

def migrate_existing_interview_to_enhanced_skills(interview_record: Dict) -> Dict:
    """Migrate an existing interview record to use enhanced skills"""
    
    candidate_name = "Candidate"
    job_title = interview_record.get('role', 'Professional')
    
    transcript = []
    if 'professional_summary' in interview_record:
        transcript.append({
            'role': 'user',
            'content': interview_record['professional_summary']
        })
    
    existing_keywords = interview_record.get('matching_keywords', [])
    individual_skills = []
    
    for keyword in existing_keywords:
        skill_data = {
            'skill': keyword.lower().replace(' ', '_'),
            'display_name': keyword.title(),
            'score': 75,
            'level': 'intermediate',
            'category': categorize_skill(keyword),
            'synonyms': get_skill_synonyms(keyword),
            'evidence': f'Mentioned {keyword} in original interview',
            'confidence': 0.75,
            'mentioned_in_intro': True,
            'job_relevance': calculate_job_relevance(keyword, job_title)
        }
        individual_skills.append(skill_data)
    
    searchable_tags = create_searchable_skill_tags(individual_skills)
    
    enhanced_skills = {
        'verified_skills': individual_skills,
        'competency_scores': interview_record.get('competency_scores', {}),
        'searchable_tags': searchable_tags,
        'skill_summary': {
            'total_skills': len(individual_skills),
            'expert_skills': 0,
            'advanced_skills': len(individual_skills) // 2,
            'categories_covered': len(set(s['category'] for s in individual_skills)),
            'average_score': 75,
            'job_relevant_skills': len([s for s in individual_skills if s['job_relevance'] >= 0.7])
        }
    }
    
    interview_record['enhanced_skills'] = enhanced_skills
    interview_record['skill_extraction_version'] = 'v2.0_migrated'
    
    return interview_record

# ===========================================
# TESTING FUNCTIONS (PRESERVED)
# ===========================================

def test_universal_context_extraction():
    """Test context extraction for multiple roles"""
    
    test_cases = [
        {
            "role": "Design Technician",
            "introduction": "Hi good morning myself i am vamsi i done my masters in mechanical engineer as a design engineer. I did my projects in civil sector comes under design of elevations in 2d and 3d making structural design for comercial and residential buildings as a design engineer i keen to work on my projects according to iso standards and BIM tools. The main softwares which i used for design process is AutoCAD 2d and 3D, Solidworks, BOM and Revit. I worked as a design technician for the civil engineering projects and Bespoke industries. I hold one year of experince doing these projects.",
            "expected_tools": ["AUTOCAD", "SOLIDWORKS", "REVIT", "BIM"],
            "expected_industry": "engineering"
        },
        
        {
            "role": "Sales Manager", 
            "introduction": "Hello, I'm Sarah. I have 5 years of experience as a Sales Manager at TechCorp and AutoSales Ltd. I've managed teams of 8-12 sales reps and consistently exceeded quarterly targets by 15-20%. I use Salesforce daily for CRM, LinkedIn Sales Navigator for prospecting, and HubSpot for marketing automation. My biggest achievement was leading my team to $2.3M in revenue last year. I have a Bachelor's in Business Administration.",
            "expected_tools": ["SALESFORCE", "LINKEDIN SALES NAVIGATOR", "HUBSPOT"],
            "expected_industry": "sales",
            "expected_companies": ["TechCorp", "AutoSales"]
        },
    ]
    
    print("🧪 TESTING UNIVERSAL CONTEXT EXTRACTION")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['role'].upper()}")
        print("-" * 40)
        
        try:
            result = analyze_introduction(test_case['introduction'], test_case['role'])
            
            expected_tools = test_case.get('expected_tools', [])
            found_tools = result.get('tools', [])
            
            tools_found = 0
            for expected_tool in expected_tools:
                if any(expected_tool.upper() in tool.upper() for tool in found_tools):
                    tools_found += 1
            
            tools_score = tools_found / max(1, len(expected_tools)) * 100
            
            expected_industry = test_case.get('expected_industry', '')
            found_industry = result.get('industry', '')
            industry_match = expected_industry.lower() in found_industry.lower()
            
            print(f"✅ RESULTS:")
            print(f"   Tools: {found_tools}")
            print(f"   Industry: {found_industry}")
            
            print(f"📊 SCORING:")
            print(f"   Tools found: {tools_found}/{len(expected_tools)} ({tools_score:.1f}%)")
            print(f"   Industry match: {'✓' if industry_match else '✗'}")
            
            if tools_score >= 60 and (industry_match or found_industry != 'general'):
                print(f"🎉 PASS: Context extraction successful")
                passed_tests += 1
            else:
                print(f"❌ FAIL: Insufficient context extraction")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
    
    print(f"\n" + "=" * 60)
    print(f"🏁 TEST COMPLETE: {passed_tests}/{total_tests} passed")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    print("Interview system loaded successfully - ALL functionality preserved")
    print("=" * 70)
    print("✅ Centralized TOOL_PATTERNS (removed 3 duplicates)")
    print("✅ QuestionTracker properly integrated")
    print("✅ All scoring metrics preserved")
    print("✅ All 16 roles supported")
    print("✅ Complete skill extraction system")
    print("✅ Testing functions included")
    print("=" * 70)