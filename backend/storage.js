const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, 'sessions');
const BRAIN_FILE = path.join(__dirname, 'brain.json');
const SEED_FILE = path.join(__dirname, 'brain.seed.json');

// Create sessions folder and brain.json if they don't exist (e.g. fresh clone or Render cold start)
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);
if (!fs.existsSync(BRAIN_FILE)) {
  if (fs.existsSync(SEED_FILE)) {
    fs.copyFileSync(SEED_FILE, BRAIN_FILE);
  } else {
    fs.writeFileSync(BRAIN_FILE, JSON.stringify({
      lastUpdated: null,
      concepts: {},
      connections: [],
      learningGaps: [],
      recommendedNext: [],
    }, null, 2));
  }
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
  brain.recommendedNext = generateRecommendations(brain);
  fs.writeFileSync(BRAIN_FILE, JSON.stringify(brain, null, 2));
}

// Fills recommendedNext using two rules:
// 1. Concepts that surfaced in follow-up questions but were never directly explored (learning gaps)
// 2. Concepts seen as branches multiple times but never clicked
function generateRecommendations(brain) {
  const concepts = brain.concepts;

  // Rule 1: learning gaps — highest priority because the learner already signalled curiosity
  const gapConcepts = brain.learningGaps
    .map(g => g.concept)
    .filter(name => !brain.concepts[name]?.encounteredAs.includes('main'));

  // Rule 2: seen as branch but never explored, sorted by how many sessions they appeared in
  // (appearing in multiple sessions = recurring relevance = worth exploring)
  const unseenBranches = Object.entries(concepts)
    .filter(([name, data]) =>
      data.encounteredAs.includes('branch') &&
      !data.encounteredAs.includes('main') &&
      !gapConcepts.includes(name)
    )
    .sort((a, b) => b[1].sessionsAppearedIn.length - a[1].sessionsAppearedIn.length)
    .slice(0, 6)
    .map(([name]) => name);

  return [...gapConcepts.slice(0, 3), ...unseenBranches].slice(0, 8);
}

// Builds a plain-English summary of brain.json to send to Claude as context
// before it responds to any exploration or follow-up question
function buildBrainContext(brain) {
  const concepts = brain.concepts;
  if (Object.keys(concepts).length === 0) return null;

  // Deeply explored = explored directly at least once with a meaningful depth score
  const deeplyExplored = Object.entries(concepts)
    .filter(([, data]) => data.depthScore >= 0.4 && data.encounteredAs.includes('main'))
    .sort((a, b) => b[1].depthScore - a[1].depthScore)
    .map(([name]) => name);

  // Lightly explored = explored directly but with low depth (no follow-ups, not revisited)
  const lightlyExplored = Object.entries(concepts)
    .filter(([, data]) => data.depthScore > 0 && data.depthScore < 0.4 && data.encounteredAs.includes('main'))
    .map(([name]) => name);

  // Seen but never explored = offered as branch suggestions, never clicked
  const seenNotExplored = Object.entries(concepts)
    .filter(([, data]) => !data.encounteredAs.includes('main'))
    .sort((a, b) => b[1].sessionsAppearedIn.length - a[1].sessionsAppearedIn.length)
    .slice(0, 8)
    .map(([name]) => name);

  // Learning gaps = concepts that came up in follow-up questions but were never explored
  const gaps = brain.learningGaps.map(
    g => `"${g.concept}" (came up while studying ${g.surfacedFrom})`
  );

  const recommended = brain.recommendedNext.slice(0, 5);

  let context = `LEARNER CONTEXT — read this before responding:\n`;

  if (deeplyExplored.length > 0) {
    context += `\nTopics this learner has explored deeply: ${deeplyExplored.join(', ')}.`;
  }
  if (lightlyExplored.length > 0) {
    context += `\nTopics touched briefly: ${lightlyExplored.join(', ')}.`;
  }
  if (seenNotExplored.length > 0) {
    context += `\nTopics seen as suggestions but never explored: ${seenNotExplored.join(', ')}.`;
  }
  if (gaps.length > 0) {
    context += `\nLearning gaps — surfaced in questions but never directly studied: ${gaps.join('; ')}.`;
  }
  if (recommended.length > 0) {
    context += `\nRecommended next based on their learning patterns: ${recommended.join(', ')}.`;
  }

  context += `\n\nUse this context to:
- Skip re-explaining things they already know deeply — build on top of that knowledge instead
- Connect this new concept to what they already understand where it's natural and useful
- If this concept relates to one of their learning gaps, surface that connection explicitly
- Lean branch suggestions toward their gaps and recommended next topics
- Treat this learner as someone who learns by following curiosity across topics, not linearly`;

  return context;
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
  buildBrainContext,
};
