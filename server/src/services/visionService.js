import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `
You are a Visual AI Monitoring Agent analyzing browser tab screenshots.
Your job is to determine what the user is doing on their browser screen and return structured JSON ONLY.

Analyze the screenshot and context (URL, page title) to extract:
1. website: full domain or platform (e.g. "github.com", "youtube.com", "chatgpt.com")
2. domain: clean domain name (e.g. "github.com")
3. activity: concise description of current action (e.g. "Writing code in React", "Reading AI research paper", "Watching coding tutorial")
4. category: Exactly one of ["Coding", "Learning", "Meetings", "Distractions", "Social", "Utility", "Other"]
5. confidence: a float number between 0.0 and 1.0 indicating confidence
6. summary: 1-2 sentence detailed summary of what user is viewing or working on
7. sensitive_content: boolean (true if image contains banking forms, passwords, payment info, personal medical info, private messages; false otherwise)
8. productivity_score: integer (1 for productive/work/learning, 0 for neutral/utility, -1 for distraction/social)

Response must be pure JSON with NO markdown wrapping or preamble.
Example JSON output:
{
  "website": "github.com",
  "domain": "github.com",
  "activity": "Editing React component",
  "category": "Coding",
  "confidence": 0.96,
  "summary": "User is actively developing a web component in GitHub.",
  "sensitive_content": false,
  "productivity_score": 1
}
`;

/**
 * Fallback heuristic analyzer when API key is missing or call fails
 */
function heuristicAnalysis(pageUrl = '', pageTitle = '') {
  let domain = 'unknown';
  try {
    if (pageUrl) {
      const parsedUrl = new URL(pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`);
      domain = parsedUrl.hostname.replace(/^www\./, '');
    }
  } catch {
    domain = pageUrl || 'browser';
  }

  const lowerUrl = pageUrl.toLowerCase();
  const lowerTitle = pageTitle.toLowerCase();

  let category = 'Other';
  let activity = 'Browsing Web';
  let score = 0;

  if (lowerUrl.includes('github') || lowerUrl.includes('vscode') || lowerUrl.includes('stackover') || lowerTitle.includes('code') || lowerTitle.includes('repo')) {
    category = 'Coding';
    activity = lowerTitle ? `Developing: ${pageTitle.substring(0, 40)}` : 'Reviewing code';
    score = 1;
  } else if (lowerUrl.includes('chatgpt') || lowerUrl.includes('claude') || lowerUrl.includes('gemini') || lowerUrl.includes('arxiv') || lowerTitle.includes('docs')) {
    category = 'Learning';
    activity = 'AI Research / Learning';
    score = 1;
  } else if (lowerUrl.includes('zoom') || lowerUrl.includes('meet.google') || lowerUrl.includes('teams')) {
    category = 'Meetings';
    activity = 'Attending Online Meeting';
    score = 1;
  } else if (lowerUrl.includes('youtube') || lowerUrl.includes('netflix') || lowerUrl.includes('twitch') || lowerUrl.includes('reddit') || lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
    category = 'Distractions';
    activity = lowerTitle ? `Watching/Browsing ${domain}` : 'Entertainment & Media';
    score = -1;
  } else if (lowerUrl.includes('mail') || lowerUrl.includes('slack') || lowerUrl.includes('notion') || lowerUrl.includes('jira')) {
    category = 'Utility';
    activity = 'Work Collaboration';
    score = 1;
  }

  return {
    website: domain,
    domain: domain,
    activity: activity,
    category: category,
    confidence: 0.85,
    summary: `User is active on ${domain} (${pageTitle || 'Active Tab'})`,
    sensitive_content: lowerUrl.includes('bank') || lowerUrl.includes('login') || lowerUrl.includes('auth'),
    productivity_score: score
  };
}

/**
 * Analyze active tab screenshot using Gemini Vision API
 */
export async function analyzeScreenshot(base64Image, context = {}) {
  const { pageUrl = '', pageTitle = '' } = context;

  if (!genAI || !apiKey) {
    console.log('[VisionService] GEMINI_API_KEY not configured. Using Contextual Heuristic Analyzer.');
    return heuristicAnalysis(pageUrl, pageTitle);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let imagePart = null;
    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/png'
        }
      };
    }

    const contextPrompt = `Context details - Active URL: ${pageUrl}, Active Page Title: ${pageTitle}.`;
    const promptParts = imagePart ? [SYSTEM_PROMPT, contextPrompt, imagePart] : [SYSTEM_PROMPT, contextPrompt];

    const result = await model.generateContent(promptParts);
    const textResponse = result.response.text();

    // Clean JSON response (strip code block markers if any)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        website: parsed.website || parsed.domain || pageUrl,
        domain: parsed.domain || parsed.website || 'unknown',
        activity: parsed.activity || 'Viewing browser tab',
        category: parsed.category || 'Other',
        confidence: parsed.confidence || 0.95,
        summary: parsed.summary || 'User is interacting with browser tab.',
        sensitive_content: Boolean(parsed.sensitive_content),
        productivity_score: parsed.productivity_score ?? 0
      };
    }

    return heuristicAnalysis(pageUrl, pageTitle);
  } catch (error) {
    console.error('[VisionService] Error calling Gemini API:', error.message);
    return heuristicAnalysis(pageUrl, pageTitle);
  }
}
