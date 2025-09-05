export default async function handler(req, res) {
  const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || 'http://localhost:5001';
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const response = await fetch(`${AI_BASE_URL}/recruiter/interviews`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch interviews:', error);
    res.status(200).json({ success: true, interviews: [] });
  }
}