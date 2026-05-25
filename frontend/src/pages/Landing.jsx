import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Shield, Heart, Users, FileText, Bell, TrendingUp, Bot,
  ChevronRight, CheckCircle, Sparkles, Activity, AlertTriangle,
  LayoutDashboard, Calendar, Zap, ArrowRight, Globe, Layers,
  Mail, Star, BarChart3,
} from 'lucide-react'
import { prospects, cases, leads, queue, pipeline } from '../api'
import { format } from 'date-fns'

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      {/* Background gradient effect */}
      <div className="absolute top-0 inset-x-0 h-[700px] bg-gradient-to-b from-blue-900/30 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative">
        <Navbar />
        <Hero />
        <DashboardShowcase />
        <LiveMetricsBar />
        <FeaturesGrid />
        <HowItWorks />
        <ProductMockups />
        <TwoPathCTA />
        <Footer />
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold leading-none">InsureFlow AI</p>
          <p className="text-slate-400 text-[10px] mt-0.5">Life Insurance Platform</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-1">
        <a href="#features" className="text-slate-300 hover:text-white text-sm px-3 py-2">Features</a>
        <a href="#how" className="text-slate-300 hover:text-white text-sm px-3 py-2">How it works</a>
        <Link to="/intake" className="text-slate-300 hover:text-white text-sm px-3 py-2">For Agents</Link>
        <Link to="/quote" className="text-slate-300 hover:text-white text-sm px-3 py-2">Get Quote</Link>
      </div>
      <Link
        to="/app"
        className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <LayoutDashboard size={14} />
        Dashboard
      </Link>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="px-6 pt-16 pb-12 max-w-6xl mx-auto text-center">
      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1 text-blue-300 text-xs mb-7 backdrop-blur">
        <Sparkles size={11} />
        AI-Powered Life Insurance Consulting Platform
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
        The operating system<br />
        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          for life insurance growth
        </span>
      </h1>
      <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-9 leading-relaxed">
        We deliver qualified consumer leads to top life insurance agents. AI handles qualification,
        case management, and follow-up — your agents close the deal.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/intake"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
        >
          I'm an Agent <ArrowRight size={16} />
        </Link>
        <Link
          to="/quote"
          className="w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <Heart size={16} /> Get a Quote
        </Link>
      </div>
      <p className="text-slate-500 text-xs mt-6 flex items-center justify-center gap-2">
        <CheckCircle size={11} className="text-green-400" /> Trusted by independent life agents nationwide
      </p>
    </section>
  )
}

