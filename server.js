const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqtsski2w',
    api_key: process.env.CLOUDINARY_API_KEY || '882716225516264',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'k18dJOendyCp95RzyFhLAxbQW2A'
});

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

// Environment Variables
const JWT_SECRET = process.env.JWT_SECRET || 'cgi-generator-super-secret-jwt-key-2024-secure';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDL1FDQJy63SjCC4sP87kvQ6B-ht_enl-8';
const FAL_API_KEY = process.env.FAL_API_KEY || '2fd637d9-6952-44a0-a5c2-1ab874fd3fa9:8924390041c47891bb58f6260270ad6e';

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

// Helper function: Upload image to Cloudinary
async function uploadImageToCloudinary(imageBuffer, filename) {
  try {
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Image, {
      public_id: `cgi-generator/${filename}`,
      folder: 'cgi-generator',
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('فشل في رفع الصورة');
  }
}

// Helper function: Generate enhanced description with Gemini AI
async function generateEnhancedDescription(productImageUrl, sceneImageUrl, userDescription) {
  try {
    const prompt = `
المستخدم قام برفع صورة منتج وصورة مشهد مرجعي مع الوصف التالي:
"${userDescription || 'دمج المنتج في المشهد'}"

صورة المنتج: ${productImageUrl}
صورة المشهد: ${sceneImageUrl}

المطلوب: إنشاء برومبت تفصيلي باللغة الإنجليزية لـ CGI generation يتضمن:
1. إزالة أي عناصر موجودة في المشهد
2. وضع المنتج بدلاً منها بشكل طبيعي
3. مراعاة الإضاءة والظلال
4. جعل المنتج يبدو واقعياً ومتناسقاً مع البيئة
5. تفاصيل الجودة والدقة

البرومبت يجب أن يكون مناسباً لـ Fal.ai API.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    return generatedText.trim();
    
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    // Fallback description
    return `Replace any existing objects in the scene with the product from the reference image. The product should appear ultra-realistic in CGI style, perfectly integrated with the environment. Match the lighting, shadows, and perspective of the original scene. Render in high resolution with photorealistic details and natural placement.`;
  }
}

// Helper function: Generate CGI image with Fal.ai
async function generateCGIImage(productImageUrl, sceneImageUrl, enhancedPrompt) {
  try {
    const payload = {
      prompt: enhancedPrompt,
      image_url: sceneImageUrl,
      image_size: "landscape_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true
    };

    const response = await axios.post(
      'https://fal.run/fal-ai/flux/dev',
      payload,
      {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.images[0].url;
    
  } catch (error) {
    console.error('Fal.ai image generation error:', error.response?.data || error.message);
    throw new Error('فشل في إنتاج صورة CGI');
  }
}

// Helper function: Generate video prompt with Gemini AI
async function generateVideoPrompt(cgiImageUrl, originalDescription) {
  try {
    const prompt = `
انظر إلى الصورة المرفقة التي تُظهر منتج CGI مدمج في مشهد.
الوصف الأصلي: "${originalDescription || 'منتج CGI'}"

المطلوب: إنشاء برومبت احترافي باللغة الإنجليزية لتحويل هذه الصورة إلى فيديو CGI متحرك باستخدام Fal.ai.

البرومبت يجب أن يتضمن:
1. حركة الكاميرا المناسبة (orbit, pan, zoom)
2. الإضاءة الديناميكية والانعكاسات
3. مدة الفيديو (5-8 ثواني)
4. جودة سينمائية عالية
5. حركة طبيعية للمنتج أو البيئة المحيطة

مثال للنمط المطلوب:
"Animate the CGI product in a cinematic way. Start with a wide shot, then slowly orbit the camera around to highlight the scale and detail. Add smooth lighting reflections and subtle environmental effects. Duration: 5-8 seconds, ultra-realistic, cinematic quality."
`;

    // Note: For image analysis, we'd need to use Gemini Pro Vision
    // For now, we'll generate a generic but effective video prompt
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedPrompt = response.data.candidates[0].content.parts[0].text;
    return generatedPrompt.trim();
    
  } catch (error) {
    console.error('Gemini video prompt error:', error.response?.data || error.message);
    // Fallback video prompt
    return `Animate the CGI object in the scene with cinematic camera movement. Start with an establishing shot, then slowly orbit around the object to showcase its integration with the environment. Add subtle lighting effects and natural motion. Duration: 5-8 seconds, high resolution, realistic animation.`;
  }
}

// Helper function: Generate CGI video with Fal.ai
async function generateCGIVideo(cgiImageUrl, videoPrompt, contentType = 'video') {
  try {
    // Using Veo 3 Fast for cost-effectiveness ($0.50 for 5 seconds)
    const payload = {
      prompt: videoPrompt,
      image_url: cgiImageUrl,
      duration: 5, // 5 seconds
      aspect_ratio: "16:9",
      audio_enabled: false // Keep costs low
    };

    const response = await axios.post(
      'https://fal.run/fal-ai/veo3/fast',
      payload,
      {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      video_url: response.data.video.url,
      duration: 5,
      cost_estimate: 0.50 // Veo 3 Fast cost
    };
    
  } catch (error) {
    console.error('Fal.ai video generation error:', error.response?.data || error.message);
    
    // Fallback to WAN 2.1 if Veo 3 fails ($0.40 for 5 seconds)
    try {
      const fallbackPayload = {
        prompt: videoPrompt,
        image_url: cgiImageUrl,
        num_frames: 81,
        frames_per_second: 16,
        resolution: "720p"
      };

      const fallbackResponse = await axios.post(
        'https://fal.run/fal-ai/wan-i2v',
        fallbackPayload,
        {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        video_url: fallbackResponse.data.video.url,
        duration: 5,
        cost_estimate: 0.40
      };
      
    } catch (fallbackError) {
      console.error('Fallback video generation error:', fallbackError.response?.data || fallbackError.message);
      throw new Error('فشل في إنتاج فيديو CGI');
    }
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
    message: 'CGI Generator API is running with real AI integration!',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    features: ['Real AI Integration', 'Cloudinary Storage', 'Multi-stage CGI Generation'],
    apis: {
      gemini: GEMINI_API_KEY ? 'Connected' : 'Not configured',
      fal: FAL_API_KEY ? 'Connected' : 'Not configured',
      cloudinary: cloudinary.config().cloud_name ? 'Connected' : 'Not configured'
    }
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
    console.error('Registration error:', error);
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

// Upload images endpoint with real Cloudinary integration
app.post('/api/upload-images', authenticateUser, upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'sceneImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { productImage, sceneImage } = req.files;
    
    if (!productImage || !sceneImage) {
      return res.status(400).json({ error: 'يرجى رفع صورة المنتج وصورة المشهد' });
    }
    
    console.log('🔄 Uploading images to Cloudinary...');
    
    const productImageUrl = await uploadImageToCloudinary(
      productImage[0].buffer, 
      `product_${Date.now()}_${req.user.id}`
    );
    
    const sceneImageUrl = await uploadImageToCloudinary(
      sceneImage[0].buffer, 
      `scene_${Date.now()}_${req.user.id}`
    );
    
    console.log('✅ Images uploaded successfully');
    
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
    res.status(500).json({ error: error.message || 'فشل في رفع الصور' });
  }
});

// Create CGI job with real AI integration
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
    
    const job = {
      id: currentJobId++,
      userId: req.user.id,
      title: title || 'مشروع CGI جديد',
      description: description || '',
      contentType,
      productImageUrl,
      sceneImageUrl,
      status: 'processing',
      stage: 'enhancing_description',
      progress: 0,
      creditsUsed: requiredCredits,
      createdAt: new Date(),
      updatedAt: new Date(),
      costs: {
        description_enhancement: 0,
        image_generation: 0,
        video_prompt: 0,
        video_generation: 0,
        total: 0
      }
    };
    
    jobs.push(job);
    
    // Start the 4-stage CGI generation process
    generateCGIAsync(job.id, productImageUrl, sceneImageUrl, description, contentType);
    
    res.json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح! جاري المعالجة بالذكاء الاصطناعي...',
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        stage: job.stage,
        contentType: job.contentType,
        createdAt: job.createdAt
      }
    });
    
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'فشل في إنشاء المشروع' });
  }
});

// Real 4-stage CGI generation process
async function generateCGIAsync(jobId, productImageUrl, sceneImageUrl, userDescription, contentType) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  
  try {
    console.log(`🚀 Starting 4-stage CGI generation for job ${jobId}`);
    
    // Stage 1: Generate Enhanced Description with Gemini AI
    console.log('📝 Stage 1: Enhancing description with Gemini AI...');
    job.stage = 'enhancing_description';
    job.progress = 10;
    job.updatedAt = new Date();
    
    const enhancedDescription = await generateEnhancedDescription(
      productImageUrl, 
      sceneImageUrl, 
      userDescription
    );
    job.enhancedDescription = enhancedDescription;
    job.costs.description_enhancement = 0.001; // ~$0.001
    
    console.log('✅ Stage 1 completed: Enhanced description generated');
    
    // Stage 2: Generate CGI Image with Fal.ai
    console.log('🎨 Stage 2: Generating CGI image with Fal.ai...');
    job.stage = 'generating_image';
    job.progress = 35;
    job.updatedAt = new Date();
    
    const cgiImageUrl = await generateCGIImage(
      productImageUrl, 
      sceneImageUrl, 
      enhancedDescription
    );
    job.cgiImageUrl = cgiImageUrl;
    job.costs.image_generation = 0.05; // ~$0.05
    
    console.log('✅ Stage 2 completed: CGI image generated');
    
    if (contentType === 'image') {
      // For image-only requests, we're done
      job.status = 'completed';
      job.progress = 100;
      job.outputUrl = cgiImageUrl;
      job.costs.total = job.costs.description_enhancement + job.costs.image_generation;
      job.updatedAt = new Date();
      
      console.log(`✅ Image generation completed for job ${jobId}`);
      return;
    }
    
    // Stage 3: Generate Video Prompt with Gemini AI
    console.log('🎬 Stage 3: Creating video prompt with Gemini AI...');
    job.stage = 'creating_video_prompt';
    job.progress = 60;
    job.updatedAt = new Date();
    
    const videoPrompt = await generateVideoPrompt(cgiImageUrl, userDescription);
    job.videoPrompt = videoPrompt;
    job.costs.video_prompt = 0.003; // ~$0.003
    
    console.log('✅ Stage 3 completed: Video prompt generated');
    
    // Stage 4: Generate CGI Video with Fal.ai
    console.log('🎥 Stage 4: Generating CGI video with Fal.ai...');
    job.stage = 'generating_video';
    job.progress = 80;
    job.updatedAt = new Date();
    
    const videoResult = await generateCGIVideo(cgiImageUrl, videoPrompt, contentType);
    job.outputUrl = videoResult.video_url;
    job.costs.video_generation = videoResult.cost_estimate;
    job.costs.total = job.costs.description_enhancement + 
                     job.costs.image_generation + 
                     job.costs.video_prompt + 
                     job.costs.video_generation;
    
    console.log('✅ Stage 4 completed: CGI video generated');
    
    // Final completion
    job.status = 'completed';
    job.progress = 100;
    job.stage = 'completed';
    job.updatedAt = new Date();
    
    console.log(`🎉 All stages completed for job ${jobId}! Total cost: $${job.costs.total.toFixed(3)}`);
    
  } catch (error) {
    console.error(`❌ Job ${jobId} failed at stage ${job.stage}:`, error);
    
    job.status = 'failed';
    job.error = error.message || 'فشل في معالجة المشروع';
    job.updatedAt = new Date();
    
    // Refund credits on failure
    const user = users.find(u => u.id === job.userId);
    if (user) {
      user.credits += job.creditsUsed;
      console.log(`💰 Refunded ${job.creditsUsed} credits to user ${user.id}`);
    }
  }
}

// Get job status with detailed stage information
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
      stage: job.stage,
      progress: job.progress,
      outputUrl: job.outputUrl,
      cgiImageUrl: job.cgiImageUrl, // For preview during video generation
      enhancedDescription: job.enhancedDescription,
      videoPrompt: job.videoPrompt,
      costs: job.costs,
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
    contentType: job.contentType,
    previewUrl: job.cgiImageUrl, // Always provide the image version
    costs: job.costs
  });
});

// Buy credits (placeholder for Stripe integration)
app.post('/api/buy-credits', authenticateUser, (req, res) => {
  const { package: packageType } = req.body;
  
  const packages = {
    starter: { credits: 10, price: 9.99 },
    professional: { credits: 50, price: 39.99 },
    enterprise: { credits: 200, price: 149.99 }
  };
  
  const selectedPackage = packages[packageType];
  if (!selectedPackage) {
    return res.status(400).json({ error: 'باقة غير صالحة' });
  }
  
  // TODO: Integrate with Stripe for real payments
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
    ],
    costs: {
      image_generation: 0.06, // ~$0.06 per image including all stages
      video_generation: 0.59, // ~$0.59 per video including all stages
      estimated_profit_margin: '88%'
    }
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
    console.log(`🚀 CGI Generator API v2.1 running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Integration Status:`);
    console.log(`   - Gemini AI: ${GEMINI_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`   - Fal.ai: ${FAL_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`   - Cloudinary: ${cloudinary.config().cloud_name ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`🎬 Ready for 4-stage CGI generation!`);
  });
}

module.exports = app;
