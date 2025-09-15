// Add this at the very beginning of server.js to test logging
console.log('🚀 =================================');
console.log('🚀 CGI GENERATOR STARTING');
console.log('🚀 Version: 2.1.0 DEBUG MODE');
console.log('🚀 =================================');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');

console.log('📦 All modules loaded successfully');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

console.log('⚙️ Middleware configured');

// Environment Variables with DEBUG
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDL1FDQJy63SjCC4sP87kvQ6B-ht_enl-8';
const FAL_API_KEY = process.env.FAL_API_KEY || '2fd637d9-6952-44a0-a5c2-1ab874fd3fa9:8924390041c47891bb58f6260270ad6e';

console.log('🔑 Environment check:');
console.log('   GEMINI_API_KEY:', GEMINI_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('   FAL_API_KEY:', FAL_API_KEY ? '✅ SET' : '❌ MISSING');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqtsski2w',
    api_key: process.env.CLOUDINARY_API_KEY || '882716225516264',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'k18dJOendyCp95RzyFhLAxbQW2A'
});

console.log('☁️ Cloudinary configured with cloud_name:', cloudinary.config().cloud_name);

// Multer config for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// In-memory storage
let users = [];
let jobs = [];
let currentUserId = 1;
let currentJobId = 1;

const JWT_SECRET = process.env.JWT_SECRET || 'cgi-generator-super-secret-jwt-key-2024-secure';

console.log('💾 In-memory storage initialized');

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

// Enhanced Health check with more debugging
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  
  const healthData = {
    status: 'OK',
    message: 'CGI Generator API v2.1.0 - DEBUG MODE ACTIVE',
    timestamp: new Date().toISOString(),
    version: '2.1.0-DEBUG',
    server_info: {
      node_env: process.env.NODE_ENV,
      has_gemini_key: !!GEMINI_API_KEY,
      has_fal_key: !!FAL_API_KEY,
      cloudinary_cloud: cloudinary.config().cloud_name
    },
    features: ['Real AI Integration', 'Cloudinary Storage', 'Multi-stage CGI Generation', 'DEBUG LOGGING'],
    apis: {
      gemini: GEMINI_API_KEY ? 'Connected' : 'Not configured',
      fal: FAL_API_KEY ? 'Connected' : 'Not configured',
      cloudinary: cloudinary.config().cloud_name ? 'Connected' : 'Not configured'
    },
    debug: {
      users_count: users.length,
      jobs_count: jobs.length,
      current_time: new Date().toISOString()
    }
  };
  
  console.log('🏥 Health check response:', JSON.stringify(healthData, null, 2));
  res.json(healthData);
});

// Debug endpoint to test console.log
app.get('/api/debug-test', (req, res) => {
  console.log('🐛 DEBUG TEST ENDPOINT CALLED');
  console.log('🐛 Current time:', new Date().toISOString());
  console.log('🐛 Environment variables check:');
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   GEMINI_API_KEY length:', GEMINI_API_KEY?.length || 0);
  console.log('   FAL_API_KEY length:', FAL_API_KEY?.length || 0);
  
  res.json({
    debug: 'This endpoint was called successfully',
    time: new Date().toISOString(),
    console_logs: 'Check Vercel function logs for console.log output'
  });
});

// Enhanced register with debugging
app.post('/api/register', async (req, res) => {
  console.log('🔐 Registration attempt started');
  console.log('🔐 Request body keys:', Object.keys(req.body));
  
  try {
    const { name, email, password } = req.body;
    
    console.log('🔐 Registration data received:', { name, email, password: '***' });
    
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل' });
    }
    
    if (users.find(u => u.email === email)) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: currentUserId++,
      name,
      email,
      password: hashedPassword,
      credits: 5,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    users.push(user);
    console.log('✅ User created successfully. ID:', user.id);
    console.log('✅ Total users now:', users.length);
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    const response = {
      success: true,
      message: 'تم إنشاء الحساب بنجاح! حصلت على 5 كريدت مجاناً',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        credits: user.credits 
      }
    };
    
    console.log('✅ Registration response prepared');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
  }
});

