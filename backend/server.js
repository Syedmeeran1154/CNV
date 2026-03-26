import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

console.log("GROQ KEY:", process.env.GROQ_API_KEY ? "FOUND" : "MISSING");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/resume-score", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY; 

  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: "Resume text missing" });
    }
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not set on the server.");
    }

   const prompt = `
You are an ATS Resume Scoring Engine.

IMPORTANT:
- Start from a BASE SCORE of 50
- Add or subtract points strictly based on resume quality
- Do NOT cluster scores around 80
- Poor resumes should score below 60
- Excellent resumes may score above 85

SCORING RULES:
+ Skills clearly listed & relevant: +10 to +25
+ Relevant experience/projects: +10 to +25
+ Clear structure & formatting: +5 to +15
- Missing key skills: -5 to -20
- Weak or no projects: -5 to -15
- Poor structure or vague content: -5 to -15

RESUME:
"""${resumeText}"""

TASKS:
1. Generate an overall ATS compatibility score.
2. Generate a "summary" (a short, 2-sentence professional profile summary of the uploaded resume).
3. Generate 5 strengths, missing keywords, and 5 suggestions.

Return ONLY JSON:
{
  "score": number, // Renamed from total_score for frontend compatibility
  "summary": string, // Added new field for the frontend display
  "strengths": string[],
  "missing_keywords": string[],
  "suggestions": string[]
}
`;


    // 1. Send Request to Groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          response_format: { type: "json_object" }
        })
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("Groq API Error Response:", text);
      return res.status(500).json({ error: `Groq API failed: ${text}` });
    }

    const data = JSON.parse(text);
    
    // Check if Groq returned a valid response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Groq Response Error:", data);
      throw new Error("Invalid response structure from Groq.");
    }
    
    const raw = data.choices[0].message.content;

    // 2. Extract and Parse JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No valid JSON found in Groq response.");

    let parsed = JSON.parse(match[0]);

    // 3. Normalize and Validate Score (Using the robust logic)
    let score =
      parsed.score ??
      parsed.total_score ?? // Fallback 1: total_score (from old prompt)
      parsed.ats_score ??
      parsed.compatibility_score ??
      50;

    // Ensure score is a number before manipulation
    if (typeof score !== 'number') {
        score = parseInt(score) || 50;
    }
    
    // Convert 0-1 scale to 0-100 scale (e.g., 0.85 -> 85)
    if (score <= 1) score *= 100;
    
    // Convert 0-10 scale to 0-100 scale (e.g., 8 -> 80)
    if (score > 1 && score <= 10) score *= 10;
    
    // Finalize score and structure for the frontend
    parsed.score = Math.max(0, Math.min(100, Math.round(score)));
    
    // Ensure the structure matches the frontend's expectation
    res.json({
        score: parsed.score,
        // The frontend will look for 'summary', so we ensure it exists, using 'keyarea' as a fallback
        summary: parsed.summary || parsed.keyarea?.join(' ') || 'Summary not provided by AI.', 
        strengths: parsed.strengths || [],
        missing_keywords: parsed.missing_keywords || [],
        suggestions: parsed.suggestions || []
    });
    
  } catch (err) {
    console.error("Server processing failed:", err.message);
    res.status(500).json({ error: `Groq analysis failed: ${err.message}` });
  }
});
app.post("/api/career-coach", async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY missing");
    }

    const {
      currentRole,
      targetRole,
      experienceYears,
      currentSkills,
      careerGoals,
      timeline
    } = req.body;

    if (!currentRole || !targetRole || !currentSkills) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
You are a REALISTIC AI Career Coach.

User Profile:
- Current Role: ${currentRole}
- Target Role: ${targetRole}
- Experience: ${experienceYears} years
- Current Skills: ${currentSkills}
- Career Goals: ${careerGoals}
- Timeline: ${timeline}

TASK:
Create a personalized, actionable career roadmap.

Rules:
- Be practical and realistic
- Avoid generic advice
- Include learning order and priorities
- Suggest projects, certifications, and practice strategy
- Adapt advice to experience level

Return ONLY valid JSON in this format:

