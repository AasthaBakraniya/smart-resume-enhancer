// ─────────────────────────────────────────────
//  Smart Resume Enhancer — script.js
//  This file does ONE job:
//  1. Read the user's text
//  2. Send it to the AI (DeepSeek via OpenRouter)
//  3. Get back a JSON object
//  4. Show it as a nice resume card
// ─────────────────────────────────────────────

async function enhance() {

    // ── Step 1: Read what the user typed ──────────
    const userText = document.getElementById('inputText').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('enhanceBtn');

    // Clear any old error
    errorMsg.textContent = '';

    // Basic validation — don't call API if fields are empty
    if (!userText) {
        errorMsg.textContent = '⚠️ Please paste some work experience text first.';
        return;
    }
    if (!apiKey) {
        errorMsg.textContent = '⚠️ Please enter your OpenRouter API key.';
        return;
    }

    // ── Step 2: Show loading state ─────────────────
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> AI is thinking...';
    document.getElementById('result').innerHTML = '<div class="empty">⏳ Analysing your experience...</div>';


    // ── Step 3: Write the prompt ───────────────────
    // This is the instruction we send to the AI.
    // We tell it: return ONLY JSON, nothing else.
    const prompt = `
You are a professional resume writer.

Read the work experience text below and extract the key information.

Return ONLY a JSON object — no explanation, no markdown backticks, just raw JSON.

Use exactly this structure:
{
  "job_title": "the person's job title",
  "company": "the company name",
  "duration": "how long they worked there, e.g. 6 months or 2019-2021",
  "key_achievements": [
    "Start with a strong action verb. Include any numbers mentioned.",
    "Another achievement starting with an action verb.",
    "Another one."
  ],
  "skills_demonstrated": ["skill1", "skill2", "skill3"],
  "impact_level": "high or medium or low"
}

Rules:
- key_achievements must start with past-tense action verbs like: Built, Developed, Designed, Led, Implemented, Reduced, Increased, Delivered, Managed, Created
- If numbers or results are mentioned, include them
- skills_demonstrated: list 3 to 5 specific technical or soft skills
- impact_level: "high" if there are measurable results, "medium" if descriptive, "low" if vague

Work experience text:
"""
${userText}
"""
`;


    // ── Step 4: Call the AI API ────────────────────
    // This is exactly the same as calling any REST API with fetch()
    // You already know fetch() from your internship — same concept!
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
                'HTTP-Referer': 'https://myresume-enhancer.com',
                'X-Title': 'Smart Resume Enhancer'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-v4-flash',   // DeepSeek V4 Flash
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional resume writer. Always respond with raw JSON only. No markdown. No explanation.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3   // low = more focused, accurate response
            })
        });

        // ── Step 5: Read the AI's reply ───────────────
        const data = await response.json();

        // Check if the API returned an error
        if (!response.ok) {
            throw new Error(data?.error?.message || 'API error ' + response.status);
        }

        // The AI's text reply is inside here:
        let aiReply = data.choices[0].message.content;

        // Sometimes AI adds ```json ... ``` around it — strip that out
        aiReply = aiReply.replace(/```json/g, '').replace(/```/g, '').trim();

        // ── Step 6: Parse the JSON ─────────────────────
        const parsed = JSON.parse(aiReply);

        // ── Step 7: Show it as a resume card ──────────
        showResumeCard(parsed);

    } catch (error) {
        // If anything went wrong, show the error clearly
        if (error.message.includes('JSON')) {
            errorMsg.textContent = '⚠️ The AI returned unexpected output. Please try again.';
        } else {
            errorMsg.textContent = '⚠️ Error: ' + error.message;
        }
        document.getElementById('result').innerHTML = '<div class="empty">Something went wrong. See the error message on the left.</div>';

    } finally {
        // Always re-enable the button at the end
        btn.disabled = false;
        btn.innerHTML = '✨ Enhance with AI';
    }
}


// ─────────────────────────────────────────────
//  showResumeCard()
//  Takes the parsed JSON and builds the HTML card
// ─────────────────────────────────────────────
function showResumeCard(data) {

    // Build the achievements list
    const achievementItems = (data.key_achievements || [])
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('');

    // Build the skills badges
    const skillBadges = (data.skills_demonstrated || [])
        .map(skill => `<span class="skill-badge">${escapeHtml(skill)}</span>`)
        .join('');

    // Choose impact label style
    const impactClass = {
        high: 'impact-high',
        medium: 'impact-medium',
        low: 'impact-low'
    }[data.impact_level] || 'impact-low';

    const impactLabel = {
        high: '⭐ High impact',
        medium: '📋 Moderate impact',
        low: '📌 Low detail — add numbers!'
    }[data.impact_level] || '';

    // Build the full HTML card and inject it into the page
    document.getElementById('result').innerHTML = `
    <div class="resume-card">

      <p class="job-title">${escapeHtml(data.job_title || 'Job Title')}</p>

      <div class="company-line">
        <span>🏢 ${escapeHtml(data.company || 'Company')}</span>
        ${data.duration ? `<span>📅 ${escapeHtml(data.duration)}</span>` : ''}
      </div>

      <h3>Key Achievements</h3>
      <ul>${achievementItems}</ul>

      <h3>Skills Demonstrated</h3>
      <div class="skills-row">${skillBadges}</div>

      <span class="${impactClass}">${impactLabel}</span>

    </div>
  `;
}


// ─────────────────────────────────────────────
//  escapeHtml()
//  Safety function — prevents broken HTML if the
//  AI returns characters like < > & in its output
// ─────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}