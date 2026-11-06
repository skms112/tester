/* إعدادات Firebase لتسجيل الدخول بالإيميل.
 * انسخ قيم "Web app config" من Firebase Console ← Project settings ← Your apps.
 * هذه القيم مو سرّية (تظهر لأي زائر للموقع)، والحماية تكون عن طريق firestore.rules.
 * إذا تركتها null يشتغل الموقع بالوضع المحلي.
 */
window.SKMS_FIREBASE_CONFIG = null;
/* مثال:
window.SKMS_FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
*/
