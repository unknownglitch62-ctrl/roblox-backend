const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let latestGeneration = null;

const systemPrompt = `You are a Roblox Luau Architect. Output ONLY a single JSON object. No markdown, no explanations.
{
    "scriptName": "PascalCaseName",
    "scriptType": "Script" | "LocalScript" | "ModuleScript",
    "parentPath": "ServerScriptService" | "StarterGui" | "StarterPlayerScripts" | "ReplicatedStorage" | "Workspace",
    "code": "Complete Luau code here"
}`;

const validateAccount = (req, res, next) => {
    const userToken = req.headers['authorization'];
    if (!userToken || userToken !== process.env.APP_AUTH_TOKEN) {
        return res.status(401).json({ success: false, error: "Access Denied." });
    }
    next();
};

app.post('/api/generate', validateAccount, async (req, res) => {
    const { prompt } = req.body;
    try {
        const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
        const response = await model.generateContent(`${systemPrompt}\n\nUser: ${prompt}`);
        let aiResponse = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsedData = JSON.parse(aiResponse);
        latestGeneration = {
            id: Date.now(),
            scriptName: parsedData.scriptName,
            scriptType: parsedData.scriptType,
            parentPath: parsedData.parentPath,
            code: parsedData.code
        };
        res.json({ success: true, message: "Asset ready for Roblox!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "AI Generation failed." });
    }
});

app.get('/api/poll', validateAccount, (req, res) => res.json({ generation: latestGeneration }));
app.post('/api/clear', validateAccount, (req, res) => { latestGeneration = null; res.json({ success: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
