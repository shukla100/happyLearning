require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/explore', async (req, res) => {
  const { concept } = req.body;

  if (!concept) {
    return res.status(400).json({ error: 'No concept provided' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are a highly skilled engineer and technical thinking partner. The user wants to learn about: "${concept}".

Respond with a JSON object in exactly this format:
{
  "explanation": "A clear, expert-level but accessible explanation of the concept. No fluff. Treat the user as intelligent but non-technical.",
  "realWorldExample": "A concrete, specific scenario of how this concept plays out inside a real software team or company. Name a real company or team type. Make it feel grounded and practical, not textbook.",
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
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong calling Claude' });
  }
});

app.post('/followup', async (req, res) => {
  const { concept, question } = req.body;

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

Answer directly and clearly. Be expert-level but accessible — no fluff, no padding. Treat the user as intelligent but non-technical. 2-4 sentences is ideal unless the question genuinely requires more depth.`,
        },
      ],
    });

    res.json({ answer: message.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong calling Claude' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
