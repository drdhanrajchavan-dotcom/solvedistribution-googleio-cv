export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productDescription } = req.body;
  if (!productDescription) {
    return res.status(400).json({ error: 'Product description is required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment variables' });
  }

  // Set up Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Helper to send SSE events
  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  sendEvent('status', { message: 'Initializing persistent environment...' });

  try {
    // 1. Create a persistent environment by making an initial dummy interaction
    // We upload the AGENTS.md content as part of the initial prompt so it can be written to the workspace.
    // In a full implementation, we'd use the Files API to upload and mount it, but for simplicity here we pass it.
    
    // For this hackathon stub, we simulate the environment creation and the parallel agent runs,
    // since we don't have the real API key and standard environment sharing details yet.
    
    sendEvent('status', { message: 'Environment created. Spawning parallel discovery agents...' });
    
    // Simulate delays and stream partial results
    await new Promise(r => setTimeout(r, 2000));
    sendEvent('agent_start', { agent: 'reddit' });
    sendEvent('agent_start', { agent: 'hn' });
    sendEvent('agent_start', { agent: 'github' });
    sendEvent('agent_start', { agent: 'devto' });
    sendEvent('agent_start', { agent: 'so' });

    await new Promise(r => setTimeout(r, 2500));
    sendEvent('demand', {
      id: 'r_1',
      platform: 'Reddit',
      title: `Need a tool to find where my users are: ${productDescription.substring(0, 20)}...`,
      snippet: 'I have built a cool tool but I have no idea where to post about it...',
      engagement: 342,
      url: 'https://reddit.com/r/SaaS'
    });
    sendEvent('agent_done', { agent: 'reddit' });

    await new Promise(r => setTimeout(r, 1500));
    sendEvent('demand', {
      id: 'hn_1',
      platform: 'Hacker News',
      title: `Ask HN: How do you distribute developer tools?`,
      snippet: 'I usually post to Show HN, but the lifespan of the post is short...',
      engagement: 890,
      url: 'https://news.ycombinator.com/ask'
    });
    sendEvent('agent_done', { agent: 'hn' });

    await new Promise(r => setTimeout(r, 1000));
    sendEvent('agent_done', { agent: 'github' });
    sendEvent('agent_done', { agent: 'devto' });
    sendEvent('agent_done', { agent: 'so' });

    sendEvent('status', { message: 'Discovery complete. Starting Strategy agent...' });
    sendEvent('agent_start', { agent: 'strat' });

    await new Promise(r => setTimeout(r, 3000));
    sendEvent('agent_done', { agent: 'strat' });

    sendEvent('done', { status: 'complete' });
  } catch (error: any) {
    sendEvent('error', { error: error.message });
  } finally {
    res.end();
  }
}
