const { GoogleGenerativeAI } = require("@google-generative-ai");
const express = require('express');
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// This is your Central System Prompt
const SYSTEM_PROMPT = `
You are an expert Roblox Luau architect. 
1. Output ONLY valid JSON.
2. The JSON structure must be: { "scripts": [ { "scriptName": "Name", "scriptType": "Script", "parentPath": "Workspace", "code": "..." } ] }.
3. EVERY script's 'code' field MUST end with the comment: -- END_OF_SCRIPT
4. Ensure the JSON is properly escaped so it can be parsed by JSON.parse().
`;

let latestGeneration = null;

app.post('/api/generate', async (req, res) => {
    const userPrompt = req.body.prompt;
    
    try {
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            `Task: ${userPrompt}`
        ]);
        
        const responseText = result.response.text();
        
        // Clean AI response to ensure it is valid JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            latestGeneration = {
                id: "task_" + Date.now(),
                ...JSON.parse(jsonMatch[0])
            };
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Failed to parse JSON" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/poll', (req, res) => {
    if (latestGeneration) {
        res.json({ generation: latestGeneration });
    } else {
        res.status(204).send();
    }
});

app.post('/api/clear', (req, res) => {
    latestGeneration = null;
    res.json({ success: true });
});

app.listen(3000, () => console.log("Backend running on port 3000"));
