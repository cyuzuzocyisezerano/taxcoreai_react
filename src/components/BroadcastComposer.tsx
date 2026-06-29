import { useState } from 'react'
import { api } from '../lib/api'
import './BroadcastComposer.css'

interface BroadcastComposerProps {
  onBroadcastSent?: () => void
}

export function BroadcastComposer({ onBroadcastSent }: BroadcastComposerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [channels, setChannels] = useState({
    inApp: true,
    email: false,
    sms: false,
  })
  const [expiresAt, setExpiresAt] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    const selectedChannels = Object.entries(channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => channel)

    if (selectedChannels.length === 0) {
      setError('Please select at least one channel')
      return
    }

    setSending(true)
    try {
      await api.broadcastNotification({
        title: title.trim(),
        message: message.trim(),
        priority,
        channels: selectedChannels,
        expiresAt: expiresAt || undefined,
      })

      setSuccess('Broadcast sent successfully!')
      setTitle('')
      setMessage('')
      setPriority('medium')
      setChannels({ inApp: true, email: false, sms: false })
      setExpiresAt('')
      onBroadcastSent?.()

      setTimeout(() => {
        setIsOpen(false)
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  const handleChannelToggle = (channel: keyof typeof channels) => {
    setChannels(prev => ({
      ...prev,
      [channel]: !prev[channel],
    }))
  }

  if (!isOpen) {
    return (
      <button className="broadcast-composer__trigger" onClick={() => setIsOpen(true)}>
        <span className="broadcast-composer__icon">📢</span>
        Send Broadcast
      </button>
    )
  }

  return (
    <div className="broadcast-composer">
      <div className="broadcast-composer__header">
        <h3>Send Broadcast Message</h3>
        <button
          type="button"
          className="broadcast-composer__close"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="broadcast-composer__form">
        {error && <div className="broadcast-composer__error">{error}</div>}
        {success && <div className="broadcast-composer__success">{success}</div>}

        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter broadcast title"
            maxLength={500}
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea
            id="message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter broadcast message"
            rows={4}
            maxLength={2000}
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={e => setPriority(e.target.value as typeof priority)}
            disabled={sending}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label>Channels *</label>
          <div className="channel-checkboxes">
            <label className="channel-checkbox">
              <input
                type="checkbox"
                checked={channels.inApp}
                onChange={() => handleChannelToggle('inApp')}
                disabled={sending}
              />
              <span>In-App</span>
            </label>
            <label className="channel-checkbox">
              <input
                type="checkbox"
                checked={channels.email}
                onChange={() => handleChannelToggle('email')}
                disabled={sending}
              />
              <span>Email</span>
            </label>
            <label className="channel-checkbox">
              <input
                type="checkbox"
                checked={channels.sms}
                onChange={() => handleChannelToggle('sms')}
                disabled={sending}
              />
              <span>SMS</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="expiresAt">Expiry Date (Optional)</label>
          <input
            id="expiresAt"
            type="datetime-local"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            disabled={sending}
          />
        </div>

        <div className="broadcast-composer__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsOpen(false)}
            disabled={sending}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </form>
    </div>
  )
}