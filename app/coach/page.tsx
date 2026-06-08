'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok || !res.body) throw new Error('Coach unavailable')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const starters = [
    'How is my nutrition looking this week?',
    'Am I eating enough protein on workout days?',
    'What should I eat before my morning gym session?',
    'Help me plan a high-protein Indian meal for tonight.',
  ]

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-screen px-4">
      <div className="py-5 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          AI Coach
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Powered by Claude — aware of your workouts, nutrition, and measurements.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 text-center py-4">Ask your coach anything.</p>
            <div className="grid grid-cols-1 gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-sm text-zinc-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-white rounded-br-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
              } ${msg.role === 'assistant' && loading && i === messages.length - 1 && !msg.content ? 'streaming-cursor' : ''}`}
            >
              {msg.content || (loading && i === messages.length - 1 ? '' : '—')}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask your coach..."
            disabled={loading}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