// Enhanced login with debugging
app.post('/api/login', async (req, res) => {
  console.log('🔑 Login attempt started');
  
  try {
    const { email, password } = req.body;
    console.log('🔑 Login attempt for email:', email);
    
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    user.lastLogin = new Date();
    console.log('✅ Login successful for user:', user.id);
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        credits: user.credits 
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

// Create CGI job with EXTENSIVE debugging
app.post('/api/create-cgi-job', authenticateUser, async (req, res) => {
  console.log('🎬 ===============================================');
  console.log('🎬 CGI JOB CREATION STARTED - DEBUG MODE');
  console.log('🎬 ===============================================');
  console.log('🎬 User ID:', req.user.id);
  console.log('🎬 User Credits:', req.user.credits);
  console.log('🎬 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      title, 
      description, 
      contentType, 
      productImageUrl, 
      sceneImageUrl 
    } = req.body;
    
    console.log('🎬 Job parameters:');
    console.log('   Title:', title);
    console.log('   Description:', description);
    console.log('   Content Type:', contentType);
    console.log('   Product Image:', productImageUrl ? '✅ PROVIDED' : '❌ MISSING');
    console.log('   Scene Image:', sceneImageUrl ? '✅ PROVIDED' : '❌ MISSING');
    
    if (!productImageUrl || !sceneImageUrl) {
      console.log('❌ Missing required images');
      return res.status(400).json({ error: 'يرجى رفع الصور أولاً' });
    }
    
    const requiredCredits = contentType === 'video' ? 5 : 1;
    console.log('🎬 Required credits:', requiredCredits);
    console.log('🎬 User has credits:', req.user.credits);
    
    if (req.user.credits < requiredCredits) {
      console.log('❌ Insufficient credits');
      return res.status(400).json({ error: 'لا يوجد كريدت كافي' });
    }
    
    // Deduct credits
    req.user.credits -= requiredCredits;
    console.log('💰 Credits deducted. New balance:', req.user.credits);
    
    const job = {
      id: currentJobId++,
      userId: req.user.id,
      title: title || 'مشروع CGI جديد',
      description: description || '',
      contentType,
      productImageUrl,
      sceneImageUrl,
      status: 'processing',
      stage: 'starting',
      progress: 0,
      creditsUsed: requiredCredits,
      createdAt: new Date(),
      updatedAt: new Date(),
      debug_mode: true
    };
    
    jobs.push(job);
    console.log('✅ Job created with ID:', job.id);
    console.log('✅ Total jobs now:', jobs.length);
    
    // Start processing
    console.log('🚀 Starting CGI generation process...');
    processJobWithDebugging(job.id);
    
    res.json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح! جاري المعالجة...',
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        stage: job.stage,
        contentType: job.contentType,
        debug_mode: true
      }
    });
    
  } catch (error) {
    console.error('❌ CGI job creation error:', error);
    res.status(500).json({ error: 'فشل في إنشاء المشروع' });
  }
});

// Processing function with extensive debugging
async function processJobWithDebugging(jobId) {
  console.log('🔄 ===============================================');
  console.log('🔄 STARTING JOB PROCESSING:', jobId);
  console.log('🔄 ===============================================');
  
  const job = jobs.find(j => j.id === jobId);
  if (!job) {
    console.log('❌ Job not found:', jobId);
    return;
  }
  
  try {
    // Stage 1: Test if we can make API calls
    console.log('📝 STAGE 1: Testing API connectivity...');
    job.stage = 'testing_apis';
    job.progress = 10;
    
    // Test Gemini
    console.log('🤖 Testing Gemini AI...');
    try {
      const testResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: "Hello, this is a test" }]
          }]
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('✅ Gemini AI test successful');
    } catch (error) {
      console.log('❌ Gemini AI test failed:', error.message);
    }
    
    // For now, just mark as completed for debugging
    console.log('🎯 DEBUG MODE: Marking job as completed for testing');
    job.status = 'completed';
    job.stage = 'debug_completed';
    job.progress = 100;
    job.outputUrl = 'https://via.placeholder.com/800x600.jpg?text=DEBUG+MODE';
    job.updatedAt = new Date();
    
    console.log('✅ Job processing completed (DEBUG MODE)');
    console.log('✅ Job ID:', job.id, 'Status:', job.status);
    
  } catch (error) {
    console.error('❌ Job processing failed:', error);
    job.status = 'failed';
    job.error = error.message;
    job.updatedAt = new Date();
  }
}

