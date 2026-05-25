import React, { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Send, Bot, User, CheckCircle } from 'lucide-react'
import { ai } from '../api'

export default function QualificationChat({ prospect }) {
  const [sessionId, setSessionId] = useState(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [completed, setCompleted] = useState(false)
  const [qualResult, setQualResult] = useState(null)
  const bottomRef = useRef(null)

  const mutation = useMutation({
    mutationFn: (data) => ai.qualify(data),
    onSuccess: (data) => {
      setSessionId(data.session_id)
      setMessages(data.history || [])
      setCompleted(data.completed || false)
      if (data.qualification_result) setQualResult(data.qualification_result)
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = () => {
    mutation.mutate({ prospect_id: prospect.id })
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim() || mutation.isPending) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    mutation.mutate({ prospect_id: prospect.id, session_id: sessionId, message: msg })
  }

  if (messages.length === 0 && !mutation.isPending) {
    return (
      <div className="card p-8 text-center">
        <Bot size={40} className="mx-auto text-blue-400 mb-3" />
        <h3 className="font-semibold text-gray-900 mb-2">AI Qualification Session</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Start an AI-driven qualification conversation for {prospect.first_name}. The AI will
          ask insurance-specific questions and score the prospect 0–100.
        </p>
        <button onClick={startSession} className="btn-primary">
          Start Qualification
        </button>
      </div>
    )
  }

  return (
    <div className="card flex flex-col" style={{ height: '560px' }}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-500" />
          <span className="font-semibold text-sm">AI Qualifier</span>
        </div>
        {completed && qualResult && (
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Score: {qualResult.score}/100 · {qualResult.recommended_action?.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {msg.role === 'assistant' ? <Bot size={14} className="text-blue-600" /> : <User size={14} className="text-gray-600" />}
            </div>
            <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
              msg.role === 'assistant'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-blue-600 text-white'
            }`}>
              {msg.content.replace(/<qualification_result>[\s\S]*?<\/qualification_result>/g, '').trim()}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {qualResult && (
        <div className="mx-4 mb-3 p-3 bg-green-50 rounded-lg border border-green-100 text-sm">
          <p className="font-semibold text-green-700 mb-1">Qualification Complete</p>
          <p className="text-gray-600">{qualResult.summary}</p>
          {qualResult.key_findings?.length > 0 && (
            <ul className="mt-1 text-gray-500 text-xs space-y-0.5">
              {qualResult.key_findings.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          )}
        </div>
      )}

      {!completed && (
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a response..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={mutation.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="btn-primary px-3"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
