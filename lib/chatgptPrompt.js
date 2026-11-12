/**
 * @file lib/chatgptPrompt.js
 * @description Helper prompt template for ChatGPT job extraction in the admin panel.
 * Enables contributors to paste raw job descriptions and receive structured fields.
 */

export const CHATGPT_EXTRACTION_PROMPT = `
You are an expert job posting analyst for JivikaHunt, a job board for freshers and interns in India.
Extract the structured information from the following raw job description text.
Respond ONLY with the formatted fields below so I can copy them directly into the form.

---
RAW JOB DESCRIPTION:
[PASTE JOB DESCRIPTION HERE]
---

FORMATTED EXTRACTION:
1. Title: [Exact clean job title, e.g. "Graduate Engineer Trainee"]
2. Company Name: [Official brand name, e.g. "Infosys"]
3. Job Type: [fresher | intern | experienced]
4. Work Mode: [onsite | hybrid | remote]
5. Locations: [Comma-separated cities, e.g. "Bengaluru, Hyderabad"]
6. Batches: [Eligible graduation years, e.g. "2024, 2025" or None]
7. Salary: [Stipend or package, e.g. "₹25,000/month" or "6 - 8 LPA" or None]
8. Skills: [Comma-separated keywords, e.g. "react, javascript, tailwind, git"]
9. Summary: [A concise, professional 2-3 sentence overview of minimum 40 characters explaining what the company is hiring for]
10. Responsibilities: [One bullet line per item]
11. Eligibility Criteria: [One bullet line per item, e.g. B.Tech / B.E / MCA with 60%+]
12. Apply Link: [Strict official career portal HTTPS URL, never shorteners]
13. Last Date: [Application deadline in YYYY-MM-DD format, or None]
`.trim();

export default CHATGPT_EXTRACTION_PROMPT;
