require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) {
  console.error('❌ CLAUDE_API_KEY is not set in .env file!');
  process.exit(1);
}

app.post('/api/claude', async (req, res) => {
  try {
    console.log('📥 Received request from frontend');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Claude API Error:', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ Success from Claude API');
    res.json(data);
    
  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: Use PORT from environment variable
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});