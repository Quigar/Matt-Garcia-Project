import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { prospects } from '../api'

const INITIAL = {
  first_name: '', last_name: '', email: '', phone: '',
  company: '', title: '',
  product_focus: '', captive_or_independent: '', imo_fmo_affiliation: '',
  carrier_appointments: '', annual_life_premium: '', avg_case_size: '',
  has_admin_support: false, production_tier: '', pain_points: '',
  current_tech_stack: '', source: '', notes: '',
}

export default function AddProspectModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState(null)

  const mutation = useMutation({
    mutationFn: (data) => prospects.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] })
      qc.invalidateQueries({ queryKey: ['pipeline-metrics'] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to create prospect'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    mutation.mutate({
      ...form,
      carrier_appointments: form.carrier_appointments ? parseInt(form.carrier_appointments) : null,
      annual_life_premium: form.annual_life_premium ? parseFloat(form.annual_life_premium) : null,
      avg_case_size: form.avg_case_size ? parseFloat(form.avg_case_size) : null,
    })
  }

  const set = (k) => (e) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Life Agent</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" required value={form.first_name} onChange={set('first_name')} />
            <Field label="Last Name *" required value={form.last_name} onChange={set('last_name')} />
            <Field label="Email" type="email" value={form.email} onChange={set('email')} />
            <Field label="Phone" value={form.phone} onChange={set('phone')} />
            <Field label="Company / DBA" value={form.company} onChange={set('company')} placeholder="e.g. Smith Life Planning" />
            <Field label="Title" value={form.title} onChange={set('title')} placeholder="e.g. Independent Life Agent" />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Practice Profile</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Product Focus</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.product_focus} onChange={set('product_focus')}>
                <option value="">Select product focus</option>
                <option value="iul_vul">IUL / VUL</option>
                <option value="annuities">Annuities</option>
                <option value="whole_life">Whole Life</option>
                <option value="term">Term Life</option>
                <option value="final_expense">Final Expense</option>
                <option value="mixed">Mixed / Generalist</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Agent Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.captive_or_independent} onChange={set('captive_or_independent')}>
                <option value="">Select type</option>
                <option value="independent">Independent</option>
                <option value="captive">Captive (NML, NYL, MassMutual...)</option>
                <option value="broker_dealer">Broker-Dealer Affiliated</option>
              </select>
            </div>
            <Field label="IMO / FMO / BGA" value={form.imo_fmo_affiliation} onChange={set('imo_fmo_affiliation')} placeholder="e.g. Integrity, AmeriLife, Equis" />
            <Field label="# of Carrier Appointments" type="number" value={form.carrier_appointments} onChange={set('carrier_appointments')} />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Production</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Annual Life Premium ($)" type="number" value={form.annual_life_premium} onChange={set('annual_life_premium')} placeholder="e.g. 350000" />
            <Field label="Avg Case Size ($)" type="number" value={form.avg_case_size} onChange={set('avg_case_size')} placeholder="e.g. 5000" />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Production Tier (auto-set if premium entered)</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.production_tier} onChange={set('production_tier')}>
                <option value="">Auto-detect</option>
                <option value="emerging">Emerging (&lt;$100K)</option>
                <option value="growing">Growing ($100K–$500K)</option>
                <option value="established">Established ($500K–$1M)</option>
                <option value="top_producer">Top Producer ($1M+)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="admin" checked={form.has_admin_support} onChange={set('has_admin_support')} className="rounded" />
              <label htmlFor="admin" className="text-sm text-gray-700">Has VA / admin support</label>
            </div>
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Tech & Context</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Tech Stack" value={form.current_tech_stack} onChange={set('current_tech_stack')} placeholder="iPipeline, Salesforce, spreadsheets..." />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Lead Source</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source} onChange={set('source')}>
                <option value="">Select source</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_email">Cold Email</option>
                <option value="referral">Referral</option>
                <option value="conference">Conference / Event</option>
                <option value="inbound">Inbound</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Pain Points (comma-separated)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. underwriting tracking, client follow-up, illustration complexity"
                value={form.pain_points} onChange={set('pain_points')} />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Adding...' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </div>
  )
}
