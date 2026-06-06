import { useState } from 'react'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  async function explore(concept) {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://localhost:3001/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      })

      if (!response.ok) throw new Error('Backend error')

      const data = await response.json()
      setResult(data)
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
    explore(input.trim())
    setInput('')
  }

  return (
    <div className="app">
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
