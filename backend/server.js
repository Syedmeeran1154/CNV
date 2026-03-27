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
const prompt = `
You are an AI Career Coach. 
Create a career roadmap for a user moving from ${currentRole} to ${targetRole}.

STRICT JSON FORMAT:
{
  "phases": ["Step 1 description", "Step 2 description"],
  "skills_to_learn": ["Skill Name 1", "Skill Name 2"],
  "projects": ["Project Name 1", "Project Name 2"],
  "tips": ["Tip 1", "Tip 2"]
}

IMPORTANT: Every item in every array MUST be a simple string. Do not return objects.
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
        const { resumeText, jdText } = req.body;
        if (!resumeText || !jdText) {
            return res.status(400).json({ error: "Missing resume or job description" });
        }

        const prompt = `
        You are an expert ATS (Applicant Tracking System). 
        Analyze the Resume against the Job Description.
        
        Resume: ${resumeText}
        Job Description: ${jdText}

        Return ONLY a JSON object with this exact structure:
        {
          "matchPercentage": 85,
          "missingSkills": ["Skill A", "Skill B"],
          "keywordHits": ["Keyword 1", "Keyword 2"],
          "analysis": "Brief summary of fit"
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
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("JD Match Error:", error);
        res.status(500).json({ error: "Failed to analyze JD" });
    }
});

// ==============================
// 🚀 START SERVER
// ==============================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});