{
  "summary": "short 2-line career direction",
  "skill_gaps": ["skill1", "skill2"],
  "roadmap": [
    {
      "phase": "Phase name",
      "duration": "time",
      "focus": ["items"],
      "actions": ["steps"]
    }
  ],
  "daily_plan": ["step1", "step2"],
  "project_ideas": ["idea1", "idea2"],
  "certifications": ["cert1", "cert2"]
}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      }
    );

    const text = await response.text();
    if (!response.ok) {
      return res.status(500).json({ error: text });
    }

    const data = JSON.parse(text);
    const raw = data.choices[0].message.content;
    const parsed = JSON.parse(raw);

    res.json(parsed);

  } catch (err) {
    console.error("Career Coach Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/jd-match", async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const { profile, jdText } = req.body;

    if (!profile || !jdText) {
      return res.status(400).json({ error: "Profile or JD missing" });
    }

    const prompt = `
You are an AI Job Description Matcher acting like a recruiter.

USER PROFILE:
- Name: ${profile.name}
- Summary: ${profile.bio}
- Skills: ${profile.skills.join(", ")}
- Projects: ${profile.projects.join(" | ")}
- Experience: ${profile.experience.join(" | ")}
- Certifications: ${profile.certifications.join(", ")}

JOB DESCRIPTION:
"""
${jdText}
"""

TASKS:
1. Calculate JD match score (0–100)
2. Identify matched skills
3. Identify missing / weak skills
4. Give a verdict: Strong Fit / Moderate Fit / Weak Fit
5. Give 3–5 clear improvement recommendations

Return ONLY valid JSON:
{
  "match_score": number,
  "verdict": string,
  "matched_skills": [],
  "missing_skills": [],
  "recommendations": []
}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          response_format: { type: "json_object" }
        })
      }
    );

    const text = await response.text();
    if (!response.ok) return res.status(500).json({ error: text });

    const data = JSON.parse(text);
    const parsed = JSON.parse(data.choices[0].message.content);

    res.json(parsed);

  } catch (err) {
    console.error("JD Matcher Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// ===============================
// AI INTERVIEW PREP (LIVE)
// ===============================
app.post("/api/interview-prep", async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

    const {
      role,
      company,        // NEW: Destructured company name
      experienceLevel,
      skills,
      interviewType,
      weakAreas
    } = req.body;

    // 🛑 Updated Validation
    if (!role || !company || !interviewType) {
      return res.status(400).json({ error: "Role, company name, and interview type required" });
    }

    // ✅ 3. Backend Update — Smarter Groq Prompt
    const prompt = `
You are an AI Interview Preparation Expert.

Candidate Details:
- Target Company: ${company}
- Job Role: ${role}
- Experience Level: ${experienceLevel}
- Interview Type: ${interviewType}
- Skills: ${skills}
- Weak Areas: ${weakAreas}

IMPORTANT INSTRUCTIONS:
- Generate questions based on commonly reported interview experiences
- Focus on frequently repeated and high-probability questions
- Questions should reflect real interview patterns (Glassdoor-style insights)
- Avoid claiming access to private/internal data
- Be realistic, practical, and role-specific

TASKS:
1. Brief company-specific interview pattern insight (keyarea: company_insight)
2. 5 frequently asked or repeated interview questions for this company & role (keyarea: repeated_questions)
3. Short but strong sample answers (part of repeated_questions)
4. What this company typically looks for in candidates (keyarea: what_they_look_for)
5. Targeted preparation tips (keyarea: tips)
6. Final confidence advice (keyarea: confidence_advice)

Return ONLY valid JSON:
{
  "company_insight": string,
  "repeated_questions": [
    {
      "question": string,
      "answer": string
    }
  ],
  "what_they_look_for": string[],
  "tips": string[],
  "confidence_advice": string
}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          response_format: { type: "json_object" }
        })
      }
    );

    const text = await response.text();
    if (!response.ok) return res.status(500).json({ error: text });

    const data = JSON.parse(text);
    const parsed = JSON.parse(data.choices[0].message.content);

    res.json(parsed);

  } catch (err) {
    console.error("Interview Prep Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});



app.listen(3000, () => {
  console.log("✅ Backend running on https://careernest-backend-jbk3.onrender.com");
});