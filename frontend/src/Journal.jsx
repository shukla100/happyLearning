import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL

export default function Journal() {
  const [topics, setTopics] = useState([])
  const [selectedTopicId, setSelectedTopicId] = useState(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [editingTopicId, setEditingTopicId] = useState(null)
  const [editingTopicName, setEditingTopicName] = useState('')

  useEffect(() => {
    loadJournal()
  }, [])

  async function loadJournal() {
    const res = await fetch(`${API}/journal`)
    const data = await res.json()
    setTopics(data.topics)
  }

  const selectedTopic = topics.find(t => t.id === selectedTopicId) || null

  async function handleNewTopic(e) {
    e.preventDefault()
    if (!newTopicName.trim()) return

    const res = await fetch(`${API}/journal/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTopicName.trim() }),
    })
    const topic = await res.json()
    setTopics(prev => [...prev, topic])
    setSelectedTopicId(topic.id)
    setNewTopicName('')
  }

  async function handleDeleteTopic(topicId) {
    await fetch(`${API}/journal/topics/${topicId}`, { method: 'DELETE' })
    setTopics(prev => prev.filter(t => t.id !== topicId))
    if (selectedTopicId === topicId) setSelectedTopicId(null)
  }

  function startRenameTopic(topic) {
    setEditingTopicId(topic.id)
    setEditingTopicName(topic.name)
  }

  async function saveTopicRename(topicId) {
    if (!editingTopicName.trim()) return
    const res = await fetch(`${API}/journal/topics/${topicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTopicName.trim() }),
    })
    const updated = await res.json()
    setTopics(prev => prev.map(t => (t.id === topicId ? updated : t)))
    setEditingTopicId(null)
  }

  async function handleNewNote(e) {
    e.preventDefault()
    if (!newNoteContent.trim() || !selectedTopicId) return

    const res = await fetch(`${API}/journal/topics/${selectedTopicId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNoteContent.trim() }),
    })
    const note = await res.json()
    setTopics(prev =>
      prev.map(t =>
        t.id === selectedTopicId ? { ...t, notes: [note, ...t.notes] } : t
      )
    )
    setNewNoteContent('')
  }

  function startEditNote(note) {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
  }

  async function saveNoteEdit(noteId) {
    if (!editingNoteContent.trim()) return
    const res = await fetch(`${API}/journal/topics/${selectedTopicId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editingNoteContent.trim() }),
    })
    const updated = await res.json()
    setTopics(prev =>
      prev.map(t =>
        t.id === selectedTopicId
          ? { ...t, notes: t.notes.map(n => (n.id === noteId ? updated : n)) }
          : t
      )
    )
    setEditingNoteId(null)
  }

  async function handleDeleteNote(noteId) {
    await fetch(`${API}/journal/topics/${selectedTopicId}/notes/${noteId}`, {
      method: 'DELETE',
    })
    setTopics(prev =>
      prev.map(t =>
        t.id === selectedTopicId
          ? { ...t, notes: t.notes.filter(n => n.id !== noteId) }
          : t
      )
    )
  }

  return (
    <div className="journal">
      <div className="journal-layout">
        <div className="journal-sidebar">
          <form onSubmit={handleNewTopic} className="journal-new-topic-form">
            <input
              type="text"
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              placeholder="New topic name"
            />
            <button type="submit" disabled={!newTopicName.trim()}>+</button>
          </form>

          <div className="journal-topic-list">
            {topics.length === 0 && (
              <p className="journal-empty-hint">No topics yet. Add one above.</p>
            )}
            {topics.map(topic => (
              <div
                key={topic.id}
                className={`journal-topic-item ${topic.id === selectedTopicId ? 'active' : ''}`}
              >
                {editingTopicId === topic.id ? (
                  <input
                    type="text"
                    className="journal-topic-rename-input"
                    value={editingTopicName}
                    onChange={e => setEditingTopicName(e.target.value)}
                    onBlur={() => saveTopicRename(topic.id)}
                    onKeyDown={e => e.key === 'Enter' && saveTopicRename(topic.id)}
                    autoFocus
                  />
                ) : (
                  <button
                    className="journal-topic-name"
                    onClick={() => setSelectedTopicId(topic.id)}
                  >
                    {topic.name}
                    <span className="journal-topic-count">{topic.notes.length}</span>
                  </button>
                )}
                <div className="journal-topic-actions">
                  <button title="Rename" onClick={() => startRenameTopic(topic)}>✎</button>
                  <button title="Delete" onClick={() => handleDeleteTopic(topic.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="journal-main">
          {!selectedTopic && (
            <p className="journal-empty-hint">Select or create a topic to start taking notes.</p>
          )}

          {selectedTopic && (
            <>
              <h2 className="journal-topic-title">{selectedTopic.name}</h2>

              <form onSubmit={handleNewNote} className="journal-new-note-form">
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  rows={4}
                />
                <button type="submit" disabled={!newNoteContent.trim()}>Add Note</button>
              </form>

              <div className="journal-notes">
                {selectedTopic.notes.length === 0 && (
                  <p className="journal-empty-hint">No notes yet for this topic.</p>
                )}
                {selectedTopic.notes.map(note => (
                  <div key={note.id} className="journal-note">
                    {editingNoteId === note.id ? (
                      <>
                        <textarea
                          value={editingNoteContent}
                          onChange={e => setEditingNoteContent(e.target.value)}
                          rows={4}
                          autoFocus
                        />
                        <div className="journal-note-actions">
                          <button onClick={() => saveNoteEdit(note.id)}>Save</button>
                          <button onClick={() => setEditingNoteId(null)}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="journal-note-content">{note.content}</p>
                        <div className="journal-note-footer">
                          <span className="journal-note-date">
                            {new Date(note.createdAt).toLocaleString()}
                            {note.updatedAt && ' (edited)'}
                          </span>
                          <div className="journal-note-actions">
                            <button onClick={() => startEditNote(note)}>Edit</button>
                            <button onClick={() => handleDeleteNote(note.id)}>Delete</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
