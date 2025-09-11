const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CGI Generator API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Welcome to CGI Generator API!',
    features: [
      'AI-powered CGI image generation',
      'Video creation from images', 
      'Credit-based pricing',
      'Professional dashboard'
    ]
  });
});

// For Vercel serverless functions
module.exports = app;
