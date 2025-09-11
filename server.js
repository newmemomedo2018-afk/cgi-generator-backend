const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
let users = [];
let jobs = [];
let currentUserId = 1;
let currentJobId = 1;

const JWT_SECRET = 'temp-secret-key-2024';

// Auth middleware
const authenticateUser = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CGI Generator API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: currentUserId++,
      name,
      email,
      password: hashedPassword,
      credits: 5,
      createdAt: new Date()
    };
    
    users.push(user);
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, credits: user.credits }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'المستخدم غير موجود' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, credits: user.credits }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

// Get user profile
app.get('/api/profile', authenticateUser, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      credits: req.user.credits
    }
  });
});

// Get user jobs
app.get('/api/jobs', authenticateUser, (req, res) => {
  const userJobs = jobs.filter(job => job.userId === req.user.id);
  res.json({ jobs: userJobs });
});

// Create job (placeholder)
app.post('/api/create-job', authenticateUser, (req, res) => {
  const { title, description } = req.body;
  
  const job = {
    id: currentJobId++,
    userId: req.user.id,
    title: title || 'مشروع CGI جديد',
    description: description || 'مشروع توليد صور وفيديوهات CGI',
    status: 'pending',
    createdAt: new Date()
  };
  
  jobs.push(job);
  
  res.json({
    success: true,
    message: 'تم إنشاء المشروع بنجاح',
    job
  });
});

module.exports = app;
