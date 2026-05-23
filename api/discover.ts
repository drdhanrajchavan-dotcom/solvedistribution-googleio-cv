import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
  }

  // Set up Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  sendEvent('status', { message: 'Initializing 5 parallel sandboxes...' });

  // Define prompts based on original project plan
  const agents = [
    {
      id: 'reddit',
      prompt: `You are a demand intelligence agent specialized in Reddit. PRODUCT: ${productDescription}. TASK: Find 5-10 Reddit threads from the last 180 days where people need this product. Query Reddit's public JSON search. Extract thread_url, subreddit, title, body_snippet, num_comments, score, verbatim_phrases. Return JSON object {"platform": "reddit", "threads": [...]}. Stop after 10 results or 60s. Return JSON only, no preamble.`
    },
    {
      id: 'hn',
      prompt: `You are a demand intelligence agent specialized in Hacker News. PRODUCT: ${productDescription}. TASK: Find 5-10 HN stories/comments where people need this product. Query hn.algolia.com/api/v1/search?query=QUERY&tags=story. Extract story_url (use objectID), title, points, num_comments, verbatim_phrases. Return JSON: {"platform": "hackernews", "threads": [...]}. Stop after 10 results or 60s. JSON only.`
    },
    {
      id: 'github',
      prompt: `You are a demand intelligence agent specialized in GitHub. PRODUCT: ${productDescription}. TASK: Find 5 open GitHub issues where people need this product. Query api.github.com/search/issues. Extract html_url, title, body_snippet, reactions_total, verbatim_phrases. Return JSON: {"platform": "github", "threads": [...]}. Stop after 10 results or 60s. JSON only.`
    },
    {
      id: 'devto',
      prompt: `You are a demand intelligence agent specialized in Dev.to. PRODUCT: ${productDescription}. TASK: Find 5 Dev.to articles where developers need this product. Query dev.to/api/articles. Extract url, title, body_snippet, public_reactions_count, verbatim_phrases. Return JSON: {"platform": "devto", "threads": [...]}. Stop after 10 results or 60s. JSON only.`
    },
    {
      id: 'so',
      prompt: `You are a demand intelligence agent specialized in Stack Overflow. PRODUCT: ${productDescription}. TASK: Find 5 Stack Overflow questions needing this product. Query api.stackexchange.com/2.3/search/advanced. Extract link, title, score, answer_count, verbatim_phrases. Return JSON: {"platform": "stackoverflow", "threads": [...]}. Stop after 10 results or 60s. JSON only.`
    }
  ];

  const fetchAgent = async (agent: typeof agents[0]) => {
    sendEvent('agent_start', { agent: agent.id });
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
          'Api-Revision': '2026-05-20'
        },
        body: JSON.stringify({
          agent: 'antigravity-preview-05-2026',
          input: agent.prompt,
          environment: { type: 'remote' }
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      // Parse output
      let textOutput = '';
      if (data.steps) {
        const modelSteps = data.steps.filter((s: any) => s.type === 'model_output');
        if (modelSteps.length > 0) {
          const lastOutput = modelSteps[modelSteps.length - 1];
          textOutput = lastOutput.content?.map((c: any) => c.text).join(' ') || '';
        }
      }

      // Extract JSON from markdown if necessary
      const jsonMatch = textOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let parsed = null;
      try {
        parsed = JSON.parse(jsonMatch ? jsonMatch[1] : textOutput);
      } catch (e) {
        console.error('Failed to parse agent JSON:', textOutput);
      }

      if (parsed && parsed.threads) {
        for (const thread of parsed.threads) {
          // Map to uniform UI format
          sendEvent('demand', {
            id: Math.random().toString(36).substring(7),
            platform: parsed.platform || agent.id,
            title: thread.title || 'Untitled',
            snippet: thread.body_snippet || thread.verbatim_phrases?.[0] || '...',
            engagement: thread.score || thread.points || thread.public_reactions_count || thread.reactions_total || 0,
            url: thread.thread_url || thread.story_url || thread.html_url || thread.url || thread.link || '#'
          });
        }
      }
    } catch (e: any) {
      console.error(`Agent ${agent.id} failed:`, e);
    }
    sendEvent('agent_done', { agent: agent.id });
  };

  try {
    // Fire all 5 sandboxes concurrently
    await Promise.all(agents.map(fetchAgent));

    sendEvent('status', { message: 'Discovery complete. Orchestrating strategy...' });
    
    // Simulate Strategy and Content generation (can be replaced with regular generateContent later)
    sendEvent('agent_start', { agent: 'strat' });
    await new Promise(r => setTimeout(r, 2000));
    sendEvent('agent_done', { agent: 'strat' });

    sendEvent('done', { status: 'complete' });
  } catch (error: any) {
    sendEvent('error', { error: error.message });
  } finally {
    res.end();
  }
}
