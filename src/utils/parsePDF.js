import * as pdfjsLib from 'pdfjs-dist';

// Use local worker to avoid CDN dependency
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function parsePDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return { text: fullText.trim(), numPages: pdf.numPages };
}

export async function parseWithAI(extractedText, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Questo è il testo estratto da un file calendario (PDF o PowerPoint) di un brand di moda. Analizzalo e restituisci un JSON array con le attività trovate.
Ogni oggetto deve avere: { "data": "DD/MM/YYYY o descrizione periodo", "tema": "nome attività", "descrizione": "opzionale", "canale": "opzionale" }.
Se trovi solo settimane o mesi senza giorni precisi, usa il primo giorno della settimana/mese.
Restituisci SOLO il JSON, niente altro.

TESTO:
${extractedText}`,
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  // Extract JSON even if surrounded by text
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Nessun JSON trovato nella risposta AI');
  return JSON.parse(match[0]);
}
