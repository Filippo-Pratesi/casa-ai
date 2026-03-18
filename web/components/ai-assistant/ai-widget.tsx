'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, ChevronDown } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function renderMarkdown(text: string): string {
  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = html.split('\n')
  const out: string[] = []
  let inList = false

  for (const raw of lines) {
    const line = raw.trim()
    if (/^#{1,3}\s/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false }
      const content = line.replace(/^#{1,3}\s+/, '')
      out.push(`<p class="font-semibold mt-2 mb-0.5">${content}</p>`)
    } else if (/^[*-]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-4 my-1 space-y-0.5">'); inList = true }
      out.push(`<li>${line.replace(/^[*-]\s+/, '')}</li>`)
    } else if (line === '') {
      if (inList) { out.push('</ul>'); inList = false }
      out.push('')
    } else {
      if (inList) { out.push('</ul>'); inList = false }
      out.push(line)
    }
  }
  if (inList) out.push('</ul>')

  // Join non-empty consecutive text lines with <br>, wrap blocks
  let joined = out.join('\n')

  // Inline: bold, italic
  joined = joined.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  joined = joined.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  joined = joined.replace(/_([^_\n]+?)_/g, '<em>$1</em>')

  // Line breaks for plain text lines (not after block elements)
  joined = joined.replace(/([^>\n])\n([^<\n])/g, '$1<br>$2')

  return joined
}

export function AiWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Errore')
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Apri assistente AI"
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-[oklch(0.57_0.20_33/0.35)] transition-all duration-300 ${
          open
            ? 'bg-muted text-foreground scale-95'
            : 'bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.62_0.18_20)] text-white hover:scale-110'
        }`}
      >
        {open ? <ChevronDown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[360px] flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden max-h-[560px]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-[oklch(0.57_0.20_33/0.08)] to-transparent px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.62_0.18_20)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Assistente CasaAI</p>
              <p className="text-[11px] text-muted-foreground">Esperto in diritto e marketing immobiliare</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: 380 }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.15)]">
                  <Sparkles className="h-6 w-6 text-[oklch(0.57_0.20_33)]" />
                </div>
                <p className="text-sm font-medium">Come posso aiutarti?</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Chiedimi di diritto immobiliare, contratti, marketing o come usare CasaAI.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                  {[
                    'Cos\'è la cedolare secca?',
                    'Bozza proposta d\'acquisto',
                    'Come funziona il MLS?',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[oklch(0.57_0.20_33)] hover:text-[oklch(0.57_0.20_33)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[oklch(0.57_0.20_33)] px-3 py-2 text-sm leading-relaxed text-white whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:mt-2 [&_p]:mb-0"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sto pensando…</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-[oklch(0.57_0.20_33/0.3)]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Scrivi un messaggio…"
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-24"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[oklch(0.57_0.20_33)] text-white transition-opacity disabled:opacity-40 hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
              Premi Enter per inviare · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      )}
    </>
  )
}
