require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const {
  createNewSession,
  createNewNode,
  saveSession,
  loadSession,
  loadAllSessions,
  loadBrain,
  saveBrain,
  recordConceptExplored,
  recordConceptAsBranch,
  recordConnection,
  recordFollowUp,
  buildBrainContext,
  loadJournal,
  saveJournal,
  createTopic,
  renameTopic,
  deleteTopic,
  addNote,
  editNote,
  deleteNote,
} = require('./storage');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function inferSemanticConnections(concept) {
  const brain = loadBrain();
  const exploredConcepts = Object.entries(brain.concepts)
    .filter(([name, data]) => name !== concept && data.encounteredAs.includes('main'))
    .map(([name]) => name);

  if (exploredConcepts.length === 0) return;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `New concept: "${concept}"
Previously explored concepts: ${exploredConcepts.join(', ')}

Which of the previously explored concepts have a tight, direct conceptual relationship with "${concept}"? Only include concepts that are closely related — same domain, direct prerequisite, or direct extension. Exclude loose or tangential connections.

Respond with JSON only: { "relatedConcepts": ["concept1", "concept2"] }
If none are tightly related, return: { "relatedConcepts": [] }`,
    }],
  });

  const parsed = JSON.parse(message.content[0].text);
  if (!parsed.relatedConcepts || parsed.relatedConcepts.length === 0) return;

  const freshBrain = loadBrain();
  parsed.relatedConcepts.forEach(related => {
    if (exploredConcepts.includes(related)) {
      recordConnection(freshBrain, concept, related);
      recordConnection(freshBrain, related, concept);
    }
  });
  saveBrain(freshBrain);
}

