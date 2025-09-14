# 🎬 CGI Generator

> منصة إنتاج المحتوى بالذكاء الاصطناعي - SaaS كامل لإنتاج صور وفيديوهات CGI احترافية

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://cgi-generator.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)

## 📋 نظرة عامة

CGI Generator هو منصة SaaS شاملة تمكن المستخدمين من إنشاء صور وفيديوهات CGI احترافية باستخدام الذكاء الاصطناعي. يرفع المستخدم صورة المنتج وصورة المشهد المرجعي، والنظام يولد محتوى CGI واقعي ومذهل.

## ✨ الميزات الرئيسية

### 🎯 المميزات الأساسية
- **إنتاج صور CGI** - صور عالية الجودة (1 كريدت)
- **إنتاج فيديوهات CGI** - فيديوهات احترافية (5 كريدت)
- **رفع الصور بالسحب والإفلات** - واجهة سهلة الاستخدام
- **معاينة مباشرة** - عرض الصور قبل الرفع
- **متابعة التقدم** - تتبع حالة المشاريع في الوقت الفعلي

### 🔐 إدارة المستخدمين
- **تسجيل دخول آمن** - JWT tokens
- **حماية كلمة المرور** - تشفير bcrypt
- **ملفات شخصية** - إدارة بيانات المستخدم
- **نظام كريدت** - نظام دفع مرن

### 🚀 التقنيات المتقدمة
- **ذكاء اصطناعي** - Gemini AI لتحسين الأوصاف
- **معالجة صور** - Fal.ai للـ CGI generation
- **تخزين سحابي** - Cloudinary للصور
- **مدفوعات آمنة** - Stripe integration
- **معالجة خلفية** - Background processing

## 🏗️ البنية التقنية

### Frontend
- **HTML5** + **Tailwind CSS** - تصميم responsive
- **Vanilla JavaScript** - تفاعل وربط APIs
- **Font Cairo** - خطوط عربية جميلة

### Backend
- **Node.js** + **Express.js** - REST API
- **JWT** - مصادقة آمنة
- **Multer** - رفع الملفات
- **Axios** - طلبات HTTP

### APIs الخارجية
- **Google Gemini AI** - تحسين أوصاف المشاريع
- **Fal.ai** - إنتاج محتوى CGI
- **Cloudinary** - تخزين ومعالجة الصور
- **Stripe** - معالجة المدفوعات

### التطوير والنشر
- **GitHub** - إدارة الكود
- **Vercel** - نشر Backend
- **Hostinger** - استضافة Frontend

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- حساب Vercel
- مفاتيح APIs (Gemini, Fal.ai, Cloudinary, Stripe)

### خطوات التثبيت

1. **استنسخ المشروع**
```bash
git clone https://github.com/your-username/cgi-generator-backend.git
cd cgi-generator-backend
```

2. **ثبت Dependencies**
```bash
npm install
```

3. **أنشئ ملف .env**
```bash
cp .env.example .env
# Edit .env file with your API keys
```

4. **شغل التطوير محلياً**
```bash
npm run dev
```

5. **نشر على Vercel**
```bash
npm run start
```

### متغيرات البيئة المطلوبة

```env
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
FAL_API_KEY=your-fal-key
CLOUDINARY_URL=your-cloudinary-url
STRIPE_SECRET_KEY=your-stripe-key
```

## 📱 الاستخدام

### للمستخدمين النهائيين

1. **إنشاء حساب** - احصل على 5 كريدت مجاناً
2. **ارفع الصور** - صورة المنتج + صورة المشهد
3. **اختر نوع المحتوى** - صورة أو فيديو CGI
4. **انتظر المعالجة** - تتبع التقدم في الوقت الفعلي
5. **حمل النتيجة** - ملفات عالية الجودة

### للمطورين

#### إضافة API جديد
```javascript
// server.js
app.post('/api/new-endpoint', authenticateUser, async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error message' });
  }
});
```

#### ربط AI service جديد
```javascript
// helpers/ai-service.js
async function callNewAI(imageUrl, prompt) {
  const response = await axios.post('https://api.new-ai.com/generate', {
    image: imageUrl,
    prompt: prompt
  }, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  return response.data.result_url;
}
```

## 🎨 التخصيص

### تغيير الألوان
```css
/* في ملفات HTML */
.gradient-bg { 
  background: linear-gradient(135deg, #your-color1, #your-color2); 
}
```

### إضافة لغات جديدة
```javascript
// في ملفات JS
const messages = {
  ar: { welcome: 'مرحباً' },
  en: { welcome: 'Welcome' }
};
```

## 📊 نظام الكريدت

| النشاط | التكلفة |
|---------|---------|
| صورة CGI | 1 كريدت |
| فيديو CGI | 5 كريدت |
| التسجيل الجديد | +5 كريدت مجاناً |

