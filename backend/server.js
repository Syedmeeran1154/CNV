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

// POINT TO FRONTEND: This tells Express to look one folder up and into 'frontend'
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// Route to serve index.html by default
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Route to serve dashboard.html
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});

// AI Resume Scoring API
app.post("/api/resume-score", async (req, res) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
        const { resumeText } = req.body;
        if (!resumeText) return res.status(400).json({ error: "No resume text provided" });

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
        if (!response.ok) return res.status(response.status).json(data);

        const aiResult = JSON.parse(data.choices[0].message.content);
        res.json(aiResult);

    } catch (error) {
        console.error("AI Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});