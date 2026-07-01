import { useEffect, useState, useRef } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import './AIAssistant.css'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  quickActions?: any[]
  data?: any
}

interface QuickAction {
  id: string
  label: string
  query: string
}

export function AIAssistant() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const role = user?.role ?? 'Officer'
  const title = user?.title ?? 'Taxpayer Officer'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    initializeChat()
  }, [])

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200)
    }
  }

  const initializeChat = async () => {
    try {
      // Load quick actions
      const actionsResponse = await api.getAIQuickActions()
      setQuickActions(actionsResponse.quickActions || [])

      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: '**Welcome to TaxCoreAI Assistant!**\n\n' +
          'I\'m your intelligent tax management companion. I can help you with:\n\n' +
          '📋 **Taxpayer Management**\n' +
          '   - Search for taxpayers\n' +
          '   - Check registration status\n' +
          '   - Update taxpayer information\n\n' +
          '📄 **Document Assistance**\n' +
          '   - Document requirements\n' +
          '   - Upload guidance\n' +
          '   - Document analysis\n\n' +
          '📊 **Compliance & Workflows**\n' +
          '   - Check compliance status\n' +
          '   - View pending tasks\n' +
          '   - Track workflows\n\n' +
          '💰 **Tax Information**\n' +
          '   - VAT and PAYE details\n' +
          '   - Tax deadlines\n' +
          '   - Penalty information\n\n' +
          '💡 **How to use:**\n' +
          'Type your question below or click on a suggested prompt to get started!',
        timestamp: new Date(),
        quickActions: actionsResponse.quickActions?.slice(0, 4) || []
      }

      setMessages([welcomeMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize chat')
    }
  }

  const sendMessage = async (query: string) => {
    if (!query.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await api.sendAIMessage(query, {
        role: 'officer',
        timestamp: new Date().toISOString()
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.message,
        timestamp: new Date(),
        quickActions: response.quickActions || [],
        data: response.data
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update quick actions if provided
      if (response.quickActions && response.quickActions.length > 0) {
        setQuickActions(response.quickActions)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)

      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `**Sorry, I encountered an error:**\n\n${errorMessage}\n\nPlease try again or rephrase your question.`,
        timestamp: new Date(),
        quickActions: quickActions.slice(0, 4)
      }

      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.query)
  }

  const handleSuggestedPrompt = (query: string) => {
    sendMessage(query)
  }

  const formatMessage = (content: string) => {
    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />')

    return formatted
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const suggestedPrompts = [
    {
      icon: '🔍',
      title: 'Search Taxpayer',
      desc: 'Find taxpayer information by name or TIN',
      query: 'Find taxpayer John Doe'
    },
    {
      icon: '📄',
      title: 'Document Requirements',
      desc: 'Learn what documents you need for registration',
      query: 'What documents do I need?'
    },
    {
      icon: '✓',
      title: 'Check Compliance',
      desc: 'Verify your tax compliance status',
      query: 'Am I compliant?'
    },
    {
      icon: '💰',
      title: 'VAT Information',
      desc: 'Get details about VAT registration and rates',
      query: 'Tell me about VAT'
    }
  ]

  return (
    <div className="ai-assistant-page">
      <AdminSidebar role={role} title={title} />
      
      <main className="ai-assistant-page__main">
        <header className="ai-assistant-page__header">
          <div>
            <h1>AI Assistant</h1>
            <p className="ai-assistant-page__subtitle">
              Your intelligent tax management companion
            </p>
          </div>
        </header>

        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="ai-welcome-screen">
            <div className="ai-welcome-icon">🤖</div>
            <h2 className="ai-welcome-title">How can I help you today?</h2>
            <p className="ai-welcome-subtitle">
              I'm your AI assistant for tax management. Ask me anything about taxpayers, documents, compliance, and more.
            </p>
            <div className="ai-suggested-prompts">
              {suggestedPrompts.map((prompt, index) => (
                <div
                  key={index}
                  className="ai-suggested-prompt"
                  onClick={() => handleSuggestedPrompt(prompt.query)}
                >
                  <div className="ai-suggested-prompt-icon">{prompt.icon}</div>
                  <div className="ai-suggested-prompt-title">{prompt.title}</div>
                  <div className="ai-suggested-prompt-desc">{prompt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <>
            <div
              className="ai-messages-container"
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-message ai-message--${message.type}`}
                >
                  <div className="ai-message-avatar">
                    {message.type === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-header">
                      <span className="ai-message-author">
                        {message.type === 'user' ? 'You' : 'TaxCoreAI Assistant'}
                      </span>
                      <span className="ai-message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div
                      className="ai-message-bubble"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />

                    {/* Quick Actions for Assistant Messages */}
                    {message.type === 'assistant' && message.quickActions && message.quickActions.length > 0 && (
                      <div className="ai-message__actions">
                        {message.quickActions.map((action) => (
                          <button
                            key={action.id}
                            className="ai-quick-action-btn"
                            onClick={() => handleQuickAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-message ai-message--assistant">
                  <div className="ai-message-avatar">🤖</div>
                  <div className="ai-message-content">
                    <div className="ai-message-header">
                      <span className="ai-message-author">TaxCoreAI Assistant</span>
                    </div>
                    <div className="ai-message-bubble">
                      <div className="ai-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {showScrollButton && (
              <button
                className="ai-scroll-to-bottom"
                onClick={scrollToBottom}
                title="Scroll to bottom"
              >
                ↓
              </button>
            )}
          </>
        )}

        {/* Input Area */}
        <div className="ai-input-area">
          <form onSubmit={handleSubmit}>
            <div className="ai-input-wrapper">
              <textarea
                ref={inputRef}
                className="ai-input-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message TaxCoreAI Assistant..."
                rows={1}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <div className="ai-input-footer">
                <span className="ai-input-hint">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <button
                  type="submit"
                  className="ai-send-btn"
                  disabled={!input.trim() || loading}
                >
                  <span>Send</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
