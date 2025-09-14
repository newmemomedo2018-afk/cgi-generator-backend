const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// In-memory storage (في الإنتاج، استخدم MongoDB)
let users = [];
let jobs = [];
let currentUserId = 1;
let currentJobId = 1;

const JWT_SECRET = 'temp-secret-key-2024';

// API Keys - ضع مفاتيح APIs الحقيقية في متغيرات البيئة
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key';
const FAL_API_KEY = process.env.FAL_API_KEY || 'your-fal-api-key';
const CLOUDINARY_URL = process.env.CLOUDINARY_URL || 'your-cloudinary-url';

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

// Helper function: Upload image to cloud storage
async function uploadImageToCloud(imageBuffer, filename) {
  try {
    // في الواقع، ستستخدم Cloudinary أو AWS S3
    // هنا مجرد محاكاة
    const base64Image = imageBuffer.toString('base64');
    
    // محاكاة رفع للسحابة
    const mockUrl = `https://res.cloudinary.com/demo/image/upload/v1/${filename}.jpg`;
    
    // في التطبيق الحقيقي:
    // const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Image}`);
    // return result.secure_url;
    
    return mockUrl;
  } catch (error) {
    throw new Error('فشل في رفع الصورة');
  }
}

// Helper function: Generate description with Gemini
async function generateDescription(productImageUrl, sceneImageUrl, userDescription) {
  try {
    const prompt = `
    تحليل الصور المرفقة وإنشاء وصف تفصيلي لمشروع CGI:
    
    صورة المنتج: ${productImageUrl}
    صورة المشهد: ${sceneImageUrl}
    وصف المستخدم: ${userDescription || 'لا يوجد وصف إضافي'}
    
    يرجى إنشاء وصف احترافي للمشروع يتضمن:
    1. وصف المنتج
    2. وصف المشهد المطلوب
    3. النتيجة المتوقعة
    `;

    // في التطبيق الحقيقي، ستستخدم Gemini API
    // const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    //   contents: [{ parts: [{ text: prompt }] }]
    // }, {
    //   headers: { 'x-goog-api-key': GEMINI_API_KEY }
    // });

    // محاكاة رد Gemini
    const mockDescription = `مشروع CGI احترافي لدمج المنتج في المشهد المحدد. سيتم استخدام تقنيات الذكاء الاصطناعي المتقدمة لإنشاء صورة واقعية تظهر المنتج بشكل طبيعي في البيئة المطلوبة مع مراعاة الإضاءة والظلال والانعكاسات.`;
    
    return mockDescription;
  } catch (error) {
    console.error('Error generating description:', error);
    return userDescription || 'مشروع CGI جديد';
  }
}

// Helper function: Generate CGI with Fal.ai
async function generateCGI(productImageUrl, sceneImageUrl, description, type = 'image') {
  try {
    const payload = {
      product_image: productImageUrl,
      scene_image: sceneImageUrl,
      prompt: description,
      output_type: type, // 'image' or 'video'
      quality: 'high',
      style: 'realistic'
    };

    // في التطبيق الحقيقي، ستستخدم Fal.ai API
    // const response = await axios.post('https://fal.run/fal-ai/product-placement', payload, {
    //   headers: {
    //     'Authorization': `Key ${FAL_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    // محاكاة نتيجة Fal.ai
    const mockResult = {
      output_url: type === 'video' 
        ? 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        : 'https://picsum.photos/800/600',
      processing_time: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
      quality_score: 0.95
    };

    return mockResult;
  } catch (error) {
    console.error('Error generating CGI:', error);
    throw new Error('فشل في إنشاء المحتوى');
  }
}

// Helper function: Deduct credits
function deductCredits(userId, amount) {
  const user = users.find(u => u.id === userId);
  if (!user || user.credits < amount) {
    return false;
  }
  user.credits -= amount;
  return true;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CGI Generator API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['Authentication', 'File Upload', 'AI Integration']
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
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل' });
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
      credits: 5, // 5 كريدت مجاني للمستخدمين الجدد
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    users.push(user);
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح! حصلت على 5 كريدت مجاناً',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        credits: user.credits 
      }
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
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    // Update last login
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
        credits: user.credits 
      }
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
      credits: req.user.credits,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    }
  });
});

// Get user jobs
app.get('/api/jobs', authenticateUser, (req, res) => {
  const userJobs = jobs.filter(job => job.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ jobs: userJobs });
});