// ── Dashboard Showcase ────────────────────────────────────────────────────────
function DashboardShowcase() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: prospectsData } = useQuery({
    queryKey: ['lp-prospects'],
    queryFn: () => prospects.recent(5),
    refetchInterval: 30_000,
  })
  const { data: caseMetrics } = useQuery({
    queryKey: ['lp-case-metrics'],
    queryFn: cases.metrics,
    refetchInterval: 30_000,
  })
  const { data: leadMetrics } = useQuery({
    queryKey: ['lp-lead-metrics'],
    queryFn: leads.metrics,
    refetchInterval: 30_000,
  })
  const { data: pipelineMetrics } = useQuery({
    queryKey: ['lp-pipeline-metrics'],
    queryFn: pipeline.metrics,
    refetchInterval: 30_000,
  })
  const { data: queueMetrics } = useQuery({
    queryKey: ['lp-queue-metrics'],
    queryFn: queue.metrics,
    refetchInterval: 30_000,
  })

  const recent = prospectsData?.items?.slice(0, 5) || []
  const pipelineValue = pipelineMetrics?.total_pipeline_value || 0

  return (
    <section className="px-4 pb-20 max-w-6xl mx-auto">
      {/* Browser chrome */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl border border-slate-700/50 shadow-2xl">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-700/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 max-w-md mx-auto bg-slate-950/50 rounded-md px-3 py-1 flex items-center gap-1.5 border border-slate-700/30">
            <Globe size={11} className="text-slate-500" />
            <span className="text-slate-400 text-xs">app.insureflow.ai/dashboard</span>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            {format(now, 'h:mm a')}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="grid grid-cols-[180px_1fr] min-h-[480px]">
          {/* Mini sidebar */}
          <div className="bg-slate-900 px-2.5 py-4 border-r border-slate-700/30">
            <div className="px-2 mb-4 pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center">
                  <Shield size={9} className="text-white" />
                </div>
                <p className="text-white font-bold text-xs leading-none">InsureFlow AI</p>
              </div>
            </div>
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Heart, label: 'Lead Pool', badge: leadMetrics?.new },
              { icon: Users, label: 'Life Agents' },
              { icon: FileText, label: 'Cases' },
              { icon: Bell, label: 'Follow-up Queue', badge: queueMetrics?.pending },
              { icon: Calendar, label: 'Appointments' },
              { icon: TrendingUp, label: 'Pipeline' },
            ].map(item => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium mb-0.5 ${
                  item.active ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                <item.icon size={12} className="shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="bg-gray-50 p-4 overflow-hidden">
            {/* Live clock header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Welcome back · {format(now, 'EEEE, MMM d')}</p>
                <p className="font-mono font-bold text-lg leading-tight">{format(now, 'h:mm:ss a')}</p>
              </div>
              <div className="flex gap-1.5">
                <div className="bg-green-500 w-1.5 h-1.5 rounded-full animate-pulse mt-2" />
                <span className="text-[10px] text-green-400 mt-1.5">LIVE</span>
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <MiniKpi icon={Users} label="Agents" value={prospectsData?.total ?? '—'} color="blue" />
              <MiniKpi icon={Heart} label="New Leads" value={leadMetrics?.new ?? 0} color="red" urgent={leadMetrics?.new > 0} />
              <MiniKpi icon={AlertTriangle} label="At Risk" value={caseMetrics?.critical_cases ?? 0} color="orange" />
              <MiniKpi
                icon={TrendingUp}
                label="Pipeline"
                value={pipelineValue >= 1000 ? `$${(pipelineValue / 1000).toFixed(0)}K` : `$${pipelineValue}`}
                color="green"
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              {/* Lead influx */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={11} className="text-blue-500" />
                    <p className="text-xs font-semibold text-gray-900">Lead Influx</p>
                  </div>
                  <span className="text-[10px] text-gray-400">Most recent</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-[180px] overflow-hidden">
                  {recent.length > 0 ? recent.map(p => (
                    <div key={p.id} className="px-3 py-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{p.full_name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.product_focus_label || p.company || '—'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        (p.lead_score || 0) >= 70 ? 'bg-green-50 text-green-600' :
                        (p.lead_score || 0) >= 40 ? 'bg-yellow-50 text-yellow-600' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {p.lead_score || 0}
                      </span>
                    </div>
                  )) : (
                    <div className="px-3 py-6 text-center text-xs text-gray-400">
                      No leads yet — share your intake form
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: agenda + cases */}
              <div className="space-y-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bell size={11} className="text-orange-500" />
                    <p className="text-xs font-semibold text-gray-900">Today's Agenda</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {(queueMetrics?.pending || 0)}
                    <span className="text-xs font-normal text-gray-400 ml-1">queue items</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">AI-drafted check-ins ready</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BarChart3 size={11} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-900">Active Cases</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {caseMetrics?.total_active || 0}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                      {caseMetrics?.stale_cases || 0} stale
                    </span>
                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                      {caseMetrics?.placement_rate || 0}% placed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline strip */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-3 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={11} className="text-green-500" />
                <p className="text-xs font-semibold text-gray-900">Pipeline Health</p>
                <span className="text-[10px] text-gray-400 ml-auto">
                  Total: ${((pipelineValue) / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                <div className="bg-blue-400" style={{ width: '20%' }} />
                <div className="bg-blue-500" style={{ width: '18%' }} />
                <div className="bg-indigo-500" style={{ width: '16%' }} />
                <div className="bg-purple-500" style={{ width: '14%' }} />
                <div className="bg-pink-500" style={{ width: '12%' }} />
                <div className="bg-green-500" style={{ width: '12%' }} />
                <div className="bg-emerald-600" style={{ width: '8%' }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] text-gray-400">
                <span>Lead</span><span>Qualified</span><span>Discovery</span><span>Demo</span>
                <span>Proposal</span><span>Contracting</span><span>Won</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below dashboard label */}
      <div className="text-center mt-6">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          <Zap size={13} className="text-yellow-400" />
          Live dashboard preview — updating in real time
        </p>
      </div>
    </section>
  )
}

function MiniKpi({ icon: Icon, label, value, color, urgent }) {
  const colors = {
    blue: 'text-blue-500',
    red: 'text-red-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
  }
  return (
    <div className={`bg-white rounded-lg p-2 shadow-sm border border-gray-100 ${urgent ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <Icon size={10} className={colors[color]} />
      </div>
      <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  )
}

// ── Live Metrics Strip ────────────────────────────────────────────────────────
function LiveMetricsBar() {
  const { data: prospectsData } = useQuery({
    queryKey: ['lp-stats-prospects'],
    queryFn: () => prospects.list({ limit: 1 }),
  })
  const { data: caseMetrics } = useQuery({
    queryKey: ['lp-stats-cases'],
    queryFn: cases.metrics,
  })
  const { data: leadMetrics } = useQuery({
    queryKey: ['lp-stats-leads'],
    queryFn: leads.metrics,
  })
  const { data: pipelineMetrics } = useQuery({
    queryKey: ['lp-stats-pipeline'],
    queryFn: pipeline.metrics,
  })

  const stats = [
    { label: 'Agents in Network', value: prospectsData?.total ?? 0, icon: Users },
    { label: 'Consumer Leads', value: leadMetrics?.total ?? 0, icon: Heart },
    { label: 'Active Cases', value: caseMetrics?.total_active ?? 0, icon: FileText },
    { label: 'Pipeline Value', value: `$${((pipelineMetrics?.total_pipeline_value ?? 0) / 1000).toFixed(0)}K`, icon: TrendingUp },
  ]

  return (
    <section className="px-6 py-10 border-y border-slate-800 bg-slate-900/30">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <s.icon size={16} className="text-blue-400 mx-auto mb-2" />
            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Features Grid ─────────────────────────────────────────────────────────────
function FeaturesGrid() {
  const features = [
    {
      icon: Heart, color: 'red',
      title: 'Consumer Lead Pool',
      desc: 'Inbound quote requests funneled to qualified agents. AI scores each lead by product fit, health class, and budget.',
    },
    {
      icon: Bot, color: 'purple',
      title: 'AI Qualification',
      desc: 'Conversational AI qualifies agent prospects through structured discovery — production tier, products, pain points.',
    },
    {
      icon: FileText, color: 'orange',
      title: 'Case Management',
      desc: 'Track every pending application from submission to placement. AI flags stale cases and recommends actions.',
    },
    {
      icon: Bell, color: 'yellow',
      title: 'Smart Follow-up Queue',
      desc: 'Automated hourly scans for stale cases. AI drafts professional check-in messages — review, edit, and send.',
    },
    {
      icon: TrendingUp, color: 'green',
      title: 'Pipeline Tracking',
      desc: 'Visual pipeline from lead to closed-won. AI-generated next-action recommendations on every deal.',
    },
    {
      icon: Layers, color: 'blue',
      title: 'Webhook Ingestion',
      desc: 'Accept leads from Facebook Lead Ads, Zapier, Typeform, or any external source with automatic field normalization.',
    },
  ]

  return (
    <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Platform Features</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Everything you need to scale
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          From the moment a lead enters the system to policy placement — the complete toolkit
          for a modern life insurance practice.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(f => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, color, title, desc }) {
  const colors = {
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all hover:bg-slate-900/80 group">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: Mail,
      title: 'Lead Capture',
      desc: 'Consumers submit quote requests at /quote. Agents apply via /intake. Webhooks pull leads from any external source automatically.',
    },
    {
      num: '02',
      icon: Bot,
      title: 'AI Match & Qualify',
      desc: 'Lead scoring runs instantly. AI qualification chats with prospects and flags top opportunities. Match consumers to licensed agents by state and product fit.',
    },
    {
      num: '03',
      icon: Star,
      title: 'Close & Track',
      desc: 'Agents work the lead. Platform tracks the case through underwriting. AI auto-generates follow-ups when cases go stale. Pipeline updates in real time.',
    },
  ]

  return (
    <section id="how" className="px-6 py-24 bg-slate-900/30 border-y border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            A complete two-sided platform
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Consumers find agents. Agents find consulting. The platform handles everything in between.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-bold bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent leading-none">
                    {s.num}
                  </span>
                  <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
                    <s.icon size={16} className="text-blue-400" />
                  </div>
                </div>
                <h3 className="text-white font-semibold text-xl mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
              {i < 2 && (
                <ChevronRight
                  size={20}
                  className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Product Mockups ───────────────────────────────────────────────────────────
function ProductMockups() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-pink-400 text-sm font-semibold uppercase tracking-wider mb-3">Built for Speed</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Three views. Zero friction.
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Every workflow is designed to be glanceable — see the state of the business in seconds.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Lead Pool */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <Heart size={16} className="text-red-400 mb-2" />
            <p className="text-white font-semibold">Lead Pool</p>
            <p className="text-slate-400 text-xs mt-0.5">Consumer leads with AI quality scoring</p>
          </div>
          <div className="p-3 bg-slate-950/50 space-y-2">
            {[
              { name: 'Sarah Chen', product: 'Term Life', score: 87, status: 'new' },
              { name: 'Marcus Williams', product: 'IUL', score: 76, status: 'new' },
              { name: 'Rosa Garcia', product: 'Final Expense', score: 65, status: 'assigned' },
            ].map(l => (
              <div key={l.name} className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[9px] text-blue-300 font-bold">
                  {l.name.split(' ').map(s => s[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{l.name}</p>
                  <p className="text-[10px] text-slate-500">{l.product}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  l.score >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {l.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Cases */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <FileText size={16} className="text-orange-400 mb-2" />
            <p className="text-white font-semibold">Pending Cases</p>
            <p className="text-slate-400 text-xs mt-0.5">Kanban view with AI risk flags</p>
          </div>
          <div className="p-3 bg-slate-950/50">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { stage: 'Submitted', count: 3, color: 'bg-blue-500/30 text-blue-300' },
                { stage: 'Pending UW', count: 5, color: 'bg-yellow-500/30 text-yellow-300' },
                { stage: 'Requirements', count: 2, color: 'bg-red-500/30 text-red-300' },
              ].map(s => (
                <div key={s.stage} className="bg-slate-900 rounded p-2 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">{s.stage}</p>
                  <p className={`text-lg font-bold px-1.5 rounded ${s.color}`}>{s.count}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-lg p-2.5 mt-2 border border-red-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={10} className="text-red-400" />
                <p className="text-[10px] text-red-400 font-semibold">Critical Risk</p>
              </div>
              <p className="text-xs text-white">Jenkins case — UW 14 days</p>
              <p className="text-[9px] text-slate-500">Carrier waiting on labs</p>
            </div>
          </div>
        </div>

        {/* Follow-up Queue */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <Bell size={16} className="text-yellow-400 mb-2" />
            <p className="text-white font-semibold">Follow-up Queue</p>
            <p className="text-slate-400 text-xs mt-0.5">AI-drafted check-ins, ready to send</p>
          </div>
          <div className="p-3 bg-slate-950/50 space-y-2">
            <div className="bg-slate-900 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-white font-medium">Davis case</p>
                <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">high</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                Hi Mike, just checking in on the Davis case — APS pending 9 days now. Want me to nudge Mutual of Omaha?
              </p>
              <div className="flex gap-1.5 mt-2">
                <div className="bg-green-600 text-white text-[9px] font-medium px-2 py-0.5 rounded">Send</div>
                <div className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded">Dismiss</div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2.5 opacity-60">
              <p className="text-xs text-white font-medium mb-0.5">Patel case</p>
              <p className="text-[10px] text-slate-500">Requirements 7d</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Two-Path CTA ──────────────────────────────────────────────────────────────
function TwoPathCTA() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-5">
        <PathCard
          icon={Users}
          eyebrow="For Life Insurance Agents"
          title="Get qualified leads and grow your book"
          desc="Join our network. Receive consumer leads matched to your products and license states, with AI-powered case management and dedicated business consulting."
          cta="Apply to Join"
          link="/intake"
          gradient="from-blue-600 to-indigo-700"
        />
        <PathCard
          icon={Heart}
          eyebrow="For Consumers"
          title="Find a licensed agent in your state"
          desc="Tell us what coverage you need. We'll match you with a licensed life insurance agent in your area — free, no obligation, no spam."
          cta="Get a Free Quote"
          link="/quote"
          gradient="from-pink-600 to-red-600"
        />
      </div>
    </section>
  )
}

function PathCard({ icon: Icon, eyebrow, title, desc, cta, link, gradient }) {
  return (
    <Link
      to={link}
      className={`block bg-gradient-to-br ${gradient} rounded-3xl p-8 group hover:scale-[1.02] transition-transform shadow-xl`}
    >
      <Icon size={28} className="text-white mb-5" />
      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">{eyebrow}</p>
      <h3 className="text-white font-bold text-2xl mb-3 leading-tight">{title}</h3>
      <p className="text-white/80 text-sm leading-relaxed mb-5">{desc}</p>
      <div className="inline-flex items-center gap-1.5 text-white font-semibold text-sm border-b border-white/40 pb-0.5">
        {cta} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <p className="text-white font-bold">InsureFlow AI</p>
          </div>
          <p className="text-slate-500 text-xs">© 2026 InsureFlow AI · Built for life insurance professionals</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/intake" className="text-slate-400 hover:text-white">Agent Application</Link>
          <Link to="/quote" className="text-slate-400 hover:text-white">Consumer Quote</Link>
          <Link to="/app" className="text-slate-400 hover:text-white">Dashboard</Link>
          <a href="#features" className="text-slate-400 hover:text-white">Features</a>
          <a href="#how" className="text-slate-400 hover:text-white">How It Works</a>
        </div>
      </div>
    </footer>
  )
}
