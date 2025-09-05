// API route to save interview results to your backend
import { getAuthHeaders } from '../../utils/auth';

export default async function handler(req, res) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  if (req.method === 'POST') {
    try {
      // Save interview results
      // For now, we'll just log it - you can connect to MongoDB later
      const { candidateInfo, assessment, completedAt } = req.body;
      
      console.log('Saving interview results:', {
        candidate: candidateInfo.email,
        score: assessment.overall_score,
        completedAt
      });
      
      // TODO: Save to MongoDB via your backend
      // const response = await fetch(`${BACKEND_URL}/api/interviews`, {
      //   method: 'POST',
      //   headers: getAuthHeaders(),
      //   body: JSON.stringify(req.body)
      // });
      
      res.status(200).json({ 
        success: true, 
        message: 'Interview results saved' 
      });
    } catch (error) {
      console.error('Failed to save interview:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save interview results' 
      });
    }
  } else if (req.method === 'GET') {
    // Get interview results (for recruiter view)
    try {
      // TODO: Fetch from your backend/database
      // For now, return mock data
      res.status(200).json({
        success: true,
        interviews: []
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch interviews' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}