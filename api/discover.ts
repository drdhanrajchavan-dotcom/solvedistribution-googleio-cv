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

  let allThreads: any[] = [];

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
        // Collect for drafting
        allThreads.push(...parsed.threads.map((t: any) => ({ ...t, platform: parsed.platform || agent.id })));
        
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
    // Run agents sequentially to avoid 429 Too Many Requests on free tier
    for (const agent of agents) {
      await fetchAgent(agent);
    }

    sendEvent('status', { message: 'Discovery complete. Orchestrating strategy...' });
    
    sendEvent('agent_start', { agent: 'strat' });
    await new Promise(r => setTimeout(r, 1000));
    sendEvent('agent_done', { agent: 'strat' });

    sendEvent('status', { message: 'Drafting contextual content...' });

    const redditThread = allThreads.find(t => String(t.platform).toLowerCase().includes('reddit'));
    const hnThread = allThreads.find(t => String(t.platform).toLowerCase().includes('hacker'));
    const generalThread = allThreads.find(t => !String(t.platform).toLowerCase().includes('reddit') && !String(t.platform).toLowerCase().includes('hacker')) || allThreads[0];

    const draftContent = async (platformName: string, agentId: string, threadContext: any) => {
      sendEvent('agent_start', { agent: agentId });
      try {
        const prompt = `You are a native ${platformName} developer writing a post that does NOT sound like marketing.
PRODUCT: ${productDescription}
TARGET_THREAD: ${JSON.stringify(threadContext || {})}
TASK: Write a short, technical reply or post mentioning the product as a specific solution to the user's problem. Cite their vocabulary from the TARGET_THREAD. No marketing jargon. Return ONLY the text of the post. Limit to 100 words.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || `Draft failed for ${platformName}`;
        
        let targetUrl = '#';
        if (threadContext) {
          targetUrl = threadContext.url || threadContext.thread_url || threadContext.story_url || threadContext.html_url || threadContext.link || '#';
        }
        
        sendEvent('drafts', {
          id: agentId,
          platform: platformName,
          content: text,
          url: targetUrl
        });
      } catch (e) {
        console.error(`Drafting failed for ${platformName}`, e);
      }
      sendEvent('agent_done', { agent: agentId });
    };

    // Run writers in parallel since standard API is less strict on rate limits than Interactions
    await Promise.all([
      draftContent('Reddit', 'w_reddit', redditThread),
      draftContent('Hacker News', 'w_hn', hnThread),
      draftContent('X', 'w_x', generalThread),
      draftContent('LinkedIn', 'w_li', generalThread)
    ]);

    // Generate placeholder image
    sendEvent('agent_start', { agent: 'w_img' });
    await new Promise(r => setTimeout(r, 1000));
    sendEvent('drafts', {
      id: 'w_img',
      platform: 'Image',
      content: `https://placehold.co/600x400/1e1e1e/00ff88?text=${encodeURIComponent(productDescription.substring(0,30))}`,
      url: '#'
    });
    sendEvent('agent_done', { agent: 'w_img' });

    sendEvent('done', { status: 'complete' });
  } catch (error: any) {
    sendEvent('error', { error: error.message });
  } finally {
    res.end();
  }
}
