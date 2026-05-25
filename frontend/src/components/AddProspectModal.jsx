import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { prospects } from '../api'

const INITIAL = {
  first_name: '', last_name: '', email: '', phone: '',
  company: '', title: '', agency_size: '', lines_of_business: '',
  current_tech_stack: '', annual_premium_volume: '', num_producers: '',
  has_ops_team: false, source: '', notes: '',
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
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to create prospect')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    const payload = {
      ...form,
      annual_premium_volume: form.annual_premium_volume ? parseFloat(form.annual_premium_volume) : null,
      num_producers: form.num_producers ? parseInt(form.num_producers) : null,
    }
    mutation.mutate(payload)
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add New Prospect</h2>
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
            <Field label="Company" value={form.company} onChange={set('company')} />
            <Field label="Title" value={form.title} onChange={set('title')} />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-600">Agency Profile</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Agency Size</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.agency_size} onChange={set('agency_size')}>
                <option value="">Select size</option>
                <option value="small">Small (1-5 producers)</option>
                <option value="mid">Mid (6-20 producers)</option>
                <option value="large">Large (21+ producers)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Source</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source} onChange={set('source')}>
                <option value="">Select source</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_email">Cold Email</option>
                <option value="referral">Referral</option>
                <option value="conference">Conference</option>
                <option value="inbound">Inbound</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Field label="Lines of Business (e.g. P&C,Life)" value={form.lines_of_business} onChange={set('lines_of_business')} />
            <Field label="Current Tech Stack" value={form.current_tech_stack} onChange={set('current_tech_stack')} placeholder="Applied Epic, AMS360..." />
            <Field label="Annual Premium Volume ($)" type="number" value={form.annual_premium_volume} onChange={set('annual_premium_volume')} />
            <Field label="# of Producers" type="number" value={form.num_producers} onChange={set('num_producers')} />
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="ops" checked={form.has_ops_team} onChange={set('has_ops_team')} className="rounded" />
              <label htmlFor="ops" className="text-sm text-gray-700">Has an in-house operations team</label>
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
              {mutation.isPending ? 'Creating...' : 'Create Prospect'}
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
