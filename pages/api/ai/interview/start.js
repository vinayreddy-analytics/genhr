// Proxy route to start an AI interview session
import { getToken } from '../../../../utils/auth';

export default async function handler(req, res) {
  const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Forward the request to AI service
    const response = await fetch(`${AI_BASE_URL}/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      throw new Error(`AI service responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log for debugging
    console.log('Interview started:', {
      success: data.success,
      questions: data.interview_data?.questions?.length,
      level: data.interview_data?.experience_level
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to start interview:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start interview',
      details: error.message 
    });
  }
}