// Get job status with debugging
app.get('/api/jobs/:jobId/status', authenticateUser, (req, res) => {
  const jobId = parseInt(req.params.jobId);
  console.log('📊 Job status requested for ID:', jobId);
  
  const job = jobs.find(j => j.id === jobId && j.userId === req.user.id);
  
  if (!job) {
    console.log('❌ Job not found or unauthorized:', jobId);
    return res.status(404).json({ error: 'المشروع غير موجود' });
  }
  
  console.log('✅ Job status:', job.status, 'Stage:', job.stage, 'Progress:', job.progress);
  
  res.json({
    job: {
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      outputUrl: job.outputUrl,
      error: job.error,
      updatedAt: job.updatedAt,
      debug_mode: job.debug_mode
    }
  });
});



// Get user profile
app.get('/api/profile', authenticateUser, (req, res) => {
  console.log('👤 Profile requested for user:', req.user.id);
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      credits: req.user.credits,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    }
  });
});

// Get user jobs
app.get('/api/jobs', authenticateUser, (req, res) => {
  console.log('📋 Jobs list requested for user:', req.user.id);
  const userJobs = jobs.filter(job => job.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  console.log('📋 Found', userJobs.length, 'jobs for user');
  res.json({ jobs: userJobs });
});

// أضف هذا الكود بعد السطر اللي فيه app.get('/api/jobs', authenticateUser, (req, res) => {

// Helper function: Upload image to Cloudinary - مفقود
async function uploadImageToCloudinary(imageBuffer, filename) {
  try {
    console.log('☁️ Uploading to Cloudinary:', filename);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Image, {
      public_id: `cgi-generator/${filename}`,
      folder: 'cgi-generator',
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    console.log('✅ Cloudinary upload successful:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error('فشل في رفع الصورة');
  }
}

// Upload images endpoint - مفقود تماماً
app.post('/api/upload-images', authenticateUser, upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'sceneImage', maxCount: 1 }
]), async (req, res) => {
  console.log('📤 Upload images request started');
  console.log('📤 User ID:', req.user.id);
  console.log('📤 Files received:', req.files ? Object.keys(req.files) : 'none');
  
  try {
    const { productImage, sceneImage } = req.files;
    
    if (!productImage || !sceneImage) {
      console.log('❌ Missing files - Product:', !!productImage, 'Scene:', !!sceneImage);
      return res.status(400).json({ error: 'يرجى رفع صورة المنتج وصورة المشهد' });
    }
    
    console.log('📤 Product image size:', productImage[0].size, 'bytes');
    console.log('📤 Scene image size:', sceneImage[0].size, 'bytes');
    
    console.log('☁️ Starting Cloudinary uploads...');
    
    const productImageUrl = await uploadImageToCloudinary(
      productImage[0].buffer, 
      `product_${Date.now()}_${req.user.id}`
    );
    
    const sceneImageUrl = await uploadImageToCloudinary(
      sceneImage[0].buffer, 
      `scene_${Date.now()}_${req.user.id}`
    );
    
    console.log('✅ Both images uploaded successfully');
    console.log('✅ Product URL:', productImageUrl);
    console.log('✅ Scene URL:', sceneImageUrl);
    
    res.json({
      success: true,
      message: 'تم رفع الصور بنجاح',
      data: {
        productImageUrl,
        sceneImageUrl
      }
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message || 'فشل في رفع الصور' });
  }
});