// Upload images endpoint
app.post('/api/upload-images', authenticateUser, upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'sceneImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { productImage, sceneImage } = req.files;
    
    if (!productImage || !sceneImage) {
      return res.status(400).json({ error: 'يرجى رفع صورة المنتج وصورة المشهد' });
    }
    
    const productImageUrl = await uploadImageToCloud(productImage[0].buffer, `product_${Date.now()}`);
    const sceneImageUrl = await uploadImageToCloud(sceneImage[0].buffer, `scene_${Date.now()}`);
    
    res.json({
      success: true,
      message: 'تم رفع الصور بنجاح',
      data: {
        productImageUrl,
        sceneImageUrl
      }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'فشل في رفع الصور' });
  }
});

// Create CGI job
app.post('/api/create-cgi-job', authenticateUser, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      contentType, 
      productImageUrl, 
      sceneImageUrl 
    } = req.body;
    
    if (!productImageUrl || !sceneImageUrl) {
      return res.status(400).json({ error: 'يرجى رفع الصور أولاً' });
    }
    
    const requiredCredits = contentType === 'video' ? 5 : 1;
    
    if (!deductCredits(req.user.id, requiredCredits)) {
      return res.status(400).json({ error: 'لا يوجد كريدت كافي' });
    }
    
    // Generate enhanced description with AI
    const enhancedDescription = await generateDescription(
      productImageUrl, 
      sceneImageUrl, 
      description
    );
    
    const job = {
      id: currentJobId++,
      userId: req.user.id,
      title: title || 'مشروع CGI جديد',
      description: enhancedDescription,
      contentType,
      productImageUrl,
      sceneImageUrl,
      status: 'processing',
      progress: 0,
      creditsUsed: requiredCredits,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    jobs.push(job);
    
    // Start CGI generation in background
    generateCGIAsync(job.id, productImageUrl, sceneImageUrl, enhancedDescription, contentType);
    
    res.json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح! جاري المعالجة...',
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        contentType: job.contentType,
        createdAt: job.createdAt
      }
    });
    
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'فشل في إنشاء المشروع' });
  }
});

// Background CGI generation
async function generateCGIAsync(jobId, productImageUrl, sceneImageUrl, description, contentType) {
  try {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Update progress
    job.progress = 25;
    job.updatedAt = new Date();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    job.progress = 50;
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    job.progress = 75;
    
    // Generate CGI
    const result = await generateCGI(productImageUrl, sceneImageUrl, description, contentType);
    
    // Update job with result
    job.status = 'completed';
    job.progress = 100;
    job.outputUrl = result.output_url;
    job.processingTime = result.processing_time;
    job.qualityScore = result.quality_score;
    job.updatedAt = new Date();
    
    console.log(`✅ Job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'failed';
      job.error = 'فشل في معالجة المشروع';
      job.updatedAt = new Date();
      
      // Refund credits
      const user = users.find(u => u.id === job.userId);
      if (user) {
        user.credits += job.creditsUsed;
      }
    }
  }
}

// Get job status
app.get('/api/jobs/:jobId/status', authenticateUser, (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = jobs.find(j => j.id === jobId && j.userId === req.user.id);
  
  if (!job) {
    return res.status(404).json({ error: 'المشروع غير موجود' });
  }
  
  res.json({
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl,
      error: job.error,
      updatedAt: job.updatedAt
    }
  });
});

// Download result
app.get('/api/jobs/:jobId/download', authenticateUser, (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = jobs.find(j => j.id === jobId && j.userId === req.user.id);
  
  if (!job || job.status !== 'completed') {
    return res.status(404).json({ error: 'المشروع غير متاح للتحميل' });
  }
  
  res.json({
    success: true,
    downloadUrl: job.outputUrl,
    contentType: job.contentType
  });
});

// Buy credits (placeholder)
app.post('/api/buy-credits', authenticateUser, (req, res) => {
  const { package: packageType } = req.body;
  
  // محاكاة شراء الكريدت
  const packages = {
    starter: { credits: 10, price: 9.99 },
    professional: { credits: 50, price: 39.99 },
    enterprise: { credits: 200, price: 149.99 }
  };
  
  const selectedPackage = packages[packageType];
  if (!selectedPackage) {
    return res.status(400).json({ error: 'باقة غير صالحة' });
  }
  
  // في التطبيق الحقيقي، ستتعامل مع Stripe هنا
  req.user.credits += selectedPackage.credits;
  
  res.json({
    success: true,
    message: `تم شراء ${selectedPackage.credits} كريدت بنجاح!`,
    newBalance: req.user.credits
  });
});

// Get pricing
app.get('/api/pricing', (req, res) => {
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'حجم الملف كبير جداً' });
    }
  }
  
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'الصفحة غير موجودة' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 CGI Generator API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
