"""
Comprehensive Test Suite for GenHR AI Interview System
Tests all enhanced features including rubric-based grading, LLM evaluation, and dynamic difficulty
"""

import requests
import json
import time
from datetime import datetime
from colorama import init, Fore, Style

# Initialize colorama for colored output
init()

BASE_URL = "http://localhost:5001"

def print_header(text):
    """Print formatted header"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{text}")
    print(f"{'='*60}{Style.RESET_ALL}")

def print_success(text):
    """Print success message"""
    print(f"{Fore.GREEN}✅ {text}{Style.RESET_ALL}")

def print_error(text):
    """Print error message"""
    print(f"{Fore.RED}❌ {text}{Style.RESET_ALL}")

def print_info(text):
    """Print info message"""
    print(f"{Fore.YELLOW}ℹ️  {text}{Style.RESET_ALL}")

def test_1_basic_interview_generation():
    """Test 1: Generate interview questions with rubrics for different levels"""
    print_header("TEST 1: Interview Generation with Rubrics")
    
    test_cases = [
        {
            "name": "Junior Data Analyst",
            "payload": {
                "candidate_info": {
                    "skills": "Python, SQL, Excel",
                    "job_title": "Data Analyst",
                    "experience": "1"  # Should generate BASIC level questions
                }
            }
        },
        {
            "name": "Mid-level Software Developer",
            "payload": {
                "candidate_info": {
                    "skills": "JavaScript, React, Node.js, MongoDB",
                    "job_title": "Software Developer",
                    "experience": "4"  # Should generate INTERMEDIATE level questions
                }
            }
        },
        {
            "name": "Senior Frontend Developer",
            "payload": {
                "candidate_info": {
                    "skills": "React, TypeScript, Redux, Performance Optimization",
                    "job_title": "Frontend Developer",
                    "experience": "7"  # Should generate EXPERT level questions
                }
            }
        }
    ]
    
    results = []
    for test_case in test_cases:
        print(f"\n{Fore.BLUE}Testing: {test_case['name']}{Style.RESET_ALL}")
        
        response = requests.post(f"{BASE_URL}/interview/start", json=test_case['payload'])
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                interview_data = data.get('interview_data', {})
                questions = interview_data.get('questions', [])
                
                print_success(f"Generated {len(questions)} questions")
                print(f"  Experience Level: {interview_data.get('experience_level')}")
                print(f"  Total Time: {interview_data.get('interview_total_time_estimate')} seconds")
                
                # Check if rubrics are present
                rubric_count = sum(1 for q in questions if q.get('rubric'))
                print(f"  Questions with rubrics: {rubric_count}/{len(questions)}")
                
                # Show sample question with rubric
                if questions:
                    q = questions[0]
                    print(f"\n  Sample Question:")
                    print(f"  Q: {q.get('question')[:100]}...")
                    print(f"  Skill Focus: {q.get('skill_focus')}")
                    print(f"  Time Limit: {q.get('time_limit_sec')}s")
                    
                    if q.get('rubric'):
                        rubric = q['rubric']
                        print(f"  Rubric:")
                        print(f"    - Expected Points: {len(rubric.get('expected_points', []))}")
                        print(f"    - Keywords: {len(rubric.get('keywords', []))}")
                        print(f"    - Common Mistakes: {len(rubric.get('common_mistakes', []))}")
                
                results.append({
                    "test": test_case['name'],
                    "success": True,
                    "questions": len(questions),
                    "has_rubrics": rubric_count == len(questions)
                })
            else:
                print_error(f"Failed: {data.get('error')}")
                results.append({"test": test_case['name'], "success": False})
        else:
            print_error(f"HTTP {response.status_code}: {response.text[:100]}")
            results.append({"test": test_case['name'], "success": False})
    
    return results

def test_2_llm_grading_evaluation():
    """Test 2: Test LLM-powered answer grading with different quality answers"""
    print_header("TEST 2: LLM-Powered Answer Grading")
    
    # Test with different quality answers
    test_answers = [
        {
            "name": "High-Quality Technical Answer",
            "payload": {
                "candidate_info": {
                    "skills": "Python, SQL, Data Analysis",
                    "job_title": "Data Analyst",
                    "experience": "3"
                },
                "answers": [{
                    "question": "How would you handle missing data in a large dataset?",
                    "answer": """I would approach missing data systematically. First, I'd analyze the pattern - is it random, systematic, or correlated with other variables? 
                    For random missing data, I'd consider imputation methods: mean/median for numerical data if normally distributed, mode for categorical, 
                    or advanced methods like KNN imputation or MICE for complex patterns. For time series, forward-fill or interpolation might be appropriate.
                    If data is missing not at random, I'd investigate the cause and potentially treat it as a separate category.
                    When more than 40-50% of values are missing, I'd consider dropping the column after assessing its importance.
                    I'd always document my approach and validate results using cross-validation to ensure imputation doesn't introduce bias.""",
                    "skill_focus": "Data Cleaning",
                    "time_taken_sec": 110,
                    "time_limit_sec": 120,
                    "rubric": {
                        "expected_points": [
                            "Analyze pattern of missing data",
                            "Different strategies for different data types",
                            "Consider dropping columns with excessive missing data",
                            "Validation of imputation approach"
                        ],
                        "keywords": ["imputation", "pattern", "MICE", "KNN", "validation"],
                        "common_mistakes": ["One-size-fits-all approach", "Not checking patterns"]
                    }
                }]
            }
        },
        {
            "name": "Medium-Quality Answer",
            "payload": {
                "candidate_info": {
                    "skills": "JavaScript, React",
                    "job_title": "Frontend Developer",
                    "experience": "2"
                },
                "answers": [{
                    "question": "How do you optimize React application performance?",
                    "answer": "To optimize React performance, I use React.memo to prevent unnecessary re-renders and useMemo for expensive calculations. I also make sure to use keys properly in lists and lazy load components when needed.",
                    "skill_focus": "Performance Optimization",
                    "time_taken_sec": 60,
                    "time_limit_sec": 90,
                    "rubric": {
                        "expected_points": [
                            "Mention React.memo and useMemo",
                            "Code splitting and lazy loading",
                            "Virtual DOM optimization",
                            "Performance profiling"
                        ],
                        "keywords": ["memo", "useMemo", "lazy", "performance"],
                        "common_mistakes": ["Not mentioning profiling", "Missing key concepts"]
                    }
                }]
            }
        },
        {
            "name": "Low-Quality/Vague Answer",
            "payload": {
                "candidate_info": {
                    "skills": "Python",
                    "job_title": "Software Developer",
                    "experience": "1"
                },
                "answers": [{
                    "question": "Explain how you would design a REST API",
                    "answer": "I would probably use REST principles and maybe create endpoints for different resources. I think I'd use JSON for the data format.",
                    "skill_focus": "API Design",
                    "time_taken_sec": 30,
                    "time_limit_sec": 90,
                    "rubric": {
                        "expected_points": [
                            "RESTful principles (GET, POST, PUT, DELETE)",
                            "Resource naming conventions",
                            "Status codes",
                            "Authentication",
                            "Versioning"
                        ],
                        "keywords": ["REST", "endpoints", "HTTP", "status codes", "authentication"],
                        "common_mistakes": ["Too vague", "Missing key concepts"]
                    }
                }]
            }
        }
    ]
    
    results = []
    for test in test_answers:
        print(f"\n{Fore.BLUE}Testing: {test['name']}{Style.RESET_ALL}")
        
        response = requests.post(f"{BASE_URL}/interview/assess", json=test['payload'])
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                assessment = data.get('assessment', {})
                
                print_success("Assessment completed")
                print(f"  Overall Score: {assessment.get('overall_score')}/100")
                
                # Show scoring breakdown
                breakdown = assessment.get('scoring_breakdown', {})
                print(f"  Scoring Breakdown:")
                for key, value in breakdown.items():
                    print(f"    • {key}: {value:.1f}/100")
                
                # Show graded answer details
                graded = assessment.get('graded_answers', [])
                if graded and graded[0].get('grades'):
                    grades = graded[0]['grades']
                    print(f"  Rubric Analysis:")
                    print(f"    • Points Covered: {grades.get('rubric_points_covered', 0)}")
                    print(f"    • Keywords Found: {grades.get('keywords_mentioned', 0)}")
                    print(f"    • Common Mistakes: {grades.get('common_mistakes_made', 0)}")
                    print(f"    • Off Topic: {grades.get('off_topic', False)}")
                    print(f"    • Hand-wavey: {grades.get('hand_wavey', False)}")
                
                # Show feedback
                print(f"  Strengths: {', '.join(assessment.get('strengths', [])[:2])}")
                print(f"  Areas to Improve: {', '.join(assessment.get('improvements', [])[:2])}")
                
                results.append({
                    "test": test['name'],
                    "success": True,
                    "score": assessment.get('overall_score'),
                    "expected_quality": test['name'].split('-')[0].lower()
                })
            else:
                print_error(f"Failed: {data.get('error')}")
                results.append({"test": test['name'], "success": False})
        else:
            print_error(f"HTTP {response.status_code}")
            results.append({"test": test['name'], "success": False})
    
    return results

def test_3_dynamic_interview_flow():
    """Test 3: Test dynamic interview with adaptive difficulty"""
    print_header("TEST 3: Dynamic Interview Flow with Difficulty Adaptation")
    
    # Start dynamic interview
    print("\n1. Starting dynamic interview...")
    start_response = requests.post(f"{BASE_URL}/interview/dynamic/start", json={
        "candidate_info": {
            "skills": "Python, Machine Learning, TensorFlow",
            "job_title": "Data Scientist",
            "experience": "4"
        }
    })
    
    if start_response.status_code != 200 or not start_response.json().get('success'):
        print_error("Failed to start dynamic interview")
        return []
    
    state = start_response.json().get('state')
    print_success(f"Interview started - Level: {state.get('level')}")
    
    # Simulate interview conversation
    test_exchanges = [
        {
            "answer": "Hello! I'm excited to be here. I have 4 years of experience in data science, specializing in machine learning and predictive modeling. I've worked extensively with Python, TensorFlow, and various ML frameworks to build and deploy models that have driven significant business value.",
            "time_taken": 45,
            "expected": "introduction"
        },
        {
            "answer": "I would use techniques like cross-validation, specifically k-fold cross-validation, to ensure the model generalizes well. I'd also implement regularization techniques like L1 or L2 to prevent overfitting, monitor training vs validation loss curves, and potentially use dropout layers in neural networks. Early stopping is another technique I frequently employ.",
            "time_taken": 85,
            "expected": "high quality technical"
        },
        {
            "answer": "Um, I think I would just try to use less data or maybe make the model simpler somehow.",
            "time_taken": 20,
            "expected": "low quality - should adapt difficulty"
        }
    ]
    
    results = []
    for i, exchange in enumerate(test_exchanges, 1):
        print(f"\n2.{i} Sending answer {i}...")
        
        reply_response = requests.post(f"{BASE_URL}/interview/dynamic/reply", json={
            "state": state,
            "answer": exchange['answer'],
            "time_taken_sec": exchange['time_taken']
        })
        
        if reply_response.status_code == 200:
            reply_data = reply_response.json()
            if reply_data.get('success'):
                state = reply_data.get('state')
                
                # Check grading if available
                last_grades = None
                for entry in reversed(state.get('transcript', [])):
                    if entry.get('grades'):
                        last_grades = entry['grades']
                        break
                
                if last_grades:
                    print_success(f"Answer graded - Correctness: {last_grades.get('correctness')}/100")
                    difficulty_change = state.get('next_difficulty', 'same')
                    print(f"  Difficulty adjustment: {difficulty_change}")
                
                if not reply_data.get('completed'):
                    next_q = reply_data.get('assistant', 'No question')
                    print(f"  Next question: {next_q[:100]}...")
                else:
                    print_success("Interview completed!")
                    summary = reply_data.get('summary', {})
                    print(f"  Final Score: {summary.get('ratings', {}).get('overall', 'N/A')}")
                
                results.append({
                    "exchange": i,
                    "success": True,
                    "score": last_grades.get('correctness') if last_grades else None
                })
            else:
                print_error(f"Reply failed: {reply_data.get('error')}")
                results.append({"exchange": i, "success": False})
        else:
            print_error(f"HTTP {reply_response.status_code}")
            results.append({"exchange": i, "success": False})
    
    return results

def test_4_timing_penalties():
    """Test 4: Verify timing penalties are applied correctly"""
    print_header("TEST 4: Timing Penalty System")
    
    test_cases = [
        {
            "name": "Within Time Limit (No Penalty)",
            "time_taken": 80,
            "time_limit": 90
        },
        {
            "name": "Slightly Over Time (Small Penalty)",
            "time_taken": 100,
            "time_limit": 90
        },
        {
            "name": "Significantly Over Time (Larger Penalty)",
            "time_taken": 150,
            "time_limit": 90
        }
    ]
    
    results = []
    for test in test_cases:
        print(f"\n{Fore.BLUE}Testing: {test['name']}{Style.RESET_ALL}")
        print(f"  Time taken: {test['time_taken']}s, Limit: {test['time_limit']}s")
        
        payload = {
            "candidate_info": {
                "skills": "Python, SQL",
                "job_title": "Data Analyst",
                "experience": "3"
            },
            "answers": [{
                "question": "Explain database normalization",
                "answer": "Database normalization is the process of organizing data to minimize redundancy. First Normal Form eliminates repeating groups, Second Normal Form removes partial dependencies, and Third Normal Form removes transitive dependencies.",
                "skill_focus": "Database Design",
                "time_taken_sec": test['time_taken'],
                "time_limit_sec": test['time_limit'],
                "rubric": {
                    "expected_points": ["Explain normalization", "Mention normal forms"],
                    "keywords": ["normalization", "redundancy", "dependencies"]
                }
            }]
        }
        
        response = requests.post(f"{BASE_URL}/interview/assess", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                assessment = data.get('assessment', {})
                graded = assessment.get('graded_answers', [])
                
                if graded and graded[0].get('grades'):
                    penalty = graded[0]['grades'].get('timing_penalty_applied', 0)
                    correctness = graded[0]['grades'].get('correctness', 0)
                    
                    if test['time_taken'] <= test['time_limit']:
                        if penalty == 0:
                            print_success(f"No penalty applied (as expected)")
                        else:
                            print_error(f"Unexpected penalty: {penalty}")
                    else:
                        if penalty > 0:
                            print_success(f"Penalty applied: {penalty} points")
                            print(f"  Final correctness score: {correctness}/100")
                        else:
                            print_error("Expected penalty but none applied")
                    
                    results.append({
                        "test": test['name'],
                        "success": True,
                        "penalty": penalty
                    })
            else:
                print_error(f"Assessment failed: {data.get('error')}")
                results.append({"test": test['name'], "success": False})
    
    return results

def test_5_score_rollup():
    """Test 5: Test score rollup with multiple questions"""
    print_header("TEST 5: Score Rollup Across Multiple Questions")
    
    # Create multiple answers with varying quality
    answers = [
        {
            "question": "What is SQL injection and how do you prevent it?",
            "answer": "SQL injection is a security vulnerability where malicious SQL code is inserted into application queries. Prevention includes using parameterized queries, stored procedures, input validation, escaping user inputs, and following the principle of least privilege for database access.",
            "skill_focus": "Security",
            "time_taken_sec": 75,
            "time_limit_sec": 90
        },
        {
            "question": "Explain the difference between supervised and unsupervised learning",
            "answer": "Supervised learning uses labeled data to train models for prediction, like classification and regression. Unsupervised learning finds patterns in unlabeled data through clustering or dimensionality reduction.",
            "skill_focus": "Machine Learning",
            "time_taken_sec": 60,
            "time_limit_sec": 90
        },
        {
            "question": "How would you handle a team conflict?",
            "answer": "I believe in addressing conflicts directly but professionally. I would first listen to all parties involved to understand different perspectives, then facilitate a discussion focused on finding common ground and solutions that benefit the team's goals.",
            "skill_focus": "soft_skills",
            "time_taken_sec": 95,
            "time_limit_sec": 120
        }
    ]
    
    payload = {
        "candidate_info": {
            "skills": "Python, SQL, Machine Learning",
            "job_title": "Data Scientist",
            "experience": "5"
        },
        "answers": answers
    }
    
    print("\nTesting assessment with multiple questions...")
    response = requests.post(f"{BASE_URL}/interview/assess", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            assessment = data.get('assessment', {})
            
            print_success(f"Overall Score: {assessment.get('overall_score')}/100")
            
            # Show skill-specific scores
            skill_scores = assessment.get('skill_scores', {})
            print("\nSkill Breakdown:")
            for skill, score in skill_scores.items():
                print(f"  • {skill}: {score}/100")
            
            # Show dimension averages
            breakdown = assessment.get('scoring_breakdown', {})
            print("\nDimension Averages:")
            for dimension, score in breakdown.items():
                print(f"  • {dimension}: {score:.1f}/100")
            
            # Show timing performance
            timing = assessment.get('timing_performance', {})
            print(f"\nTiming Performance:")
            print(f"  • Questions graded: {timing.get('questions_graded')}")
            print(f"  • Penalties applied: {timing.get('timing_penalties_applied')}")
            
            # Show recommendation
            rec = assessment.get('recommendation', {})
            print(f"\nRecommendation:")
            print(f"  • Fit Score: {rec.get('fit_score')}/100")
            print(f"  • {rec.get('rationale')}")
            print(f"  • Next Steps: {rec.get('next_steps')}")
            
            return [{
                "test": "Multi-question rollup",
                "success": True,
                "overall_score": assessment.get('overall_score'),
                "question_count": len(answers)
            }]
        else:
            print_error(f"Failed: {data.get('error')}")
            return [{"test": "Multi-question rollup", "success": False}]
    else:
        print_error(f"HTTP {response.status_code}")
        return [{"test": "Multi-question rollup", "success": False}]

def run_all_tests():
    """Run all tests and provide summary"""
    print_header("COMPREHENSIVE AI INTERVIEW SYSTEM TEST")
    print(f"Testing URL: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    all_results = []
    
    # Run each test suite
    test_functions = [
        test_1_basic_interview_generation,
        test_2_llm_grading_evaluation,
        test_3_dynamic_interview_flow,
        test_4_timing_penalties,
        test_5_score_rollup
    ]
    
    for test_func in test_functions:
        try:
            results = test_func()
            all_results.extend(results)
        except Exception as e:
            print_error(f"Test failed with error: {str(e)}")
            all_results.append({"test": test_func.__name__, "success": False, "error": str(e)})
    
    # Print summary
    print_header("TEST SUMMARY")
    
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r.get('success'))
    
    print(f"\nTotal Tests Run: {total_tests}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {total_tests - successful_tests}")
    print(f"Success Rate: {(successful_tests/total_tests*100):.1f}%")
    
    if successful_tests == total_tests:
        print_success("\n🎉 ALL TESTS PASSED! Your AI interview system is working perfectly!")
        print("\n✅ Verified Features:")
        print("  • Rubric-based question generation for different experience levels")
        print("  • LLM-powered grading with accurate scoring")
        print("  • Dynamic difficulty adaptation")
        print("  • Timing penalty system")
        print("  • Comprehensive score rollups")
        print("  • Human-style feedback generation")
        print("\n🚀 Your system is ready for frontend integration!")
    else:
        print_error("\n⚠️  Some tests failed. Please review the output above.")
        print("\nFailed tests:")
        for r in all_results:
            if not r.get('success'):
                print(f"  • {r.get('test')}")
    
    return all_results

if __name__ == "__main__":
    # Check if service is running
    try:
        health_check = requests.get(f"{BASE_URL}/health")
        if health_check.status_code == 200:
            print_success("AI Service is running and healthy!")
            time.sleep(1)
        else:
            print_error("AI Service health check failed!")
            exit(1)
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to AI service at {BASE_URL}")
        print_info("Please make sure the service is running: python app.py")
        exit(1)
    
    # Run all tests
    results = run_all_tests()
    
    # Optional: Save results to file
    with open('test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
        print_info("\nTest results saved to test_results.json")