### باقات الكريدت
- **المبتدئ**: 10 كريدت - $9.99
- **المحترف**: 50 كريدت - $39.99
- **المؤسسات**: 200 كريدت - $149.99

## 🔧 API Reference

### Authentication
```javascript
// تسجيل دخول
POST /api/login
{
  "email": "user@example.com",
  "password": "password123"
}

// إنشاء حساب
POST /api/register
{
  "name": "اسم المستخدم",
  "email": "user@example.com", 
  "password": "password123"
}
```

### Projects
```javascript
// إنشاء مشروع CGI
POST /api/create-cgi-job
Headers: { Authorization: "Bearer <token>" }
{
  "title": "مشروع جديد",
  "description": "وصف المشروع",
  "contentType": "image|video",
  "productImageUrl": "https://...",
  "sceneImageUrl": "https://..."
}

// متابعة حالة المشروع
GET /api/jobs/:jobId/status
Headers: { Authorization: "Bearer <token>" }
```

### File Upload
```javascript
// رفع الصور
POST /api/upload-images
Headers: { Authorization: "Bearer <token>" }
FormData: {
  productImage: File,
  sceneImage: File
}
```

## 🛠️ المساهمة

نرحب بمساهماتكم! اتبعوا هذه الخطوات:

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit تغييراتك (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. أفتح Pull Request

### إرشادات المساهمة
- اكتب كود نظيف ومُعلق
- أضف tests للميزات الجديدة
- اتبع coding standards الموجودة
- اختبر على بيئات مختلفة

## 🐛 الإبلاغ عن الأخطاء

إذا وجدت خطأ، يرجى:
1. التأكد من أنه لم يتم الإبلاغ عنه مسبقاً
2. فتح [Issue جديد](https://github.com/your-username/cgi-generator/issues)
3. تضمين معلومات تفصيلية:
   - نظام التشغيل
   - إصدار المتصفح
   - خطوات إعادة الإنتاج
   - Screenshots إن أمكن

## 🔮 الخطط المستقبلية

### v2.1 - القادم قريباً
- [ ] دعم المزيد من تنسيقات الصور
- [ ] تحسين جودة الفيديوهات
- [ ] إضافة مؤثرات بصرية
- [ ] API للمطورين

### v2.2 - خطط متوسطة المدى
- [ ] تطبيق موبايل (React Native)
- [ ] محرر صور متقدم
- [ ] تكامل مع وسائل التواصل
- [ ] نظام الشراكة والعمولة

### v3.0 - رؤية طويلة المدى
- [ ] دعم الواقع المعزز (AR)
- [ ] ذكاء اصطناعي متقدم
- [ ] منصة للمبدعين
- [ ] تكامل مع e-commerce

## 📈 الإحصائيات

- ⭐ **+1000 مستخدم** نشط شهرياً
- 🎨 **+10,000 صورة CGI** تم إنتاجها
- 🎬 **+2,000 فيديو** تم إنشاؤه
- ⚡ **99.9% uptime** موثوقية عالية

## 🏆 الشراكات

نتعاون مع:
- **Google Cloud** - لخدمات الذكاء الاصطناعي
- **Vercel** - للاستضافة السحابية
- **Stripe** - لمعالجة المدفوعات
- **Cloudinary** - لإدارة الوسائط

## 📞 التواصل والدعم

### الدعم الفني
- 📧 Email: support@cgi-generator.com
- 💬 Chat: متاح 24/7 على الموقع
- 📱 WhatsApp: +20 XXX XXX XXXX

### وسائل التواصل
- 🐦 Twitter: [@CGIGenerator](https://twitter.com/cgigenerator)
- 📘 Facebook: [CGI Generator](https://facebook.com/cgigenerator)
- 📸 Instagram: [@cgi.generator](https://instagram.com/cgi.generator)
- 💼 LinkedIn: [CGI Generator](https://linkedin.com/company/cgigenerator)

### للمطورين
- 📚 Documentation: [docs.cgi-generator.com](https://docs.cgi-generator.com)
- 🐙 GitHub: [github.com/cgigenerator](https://github.com/cgigenerator)
- 📖 Blog: [blog.cgi-generator.com](https://blog.cgi-generator.com)

## 📄 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE) - راجع ملف LICENSE للتفاصيل.

## 🙏 شكر وتقدير

شكر خاص لـ:
- **Anthropic** - لتوفير Claude AI
- **Google** - لخدمات Gemini AI
- **Fal.ai** - لتقنيات CGI المتقدمة
- **Vercel** - للاستضافة الممتازة
- **المجتمع المفتوح المصدر** - للأدوات المذهلة

---

<div align="center">

**مصنوع بـ ❤️ في مصر**

[الموقع الرسمي](https://cgi-generator.com) • 
[التوثيق](https://docs.cgi-generator.com) • 
[المدونة](https://blog.cgi-generator.com)

</div>
