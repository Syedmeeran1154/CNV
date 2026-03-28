import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});


// ==============================
// ✅ RESUME SCORER API
// ==============================
app.post("/api/resume-score", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { resumeText } = req.body;
        if (!resumeText) {
            return res.status(400).json({ error: "No resume text provided" });
        }

        const prompt = `You are an ATS Scoring Engine. Return ONLY valid JSON with keys: score (number), summary (string), strengths (array), missing_keywords (array), and suggestions (array). Resume: ${resumeText}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        const aiResult = JSON.parse(data.choices[0].message.content);
        res.json(aiResult);

    } catch (error) {
        console.error("Resume API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// ==============================
// ✅ CAREER COACH API (FIXED)
// ==============================
app.post("/api/career-coach", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const {
            currentRole,
            targetRole,
            experienceYears,
            currentSkills,
            goals,
            timeline
        } = req.body;

        if (!currentRole || !targetRole) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Inside app.post("/api/career-coach", ...)
// Inside app.post("/api/career-coach", ...)
const prompt = `
You are an expert AI Career Coach. 
Create a highly detailed career roadmap for a user moving from ${currentRole} to ${targetRole}.

STRICT JSON FORMAT:
{
  "roadmap": [
    {
      "phase": "Phase 1: Foundation & Skill Alignment",
      "description": "2-line detailed explanation of what to do and exactly what to learn in this stage."
    },
    {
      "phase": "Phase 2: Advanced Implementation",
      "description": "2-line detailed explanation of advanced tools and practical application steps."
    },
    {
      "phase": "Phase 3: Portfolio & Career Transition",
      "description": "2-line detailed explanation on finalizing projects and networking for the target role."
    }
  ],
  "skills_to_master": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6"],
  "suggested_certificates": [
    { "name": "Exact Certificate Name", "provider": "Platform (e.g. Coursera, AWS)" }
  ],
  "real_world_projects": [
    { "title": "Project Name", "description": "What to build (e.g., AI-powered E-commerce)" }
  ],
  "pro_tips": ["Tip 1", "Tip 2"]
}
`;
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        const result = JSON.parse(data.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("Career Coach API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// ==============================
// ✅ JD MATCH API (The missing piece)
// ==============================
app.post("/api/jd-match", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { profile, jdText } = req.body;
        
        if (!profile || !jdText) {
            return res.status(400).json({ error: "Missing profile data or job description" });
        }

        // Convert the profile object into a string for the AI to read easily
        const candidateProfile = `
        Name: ${profile.name}
        Bio: ${profile.bio}
        Skills: ${profile.skills.join(", ")}
        Experience: ${JSON.stringify(profile.experience)}
        Projects: ${JSON.stringify(profile.projects)}
        Certifications: ${profile.certifications.join(", ")}
        `;

        const prompt = `
        You are an expert ATS and Career Coach. Analyze the Candidate Profile against the Job Description.
        
        CANDIDATE PROFILE:
        ${candidateProfile}

        JOB DESCRIPTION:
        ${jdText}

        STRICT JSON RESPONSE FORMAT:
        {
          "match_score": 85,
          "verdict": "Strong match with minor skill gaps.",
          "matched_skills": ["Skill A", "Skill B"],
          "missing_skills": ["Skill C"],
          "recommendations": ["Recommendation 1", "Recommendation 2"]
        }
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3, // Lower temperature for more consistent scoring
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("JD Match Error:", error);
        res.status(500).json({ error: "Failed to analyze Job Description" });
    }
});
// ==============================
// ✅ INTERVIEW PREP API
// ==============================
app.post("/api/interview-prep", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { role, company, experienceLevel, skills, interviewType, weakAreas } = req.body;

        if (!role || !company || !interviewType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const prompt = `
        You are an expert Interview Coach. Generate a preparation guide for:
        Role: ${role}
        Company: ${company}
        Level: ${experienceLevel}
        Interview Type: ${interviewType}
        Skills: ${skills}
        Weak Areas: ${weakAreas}

        STRICT JSON FORMAT:
        {
          "company_insight": "Brief history and culture of the company.",
          "what_they_look_for": ["Core value 1", "Technical priority 2"],
          "repeated_questions": [
            { "question": "Question text", "answer": "Model answer using STAR/Technical concepts" }
          ],
          "tips": ["Preparation tip 1", "Confidence tip 2"],
          "confidence_advice": "A short motivational tip."
        }`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);

        const result = JSON.parse(data.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("Interview Prep Error:", error);
        res.status(500).json({ error: "Failed to generate interview prep" });
    }
});
// ==============================
// 🚀 START SERVER
// ==============================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});