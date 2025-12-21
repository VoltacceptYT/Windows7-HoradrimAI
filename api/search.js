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
    const { q, format = 'json', kl = 'us-en', count = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ 
        error: 'Missing search query',
        message: 'Please provide a search query using the "q" parameter'
      });
    }
    
    console.log(`Searching for: "${q}"`);
    
    // Call DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=${format}&kl=${kl}&no_html=1&skip_disambig=1&t=SearchEngine`;
    
    console.log('DuckDuckGo API URL:', ddgUrl);
    
    const response = await fetch(ddgUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SearchEngine/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format response for better frontend consumption
    const formattedResponse = {
      query: q,
      abstract: {
        text: data.AbstractText || '',
        source: data.AbstractSource || '',
        url: data.AbstractURL || '',
        heading: data.Heading || ''
      },
      definition: {
        text: data.Definition || '',
        source: data.DefinitionSource || '',
        url: data.DefinitionURL || ''
      },
      image: data.Image || '',
      type: data.Type || '',
      results: [],
      relatedTopics: []
    };
    
    // Process Results (web search results)
    if (data.Results && Array.isArray(data.Results)) {
      formattedResponse.results = data.Results.map(result => ({
        title: result.Text || '',
        url: result.FirstURL || '',
        description: result.Text ? result.Text.split(' — ').slice(1).join(' — ') : '',
        icon: result.Icon ? (result.Icon.URL || '') : ''
      })).slice(0, count);
    }
    
    // Process Related Topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      formattedResponse.relatedTopics = data.RelatedTopics
        .filter(topic => topic.Text && topic.FirstURL)
        .map(topic => ({
          title: topic.Text.split(' — ')[0] || topic.Text,
          url: topic.FirstURL,
          description: topic.Text.includes(' — ') ? 
            topic.Text.split(' — ').slice(1).join(' — ') : '',
          icon: topic.Icon ? (topic.Icon.URL || '') : ''
        }))
        .slice(0, 10);
    }
    
    // If no results from API, try to get some from other sources
    if (formattedResponse.results.length === 0 && formattedResponse.relatedTopics.length === 0) {
      formattedResponse.results = [{
        title: `Search results for "${q}"`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        description: 'View more results on DuckDuckGo',
        icon: ''
      }];
    }
    
    console.log(`Search completed. Found ${formattedResponse.results.length} results and ${formattedResponse.relatedTopics.length} related topics.`);
    
    return res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return a fallback response
    return res.status(500).json({
      error: 'Search service temporarily unavailable',
      message: error.message,
      query: req.query.q || '',
      results: [{
        title: 'Search Error',
        url: `https://duckduckgo.com/?q=${encodeURIComponent(req.query.q || '')}`,
        description: 'Click to search directly on DuckDuckGo',
        icon: ''
      }],
      relatedTopics: []
    });
  }
}