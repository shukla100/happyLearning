require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const {
  createNewSession,
  createNewNode,
  saveSession,
  loadSession,
  loadBrain,
  saveBrain,
  recordConceptExplored,
  recordConceptAsBranch,
  recordConnection,
  recordFollowUp,
} = require('./storage');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  const intro = context
    ? `You are a highly skilled engineer and technical thinking partner. The user has been learning about "${context}" and now wants to explore "${concept}" through that lens. Frame your explanation by connecting it back to what they just learned about "${context}" — make the connection explicit and natural.`
    : `You are a highly skilled engineer and technical thinking partner. The user wants to learn about: "${concept}".`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `${intro}

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

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `You are a highly skilled engineer and technical thinking partner. The user has been learning about "${concept}" and has a follow-up question.

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
