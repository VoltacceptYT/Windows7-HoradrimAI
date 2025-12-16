// api/chat.js - Groq API Backend
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'API key is not configured on the server'
      });
    }
    
    // Get request data
    const { 
      messages, 
      max_tokens = 2048, 
      temperature = 0.7, 
      model = "llama-3.3-70b-versatile" 
    } = req.body;
    
    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log('Calling Groq API with model:', model);
    
    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        stream: false
      })
    });
    
    console.log('Groq API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { error: errorText };
      }
      
      return res.status(response.status).json({ 
        error: 'Groq API error',
        status: response.status,
        details: errorDetails
      });
    }
    
    const data = await response.json();
    console.log('Groq API success, response received');
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}