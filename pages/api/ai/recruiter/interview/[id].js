// Proxy to get specific interview details for recruiters
export default async function handler(req, res) {
  const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
  const { id } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const response = await fetch(`${AI_BASE_URL}/recruiter/interview/${id}`);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch interview details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch interview details'
    });
  }
}