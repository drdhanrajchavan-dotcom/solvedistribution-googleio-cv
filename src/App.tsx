import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Rocket, Play, CheckCircle2, Circle, Loader2, Sparkles, Map, Route, PenTool, Copy, Check } from 'lucide-react'

type Phase = 'idle' | 'discovering' | 'strategy' | 'drafting' | 'done'
type AgentStatus = 'idle' | 'running' | 'done' | 'skipped'

interface AgentTrace {
  id: string
  name: string
  status: AgentStatus
}

interface DemandThread {
  id: string
  platform: string
  title: string
  snippet: string
  engagement: number
  url: string
}

interface LaunchpadItem {
  id: string
  platform: string
  content: string
  url: string
}

export default function App() {
  const [productDescription, setProductDescription] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [demandThreads, setDemandThreads] = useState<DemandThread[]>([])
  const [launchpadItems, setLaunchpadItems] = useState<LaunchpadItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [agents, setAgents] = useState<AgentTrace[]>([
    { id: 'reddit', name: 'Reddit Discovery', status: 'idle' },
    { id: 'hn', name: 'Hacker News Discovery', status: 'idle' },
    { id: 'github', name: 'GitHub Issues Discovery', status: 'idle' },
    { id: 'devto', name: 'Dev.to Discovery', status: 'idle' },
    { id: 'so', name: 'StackOverflow Discovery', status: 'idle' },
    { id: 'agg', name: 'Aggregator (Flash)', status: 'idle' },
    { id: 'strat', name: 'Strategy Agent', status: 'idle' },
    { id: 'w_reddit', name: 'Reddit Writer', status: 'idle' },
    { id: 'w_x', name: 'X Writer', status: 'idle' },
    { id: 'w_hn', name: 'HN Writer', status: 'idle' },
    { id: 'w_li', name: 'LinkedIn Writer', status: 'idle' },
    { id: 'w_img', name: 'Image Generator', status: 'idle' }
  ])

  const handleLaunch = async () => {
    if (!productDescription) return
    setPhase('discovering')
    setDemandThreads([])
    
    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.error('API Error:', errData);
        setPhase('idle');
        alert(`API Error: ${errData?.error || response.statusText}`);
        return;
      }
      
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('event: ')) {
            const eventName = lines[i].replace('event: ', '').trim();
            const dataLine = lines[i + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              const dataStr = dataLine.replace('data: ', '').trim();
              if (dataStr) {
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (eventName === 'agent_start') {
                    setAgents(agents => agents.map(a => a.id === data.agent ? { ...a, status: 'running' } : a));
                    if (data.agent === 'strat') setPhase('strategy');
                  } else if (eventName === 'agent_done') {
                    setAgents(agents => agents.map(a => a.id === data.agent ? { ...a, status: 'done' } : a));
                  } else if (eventName === 'demand') {
                    setDemandThreads(prev => [...prev, data]);
                  } else if (eventName === 'drafts') {
                    setLaunchpadItems(prev => {
                      const exists = prev.find(p => p.id === data.id);
                      if (exists) return prev.map(p => p.id === data.id ? data : p);
                      return [...prev, data];
                    });
                  } else if (eventName === 'done') {
                    setPhase('drafting');
                  }
                } catch (e) {
                  console.error('Error parsing SSE data', e);
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Error in launch', e);
      setPhase('idle');
      alert(`Connection failed: ${e.message}`);
    }
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleLaunchPlatform = async (item: LaunchpadItem) => {
    if (item.platform === 'Image') {
      window.open(item.content, '_blank');
      return;
    }
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn("Clipboard failed", e);
    }

    let targetUrl = item.url;
    if (!targetUrl || targetUrl === '#') {
      if (item.platform.includes('Reddit')) targetUrl = `https://www.reddit.com/submit?text=${encodeURIComponent(item.content)}`;
      else if (item.platform.includes('X')) targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(item.content)}`;
      else if (item.platform.includes('LinkedIn')) targetUrl = `https://www.linkedin.com/sharing/share-offsite/`;
      else targetUrl = `https://news.ycombinator.com/submit`;
    }
    window.open(targetUrl, '_blank');
  }

  const renderStatusIcon = (status: AgentStatus) => {
    switch(status) {
      case 'idle': return <Circle className="w-4 h-4 text-muted-foreground/40" />
      case 'running': return <Loader2 className="w-4 h-4 text-[#00FF88] animate-spin" />
      case 'done': return <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
      case 'skipped': return <Circle className="w-4 h-4 text-muted-foreground/20" />
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-foreground p-8 font-sans selection:bg-[#00FF88]/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="flex flex-col items-center justify-center text-center space-y-6 pt-12 pb-8">
          <div className="flex items-center gap-3 text-[#00FF88] mb-2">
            <Rocket className="w-8 h-8" />
            <h1 className="text-4xl font-bold tracking-tight text-white">LaunchAgent</h1>
          </div>
          <p className="text-xl text-muted-foreground font-medium">Find where demand is. Launch there.</p>
          
          <div className="w-full max-w-2xl relative mt-8">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#00FF88]/20 to-purple-500/20 blur-xl opacity-50"></div>
            <div className="relative flex flex-col sm:flex-row gap-3 bg-[#0a0a0e] p-2 rounded-xl border border-white/5 shadow-2xl">
              <Input 
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product in one sentence..." 
                className="text-base h-12 bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-muted-foreground/60 shadow-none"
              />
              <Button 
                onClick={handleLaunch}
                disabled={!productDescription || phase !== 'idle'}
                className="h-12 px-8 font-semibold bg-[#00FF88] text-black hover:bg-[#00FF88]/90 transition-all rounded-lg"
              >
                Find Demand <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {phase !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Progress Strip */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center bg-[#0a0a0e] border border-white/5 rounded-xl p-6">
              {[
                { id: 'discovering', label: '1. Discovering Demand', icon: Map },
                { id: 'strategy', label: '2. Building Strategy', icon: Route },
                { id: 'drafting', label: '3. Drafting Launch Assets', icon: PenTool },
              ].map((step, idx) => {
                const isActive = phase === step.id
                const isPast = ['discovering', 'strategy', 'drafting', 'done'].indexOf(phase) > idx
                return (
                  <div key={step.id} className="flex items-center gap-4">
                    <Badge 
                      variant={isActive || isPast ? "default" : "outline"}
                      className={`text-sm px-4 py-2 flex items-center gap-2 ${
                        isActive ? 'bg-[#00FF88] text-black hover:bg-[#00FF88]' : 
                        isPast ? 'bg-[#00FF88]/20 text-[#00FF88] border-none' : 
                        'bg-transparent text-muted-foreground border-white/10'
                      }`}
                    >
                      <step.icon className="w-4 h-4" />
                      {step.label}
                      {isActive && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                    </Badge>
                    {idx < 2 && <div className="hidden sm:block w-8 h-[1px] bg-white/10"></div>}
                  </div>
                )
              })}
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
              
              {/* Left Rail: Agent Trace */}
              <Card className="bg-[#0a0a0e] border-white/5 flex flex-col h-[600px]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-20"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF88]"></span>
                    </span>
                    Agent Trace
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[520px] px-6">
                    <div className="space-y-4 pr-4">
                      {agents.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            {renderStatusIcon(agent.status)}
                            <span className={`text-sm font-medium ${
                              agent.status === 'running' ? 'text-white' : 
                              agent.status === 'done' ? 'text-muted-foreground' : 
                              'text-muted-foreground/50'
                            }`}>
                              {agent.name}
                            </span>
                          </div>
                          {agent.status === 'running' && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-1"
                            >
                              {[1,2,3].map(i => (
                                <div key={i} className={`w-1 h-1 rounded-full bg-[#00FF88] animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Main Area: Tabs */}
              <div className="bg-[#0a0a0e] border border-white/5 rounded-xl flex flex-col h-[600px] overflow-hidden">
                <Tabs defaultValue="demand" className="w-full h-full flex flex-col">
                  <div className="px-6 pt-6 pb-2 border-b border-white/5">
                    <TabsList className="bg-transparent gap-6 h-auto p-0">
                      <TabsTrigger value="demand" className="data-[state=active]:bg-transparent data-[state=active]:text-[#00FF88] data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[#00FF88] rounded-none px-0 pb-2 text-base">Demand Map</TabsTrigger>
                      <TabsTrigger value="strategy" className="data-[state=active]:bg-transparent data-[state=active]:text-[#00FF88] data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[#00FF88] rounded-none px-0 pb-2 text-base">Strategy</TabsTrigger>
                      <TabsTrigger value="launchpad" className="data-[state=active]:bg-transparent data-[state=active]:text-[#00FF88] data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[#00FF88] rounded-none px-0 pb-2 text-base">Launchpad</TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    <TabsContent value="demand" className="mt-0 space-y-4">
                      {demandThreads.length > 0 ? (
                        <div className="space-y-4">
                          {demandThreads.map(thread => (
                            <motion.div key={thread.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-[#00FF88]/50 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="bg-black/50 text-xs border-white/10">{thread.platform}</Badge>
                                <span className="text-xs text-[#00FF88] font-mono">{thread.engagement} engagements</span>
                              </div>
                              <h3 className="text-sm font-semibold text-white mb-1">{thread.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{thread.snippet}</p>
                              <a href={thread.url} className="text-xs text-[#00FF88] hover:underline inline-flex items-center">View source ↗</a>
                            </motion.div>
                          ))}
                          {phase === 'discovering' && (
                            <div className="flex items-center justify-center py-4 text-muted-foreground space-x-3">
                              <Loader2 className="w-4 h-4 animate-spin text-[#00FF88]/50" />
                              <span className="text-sm">Agents still scanning...</span>
                            </div>
                          )}
                        </div>
                      ) : phase === 'discovering' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                          <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]/50" />
                          <p>Agents are scanning Reddit, HackerNews, Dev.to...</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center py-12">Demand threads will stream here.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="strategy" className="mt-0">
                      {phase === 'strategy' || phase === 'drafting' || phase === 'done' ? (
                        <div className="flex items-center justify-center h-64 text-[#00FF88]">
                          Strategy forming based on {demandThreads.length} signals...
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center py-12">Strategy recommendations will appear here.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="launchpad" className="mt-0 space-y-6">
                      {launchpadItems.length > 0 ? (
                        launchpadItems.map(item => (
                          <div key={item.id} className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-white">{item.platform} Post</h3>
                            </div>
                            
                            {item.platform === 'Image' ? (
                              <img src={item.content} alt="Generated social card" className="w-full h-auto rounded-lg border border-white/10" />
                            ) : (
                              <Textarea 
                                defaultValue={item.content}
                                className="bg-black/50 border-white/10 focus-visible:ring-[#00FF88] text-sm text-white min-h-[100px]"
                              />
                            )}

                            <div className="flex gap-3">
                              <Button 
                                onClick={() => handleLaunchPlatform(item)}
                                className="flex-1 bg-[#00FF88] text-black hover:bg-[#00FF88]/90 font-medium"
                              >
                                {item.platform === 'Image' ? 'Download Image' : `Launch on ${item.platform}`} <Rocket className="w-4 h-4 ml-2" />
                              </Button>
                              
                              {item.platform !== 'Image' && (
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.content);
                                    setCopiedId(item.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="border-white/20 text-white hover:bg-white/10"
                                >
                                  {copiedId === item.id ? <Check className="w-4 h-4 text-[#00FF88]" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground text-center py-12">Drafted posts and launch buttons will appear here.</div>
                      )}
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