// Download result endpoint - مفقود
app.get('/api/jobs/:jobId/download', authenticateUser, (req, res) => {
  console.log('⬇️ Download requested for job:', req.params.jobId);
  
  const jobId = parseInt(req.params.jobId);
  const job = jobs.find(j => j.id === jobId && j.userId === req.user.id);
  
  if (!job || job.status !== 'completed') {
    console.log('❌ Job not found or not completed');
    return res.status(404).json({ error: 'المشروع غير متاح للتحميل' });
  }
  
  console.log('✅ Download URL:', job.outputUrl);
  
  res.json({
    success: true,
    downloadUrl: job.outputUrl,
    contentType: job.contentType,
    previewUrl: job.cgiImageUrl
  });
});

// Enhanced pricing endpoint
app.get('/api/pricing', (req, res) => {
  console.log('💰 Pricing information requested');
  res.json({
    packages: [
      {
        id: 'starter',
        name: 'المبتدئ',
        credits: 10,
        price: 9.99,
        features: ['10 كريدت', 'صور CGI', 'فيديوهات قصيرة', 'دعم فني']
      },
      {
        id: 'professional',
        name: 'المحترف',
        credits: 50,
        price: 39.99,
        popular: true,
        features: ['50 كريدت', 'صور عالية الجودة', 'فيديوهات طويلة', 'أولوية في المعالجة', 'دعم مميز']
      },
      {
        id: 'enterprise',
        name: 'المؤسسات',
        credits: 200,
        price: 149.99,
        features: ['200 كريدت', 'جودة فائقة', 'معالجة سريعة', 'API مخصص', 'دعم مخصص']
      }
    ]
  });
});

// Debug buy credits (no real payment for testing)
app.post('/api/buy-credits', authenticateUser, (req, res) => {
  console.log('💳 DEBUG: Credit purchase attempted');
  console.log('💳 User:', req.user.id, 'Package:', req.body.package);
  
  const { package: packageType } = req.body;
  
  const packages = {
    starter: { credits: 10, price: 9.99 },
    professional: { credits: 50, price: 39.99 },
    enterprise: { credits: 200, price: 149.99 }
  };
  
  const selectedPackage = packages[packageType];
  if (!selectedPackage) {
    console.log('❌ Invalid package:', packageType);
    return res.status(400).json({ error: 'باقة غير صالحة' });
  }
  
  // DEBUG: Just add credits without real payment
  console.log('🎁 DEBUG MODE: Adding credits without payment');
  req.user.credits += selectedPackage.credits;
  
  console.log('✅ Credits added. New balance:', req.user.credits);
  
  res.json({
    success: true,
    message: `تم شراء ${selectedPackage.credits} كريدت بنجاح! (وضع تجريبي)`,
    newBalance: req.user.credits,
    debug_note: 'هذا وضع تجريبي - لم يتم خصم أموال حقيقية'
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('🔍 404 - Path not found:', req.originalUrl);
  res.status(404).json({ error: 'الصفحة غير موجودة' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('🚀 ===============================================');
    console.log('🚀 CGI GENERATOR API STARTED - DEBUG MODE');
    console.log('🚀 ===============================================');
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🚀 Health: http://localhost:${PORT}/api/health`);
    console.log(`🚀 Debug: http://localhost:${PORT}/api/debug-test`);
    console.log('🚀 Environment Variables:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   GEMINI_API_KEY:', GEMINI_API_KEY ? 'SET ✅' : 'MISSING ❌');
    console.log('   FAL_API_KEY:', FAL_API_KEY ? 'SET ✅' : 'MISSING ❌');
    console.log('🚀 Ready for debugging! 🐛');
    console.log('🚀 ===============================================');
  });
}

module.exports = app;
