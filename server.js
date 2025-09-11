// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const Queue = require('bull');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Redis Queue Setup
const cgiQueue = new Queue('CGI processing', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

// Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Database Models (استخدم MongoDB أو PostgreSQL)
const User = require('./models/User');
const Job = require('./models/Job');
const Credit = require('./models/Credit');

// Auth Middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  }
};

// Check Credits Middleware
const checkCredits = (requiredCredits) => {
  return async (req, res, next) => {
    try {
      const userCredits = await Credit.findOne({ userId: req.user._id });
      
      if (!userCredits || userCredits.balance < requiredCredits) {
        return res.status(400).json({ 
          error: 'رصيد الكريدت مش كافي',
          required: requiredCredits,
          current: userCredits?.balance || 0
        });
      }
      
      req.requiredCredits = requiredCredits;
      next();
    } catch (error) {
      res.status(500).json({ error: 'خطأ في التحقق من الرصيد' });
    }
  };
};

// Routes

// 1. Upload Product Images and Create Job
app.post('/api/upload', 
  authenticateUser, 
  upload.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'referenceScene', maxCount: 1 }
  ]), 
  async (req, res) => {
    try {
      const { vision, generateVideo } = req.body;
      const jobId = uuidv4();
      
      // Upload files to S3
      const productImageKey = `products/${jobId}-product.jpg`;
      const referenceSceneKey = `scenes/${jobId}-scene.jpg`;
      
      const productUpload = await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: productImageKey,
        Body: req.files.productImage[0].buffer,
        ContentType: req.files.productImage[0].mimetype
      }).promise();
      
      const sceneUpload = await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: referenceSceneKey,
        Body: req.files.referenceScene[0].buffer,
        ContentType: req.files.referenceScene[0].mimetype
      }).promise();
      
      // Create job in database
      const job = new Job({
        jobId,
        userId: req.user._id,
        productImageUrl: productUpload.Location,
        referenceSceneUrl: sceneUpload.Location,
        vision,
        generateVideo: generateVideo === 'true',
        status: 'pending',
        createdAt: new Date()
      });
      
      await job.save();
      
      // Add to processing queue
      await cgiQueue.add('process-cgi', { jobId });
      
      res.json({
        success: true,
        jobId,
        message: 'تم رفع الصور بنجاح وبدء المعالجة'
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'خطأ في رفع الصور' });
    }
  }
);

// 2. Generate CGI Image
app.post('/api/generate-image/:jobId', 
  authenticateUser, 
  checkCredits(1), 
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await Job.findOne({ jobId, userId: req.user._id });
      
      if (!job) {
        return res.status(404).json({ error: 'مش لاقيين الـ Job' });
      }
      
      // Add image generation to queue
      await cgiQueue.add('generate-image', { jobId });
      
      // Deduct credits
      await Credit.findOneAndUpdate(
        { userId: req.user._id },
        { $inc: { balance: -1 } }
      );
      
      res.json({
        success: true,
        message: 'بدأ توليد صورة CGI',
        jobId
      });
      
    } catch (error) {
      res.status(500).json({ error: 'خطأ في توليد الصورة' });
    }
  }
);

// 3. Generate CGI Video
app.post('/api/generate-video/:jobId', 
  authenticateUser, 
  checkCredits(5), 
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { duration = 5 } = req.body;
      
      const job = await Job.findOne({ jobId, userId: req.user._id });
      
      if (!job || !job.cgiImageUrl) {
        return res.status(400).json({ 
          error: 'لازم تولد الصورة الأول' 
        });
      }
      
      // Calculate credits needed (5 for base + 1 for each extra second)
      const creditsNeeded = 5 + Math.max(0, duration - 5);
      
      // Check if user has enough credits
      const userCredits = await Credit.findOne({ userId: req.user._id });
      if (!userCredits || userCredits.balance < creditsNeeded) {
        return res.status(400).json({ 
          error: 'رصيد الكريدت مش كافي للفيديو',
          required: creditsNeeded,
          current: userCredits?.balance || 0
        });
      }
      
      // Add video generation to queue
      await cgiQueue.add('generate-video', { jobId, duration });
      
      // Deduct credits
      await Credit.findOneAndUpdate(
        { userId: req.user._id },
        { $inc: { balance: -creditsNeeded } }
      );
      
      res.json({
        success: true,
        message: 'بدأ توليد فيديو CGI',
        jobId,
        creditsUsed: creditsNeeded
      });
      
    } catch (error) {
      res.status(500).json({ error: 'خطأ في توليد الفيديو' });
    }
  }
);

// 4. Get Job Status
app.get('/api/job/:jobId', authenticateUser, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ jobId, userId: req.user._id });
    
    if (!job) {
      return res.status(404).json({ error: 'مش لاقيين الـ Job' });
    }
    
    res.json(job);
    
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الـ Job' });
  }
});

// 5. Get User Jobs
app.get('/api/jobs', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const jobs = await Job.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Job.countDocuments({ userId: req.user._id });
    
    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
    
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الـ Jobs' });
  }
});

// 6. Purchase Credits
app.post('/api/purchase-credits', authenticateUser, async (req, res) => {
  try {
    const { package } = req.body; // 'basic', 'pro', 'enterprise'
    
    const packages = {
      basic: { price: 1000, credits: 30, name: 'Basic' }, // $10 = 1000 cents
      pro: { price: 4000, credits: 200, name: 'Pro' },
      enterprise: { price: 12000, credits: 800, name: 'Enterprise' }
    };
    
    const selectedPackage = packages[package];
    if (!selectedPackage) {
      return res.status(400).json({ error: 'باقة غير صحيحة' });
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPackage.price,
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString(),
        package,
        credits: selectedPackage.credits
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      package: selectedPackage
    });
    
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إنشاء الدفع' });
  }
});

// 7. Stripe Webhook
app.post('/api/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { userId, credits } = paymentIntent.metadata;
      
      // Add credits to user account
      await Credit.findOneAndUpdate(
        { userId },
        { $inc: { balance: parseInt(credits) } },
        { upsert: true }
      );
      
      console.log(`تم إضافة ${credits} كريدت للمستخدم ${userId}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'خطأ في Webhook' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر شغال على البورت ${PORT}`);
});

module.exports = app;