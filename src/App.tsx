import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Rocket, Play, CheckCircle2, Circle, Loader2, Sparkles, Map, Route, PenTool } from 'lucide-react'

type Phase = 'idle' | 'discovering' | 'strategy' | 'drafting' | 'done'
type AgentStatus = 'idle' | 'running' | 'done' | 'skipped'

interface AgentTrace {
  id: string
  name: string
  status: AgentStatus
}

export default function App() {
  const [productDescription, setProductDescription] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  
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

  const handleLaunch = () => {
    if (!productDescription) return
    setPhase('discovering')
    // In a real implementation, we would start SSE fetching here
    // For the UI stub, we'll just simulate the first agents running
    setAgents(agents.map(a => 
      ['reddit', 'hn', 'github', 'devto', 'so'].includes(a.id) 
        ? { ...a, status: 'running' } 
        : a
    ))
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
                      {phase === 'discovering' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                          <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]/50" />
                          <p>Agents are scanning Reddit, HackerNews, Dev.to...</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center py-12">Demand threads will stream here.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="strategy" className="mt-0">
                      <div className="text-muted-foreground text-center py-12">Strategy recommendations will appear here.</div>
                    </TabsContent>

                    <TabsContent value="launchpad" className="mt-0">
                      <div className="text-muted-foreground text-center py-12">Drafted posts and launch buttons will appear here.</div>
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
