const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, 'sessions');
const BRAIN_FILE = path.join(__dirname, 'brain.json');

// Create sessions folder and brain.json if they don't exist (e.g. fresh clone)
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);
if (!fs.existsSync(BRAIN_FILE)) {
  fs.writeFileSync(BRAIN_FILE, JSON.stringify({
    lastUpdated: null,
    concepts: {},
    connections: [],
    learningGaps: [],
    recommendedNext: [],
  }, null, 2));
}

// ─── Session helpers ────────────────────────────────────────────────────────

function generateSessionId() {
  return `session_${Date.now()}`;
}

function generateNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createNewSession(startingConcept) {
  return {
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    startingConcept,
    nodes: [],
  };
}

function createNewNode(concept, explanation, realWorldExample, branches) {
  return {
    nodeId: generateNodeId(),
    concept,
    exploredAt: new Date().toISOString(),
    explanation,
    realWorldExample,
    branches,
    followUps: [],
    nextConcept: null,
  };
}

function saveSession(session) {
  const filePath = path.join(SESSIONS_DIR, `${session.sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
}

function loadSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadAllSessions() {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

// ─── Brain helpers ──────────────────────────────────────────────────────────

function loadBrain() {
  return JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf8'));
}

function saveBrain(brain) {
  brain.lastUpdated = new Date().toISOString();
  fs.writeFileSync(BRAIN_FILE, JSON.stringify(brain, null, 2));
}

// Called when a concept is directly explored (main node)
function recordConceptExplored(brain, concept, sessionId) {
  if (!brain.concepts[concept]) {
    brain.concepts[concept] = {
      firstEncountered: new Date().toISOString(),
      lastEncountered: new Date().toISOString(),
      timesExplored: 0,
      followUpQuestions: [],
      extractedConcepts: [],
      depthScore: 0,
      encounteredAs: [],
      sessionsAppearedIn: [],
    };
  }

  const entry = brain.concepts[concept];
  entry.lastEncountered = new Date().toISOString();
  entry.timesExplored += 1;
  if (!entry.encounteredAs.includes('main')) entry.encounteredAs.push('main');
  if (!entry.sessionsAppearedIn.includes(sessionId)) entry.sessionsAppearedIn.push(sessionId);

  recalculateDepthScore(brain, concept);
}

// Called when a concept appears as a branch option (even if not clicked)
function recordConceptAsBranch(brain, concept, sessionId) {
  if (!brain.concepts[concept]) {
    brain.concepts[concept] = {
      firstEncountered: new Date().toISOString(),
      lastEncountered: new Date().toISOString(),
      timesExplored: 0,
      followUpQuestions: [],
      extractedConcepts: [],
      depthScore: 0,
      encounteredAs: [],
      sessionsAppearedIn: [],
    };
  }

  const entry = brain.concepts[concept];
  if (!entry.encounteredAs.includes('branch')) entry.encounteredAs.push('branch');
  if (!entry.sessionsAppearedIn.includes(sessionId)) entry.sessionsAppearedIn.push(sessionId);

  recalculateDepthScore(brain, concept);
}

// Called when a follow-up question is asked — stores both the raw question
// and any concepts Claude extracted from it (even if vague)
function recordFollowUp(brain, parentConcept, question, extractedConcepts, sessionId) {
  // Log the question on the parent concept
  if (brain.concepts[parentConcept]) {
    brain.concepts[parentConcept].followUpQuestions.push(question);
    recalculateDepthScore(brain, parentConcept);
  }

  // Each extracted concept gets its own entry as a learning gap
  extractedConcepts.forEach(concept => {
    if (!brain.concepts[concept]) {
      brain.concepts[concept] = {
        firstEncountered: new Date().toISOString(),
        lastEncountered: new Date().toISOString(),
        timesExplored: 0,
        followUpQuestions: [],
        extractedConcepts: [],
        depthScore: 0,
        encounteredAs: [],
        sessionsAppearedIn: [],
      };
    }

    const entry = brain.concepts[concept];
    entry.lastEncountered = new Date().toISOString();
    if (!entry.encounteredAs.includes('followup-extracted')) {
      entry.encounteredAs.push('followup-extracted');
    }
    if (!entry.sessionsAppearedIn.includes(sessionId)) {
      entry.sessionsAppearedIn.push(sessionId);
    }

    // Mark as a learning gap if never directly explored
    const isGap = !entry.encounteredAs.includes('main');
    const alreadyGap = brain.learningGaps.some(g => g.concept === concept);
    if (isGap && !alreadyGap) {
      brain.learningGaps.push({
        concept,
        surfacedFrom: parentConcept,
        signal: `Surfaced from a follow-up question on "${parentConcept}" but never directly explored`,
      });
    }
  });
}

// Called when you go from one concept to another
function recordConnection(brain, fromConcept, toConcept) {
  const existing = brain.connections.find(
    c => c.from === fromConcept && c.to === toConcept
  );
  if (existing) {
    existing.strength += 1;
  } else {
    brain.connections.push({ from: fromConcept, to: toConcept, strength: 1 });
  }
}

// depthScore: 0–1 number reflecting how deeply you engaged with a concept
// Higher score = more follow-ups asked, explored directly multiple times, appeared across sessions
function recalculateDepthScore(brain, concept) {
  const entry = brain.concepts[concept];
  if (!entry) return;

  const exploredDirectly = entry.timesExplored > 0 ? 0.4 : 0;
  const followUpWeight = Math.min(entry.followUpQuestions.length * 0.15, 0.4);
  const multiSession = entry.sessionsAppearedIn.length > 1 ? 0.2 : 0;

  entry.depthScore = Math.min(parseFloat((exploredDirectly + followUpWeight + multiSession).toFixed(2)), 1);
}

module.exports = {
  createNewSession,
  createNewNode,
  saveSession,
  loadSession,
  loadAllSessions,
  loadBrain,
  saveBrain,
  recordConceptExplored,
  recordConceptAsBranch,
  recordFollowUp,
  recordConnection,
  recalculateDepthScore,
};
