from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from pathlib import Path
from interview import (
    conduct_interview, start_skill_assessment, load_available_roles,
    conduct_interview_start_enhanced, conduct_interview_reply_enhanced
)
from ml_similarity import SkillSimilarityEngine
import numpy as np


# Optional database integration
try:
    from models import InterviewSession, Interview
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False
    print("⚠️  Database models not available - running without DB integration")

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def home():
    """Root endpoint with API documentation"""
    return jsonify({
        'message': '🚀 GenHR AI Service API',
        'status': 'running',
        'endpoints': {
            'health_check': 'GET /health',
            'start_interview': 'POST /interview/start',
            'assess_skills': 'POST /interview/assess', 
            'dynamic_interview_start': 'POST /interview/dynamic/start',
            'dynamic_interview_reply': 'POST /interview/dynamic/reply',
            'get_roles': 'GET /roles',
            'recruiter_interviews': 'GET /recruiter/interviews',
            'interview_details': 'GET /recruiter/interview/<id>'
        },
        'test_with': {
            'check_health': 'curl http://localhost:5001/health',
            'list_roles': 'curl http://localhost:5001/roles'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    try:
        available_roles = load_available_roles()
        return jsonify({
            'status': 'healthy',
            'message': 'Enhanced AI service is running!',
            'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
            'available_roles': list(available_roles.keys()) if available_roles else [],
            'total_roles': len(available_roles) if available_roles else 0,
            'database_available': DATABASE_AVAILABLE,
            'enhanced_features': {
                'rubric_based_grading': True,
                'dynamic_difficulty': True,
                'llm_evaluation': True,
                'timing_penalties': True,
                'score_rollup': True,
                'human_style_feedback': True
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'healthy',
            'message': 'Enhanced AI service is running!', 
            'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
            'available_roles': [],
            'error': str(e)
        })

@app.route('/interview/start', methods=['POST'])
def start_interview():
    """Enhanced interview start with rubric-based questions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        candidate_info = data.get('candidate_info', {})
        
        if not candidate_info.get('skills') or not candidate_info.get('job_title'):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: skills and job_title'
            }), 400
        
        # Generate enhanced interview with rubrics
        result = conduct_interview(candidate_info)
        
        # Save session to database if available
        if DATABASE_AVAILABLE:
            try:
                session = InterviewSession.create_session(candidate_info, result)
                result['session_id'] = session['_id']
            except Exception as e:
                print(f"Database save error: {e}")
        
        return jsonify({
            'success': True,
            'interview_data': result
        })
        
    except Exception as e:
        print(f"Enhanced interview start error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/interview/assess', methods=['POST'])
def assess_skills():
    """Enhanced skill assessment with rubric-based grading"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        answers = data.get('answers', [])
        candidate_info = data.get('candidate_info', {})
        
        if not answers:
            return jsonify({
                'success': False,
                'error': 'No answers provided for assessment'
            }), 400
        
        # Enhanced assessment with rubric-based grading
        result = start_skill_assessment(answers, candidate_info)
        
        # Save to database if available
        if DATABASE_AVAILABLE:
            try:
                # Save enhanced interview results
                interview_data = {
                    'candidate_info': candidate_info,
                    'answers': answers,
                    'assessment': result,
                    'interview_type': 'rubric_based_assessment',
                    'enhanced_grading': True
                }
                Interview.save_completed_interview(interview_data, result)
            except Exception as e:
                print(f"Database save error: {e}")
        
        return jsonify({
            'success': True,
            'assessment': result
        })
        
    except Exception as e:
        print(f"Enhanced assessment error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/interview/dynamic/start', methods=['POST'])
def start_dynamic_interview():
    """Start enhanced dynamic interview"""
    try:
        data = request.get_json()
        candidate_info = data.get('candidate_info', {})
        
        # Call the ENHANCED version
        result = conduct_interview_start_enhanced(candidate_info)
        
        if DATABASE_AVAILABLE:
            try:
                session = InterviewSession.create_session(candidate_info, result['state'])
                result['state']['session_id'] = session['_id']
                print(f"DEBUG: Created session with ID: {session['_id']}")
            except Exception as e:
                print(f"Database error: {e}")
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/interview/dynamic/reply', methods=['POST'])
def dynamic_interview_reply():
    """Process dynamic interview reply with enhanced grading"""
    try:
        data = request.get_json()
        state = data.get('state', {})
        answer = data.get('answer', '')
        time_taken_sec = data.get('time_taken_sec', 0)
        
        if not answer.strip():
            return jsonify({
                'success': False,
                'error': 'Answer cannot be empty'
            }), 400
        
        # Call the ENHANCED version
        result = conduct_interview_reply_enhanced(state, answer, time_taken_sec)
        if result.get('completed'):
            summary = result.get('summary', {})
            print("=" * 60)
            print("🧪 DEBUGGING ENHANCED SUMMARY:")
            print(f"Summary keys: {list(summary.keys())}")
            
            # Check for enhanced_skills field
            if 'enhanced_skills' in summary:
                enhanced = summary['enhanced_skills']
                print(f"✅ enhanced_skills found!")
                print(f"   - verified_skills: {len(enhanced.get('verified_skills', []))} skills")
                print(f"   - searchable_tags: {len(enhanced.get('searchable_tags', []))} tags")
                
                # Print first few skills
                skills = enhanced.get('verified_skills', [])
                for i, skill in enumerate(skills[:3]):
                    print(f"   - Skill {i+1}: {skill.get('display_name')} ({skill.get('score')}/100)")
            else:
                print("❌ enhanced_skills field MISSING from summary!")
                print("Available fields:", list(summary.keys()))
            
            # Check for old fields too
            if 'matching_keywords' in summary:
                print(f"📋 matching_keywords: {summary['matching_keywords']}")
            
            print("=" * 60)

        
        # DEBUG: Check what's in the result
        print(f"DEBUG: Result keys: {result.keys()}")
        print(f"DEBUG: Is completed? {result.get('completed', False)}")
        print(f"DEBUG: Has summary? {bool(result.get('summary'))}")
        
        # Update database with enhanced grading data
        if DATABASE_AVAILABLE and result.get('state', {}).get('session_id'):
            try:
                session_id = result['state']['session_id']
                print(f"DEBUG: Session ID: {session_id}")
                
                # Determine status
                status = 'completed' if result.get('completed') else 'in_progress'
                print(f"DEBUG: Status: {status}")
                
                # Update session
                InterviewSession.update_session(session_id, result['state'], status)
                print(f"DEBUG: Session updated with status: {status}")
                
                # Save completed interview with enhanced data
                if result.get('completed'):
                    print(f"DEBUG: Interview marked as completed")
                    
                    if result.get('summary'):
                        print(f"DEBUG: Summary exists with keys: {result['summary'].keys()}")
                        
                        # Get session data
                        session_data = InterviewSession.get_session(session_id)
                        
                        if session_data:
                            print(f"DEBUG: Session data retrieved, calling save_completed_interview...")
                            Interview.save_completed_interview(session_data, result['summary'])
                            print(f"DEBUG: Interview should be saved now in 'interviews' collection")
                        else:
                            print(f"DEBUG: ERROR - No session data found for {session_id}")
                    else:
                        print(f"DEBUG: ERROR - No summary in result")
                else:
                    print(f"DEBUG: Interview not marked as completed yet")
                    
            except Exception as e:
                print(f"DEBUG: Database update error: {e}")
                import traceback
                traceback.print_exc()
        else:
            if not DATABASE_AVAILABLE:
                print("DEBUG: Database not available")
            if not result.get('state', {}).get('session_id'):
                print("DEBUG: No session_id in state")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"DEBUG: Route error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/roles', methods=['GET'])
def get_roles():
    try:
        roles = load_available_roles()
        return jsonify({
            'success': True,
            'roles': roles
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/ml/skill-similarity', methods=['POST'])
def calculate_ml_skill_similarity():
    """Calculate ML-powered skill similarity"""
    try:
        data = request.get_json()
        job_skills = data.get('job_skills', [])
        candidate_enhanced_skills = data.get('candidate_enhanced_skills', {})
        
        if not job_skills:
            return jsonify({'success': False, 'error': 'job_skills required'}), 400
        
        # Initialize ML engine
        similarity_engine = SkillSimilarityEngine()
        
        # Extract candidate skills from enhanced_skills structure
        candidate_skills = []
        if candidate_enhanced_skills and 'verified_skills' in candidate_enhanced_skills:
            for skill in candidate_enhanced_skills['verified_skills']:
                candidate_skills.append(skill.get('display_name', skill.get('skill', '')))
        
        if not candidate_skills:
            return jsonify({
                'success': True,
                'similarity_result': {'overall_score': 0, 'matches': [], 'coverage': 0, 'method': 'no_skills'}
            })
        
        # Calculate ML similarity
        result = similarity_engine.calculate_skill_similarity(job_skills, candidate_skills)
        result['method'] = 'ml_similarity'
        
        return jsonify({
            'success': True,
            'similarity_result': result
        })
        
    except Exception as e:
        print(f"ML similarity error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Enhanced recruiter endpoints (if database available)
if DATABASE_AVAILABLE:
    @app.route('/recruiter/interviews', methods=['GET'])
    def get_completed_interviews():
        try:
            job_title = request.args.get('job_title')
            limit = int(request.args.get('limit', 50))
            
            interviews = Interview.get_interviews_for_role(job_title, limit)
            
            return jsonify({
                'success': True,
                'interviews': interviews,
                'total': len(interviews),
                'enhanced_grading': True
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/recruiter/interview/<interview_id>', methods=['GET'])
    def get_interview_details(interview_id):
        try:
            interview = Interview.get_interview_details(interview_id)
            
            if not interview:
                return jsonify({'success': False, 'error': 'Interview not found'}), 404
            
            return jsonify({
                'success': True,
                'interview': interview,
                'enhanced_grading': True
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("🤖 Starting Enhanced GenHR AI Service...")
    print(f"📡 OpenAI API Key configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    print(f"🗄️  Database integration: {'Enabled' if DATABASE_AVAILABLE else 'Disabled'}")
    
    try:
        roles = load_available_roles()
        print(f"📋 Loaded {len(roles)} job roles from roles.json")
    except Exception as e:
        print(f"⚠️  Warning: Could not load roles.json - {str(e)}")
    
    print("✨ Enhanced Features:")
    print("   🎯 Rubric-based question generation")
    print("   🧠 LLM-powered answer evaluation") 
    print("   📊 Dynamic difficulty adaptation")
    print("   ⏱️  Timing penalty system")
    print("   📈 Comprehensive score rollups")
    print("   💬 Human-style feedback")
    
    print(f"🚀 Starting server on http://localhost:5001")
    app.run(debug=True, port=5001, host='0.0.0.0')