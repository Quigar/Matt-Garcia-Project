import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, TrendingUp, Bot, Shield, FileText } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import Appointments from './pages/Appointments'
import Pipeline from './pages/Pipeline'
import ProspectDetail from './pages/ProspectDetail'
import Cases from './pages/Cases'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/prospects', icon: Users, label: 'Life Agents' },
  { to: '/cases', icon: FileText, label: 'Pending Cases' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
          <div className="px-5 py-6 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">InsureFlow AI</p>
                <p className="text-slate-400 text-xs mt-0.5">Insurance CRM</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
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
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white text-xs font-medium">AI Assistant</p>
                <p className="text-green-400 text-xs">Online</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/prospects/:id" element={<ProspectDetail />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/cases" element={<Cases />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
