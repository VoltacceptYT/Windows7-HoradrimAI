// api/deepseek.js
export default async function handler(req, res) {
  // Set CORS headers for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured on the server'
      });
    }

    // Log request for debugging
    console.log('Received request with body:', JSON.stringify(req.body, null, 2));

    // Get request data
    const { messages, max_tokens = 2048, temperature = 0.7, model = "deepseek-chat" } = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Call DeepSeek API
    console.log('Calling DeepSeek API...');
    const response = await fetch('https://api.deepseek.com/chat/completions', {
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

    // Log DeepSeek API response status
    console.log('DeepSeek API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'DeepSeek API error',
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('DeepSeek API success, response received');

    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}