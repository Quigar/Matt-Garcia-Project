import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Calendar, TrendingUp, Bot,
  Shield, FileText, Bell, Heart,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import Appointments from './pages/Appointments'
import Pipeline from './pages/Pipeline'
import ProspectDetail from './pages/ProspectDetail'
import Cases from './pages/Cases'
import Queue from './pages/Queue'
import LeadPool from './pages/LeadPool'
import IntakeForm from './pages/IntakeForm'
import ConsumerLeadForm from './pages/ConsumerLeadForm'
import { queue as queueApi, leads as leadsApi } from './api'

function Sidebar() {
  const { data: qMetrics } = useQuery({
    queryKey: ['queue-metrics'],
    queryFn: queueApi.metrics,
    refetchInterval: 60_000,
  })

  const { data: leadMetrics } = useQuery({
    queryKey: ['lead-metrics'],
    queryFn: leadsApi.metrics,
    refetchInterval: 60_000,
  })

  const pendingCount = qMetrics?.pending ?? 0
  const newLeadsCount = leadMetrics?.new ?? 0

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Heart, label: 'Lead Pool', badge: newLeadsCount },
    { to: '/prospects', icon: Users, label: 'Life Agents' },
    { to: '/cases', icon: FileText, label: 'Pending Cases' },
    { to: '/queue', icon: Bell, label: 'Follow-up Queue', badge: pendingCount },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
  ]

  return (
    <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">InsureFlow AI</p>
            <p className="text-slate-400 text-xs mt-0.5">Life Insurance CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-medium">AI Assistant</p>
            <p className="text-green-400 text-xs">Online · checks hourly</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <a
            href="/intake"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2 py-1 transition-colors"
          >
            Agent Form
          </a>
          <a
            href="/quote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2 py-1 transition-colors"
          >
            Quote Form
          </a>
        </div>
      </div>
    </aside>
  )
}

function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadPool />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/prospects/:id" element={<ProspectDetail />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/pipeline" element={<Pipeline />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public standalone forms — no sidebar */}
        <Route path="/intake" element={<IntakeForm />} />
        <Route path="/quote" element={<ConsumerLeadForm />} />
        {/* Admin app */}
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
