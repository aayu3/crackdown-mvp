import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /reminders
 * { "tasks": ["do laundry", "finish report"], "times": ["18:00", "21:00"] }
 */
app.post('/reminders', async (req, res) => {

  const messages = [
    {
      role: 'system',
      content:
        'You are a semi-sarcastic but encouraging assistant. Generate ONE short reminder per time the user supplied. Return ONLY a JSON object: {"reminders":[...]}',
    },
    {
      role: 'user',
      content: JSON.stringify(req.body),
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 1,
      response_format: { type: 'json_object' }, // new JSON mode
      max_tokens: 256,
    });                           // :contentReference[oaicite:0]{index=0}

    // the assistant’s message *is* JSON because of response_format
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI call failed' });
  }
});

app.listen(process.env.PORT || 8080, () =>
  console.log('Reminder service running'),
);