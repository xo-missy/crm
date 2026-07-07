import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client if key is provided
let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Generate a lead score (Hot, Warm, Cold) with a one-sentence reason.
 */
export async function generateLeadScore({ contact, notes, deals }) {
  if (!anthropicClient) {
    return generateMockLeadScore({ contact, notes, deals });
  }

  try {
    const prompt = `
You are an expert CRM sales intelligence bot.
Analyze this contact information, their interaction notes, and associated sales deals, then assign a lead score ("Hot", "Warm", or "Cold") and provide a brief one-line reason.

Contact Details:
- Name: ${contact.name}
- Phone: ${contact.phone || 'N/A'}
- Tags: ${contact.tags.join(', ') || 'None'}

Deals:
${deals.map(d => `- Title: ${d.title}, Value: $${d.value}, Stage: ${d.stage}`).join('\n') || 'No deals'}

Notes:
${notes.map(n => `- ${n.content}`).join('\n') || 'No notes'}

Respond ONLY with a JSON object in this format:
{
  "score": "Hot" | "Warm" | "Cold",
  "reason": "One-line summary explanation of the score"
}
Do not add any markup or introductory text. Just return the JSON object.
    `;

    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const contentText = response.content[0].text.trim();
    return JSON.parse(contentText);
  } catch (error) {
    console.error('Anthropic API error for Lead Score:', error);
    return generateMockLeadScore({ contact, notes, deals });
  }
}

/**
 * Generate a summary (2-3 sentences) of where things stand with a contact.
 */
export async function generateContactSummary({ contact, notes, deals }) {
  if (!anthropicClient) {
    return generateMockContactSummary({ contact, notes, deals });
  }

  try {
    const prompt = `
You are a CRM assistant. Summarize this contact's relationship status and current progress based on the notes and deals.
Keep the summary to exactly 2 to 3 sentences. Be professional and objective.

Contact: ${contact.name}
Tags: ${contact.tags.join(', ') || 'None'}

Deals:
${deals.map(d => `- ${d.title} (Value: $${d.value}, Stage: ${d.stage})`).join('\n') || 'No deals'}

Notes:
${notes.map(n => `- [${new Date(n.createdAt).toLocaleDateString()}] ${n.content}`).join('\n') || 'No notes'}

Respond with just the raw paragraph summary (2-3 sentences). Do not add any headings or extra text.
    `;

    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 250,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic API error for Contact Summary:', error);
    return generateMockContactSummary({ contact, notes, deals });
  }
}

// --- MOCK FALLBACKS ---

function generateMockLeadScore({ contact, notes, deals }) {
  let score = 'Cold';
  let reason = 'Minimal interaction history or open deals logged.';

  const notesText = notes.map(n => n.content.toLowerCase()).join(' ');
  const hasWonOrNegotiating = deals.some(d => ['Negotiation', 'Won', 'Proposal'].includes(d.stage));
  const hasDeals = deals.length > 0;

  if (hasWonOrNegotiating || notesText.includes('buy') || notesText.includes('interested') || notesText.includes('meeting scheduled')) {
    score = 'Hot';
    reason = hasWonOrNegotiating 
      ? `Contact has deals in advanced stages (${deals.find(d => ['Negotiation', 'Won', 'Proposal'].includes(d.stage))?.stage}).`
      : 'Contact shows high interest through recent email exchanges/meetings.';
  } else if (hasDeals || notesText.includes('follow up') || notesText.includes('connected')) {
    score = 'Warm';
    reason = 'Active pipeline deals present with moderate interaction notes.';
  } else if (notes.length > 0) {
    score = 'Warm';
    reason = 'Some notes have been logged, but no active deals or high-intent buying signals detected.';
  }

  return { score, reason: `[Fallback Mode] ${reason}` };
}

function generateMockContactSummary({ contact, notes, deals }) {
  if (notes.length === 0 && deals.length === 0) {
    return `No activity has been recorded for ${contact.name} yet. Initial outreach is recommended to establish contact.`;
  }

  const latestNote = notes.length > 0 ? notes[0].content : null;
  const activeDealsCount = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length;
  
  let summary = `Things are currently in progress with ${contact.name}.`;
  if (activeDealsCount > 0) {
    summary += ` There are currently ${activeDealsCount} active deals in the pipeline.`;
  } else {
    summary += ` There are no active deals open at this time.`;
  }

  if (latestNote) {
    summary += ` The latest update reports: "${latestNote.length > 80 ? latestNote.substring(0, 80) + '...' : latestNote}"`;
  } else {
    summary += ` No meeting or interaction logs have been added recently.`;
  }

  return `[Fallback Mode] ${summary}`;
}
