
/// pages/api
export default async function handler(req, res) {
  const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const response = await fetch(`${AI_BASE_URL}/interview/dynamic/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to start dynamic interview:', error);
    res.status(500).json({ success: false, error: 'Failed to start interview' });
  }
}