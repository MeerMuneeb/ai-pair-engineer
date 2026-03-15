export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' });
  }

  const prompt = `You are an expert code reviewer. Analyze the following ${language} code and respond with ONLY valid JSON (no markdown, no backticks, no explanation).

Schema:
{
  "language": "detected language",
  "readability":     { "score": <1-10>, "issues": ["...","...","..."] },
  "structure":       { "score": <1-10>, "issues": ["...","...","..."] },
  "maintainability": { "score": <1-10>, "issues": ["...","...","..."] },
  "tests": ["...","...","..."],
  "testSnippet": "short runnable test example (3-6 lines)",
  "refactoring": { "description": "1-2 sentence summary", "code": "full refactored code" },
  "positive": "one specific positive note referencing actual variable/function names"
}

Rules:
- Exactly 3 issues per dimension, referencing actual variable/function names from the code
- Refactored code must be production-ready
- testSnippet is illustrative only, keep it brief

Code to review:
\`\`\`${language}
${code}
\`\`\``;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
