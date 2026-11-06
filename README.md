# SKMSCOFFEE

موقع متخصص في القهوة المختصة: المطاحن اليدوية والأوتوماتيكية، أشهر الوصفات، أداة لابتكار الوصفات، أنواع البن، أشهر المزارع، محامص الكويت، وسكانر البن لمعرفة الطحنة المناسبة.

## التشغيل
موقع ثابت (HTML/CSS/JS) بدون أي بناء. افتح `index.html` مباشرة، أو شغّل خادم محلي:

```bash
python3 -m http.server 8000
```

ثم افتح http://localhost:8000. الكاميرا في السكانر تحتاج `localhost` أو `https`.

## الحسابات والمجتمع
- على claude.ai (نسخة الـ artifact): كل عضو يسجّل بحسابه على claude.ai، ووصفاته الخاصة تنحفظ في `data/users/<id>` (ما يشوفها غيره)، وملفه ومنشوراته في `community/<id>` (الكل يقرأ، وكل عضو يكتب ملفه فقط، وصاحب المنصة يقدر يزيل المنشورات).
- الموقع المستقل: تسجيل الدخول بالإيميل وكلمة السر عن طريق Firebase (التسجيل، الدخول، تأكيد الإيميل، استرجاع كلمة السر). البيانات في Firestore بنفس المسارات، ومحمية بـ `firestore.rules`.
- إذا ما انربط Firebase: وضع محلي، الحساب والوصفات تنحفظ في المتصفح فقط والمجتمع غير متاح.

## ربط Firebase (تسجيل بالإيميل)
1. ادخل https://console.firebase.google.com وأنشئ مشروع جديد.
2. Build ← Authentication ← Get started ← فعّل **Email/Password**.
3. Build ← Firestore Database ← Create database (اختر أقرب منطقة، مثل `europe-west` أو `me-central`).
4. Project settings ← Your apps ← أضف Web app، وانسخ الإعدادات في `assets/js/firebase-config.js` بدل `null`.
5. ارفع قواعد الحماية والموقع (يحتاج Node.js):

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

```bash
firebase deploy --project <PROJECT_ID>
```

بعدها الموقع يشتغل على `https://<PROJECT_ID>.web.app`. لإضافة Google أو Apple أو Facebook لاحقًا: فعّلها من Authentication ← Sign-in method، ونضيف أزرارها في الكود.

لإعطاء حسابك صلاحية إدارة المنشورات، عيّن له custom claim اسمه `admin` (من Firebase Admin SDK).

## الملفات
- `index.html`: الصفحة
- `assets/css/style.css`: التصميم (يدعم الوضع الليلي والجوال)
- `assets/js/data.js`: كل البيانات (المطاحن، الوصفات، البن، المزارع، المحامص). عدّلها من هنا.
- `assets/js/app.js`: الواجهة، ومنشئ الوصفات، والسكانر

## ملاحظة عن بيانات المحامص
كل محمصة لها حقل `status`: `address` (عنوان من مصدر)، `area` (المنطقة فقط)، `unknown` (يحتاج تأكيد). ما نكتب عنوان ما له مصدر.
