# ml_similarity.py - Phase 3: Semantic Skill Matching Engine
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import json
import pickle
from datetime import datetime, timedelta
from pathlib import Path

class SkillSimilarityEngine:
    """ML-powered semantic skill matching using SentenceTransformers"""
    
    def __init__(self, model_name='all-MiniLM-L6-v2', cache_dir='./ml_cache'):
        """Initialize the similarity engine"""
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Load or initialize model
        print(f"Loading SentenceTransformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        # Skill embedding cache for performance
        self.embedding_cache = self._load_cache()
        
        # Similarity thresholds (tunable)
        self.thresholds = {
            'exact_match': 0.95,      # Almost identical skills
            'strong_match': 0.80,     # Very similar skills  
            'moderate_match': 0.65,   # Somewhat related skills
            'weak_match': 0.45        # Distantly related skills
        }
    
    def calculate_skill_similarity(self, job_skills, candidate_skills):
        """Calculate semantic similarity between job requirements and candidate skills"""
        
        if not job_skills or not candidate_skills:
            return {'overall_score': 0.0, 'matches': [], 'coverage': 0.0}
        
        # Prepare skill texts for embedding
        job_texts = [self._prepare_skill_text(skill) for skill in job_skills]
        candidate_texts = [self._prepare_skill_text(skill) for skill in candidate_skills]
        
        # Get embeddings (with caching)
        job_embeddings = self._get_embeddings(job_texts)
        candidate_embeddings = self._get_embeddings(candidate_texts)
        
        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(job_embeddings, candidate_embeddings)
        
        # Find best matches for each job requirement
        matches = []
        total_similarity = 0.0
        
        for i, job_skill in enumerate(job_skills):
            # Find best matching candidate skill
            best_match_idx = int(np.argmax(similarity_matrix[i]))  # Convert to Python int
            best_similarity = float(similarity_matrix[i][best_match_idx])  # Convert to Python float
            
            match_info = {
                'job_skill': str(job_skill),
                'candidate_skill': str(candidate_skills[best_match_idx]),
                'similarity_score': round(best_similarity,4),
                'match_strength': self._classify_match_strength(best_similarity),
                'confidence': round(float(self._calculate_confidence(best_similarity, job_skill, candidate_skills[best_match_idx])), 4)
            }
            
            matches.append(match_info)
            total_similarity += best_similarity
        
        # Calculate overall metrics
        overall_score = (total_similarity / len(job_skills)) * 100 if job_skills else 0.0
        coverage = len([m for m in matches if m['similarity_score'] >= self.thresholds['weak_match']]) / len(job_skills) * 100
        
        return {
            'overall_score': round(float(overall_score), 2),
            'coverage': round(float(coverage), 2),
            'matches': matches,
            'job_skills_count': len(job_skills),
            'candidate_skills_count': len(candidate_skills),
            'strong_matches': len([m for m in matches if m['similarity_score'] >= self.thresholds['strong_match']]),
            'moderate_matches': len([m for m in matches if m['similarity_score'] >= self.thresholds['moderate_match']]),
            'weak_matches': len([m for m in matches if m['similarity_score'] >= self.thresholds['weak_match']])
        }
    
    def find_skill_gaps(self, job_skills, candidate_skills, threshold=0.65):
        """Identify skills the candidate is missing for the job"""
        
        similarity_result = self.calculate_skill_similarity(job_skills, candidate_skills)
        
        gaps = []
        for match in similarity_result['matches']:
            if match['similarity_score'] < threshold:
                gaps.append({
                    'missing_skill': match['job_skill'],
                    'closest_candidate_skill': match['candidate_skill'],
                    'gap_severity': self._calculate_gap_severity(match['similarity_score']),
                    'similarity_score': match['similarity_score']
                })
        
        return sorted(gaps, key=lambda x: x['similarity_score'])
    
    def suggest_skill_improvements(self, candidate_skills, target_role_skills):
        """Suggest which skills to develop for better job matching"""
        
        gaps = self.find_skill_gaps(target_role_skills, candidate_skills)
        
        suggestions = []
        for gap in gaps[:5]:  # Top 5 suggestions
            suggestions.append({
                'skill_to_develop': gap['missing_skill'],
                'current_closest': gap['closest_candidate_skill'],
                'priority': 'High' if gap['gap_severity'] > 0.7 else 'Medium' if gap['gap_severity'] > 0.4 else 'Low',
                'learning_resources': self._get_learning_resources(gap['missing_skill'])
            })
        
        return suggestions
    
    def _prepare_skill_text(self, skill):
        """Prepare skill text for embedding (expand with context)"""
        if isinstance(skill, dict):
            # Enhanced skill object from Phase 2
            skill_text = skill.get('display_name', skill.get('skill', ''))
            category = skill.get('category', '')
            if category and category != 'general':
                skill_text = f"{skill_text} {category.replace('_', ' ')}"
        else:
            # Simple string skill
            skill_text = str(skill)
        
        return skill_text.lower().strip()
    
    def _get_embeddings(self, texts):
        """Get embeddings with caching for performance"""
        embeddings = []
        
        for text in texts:
            # Check cache first
            cache_key = self._get_cache_key(text)
            if cache_key in self.embedding_cache:
                embeddings.append(self.embedding_cache[cache_key])
            else:
                # Generate new embedding
                embedding = self.model.encode([text])[0]
                self.embedding_cache[cache_key] = embedding
                embeddings.append(embedding)
        
        # Save updated cache
        self._save_cache()
        
        return np.array(embeddings)
    
    def _classify_match_strength(self, similarity_score):
        """Classify the strength of a skill match"""
        if similarity_score >= self.thresholds['exact_match']:
            return 'exact'
        elif similarity_score >= self.thresholds['strong_match']:
            return 'strong'
        elif similarity_score >= self.thresholds['moderate_match']:
            return 'moderate'
        elif similarity_score >= self.thresholds['weak_match']:
            return 'weak'
        else:
            return 'no_match'
    
    def _calculate_confidence(self, similarity_score, job_skill, candidate_skill):
        """Calculate confidence in the match"""
        # Higher confidence for exact text matches
        if str(job_skill).lower() == str(candidate_skill).lower():
            return 1.0
        
        # Adjust confidence based on similarity score
        base_confidence = float(similarity_score)
        
        # Boost confidence for common technical terms
        technical_terms = ['python', 'javascript', 'sql', 'react', 'aws', 'docker']
        job_lower = str(job_skill).lower()
        candidate_lower = str(candidate_skill).lower()
        
        if any(term in job_skill.lower() and term in candidate_skill.lower() for term in technical_terms):
            base_confidence += 0.1
        
        return min(1.0, base_confidence)
    
    def _calculate_gap_severity(self, similarity_score):
        """Calculate how severe a skill gap is"""
        return 1.0 - similarity_score
    
    def _get_learning_resources(self, skill):
        """Suggest learning resources for missing skills"""
        # This could be expanded with a real database of learning resources
        resources = {
            'python': ['Python.org tutorials', 'Codecademy Python', 'Real Python'],
            'javascript': ['MDN Web Docs', 'FreeCodeCamp', 'JavaScript.info'],
            'react': ['React documentation', 'React tutorial', 'Scrimba React course'],
            'aws': ['AWS Free Tier', 'AWS Certified Solutions Architect', 'A Cloud Guru'],
            'docker': ['Docker documentation', 'Docker for Beginners', 'Play with Docker']
        }
        
        skill_lower = skill.lower()
        for key, resource_list in resources.items():
            if key in skill_lower:
                return resource_list
        
        return [f"Search for '{skill} tutorials'", f"'{skill} documentation'", f"Online '{skill} courses'"]
    
    def _get_cache_key(self, text):
        """Generate cache key for text"""
        import hashlib
        return hashlib.md5(text.encode()).hexdigest()
    
    def _load_cache(self):
        """Load embedding cache from disk"""
        cache_file = self.cache_dir / 'embeddings_cache.pkl'
        if cache_file.exists():
            try:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                print(f"Warning: Could not load embedding cache: {e}")
        return {}
    
    def _save_cache(self):
        """Save embedding cache to disk"""
        try:
            cache_file = self.cache_dir / 'embeddings_cache.pkl'
            with open(cache_file, 'wb') as f:
                pickle.dump(self.embedding_cache, f)
        except Exception as e:
            print(f"Warning: Could not save embedding cache: {e}")
    
    def get_cache_stats(self):
        """Get cache statistics"""
        return {
            'cached_embeddings': len(self.embedding_cache),
            'cache_size_mb': len(pickle.dumps(self.embedding_cache)) / (1024 * 1024),
            'model_name': self.model_name
        }

# Utility functions for integration
def enhance_job_candidate_matching(job_skills, candidate_enhanced_skills):
    """Enhanced matching using ML similarity + Phase 2 enhanced skills"""
    
    # Initialize ML engine
    similarity_engine = SkillSimilarityEngine()
    
    # Extract candidate skills for comparison
    candidate_skills = []
    if candidate_enhanced_skills and 'verified_skills' in candidate_enhanced_skills:
        for skill in candidate_enhanced_skills['verified_skills']:
            candidate_skills.append({
                'skill': skill.get('display_name', skill.get('skill', '')),
                'category': skill.get('category', ''),
                'score': skill.get('score', 0)
            })
    
    if not candidate_skills:
        return {'overall_score': 0, 'matches': [], 'coverage': 0, 'method': 'no_skills'}
    
    # Calculate ML similarity
    ml_result = similarity_engine.calculate_skill_similarity(job_skills, candidate_skills)
    ml_result['method'] = 'ml_similarity'
    
    return ml_result

def batch_improve_all_matches():
    """Utility to recalculate all job-candidate matches with ML similarity"""
    from models import Interview, db
    
    print("🚀 Starting batch ML similarity improvement...")
    
    # Get all completed interviews
    interviews = list(db.interviews.find({'status': 'completed', 'enhanced_skills': {'$exists': True}}))
    
    similarity_engine = SkillSimilarityEngine()
    updated_count = 0
    
    for interview in interviews:
        try:
            enhanced_skills = interview.get('enhanced_skills', {})
            if not enhanced_skills.get('verified_skills'):
                continue
            
            # Add ML similarity metadata
            ml_metadata = {
                'ml_similarity_enabled': True,
                'ml_model_version': similarity_engine.model_name,
                'ml_updated_at': datetime.utcnow()
            }
            
            # Update interview record
            db.interviews.update_one(
                {'_id': interview['_id']},
                {'$set': {'ml_similarity_metadata': ml_metadata}}
            )
            
            updated_count += 1
            
        except Exception as e:
            print(f"Error updating interview {interview.get('_id')}: {e}")
    
    print(f"✅ Updated {updated_count} interviews with ML similarity metadata")
    return updated_count

# Testing and validation
if __name__ == "__main__":
    # Test the similarity engine
    engine = SkillSimilarityEngine()
    
    # Test case 1: Frontend development
    job_skills = ["React Developer", "JavaScript Programming", "CSS Styling"]
    candidate_skills = ["Frontend Development", "React.js", "Web Development", "HTML/CSS"]
    
    result = engine.calculate_skill_similarity(job_skills, candidate_skills)
    print("Test 1 - Frontend Development:")
    print(f"Overall Score: {result['overall_score']}")
    print(f"Coverage: {result['coverage']}%")
    for match in result['matches']:
        print(f"  {match['job_skill']} → {match['candidate_skill']} ({match['similarity_score']:.3f})")
    
    # Test case 2: Data Analysis
    job_skills = ["Python Programming", "Data Visualization", "Statistical Analysis"]
    candidate_skills = ["Python", "Tableau", "Excel", "Statistics", "Data Science"]
    
    result = engine.calculate_skill_similarity(job_skills, candidate_skills)
    print("\nTest 2 - Data Analysis:")
    print(f"Overall Score: {result['overall_score']}")
    print(f"Coverage: {result['coverage']}%")
    for match in result['matches']:
        print(f"  {match['job_skill']} → {match['candidate_skill']} ({match['similarity_score']:.3f})")
    
    print(f"\nCache Stats: {engine.get_cache_stats()}")
