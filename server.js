const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://memomedo2018:Mohamed0%40%21@cgi-generator.nlqnv40.mongodb.net/cgi-generator?retryWrites=true&w=majority&appName=cgi-generator';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 5 },
  plan: { type: String, default: 'free' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// Project Schema
const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  contentType: { type: String, enum: ['image', 'video'], default: 'image' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  productImageUrl: { type: String },
  sceneImageUrl: { type: String },
  resultImageUrl: { type: String },
  resultVideoUrl: { type: String },
  creditsUsed: { type: Number, default: 1 },
  processingStarted: { type: Date },
  processingCompleted: { type: Date },
  aiJobId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'temp-secret-key-2024-mongodb';

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
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  }
};

// Helper function for cloud storage (placeholder)
async function uploadToCloudStorage(fileBuffer, fileName) {
  // Placeholder - سنضيف Cloudinary لاحقاً
  return `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(fileName)}`;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CGI Generator API with MongoDB is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      credits: 5
    });
    
    await user.save();
    
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { 
        id: user._id, 
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
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'المستخدم غير موجود' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { 
        id: user._id, 
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
app.get('/api/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'خطأ في جلب الملف الشخصي' });
  }
});

// Get user projects
app.get('/api/projects', authenticateUser, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({ projects });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({ error: 'خطأ في جلب المشاريع' });
  }
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
    const project = new Project({
      userId: req.user._id,
      title: title || 'مشروع CGI جديد',
      description: description || 'مشروع توليد صور وفيديوهات CGI',
      contentType,
      productImageUrl,
      sceneImageUrl,
      creditsUsed: requiredCredits,
      status: 'processing',
      processingStarted: new Date()
    });
    
    await project.save();
    
    // Deduct credits
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { credits: -requiredCredits }
    });
    
    // Simulate AI processing
    setTimeout(async () => {
      try {
        await Project.findByIdAndUpdate(project._id, {
          status: 'completed',
          processingCompleted: new Date(),
          resultImageUrl: 'https://via.placeholder.com/800x600.png?text=CGI+Result+Image',
          resultVideoUrl: contentType === 'video' ? 'https://sample-videos.com/zip/10/mp4/360/mp4-5s.mp4' : null
        });
      } catch (error) {
        console.error('Error updating project status:', error);
      }
    }, 10000); // 10 seconds simulation
    
    res.json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح وبدء المعالجة',
      project: {
        id: project._id,
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
app.get('/api/projects/:id', authenticateUser, async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود' });
    }
    
    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'خطأ في جلب المشروع' });
  }
});

// Add credits (for admin or payment processing)
app.post('/api/add-credits', authenticateUser, async (req, res) => {
  try {
    const { credits, reason = 'Purchase' } = req.body;
    
    if (!credits || credits <= 0) {
      return res.status(400).json({ error: 'عدد الكريدت يجب أن يكون أكبر من صفر' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: credits } },
      { new: true }
    );
    
    res.json({
      success: true,
      message: `تم إضافة ${credits} كريدت بنجاح`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan
      }
    });
    
  } catch (error) {
    console.error('Add credits error:', error);
    res.status(500).json({ error: 'خطأ في إضافة الكريدت' });
  }
});

// Get dashboard stats
app.get('/api/stats', authenticateUser, async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ userId: req.user._id });
    const completedProjects = await Project.countDocuments({ 
      userId: req.user._id, 
      status: 'completed' 
    });
    const processingProjects = await Project.countDocuments({ 
      userId: req.user._id, 
      status: 'processing' 
    });
    
    res.json({
      stats: {
        totalProjects,
        completedProjects,
        processingProjects,
        credits: req.user.credits,
        plan: req.user.plan
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
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
