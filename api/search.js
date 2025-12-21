// api/search.js - DuckDuckGo Search API Backend
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }
  
  try {
    // Get search query from query parameters
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ 
        error: 'Missing search query',
        message: 'Please provide a search query using the "q" parameter'
      });
    }
    
    console.log(`Searching for: "${q}"`);
    
    // Call DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&t=SearchEngine`;
    
    console.log('DuckDuckGo API URL:', ddgUrl);
    
    const response = await fetch(ddgUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SearchEngine/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format response
    const formattedResponse = {
      query: q,
      abstract: {
        text: data.AbstractText || '',
        source: data.AbstractSource || '',
        url: data.AbstractURL || '',
        heading: data.Heading || ''
      },
      image: data.Image || '',
      results: [],
      relatedTopics: []
    };
    
    // Process Results
    if (data.Results && Array.isArray(data.Results)) {
      formattedResponse.results = data.Results.slice(0, 10).map(result => ({
        title: result.Text ? result.Text.split(' — ')[0] : 'Untitled',
        url: result.FirstURL || '',
        description: result.Text ? result.Text.split(' — ').slice(1).join(' — ') : 'No description'
      }));
    }
    
    // Process Related Topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      formattedResponse.relatedTopics = data.RelatedTopics
        .filter(topic => topic.Text && topic.FirstURL)
        .slice(0, 6)
        .map(topic => ({
          title: topic.Text.split(' — ')[0] || topic.Text,
          url: topic.FirstURL,
          description: topic.Text.includes(' — ') ? 
            topic.Text.split(' — ').slice(1).join(' — ') : ''
        }));
    }
    
    // If no results at all, provide a fallback
    if (formattedResponse.results.length === 0 && formattedResponse.relatedTopics.length === 0 && !formattedResponse.abstract.text) {
      formattedResponse.results = [{
        title: `Search for "${q}"`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        description: 'Click to search directly on DuckDuckGo'
      }];
    }
    
    console.log(`Search completed. Found ${formattedResponse.results.length} results.`);
    
    return res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return a simple error response
    return res.status(500).json({
      error: 'Search service temporarily unavailable',
      message: error.message,
      query: req.query.q || '',
      results: [],
      relatedTopics: []
    });
  }
}