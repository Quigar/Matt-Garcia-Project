import React, { useState } from 'react'
import { Shield, CheckCircle, ChevronRight, User, DollarSign, Settings } from 'lucide-react'
import { intake as intakeApi } from '../api'

const PRODUCT_OPTIONS = [
  { value: 'final_expense', label: 'Final Expense' },
  { value: 'term', label: 'Term Life' },
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'iul_vul', label: 'IUL / VUL' },
  { value: 'annuities', label: 'Annuities' },
  { value: 'mixed', label: 'Mixed / Full Line' },
]

const TECH_OPTIONS = [
  'iPipeline', 'LifeSuite', 'Salesforce', 'HubSpot', 'Redtail',
  'Spreadsheets', 'Paper / Manual', 'Other',
]

const PAIN_POINT_OPTIONS = [
  'Case management & follow-up',
  'Lead generation',
  'Client prospecting',
  'Carrier underwriting bottlenecks',
  'Compliance & paperwork',
  'Tech overwhelm',
  'Growing my team',
  'Scaling production',
]

export default function IntakeForm() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company: '', title: '',
    product_focus: '', captive_or_independent: '', imo_fmo_affiliation: '',
    carrier_appointments: '', annual_life_premium: '',
    has_admin_support: false, pain_points: '', current_tech_stack: '',
  })
  const [selectedPains, setSelectedPains] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const togglePain = (p) => {
    setSelectedPains(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        carrier_appointments: form.carrier_appointments ? parseInt(form.carrier_appointments) : null,
        annual_life_premium: form.annual_life_premium ? parseFloat(form.annual_life_premium) : null,
        pain_points: selectedPains.join(', '),
      }
      const result = await intakeApi.agent(payload)
      setSubmitted(result)
    } catch (err) {
      const msg = err?.response?.data?.detail
      if (msg?.includes('already')) {
        setError('An agent with this email is already in our system. Reach out to us directly!')
      } else {
        setError('Something went wrong. Please try again or contact us directly.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Received!</h2>
          <p className="text-gray-500 mb-4">
            Thank you for applying to InsureFlow AI. Our team will review your profile and reach out within 1 business day.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 inline-block">
            <p className="text-sm text-blue-600 font-medium">Reference: <span className="font-bold">{submitted.reference}</span></p>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Keep this reference number for your records.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold leading-none">InsureFlow AI</p>
            <p className="text-blue-300 text-xs mt-0.5">Life Insurance Consulting Platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Partner Agent Application</h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            Join InsureFlow AI and get qualified consumer leads, AI-powered case management, and dedicated business consulting.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6">
            {[
              'Qualified Life Insurance Leads',
              'AI Case Management',
              'Dedicated Consulting',
            ].map(benefit => (
              <div key={benefit} className="flex items-center gap-1.5 text-sm text-blue-300">
                <CheckCircle size={14} className="text-blue-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User size={14} className="text-blue-400" />
              </div>
              <h2 className="text-white font-semibold">Contact Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="First Name *" value={form.first_name} onChange={v => set('first_name', v)} required />
              <FormInput label="Last Name *" value={form.last_name} onChange={v => set('last_name', v)} required />
              <FormInput label="Email Address *" type="email" value={form.email} onChange={v => set('email', v)} required />
              <FormInput label="Phone Number" type="tel" value={form.phone} onChange={v => set('phone', v)} />
              <FormInput label="Company / DBA" value={form.company} onChange={v => set('company', v)} />
              <FormInput label="Title / Role" placeholder="e.g. Independent Life Agent" value={form.title} onChange={v => set('title', v)} />
            </div>
          </section>

          {/* Production Profile */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign size={14} className="text-green-400" />
              </div>
              <h2 className="text-white font-semibold">Production Profile</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-blue-200 font-medium mb-2">Primary Product Focus</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('product_focus', form.product_focus === opt.value ? '' : opt.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.product_focus === opt.value
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/5 border-white/10 text-blue-200 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-blue-200 font-medium mb-2">Agent Type</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.captive_or_independent}
                  onChange={e => set('captive_or_independent', e.target.value)}
                >
                  <option value="" className="text-gray-900">Select...</option>
                  <option value="independent" className="text-gray-900">Independent</option>
                  <option value="captive" className="text-gray-900">Captive</option>
                  <option value="broker_dealer" className="text-gray-900">Broker-Dealer</option>
                </select>
              </div>

              <FormInput
                label="IMO / FMO Affiliation"
                placeholder="e.g. FGL, Integrity, AmeriLife"
                value={form.imo_fmo_affiliation}
                onChange={v => set('imo_fmo_affiliation', v)}
              />

              <FormInput
                label="Carrier Appointments (#)"
                type="number"
                placeholder="e.g. 12"
                value={form.carrier_appointments}
                onChange={v => set('carrier_appointments', v)}
              />

              <FormInput
                label="Annual Life Premium ($)"
                type="number"
                placeholder="e.g. 250000"
                value={form.annual_life_premium}
                onChange={v => set('annual_life_premium', v)}
              />
            </div>
          </section>

          {/* Challenges & Setup */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings size={14} className="text-purple-400" />
              </div>
              <h2 className="text-white font-semibold">Your Challenges & Setup</h2>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-blue-200 font-medium mb-3">
                What are your biggest challenges? <span className="text-blue-400">(Select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAIN_POINT_OPTIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePain(p)}
                    className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                      selectedPains.includes(p)
                        ? 'bg-purple-600/40 border-purple-500/60 text-white'
                        : 'bg-white/5 border-white/10 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    {selectedPains.includes(p) && <span className="mr-1">✓</span>}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-blue-200 font-medium mb-2">Current Technology Stack</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {TECH_OPTIONS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const current = form.current_tech_stack ? form.current_tech_stack.split(', ').filter(Boolean) : []
                      if (current.includes(t)) {
                        set('current_tech_stack', current.filter(x => x !== t).join(', '))
                      } else {
                        set('current_tech_stack', [...current, t].join(', '))
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      (form.current_tech_stack || '').includes(t)
                        ? 'bg-blue-600/40 border-blue-500/60 text-white'
                        : 'bg-white/5 border-white/10 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('has_admin_support', !form.has_admin_support)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  form.has_admin_support ? 'bg-blue-600' : 'bg-white/20'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  form.has_admin_support ? 'left-5' : 'left-1'
                }`} />
              </button>
              <label className="text-sm text-blue-200">I have an admin assistant or VA</label>
            </div>
          </section>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !form.first_name || !form.last_name || !form.email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base transition-colors"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Submit Application <ChevronRight size={18} /></>
            )}
          </button>

          <p className="text-center text-blue-400 text-xs">
            By submitting, you agree to be contacted by an InsureFlow AI consultant.
          </p>
        </form>
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block text-sm text-blue-200 font-medium mb-1.5">
        {label}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
