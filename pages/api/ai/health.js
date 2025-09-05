// Proxy route to check AI service health
// This avoids CORS issues when calling from the browser

export default async function handler(req, res) {
  const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
  
  try {
    const response = await fetch(`${AI_BASE_URL}/health`);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    console.error('AI health check failed:', error);
    res.status(500).json({ 
      error: 'Failed to connect to AI service',
      details: error.message 
    });
  }
}