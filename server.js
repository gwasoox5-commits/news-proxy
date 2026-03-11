import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정 - 모든 origin 허용
app.use(cors());

// 헬스 체크
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'News Proxy Server',
    endpoints: {
      health: '/',
      news: '/api/news/:category'
    }
  });
});

// 뉴스 프록시 엔드포인트
app.get('/api/news/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // 카테고리별 키워드 매핑
    const keywordMap = {
      'generative-ai': ['generative AI', 'ChatGPT', 'large language model', 'LLM', 'GPT-4'],
      'data-analytics': ['data analytics', 'business intelligence', 'Snowflake', 'data warehouse'],
      'fintech': ['fintech', 'digital payment', 'embedded finance', 'neobank'],
      'digital-healthcare': ['digital health', 'telemedicine', 'healthtech', 'remote patient monitoring'],
      'biotech': ['biotech', 'gene therapy', 'CRISPR', 'drug discovery', 'synthetic biology'],
      'climate-tech': ['climate tech', 'carbon capture', 'CCUS', 'renewable energy', 'sustainability'],
      'energy-tech': ['energy storage', 'battery technology', 'smart grid', 'hydrogen'],
      'mobility': ['electric vehicle', 'autonomous driving', 'EV', 'self-driving', 'Tesla'],
      'robotics': ['robotics', 'industrial robot', 'service robot', 'automation', 'cobot'],
      'industrial-tech': ['Industry 4.0', 'smart manufacturing', 'IIoT', 'digital factory'],
      'supply-chain': ['supply chain', 'logistics tech', 'warehouse automation', 'freight'],
      'commerce-retail': ['e-commerce', 'retail tech', 'omnichannel', 'D2C'],
      'creator-economy': ['creator economy', 'content platform', 'influencer', 'social commerce'],
      'edtech-hrtech': ['edtech', 'HR tech', 'learning platform', 'online education'],
      'proptech': ['proptech', 'real estate tech', 'smart building', 'co-working'],
      'agritech': ['agritech', 'precision agriculture', 'vertical farming', 'food tech'],
      'web3': ['Web3', 'blockchain', 'cryptocurrency', 'DeFi', 'NFT', 'digital asset'],
      'xr': ['metaverse', 'virtual reality', 'augmented reality', 'VR', 'AR', 'spatial computing']
    };
    
    const keywords = keywordMap[category] || ['technology', 'startup'];
    const searchQuery = keywords.slice(0, 5).map(k => `"${k}"`).join(' OR ');
    
    // Google News RSS URL
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    
    console.log(`[${new Date().toISOString()}] Fetching news for category: ${category}`);
    console.log(`Query: ${searchQuery}`);
    
    // Google News RSS 가져오기
    const response = await fetch(googleNewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google News API returned ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // XML 파싱 (간단한 정규식 사용)
    const articles = parseGoogleNewsRSS(xmlText);
    
    console.log(`[${new Date().toISOString()}] Found ${articles.length} articles`);
    
    res.json({
      category,
      keywords: keywords.slice(0, 5),
      news: articles.slice(0, 10), // 상위 10개만
      source: 'Google News RSS (Proxy)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error.message,
      category: req.params.category
    });
  }
});

// Google News RSS 파싱 함수
function parseGoogleNewsRSS(xmlText) {
  const articles = [];
  
  try {
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s);
      const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/s);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/s);
      const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s);
      const sourceMatch = itemContent.match(/<source[^>]*>(.*?)<\/source>/s);
      
      if (titleMatch && linkMatch) {
        let title = titleMatch[1].trim();
        let url = linkMatch[1].trim();
        
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()) : new Date();
        
        let description = '';
        if (descMatch) {
          description = descMatch[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()
            .substring(0, 300);
        }
        
        const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown';
        
        articles.push({
          title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          url,
          source,
          published_at: pubDate.toISOString(),
          description: description || title,
          language: 'EN',
          trust_score: 0
        });
      }
    }
  } catch (error) {
    console.error('Error parsing RSS:', error);
  }
  
  return articles;
}

app.listen(PORT, () => {
  console.log(`News Proxy Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`News endpoint: http://localhost:${PORT}/api/news/:category`);
});
