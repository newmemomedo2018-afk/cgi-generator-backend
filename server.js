const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (temporary)
let users = [];
let projects = [];
let currentUserId = 1;
let currentProjectId = 1;

const JWT_SECRET = process.env.JWT_SECRET || 'temp-secret-key-2024';

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

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

// Helper function for cloud storage (placeholder)
async function uploadToCloudStorage(fileBuffer, fileName) {
  return `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(fileName)}`;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CGI Generator API is running! (In-Memory Mode)',
    timestamp: new Date().toISOString(),
    version: '2.1.0-temp',
    database: 'In-Memory',
    users: users.length,
    projects: projects.length
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
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
      plan: 'free',
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    users.push(user);
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        credits: user.credits,
        plan: user.plan
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
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
    
    user.lastLogin = new Date();
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        credits: user.credits,
        plan: user.plan
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
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
      credits: req.user.credits,
      plan: req.user.plan,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    }
  });
});

// Get user projects
app.get('/api/projects', authenticateUser, (req, res) => {
  const userProjects = projects.filter(project => project.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ projects: userProjects });
});

// Create project with file upload
app.post('/api/create-project', authenticateUser, upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'sceneImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, contentType = 'image' } = req.body;
    const requiredCredits = contentType === 'video' ? 5 : 1;
    
    // Check credits
    if (req.user.credits < requiredCredits) {
      return res.status(400).json({ 
        error: `تحتاج إلى ${requiredCredits} كريدت لإنشاء هذا المحتوى` 
      });
    }
    
    // Check uploaded files
    if (!req.files?.productImage || !req.files?.sceneImage) {
      return res.status(400).json({ error: 'يرجى رفع صورة المنتج وصورة المشهد' });
    }
    
    const productImage = req.files.productImage[0];
    const sceneImage = req.files.sceneImage[0];
    
    // Upload images to cloud storage (placeholder)
    const productImageUrl = await uploadToCloudStorage(
      productImage.buffer, 
      `product_${Date.now()}_${productImage.originalname}`
    );
    
    const sceneImageUrl = await uploadToCloudStorage(
      sceneImage.buffer, 
      `scene_${Date.now()}_${sceneImage.originalname}`
    );
    
    // Create project
    const project = {
      id: currentProjectId++,
      userId: req.user.id,
      title: title || 'مشروع CGI جديد',
      description: description || 'مشروع توليد صور وفيديوهات CGI',
      contentType,
      productImageUrl,
      sceneImageUrl,
      creditsUsed: requiredCredits,
      status: 'processing',
      processingStarted: new Date(),
      createdAt: new Date()
    };
    
    projects.push(project);
    
    // Deduct credits
    req.user.credits -= requiredCredits;
    
    // Simulate AI processing
    setTimeout(() => {
      const projectIndex = projects.findIndex(p => p.id === project.id);
      if (projectIndex !== -1) {
        projects[projectIndex].status = 'completed';
        projects[projectIndex].processingCompleted = new Date();
        projects[projectIndex].resultImageUrl = 'https://via.placeholder.com/800x600.png?text=CGI+Result+Image';
        if (contentType === 'video') {
          projects[projectIndex].resultVideoUrl = 'https://sample-videos.com/zip/10/mp4/360/mp4-5s.mp4';
        }
      }
    }, 10000); // 10 seconds simulation
    
    res.json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح وبدء المعالجة',
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        contentType: project.contentType,
        creditsUsed: project.creditsUsed,
        createdAt: project.createdAt
      }
    });
    
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء المشروع' });
  }
});

// Get project by ID
app.get('/api/projects/:id', authenticateUser, (req, res) => {
  const project = projects.find(p => 
    p.id === parseInt(req.params.id) && p.userId === req.user.id
  );
  
  if (!project) {
    return res.status(404).json({ error: 'المشروع غير موجود' });
  }
  
  res.json({ project });
});

// Add credits
app.post('/api/add-credits', authenticateUser, (req, res) => {
  const { credits, reason = 'Purchase' } = req.body;
  
  if (!credits || credits <= 0) {
    return res.status(400).json({ error: 'عدد الكريدت يجب أن يكون أكبر من صفر' });
  }
  
  req.user.credits += credits;
  
  res.json({
    success: true,
    message: `تم إضافة ${credits} كريدت بنجاح`,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      credits: req.user.credits,
      plan: req.user.plan
    }
  });
});

// Get dashboard stats
app.get('/api/stats', authenticateUser, (req, res) => {
  const userProjects = projects.filter(p => p.userId === req.user.id);
  const totalProjects = userProjects.length;
  const completedProjects = userProjects.filter(p => p.status === 'completed').length;
  const processingProjects = userProjects.filter(p => p.status === 'processing').length;
  
  res.json({
    stats: {
      totalProjects,
      completedProjects,
      processingProjects,
      credits: req.user.credits,
      plan: req.user.plan
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
