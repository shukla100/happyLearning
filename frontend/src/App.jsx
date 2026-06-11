import { useState } from 'react'
import './App.css'
import NeuralBackground from './NeuralBackground'

function App() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpAnswer, setFollowUpAnswer] = useState(null)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [connectInput, setConnectInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [nodeId, setNodeId] = useState(null)

  async function explore(concept, context = null, startNew = false) {
    setLoading(true)
    setError(null)
    setResult(null)
    setFollowUpAnswer(null)
    setFollowUpInput('')
    setConnectInput('')

    try {
      const response = await fetch('http://localhost:3001/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, context, sessionId: startNew ? null : sessionId }),
      })

      if (!response.ok) throw new Error('Backend error')

      const data = await response.json()
      setResult(data)
      setSessionId(data.sessionId)
      setNodeId(data.nodeId)
      setHistory(prev => [...prev, concept])
    } catch (err) {
      setError('Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    explore(input.trim(), null, true)
    setInput('')
  }

  async function askFollowUp(e) {
    e.preventDefault()
    if (!followUpInput.trim()) return

    setFollowUpLoading(true)
    setFollowUpAnswer(null)

    try {
      const response = await fetch('http://localhost:3001/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: history[history.length - 1],
          question: followUpInput.trim(),
          sessionId,
          nodeId,
        }),
      })

      if (!response.ok) throw new Error('Backend error')

      const data = await response.json()
      setFollowUpAnswer(data.answer)
    } catch (err) {
      setFollowUpAnswer('Something went wrong. Is the backend running?')
    } finally {
      setFollowUpLoading(false)
    }
  }

  function handleConnect(e) {
    e.preventDefault()
    if (!connectInput.trim()) return
    explore(connectInput.trim(), history[history.length - 1])
    setConnectInput('')
  }

  return (
    <div className="app">
      <NeuralBackground />
      <header>
        <h1>happyLearning</h1>
        <p>Type a concept. Follow your curiosity.</p>
      </header>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. database indexing"
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Thinking...' : 'Explore'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="history">
          {history.map((item, i) => (
            <span key={i}>
              {i > 0 && <span className="arrow"> → </span>}
              <button className="history-btn" onClick={() => explore(item)}>
                {item}
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Asking Claude...</span>
        </div>
      )}

      {result && (
        <div className="result">
          <div className="result-left">
            <div className="explanation">
              <h2>{history[history.length - 1]}</h2>
              <p>{result.explanation}</p>
            </div>

            {result.realWorldExample && (
              <div className="real-world">
                <p className="section-label">In practice</p>
                <p>{result.realWorldExample}</p>
              </div>
            )}
          </div>

          <div className="followup">
            <p className="section-label">Ask a question about this</p>
            <form onSubmit={askFollowUp} className="followup-form">
              <input
                type="text"
                value={followUpInput}
                onChange={e => setFollowUpInput(e.target.value)}
                placeholder="e.g. what does a B-tree look like?"
                disabled={followUpLoading}
              />
              <button type="submit" disabled={followUpLoading || !followUpInput.trim()}>
                {followUpLoading ? '...' : 'Ask'}
              </button>
            </form>
            {followUpLoading && (
              <div className="loading followup-loading">
                <div className="spinner" />
                <span>Thinking...</span>
              </div>
            )}
            {followUpAnswer && (
              <div className="followup-answer">
                <p>{followUpAnswer}</p>
              </div>
            )}
          </div>

          <div className="connect">
            <p className="section-label">Based on this, explore...</p>
            <form onSubmit={handleConnect} className="connect-form">
              <input
                type="text"
                value={connectInput}
                onChange={e => setConnectInput(e.target.value)}
                placeholder={`Based on ${history[history.length - 1] || 'this'}, explain...`}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !connectInput.trim()}>
                Explore
              </button>
            </form>
          </div>

          <div className="branches">
            <p className="branches-label">Where do you want to go next?</p>
            <div className="branch-grid">
              {result.branches.map(branch => (
                <button
                  key={branch.id}
                  className="branch-btn"
                  onClick={() => explore(branch.label)}
                >
                  <span className="branch-label">{branch.label}</span>
                  <span className="branch-reason">{branch.reason}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