app.post('/explore', async (req, res) => {
  const { concept, context, sessionId } = req.body;

  if (!concept) {
    return res.status(400).json({ error: 'No concept provided' });
  }

  // Load existing session or start a fresh one
  let session = sessionId ? loadSession(sessionId) : null;
  if (!session) {
    session = createNewSession(concept);
  }

  // Read brain.json and build a context summary for Claude
  const brain = loadBrain();
  const brainContext = buildBrainContext(brain);

  // The system prompt is the foundational instructions Claude reads before anything else.
  // We put the learner's brain context here so Claude treats it as background truth,
  // not as part of the conversation.
  const systemPrompt = [
    `You are a highly skilled engineer and expert technical thinking partner. You explain things like a brilliant engineer talking to a smart, curious friend over coffee — direct, vivid, no jargon without explanation.`,
    brainContext || '',
  ].filter(Boolean).join('\n\n');

  const userMessage = context
    ? `The user has been learning about "${context}" and now wants to explore "${concept}" through that lens. Frame your explanation by connecting it back to what they just learned about "${context}" — make the connection explicit and natural.`
    : `The user wants to learn about: "${concept}".`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${userMessage}

Respond with a JSON object in exactly this format:
{
  "explanation": "3-4 punchy sentences max. Expert-level insight, zero fluff. Write like a brilliant engineer explaining this to a smart friend over coffee — direct, vivid, no jargon without explanation. Make the core idea land immediately.",
  "realWorldExample": "2-3 sentences. Name a real company. Make it feel like something that actually happened in a real engineering meeting, not a textbook scenario.",
  "branches": [
    { "id": "1", "label": "Branch concept name", "reason": "One sentence on why this naturally connects" },
    { "id": "2", "label": "Branch concept name", "reason": "One sentence on why this naturally connects" },
    { "id": "3", "label": "Branch concept name", "reason": "One sentence on why this naturally connects" },
    { "id": "4", "label": "Branch concept name", "reason": "One sentence on why this naturally connects" },
    { "id": "5", "label": "Branch concept name", "reason": "One sentence on why this naturally connects" }
  ]
}

Return only the JSON. No markdown, no extra text.`,
        },
      ],
    });

    const raw = message.content[0].text;
    const parsed = JSON.parse(raw);

    // Mark the previous node as leading to this concept
    if (session.nodes.length > 0) {
      const lastNode = session.nodes[session.nodes.length - 1];
      if (!lastNode.nextConcept) lastNode.nextConcept = concept;
    }

    // Create a new node and save the session
    const node = createNewNode(concept, parsed.explanation, parsed.realWorldExample, parsed.branches);
    session.nodes.push(node);
    saveSession(session);

    // Update brain.json
    const brain = loadBrain();
    recordConceptExplored(brain, concept, session.sessionId);
    parsed.branches.forEach(b => recordConceptAsBranch(brain, b.label, session.sessionId));
    if (context) recordConnection(brain, context, concept);
    saveBrain(brain);

    res.json({ ...parsed, sessionId: session.sessionId, nodeId: node.nodeId });

    // Run semantic inference in background — frontend does not wait for this
    inferSemanticConnections(concept).catch(err => console.error('Semantic inference failed:', err));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong calling Claude' });
  }
});

app.post('/followup', async (req, res) => {
  const { concept, question, sessionId, nodeId } = req.body;

  if (!concept || !question) {
    return res.status(400).json({ error: 'Missing concept or question' });
  }

  const followUpBrain = loadBrain();
  const followUpBrainContext = buildBrainContext(followUpBrain);

  const followUpSystem = [
    `You are a highly skilled engineer and expert technical thinking partner. You explain things like a brilliant engineer talking to a smart, curious friend — direct, vivid, no jargon without explanation.`,
    followUpBrainContext || '',
  ].filter(Boolean).join('\n\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: followUpSystem,
      messages: [
        {
          role: 'user',
          content: `The user has been learning about "${concept}" and has a follow-up question.

Question: "${question}"

Respond with a JSON object in exactly this format:
{
  "answer": "Your answer here. Be expert-level but accessible — no fluff, no padding. Treat the user as intelligent but non-technical. 2-4 sentences is ideal unless the question genuinely requires more depth.",
  "extractedConcepts": ["concept1", "concept2"]
}

For extractedConcepts: identify 1-3 underlying technical concepts that the question is really about — even if the question is vague or conversational. For example, "why does any of this matter for speed?" is really about "performance" and "latency". Use clean, lowercase concept names. If the question is very specific and maps directly to the topic, return an empty array.

Return only the JSON. No markdown, no extra text.`,
        },
      ],
    });

    const raw = message.content[0].text;
    const parsed = JSON.parse(raw);

    // Save the follow-up to the correct node in the session
    if (sessionId && nodeId) {
      const session = loadSession(sessionId);
      if (session) {
        const node = session.nodes.find(n => n.nodeId === nodeId);
        if (node) {
          node.followUps.push({
            question,
            answer: parsed.answer,
            extractedConcepts: parsed.extractedConcepts,
            askedAt: new Date().toISOString(),
          });
          saveSession(session);
        }
      }
    }

    // Update brain.json with the follow-up and extracted concepts
    if (sessionId) {
      const brain = loadBrain();
      recordFollowUp(brain, concept, question, parsed.extractedConcepts || [], sessionId);
      saveBrain(brain);
    }

    res.json({ answer: parsed.answer, extractedConcepts: parsed.extractedConcepts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong calling Claude' });
  }
});

app.get('/concept/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name)
  const sessions = loadAllSessions()

  let explanation = null
  let realWorldExample = null
  const followUps = []

  for (const session of sessions) {
    for (const node of session.nodes) {
      if (node.concept.toLowerCase() === name.toLowerCase()) {
        if (!explanation) {
          explanation = node.explanation
          realWorldExample = node.realWorldExample
        }
        followUps.push(...node.followUps)
      }
    }
  }

  if (!explanation) {
    return res.status(404).json({ error: 'Concept not found' })
  }

  res.json({ concept: name, explanation, realWorldExample, followUps })
})

app.get('/sessions', (req, res) => {
  try {
    const sessions = loadAllSessions();
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load sessions' });
  }
});

app.get('/brain', (req, res) => {
  try {
    const brain = loadBrain();
    res.json(brain);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load brain' });
  }
});

app.get('/journal', (req, res) => {
  try {
    const journal = loadJournal();
    res.json(journal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load journal' });
  }
});

app.post('/journal/topics', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Topic name is required' });
  }

  const journal = loadJournal();
  const topic = createTopic(journal, name.trim());
  saveJournal(journal);
  backupJournalToGitHub();
  res.json(topic);
});

app.put('/journal/topics/:topicId', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Topic name is required' });
  }

  const journal = loadJournal();
  const topic = renameTopic(journal, req.params.topicId, name.trim());
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  saveJournal(journal);
  backupJournalToGitHub();
  res.json(topic);
});

app.delete('/journal/topics/:topicId', (req, res) => {
  const journal = loadJournal();
  deleteTopic(journal, req.params.topicId);
  saveJournal(journal);
  backupJournalToGitHub();
  res.json({ success: true });
});

app.post('/journal/topics/:topicId/notes', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const journal = loadJournal();
  const note = addNote(journal, req.params.topicId, content.trim());
  if (!note) return res.status(404).json({ error: 'Topic not found' });
  saveJournal(journal);
  backupJournalToGitHub();
  res.json(note);
});

app.put('/journal/topics/:topicId/notes/:noteId', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const journal = loadJournal();
  const note = editNote(journal, req.params.topicId, req.params.noteId, content.trim());
  if (!note) return res.status(404).json({ error: 'Note not found' });
  saveJournal(journal);
  backupJournalToGitHub();
  res.json(note);
});

app.delete('/journal/topics/:topicId/notes/:noteId', (req, res) => {
  const journal = loadJournal();
  deleteNote(journal, req.params.topicId, req.params.noteId);
  saveJournal(journal);
  backupJournalToGitHub();
  res.json({ success: true });
});

// Shared helper for pushing any JSON file to the GitHub backup repo.
// Used both by /end-session (session + brain) and by every journal route
// (journal.json), since journal entries aren't tied to a session and need
// their own trigger to survive Render's disk resets.
async function pushFileToGitHub(filePath, content) {
  const token = process.env.GITHUB_TOKEN;
  const repoFullName = process.env.GITHUB_SESSIONS_REPO;
  if (!token || !repoFullName) {
    throw new Error('GitHub credentials not configured in .env');
  }

  const [owner, repo] = repoFullName.split('/');

  // Dynamic import works here because @octokit/rest v22 is ESM-only
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });

  const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

  // Check if the file already exists (needed to get its SHA for updates)
  let sha;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path: filePath });
    sha = existing.data.sha;
  } catch {
    sha = undefined;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `update: ${filePath}`,
    content: encoded,
    sha,
  });
}

// Fire-and-forget backup of journal.json — called after every journal change.
// Errors are only logged so a GitHub hiccup never breaks the user-facing request.
//
// GitHub rejects a write if the file's "sha" (a hash identifying its current
// version) doesn't match what it expects — its way of detecting two writes
// racing each other. Two journal changes made in quick succession (e.g. adding
// a topic right before adding a note) would otherwise both read the "old" sha
// and collide. Chaining onto `journalBackupQueue` instead of calling
// pushFileToGitHub directly forces every backup to wait for the previous one
// to finish, so they always run one at a time.
let journalBackupQueue = Promise.resolve();
function backupJournalToGitHub() {
  journalBackupQueue = journalBackupQueue
    .then(() => pushFileToGitHub('journal.json', loadJournal()))
    .catch(err => {
      console.error('Journal backup to GitHub failed:', err.message);
    });
}

app.post('/end-session', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'No sessionId provided' });
  }

  const session = loadSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const brain = loadBrain();
    await pushFileToGitHub(`sessions/${sessionId}.json`, session);
    await pushFileToGitHub('brain.json', brain);

    res.json({ success: true, message: 'Session and brain backed up to GitHub' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to push to GitHub' });
  }
});

// On startup, if there's no real data locally yet (fresh clone or a Render
// cold start after the disk got wiped), pull the last backup down from the
// GitHub sessions repo instead of starting from the old demo seed data.
// If the backup repo is empty too, the server just starts blank.
async function restoreFromGitHubBackup() {
  const brain = loadBrain();
  const hasLocalData = Object.keys(brain.concepts).length > 0;
  if (hasLocalData) return;

  const token = process.env.GITHUB_TOKEN;
  const repoFullName = process.env.GITHUB_SESSIONS_REPO;
  if (!token || !repoFullName) return;

  const [owner, repo] = repoFullName.split('/');
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'brain.json' });
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    fs.writeFileSync(path.join(__dirname, 'brain.json'), content);
    console.log('Restored brain.json from GitHub backup.');
  } catch {
    console.log('No brain.json found in GitHub backup — starting blank.');
    return;
  }

  try {
    const { data: sessionFiles } = await octokit.repos.getContent({ owner, repo, path: 'sessions' });
    for (const file of sessionFiles.filter(f => f.type === 'file' && f.name.endsWith('.json'))) {
      const { data } = await octokit.repos.getContent({ owner, repo, path: file.path });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      fs.writeFileSync(path.join(__dirname, 'sessions', file.name), content);
    }
    console.log(`Restored ${sessionFiles.length} session(s) from GitHub backup.`);
  } catch {
    console.log('No sessions found in GitHub backup.');
  }

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'journal.json' });
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    fs.writeFileSync(path.join(__dirname, 'journal.json'), content);
    console.log('Restored journal.json from GitHub backup.');
  } catch {
    console.log('No journal.json found in GitHub backup.');
  }
}

restoreFromGitHubBackup().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
});
