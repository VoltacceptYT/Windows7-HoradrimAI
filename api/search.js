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
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    
    console.log('DuckDuckGo API URL:', ddgUrl);
    
    // Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(ddgUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('DuckDuckGo API error:', response.status, response.statusText);
      // Return fallback results instead of throwing
      return res.status(200).json({
        query: q,
        abstract: { text: '', source: '', url: '', heading: '' },
        results: [
          {
            title: `Search for "${q}" on DuckDuckGo`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
            description: 'Click to search directly on DuckDuckGo'
          }
        ],
        relatedTopics: []
      });
    }
    
    const data = await response.json();
    console.log('DuckDuckGo API response received');
    
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
    if (data.Results && Array.isArray(data.Results) && data.Results.length > 0) {
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
    
    // If no results, provide fallback
    if (formattedResponse.results.length === 0 && formattedResponse.relatedTopics.length === 0) {
      formattedResponse.results = [
        {
          title: `Search results for "${q}"`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
          description: 'View more results on DuckDuckGo'
        }
      ];
    }
    
    console.log(`Search completed. Found ${formattedResponse.results.length} results`);
    
    return res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return fallback results for any error
    return res.status(200).json({
      query: req.query.q || '',
      abstract: { text: '', source: '', url: '', heading: '' },
      results: [
        {
          title: 'Search Error - Try DuckDuckGo',
          url: `https://duckduckgo.com/?q=${encodeURIComponent(req.query.q || '')}`,
          description: 'Search service temporarily unavailable. Click to search directly on DuckDuckGo.'
        }
      ],
      relatedTopics: []
    });
  }
}