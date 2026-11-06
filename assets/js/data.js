/* SKMSCOFFEE: بيانات الموقع
 * ملاحظة: بيانات المحامص مأخوذة من نتائج بحث عامة (أدلة أماكن ومقالات).
 * أي معلومة ما لقينا لها مصدر واضح متروكة كـ "يحتاج تأكيد" بدل ما نخمّنها.
 */

/* ---------- طرق التحضير (تستخدم في السكانر والوصفات) ---------- */
const METHODS = [
  { id: "turkish",   name: "قهوة تركية",          min: 40,  max: 220,  ratio: "1:10",        temp: "ماء بارد على نار هادئة" },
  { id: "espresso",  name: "إسبريسو",              min: 200, max: 350,  ratio: "1:2 (مُخرج)", temp: "90 – 96°م" },
  { id: "moka",      name: "موكا بوت",             min: 360, max: 660,  ratio: "حسب سلة الموكا", temp: "ماء ساخن مسبقًا" },
  { id: "aeropress", name: "إيروبرس",              min: 320, max: 960,  ratio: "1:12 – 1:18", temp: "85 – 99°م" },
  { id: "v60",       name: "V60 / تقطير مخروطي",   min: 400, max: 700,  ratio: "1:15 – 1:17", temp: "90 – 100°م" },
  { id: "flat",      name: "كاليتا ويف / قاع مسطح", min: 500, max: 800,  ratio: "1:15 – 1:17", temp: "90 – 96°م" },
  { id: "chemex",    name: "كيمكس",               min: 550, max: 900,  ratio: "1:15 – 1:17", temp: "90 – 96°م" },
  { id: "siphon",    name: "سايفون",               min: 375, max: 800,  ratio: "1:15",        temp: "90 – 95°م" },
  { id: "french",    name: "فرنش برس",             min: 690, max: 1300, ratio: "1:15 – 1:17", temp: "93 – 100°م" },
  { id: "coldbrew",  name: "كولد برو",             min: 800, max: 1400, ratio: "1:5 – 1:8 (مركّز)", temp: "ماء بارد 12 – 18 ساعة" }
];

/* مقياس الطحنة: من الميكرون إلى وصف ملموس */
const GRIND_SCALE = [
  { upTo: 250,  id: "xfine",   name: "ناعمة جدًا",    feel: "مثل الطحين أو البودرة" },
  { upTo: 400,  id: "fine",    name: "ناعمة",         feel: "مثل الملح الناعم" },
  { upTo: 600,  id: "mfine",   name: "متوسطة-ناعمة",  feel: "مثل الرمل الناعم" },
  { upTo: 800,  id: "medium",  name: "متوسطة",        feel: "مثل رمل البحر" },
  { upTo: 1000, id: "mcoarse", name: "متوسطة-خشنة",   feel: "مثل السكر الخشن" },
  { upTo: 1200, id: "coarse",  name: "خشنة",          feel: "مثل الملح الخشن" },
  { upTo: 9999, id: "xcoarse", name: "خشنة جدًا",     feel: "مثل الفلفل المجروش" }
];

/* ---------- القهوة المختصة وتفرعاتها ---------- */
const SPECIALTY_TYPES = [
  { cat: "espresso", title: "إسبريسو", en: "Espresso", desc: "استخلاص مركّز بضغط حوالي 9 بار. أساس أغلب مشروبات القهوة." },
  { cat: "espresso", title: "ريستريتو", en: "Ristretto", desc: "إسبريسو أقصر بكمية ماء أقل. أحلى وأكثر قوامًا." },
  { cat: "espresso", title: "لونغو", en: "Lungo", desc: "إسبريسو أطول بكمية ماء أكبر. أخف وأكثر مرارة." },
  { cat: "espresso", title: "أمريكانو", en: "Americano", desc: "إسبريسو مع ماء حار." },
  { cat: "espresso", title: "كورتادو", en: "Cortado", desc: "إسبريسو مع كمية مقاربة من الحليب المبخّر." },
  { cat: "espresso", title: "فلات وايت", en: "Flat White", desc: "إسبريسو مزدوج مع حليب مبخّر برغوة ناعمة رقيقة." },
  { cat: "espresso", title: "كابتشينو", en: "Cappuccino", desc: "إسبريسو مع حليب ورغوة أكثف من اللاتيه." },
  { cat: "espresso", title: "لاتيه", en: "Caffè Latte", desc: "إسبريسو مع كمية أكبر من الحليب المبخّر وطبقة رغوة خفيفة." },
  { cat: "espresso", title: "ماكياتو", en: "Macchiato", desc: "إسبريسو مع لمسة رغوة حليب." },
  { cat: "espresso", title: "بيكولو", en: "Piccolo", desc: "ريستريتو مع حليب مبخّر في كوب صغير." },
  { cat: "filter", title: "V60", en: "Hario V60", desc: "تقطير مخروطي يبرز الحموضة والنكهات الزهرية والفاكهية." },
  { cat: "filter", title: "كيمكس", en: "Chemex", desc: "فلتر ورقي سميك يعطي فنجان نظيف وخفيف القوام." },
  { cat: "filter", title: "كاليتا ويف", en: "Kalita Wave", desc: "قاع مسطح بثلاث فتحات يعطي استخلاص متوازن وثابت." },
  { cat: "filter", title: "أوريغامي", en: "Origami Dripper", desc: "دريبر بطيّات يقبل فلاتر مخروطية ومسطحة." },
  { cat: "immersion", title: "فرنش برس", en: "French Press", desc: "غمر كامل بفلتر معدني. قوام ثقيل وزيوت أكثر." },
  { cat: "immersion", title: "إيروبرس", en: "AeroPress", desc: "غمر وضغط خفيف. مرن جدًا وسهل في السفر." },
  { cat: "immersion", title: "كليفر", en: "Clever Dripper", desc: "يجمع الغمر والتقطير، سهل وثابت النتائج." },
  { cat: "immersion", title: "سايفون", en: "Siphon", desc: "تحضير بالبخار والفراغ. فنجان نظيف وعرض ممتع." },
  { cat: "cold", title: "كولد برو", en: "Cold Brew", desc: "نقع بماء بارد لساعات طويلة. ناعم وقليل الحموضة." },
  { cat: "cold", title: "قهوة مقطّرة على ثلج", en: "Japanese Iced / Flash Brew", desc: "تقطير بماء حار مباشرة على الثلج يحافظ على النكهات العطرية." },
  { cat: "cold", title: "نايترو كولد برو", en: "Nitro Cold Brew", desc: "كولد برو مشحون بالنيتروجين بقوام كريمي." },
  { cat: "cold", title: "آيس لاتيه", en: "Iced Latte", desc: "إسبريسو مع حليب بارد وثلج." },
  { cat: "traditional", title: "قهوة تركية", en: "Turkish Coffee", desc: "طحنة ناعمة جدًا تُغلى بالركوة بدون فلترة." },
  { cat: "traditional", title: "موكا بوت", en: "Moka Pot", desc: "استخلاص بضغط البخار على النار. قوي وقريب من الإسبريسو." },
  { cat: "traditional", title: "القهوة العربية", en: "Arabic Coffee", desc: "بن محمّص تحميص خفيف مع الهيل وأحيانًا الزعفران، تُقدَّم بالدلة." }
];
const SPECIALTY_CATS = [
  { id: "all", name: "الكل" },
  { id: "espresso", name: "مشروبات الإسبريسو" },
  { id: "filter", name: "التقطير" },
  { id: "immersion", name: "الغمر" },
  { id: "cold", name: "القهوة الباردة" },
  { id: "traditional", name: "تقليدية" }
];

/* ---------- أنواع البن ---------- */
const BEANS = [
  // الأنواع (Species)
  { cat: "species", title: "أرابيكا", en: "Coffea arabica", desc: "حوالي 60% أو أكثر من إنتاج العالم. نكهات معقدة وحموضة واضحة وكافيين أقل. أساس القهوة المختصة." },
  { cat: "species", title: "روبوستا", en: "Coffea canephora", desc: "كافيين أعلى ومرارة أكثر وقوام ثقيل. تنزرع بارتفاعات أقل وتستخدم كثيرًا في الخلطات." },
  { cat: "species", title: "ليبيريكا", en: "Coffea liberica", desc: "نوع نادر بحبوب كبيرة غير منتظمة ونكهة مميزة، يُزرع في مناطق مثل الفلبين وماليزيا." },
  // الأصناف (Varieties)
  { cat: "variety", title: "جيشا / غيشا", en: "Geisha / Gesha", desc: "أصلها من إثيوبيا واشتهرت في بنما. زهرية جدًا (ياسمين، برغموت) ومن أغلى الأصناف في المزادات." },
  { cat: "variety", title: "بوربون", en: "Bourbon", desc: "صنف كلاسيكي حلو ومتوازن، ومنه طفرات بالألوان: الأحمر والأصفر والوردي." },
  { cat: "variety", title: "تيبيكا", en: "Typica", desc: "من أقدم الأصناف، ومنه تفرعت أصناف كثيرة. نظيف وحلو." },
  { cat: "variety", title: "كاتورا", en: "Caturra", desc: "طفرة قزمية من البوربون، منتشرة في أمريكا اللاتينية." },
  { cat: "variety", title: "كاتواي", en: "Catuaí", desc: "تهجين بين موندو نوفو وكاتورا، منتشر في البرازيل." },
  { cat: "variety", title: "SL28 و SL34", en: "SL28 / SL34", desc: "أصناف كينية مشهورة بحموضة تشبه الكشمش الأسود والفواكه الحمراء." },
  { cat: "variety", title: "باكامارا", en: "Pacamara", desc: "تهجين باكاس × ماراغوجيبي بحبوب كبيرة. مشهور في السلفادور." },
  { cat: "variety", title: "الأصناف الإثيوبية المحلية", en: "Ethiopian Landraces (Heirloom)", desc: "آلاف الأصناف المحلية في موطن القهوة الأصلي. زهرية وفاكهية." },
  { cat: "variety", title: "سيدرا", en: "Sidra", desc: "صنف مشهور في الإكوادور وكولومبيا، صار شائع في المسابقات." },
  { cat: "variety", title: "بينك بوربون", en: "Pink Bourbon", desc: "صنف كولومبي مطلوب بحموضة فاكهية وحلاوة عالية." },
  // المناشئ
  { cat: "origin", title: "إثيوبيا", en: "Yirgacheffe · Sidamo · Guji · Harrar", desc: "موطن القهوة. المغسولة زهرية بنكهة ليمون وشاي، والمجففة توتية." },
  { cat: "origin", title: "كينيا", en: "Nyeri · Kirinyaga", desc: "حموضة مشرقة ونكهات كشمش وطماطم وجريب فروت." },
  { cat: "origin", title: "كولومبيا", en: "Huila · Nariño · Cauca", desc: "متوازنة وحلوة بنكهات كراميل وفاكهة. متوفرة أغلب السنة." },
  { cat: "origin", title: "بنما", en: "Boquete · Volcán", desc: "موطن جيشا المزادات. أنيقة وزهرية." },
  { cat: "origin", title: "البرازيل", en: "Cerrado · Sul de Minas", desc: "أكبر منتج في العالم. شوكولاتة ومكسرات وحموضة منخفضة. ممتازة للإسبريسو." },
  { cat: "origin", title: "غواتيمالا", en: "Antigua · Huehuetenango", desc: "كاكاو وتوابل وحموضة متوسطة." },
  { cat: "origin", title: "كوستاريكا", en: "Tarrazú · West Valley", desc: "نظيفة ومشرقة، ومشهورة بمعالجات العسل." },
  { cat: "origin", title: "اليمن", en: "Haraz · Bani Matar", desc: "من أقدم مناطق تجارة القهوة (ميناء المخا). معقدة بنكهات فواكه مجففة وتوابل." },
  { cat: "origin", title: "رواندا وبوروندي", en: "Rwanda · Burundi", desc: "حلوة ومشرقة بنكهات فواكه حمراء وشاي." },
  { cat: "origin", title: "إندونيسيا", en: "Sumatra · Java · Sulawesi", desc: "قوام ثقيل ونكهات ترابية وتوابل، غالبًا بمعالجة التقشير الرطب." },
  { cat: "origin", title: "جامايكا", en: "Blue Mountain", desc: "قهوة الجبال الزرقاء الشهيرة. ناعمة ومتوازنة." },
  { cat: "origin", title: "هاواي", en: "Kona", desc: "تُزرع على منحدرات بركان في جزيرة هاواي. ناعمة وحلوة." },
  // المعالجة
  { cat: "process", title: "مغسولة", en: "Washed", desc: "تُزال الثمرة قبل التجفيف. فنجان نظيف وحموضة واضحة." },
  { cat: "process", title: "مجففة / طبيعية", en: "Natural / Dry", desc: "تجفف الحبة داخل الثمرة. حلاوة عالية ونكهات توت وفواكه ناضجة." },
  { cat: "process", title: "عسلية", en: "Honey", desc: "تجفف مع جزء من لب الثمرة. حلاوة وقوام بين المغسولة والطبيعية." },
  { cat: "process", title: "لاهوائية", en: "Anaerobic", desc: "تخمير في خزانات مغلقة بدون أكسجين. نكهات مكثفة وغير تقليدية." },
  { cat: "process", title: "النقع الكربوني", en: "Carbonic Maceration", desc: "تخمير بثاني أكسيد الكربون، مستعار من صناعة النبيذ." },
  { cat: "process", title: "التقشير الرطب", en: "Wet-Hulled (Giling Basah)", desc: "معالجة إندونيسية تعطي قوام ثقيل ونكهات ترابية." }
];
const BEAN_CATS = [
  { id: "all", name: "الكل" },
  { id: "species", name: "الأنواع" },
  { id: "variety", name: "الأصناف" },
  { id: "origin", name: "المناشئ" },
  { id: "process", name: "المعالجة" }
];

/* ---------- المطاحن ----------
 * burrMm: يُترك null إذا ما عندنا رقم مؤكد.
 * stepUm: مقدار الحركة لكل نقرة (ميكرون) للمطاحن اليدوية اللي ينتشر رقمها، ويُترك null غير كذا.
 */
const GRINDERS = [
  // يدوية
  { id: "comandante", type: "manual", name: "Comandante C40 MK4", brand: "Comandante", burr: "مخروطية · فولاذ عالي النيتروجين", burrMm: 39, stepUm: 30, best: ["filter", "espresso"], desc: "من أشهر المطاحن اليدوية للتقطير، وثباتها عالي." },
  { id: "jxpro", type: "manual", name: "1Zpresso JX-Pro", brand: "1Zpresso", burr: "مخروطية · ستانلس ستيل", burrMm: 48, stepUm: 12.5, best: ["espresso", "filter"], desc: "ضبط دقيق خارجي يناسب الإسبريسو والتقطير." },
  { id: "jmax", type: "manual", name: "1Zpresso J-Max", brand: "1Zpresso", burr: "مخروطية · ستانلس ستيل", burrMm: 48, stepUm: 8.8, best: ["espresso"], desc: "مصممة للإسبريسو بخطوات ضبط صغيرة جدًا." },
  { id: "kultra", type: "manual", name: "1Zpresso K-Ultra", brand: "1Zpresso", burr: "مخروطية · ستانلس ستيل", burrMm: 48, stepUm: 20, best: ["filter", "espresso"], desc: "متعددة الاستخدامات بتركيز على وضوح نكهات التقطير." },
  { id: "zp6", type: "manual", name: "1Zpresso ZP6 Special", brand: "1Zpresso", burr: "مخروطية", burrMm: null, stepUm: null, best: ["filter"], desc: "مخصصة للتقطير وتعطي فنجان نظيف وواضح." },
  { id: "k6", type: "manual", name: "Kingrinder K6", brand: "Kingrinder", burr: "مخروطية · ستانلس ستيل", burrMm: 48, stepUm: 16, best: ["filter", "espresso"], desc: "خيار اقتصادي بقيمة عالية مقابل السعر." },
  { id: "c3", type: "manual", name: "Timemore Chestnut C3", brand: "Timemore", burr: "مخروطية · ستانلس ستيل", burrMm: 38, stepUm: null, best: ["filter"], desc: "مطحنة مبتدئين ممتازة للتقطير والفرنش برس." },
  { id: "chestnutx", type: "manual", name: "Timemore Chestnut X", brand: "Timemore", burr: "مخروطية · ستانلس ستيل", burrMm: null, stepUm: null, best: ["filter", "espresso"], desc: "الفئة الأعلى من Timemore بتصنيع متين." },
  { id: "kinu", type: "manual", name: "Kinu M47", brand: "Kinu", burr: "مخروطية · ستانلس ستيل", burrMm: 47, stepUm: null, best: ["espresso", "filter"], desc: "ألمانية الصنع، ثقيلة ومتينة وقوية في الإسبريسو." },
  { id: "skerton", type: "manual", name: "Hario Skerton Pro", brand: "Hario", burr: "مخروطية · سيراميك", burrMm: null, stepUm: null, best: ["filter"], desc: "خيار اقتصادي معروف للبداية." },
  { id: "porlex", type: "manual", name: "Porlex Mini II", brand: "Porlex", burr: "مخروطية · سيراميك", burrMm: null, stepUm: null, best: ["filter"], desc: "صغيرة وخفيفة، تدخل داخل الإيروبرس للسفر." },

  // أوتوماتيكية
  { id: "encoreesp", type: "electric", name: "Baratza Encore ESP", brand: "Baratza", burr: "مخروطية · فولاذ", burrMm: 40, stepUm: null, best: ["espresso", "filter"], desc: "مدخل اقتصادي فيها نطاق مخصص للإسبريسو ونطاق للتقطير." },
  { id: "virtuoso", type: "electric", name: "Baratza Virtuoso+", brand: "Baratza", burr: "مخروطية · فولاذ", burrMm: 40, stepUm: null, best: ["filter"], desc: "مطحنة منزلية ممتازة للتقطير والفرنش برس." },
  { id: "ode2", type: "electric", name: "Fellow Ode Gen 2", brand: "Fellow", burr: "مسطحة · فولاذ", burrMm: 64, stepUm: null, best: ["filter"], desc: "مصممة للتقطير وما تنفع للإسبريسو." },
  { id: "opus", type: "electric", name: "Fellow Opus", brand: "Fellow", burr: "مخروطية · فولاذ", burrMm: 40, stepUm: null, best: ["espresso", "filter"], desc: "متعددة الاستخدامات من الإسبريسو إلى الكولد برو." },
  { id: "niche", type: "electric", name: "Niche Zero", brand: "Niche", burr: "مخروطية · فولاذ", burrMm: 63, stepUm: null, best: ["espresso", "filter"], desc: "طحن جرعة واحدة مع احتفاظ شبه معدوم بالبن." },
  { id: "mignon", type: "electric", name: "Eureka Mignon Specialita", brand: "Eureka", burr: "مسطحة · فولاذ", burrMm: 55, stepUm: null, best: ["espresso"], desc: "إيطالية هادئة وشائعة جدًا للإسبريسو المنزلي." },
  { id: "df64", type: "electric", name: "DF64", brand: "Turin / G-iota", burr: "مسطحة · فولاذ", burrMm: 64, stepUm: null, best: ["espresso", "filter"], desc: "مطحنة جرعة واحدة بسعر مناسب وتقبل ترقية الشفرات." },
  { id: "p64", type: "electric", name: "Lagom P64", brand: "Option-O", burr: "مسطحة · فولاذ", burrMm: 64, stepUm: null, best: ["espresso", "filter"], desc: "تصنيع دقيق جدًا وخيارات شفرات مختلفة." },
  { id: "x54", type: "electric", name: "Mahlkönig X54", brand: "Mahlkönig", burr: "مسطحة · فولاذ", burrMm: 54, stepUm: null, best: ["espresso", "filter"], desc: "مطحنة منزلية من شركة معروفة بمطاحن المقاهي." },
  { id: "uniform", type: "electric", name: "Wilfa Uniform", brand: "Wilfa", burr: "مسطحة · فولاذ", burrMm: 58, stepUm: null, best: ["filter"], desc: "نرويجية مخصصة للتقطير وطحنها متجانس." },
  { id: "sgp", type: "electric", name: "Breville / Sage Smart Grinder Pro", brand: "Breville", burr: "مخروطية · ستانلس ستيل", burrMm: null, stepUm: null, best: ["espresso", "filter"], desc: "60 درجة طحن وشاشة ومؤقّت. مدخل شائع للإسبريسو." },
  { id: "superjolly", type: "electric", name: "Mazzer Super Jolly", brand: "Mazzer", burr: "مسطحة · فولاذ", burrMm: 64, stepUm: null, best: ["espresso"], desc: "مطحنة مقاهي إيطالية كلاسيكية للإسبريسو." },
  { id: "eg1", type: "electric", name: "Weber Workshops EG-1", brand: "Weber Workshops", burr: "مسطحة · فولاذ", burrMm: 80, stepUm: null, best: ["espresso", "filter"], desc: "من أعلى المطاحن المنزلية فئةً وسعرًا." },
  { id: "ek43", type: "electric", name: "Mahlkönig EK43", brand: "Mahlkönig", burr: "مسطحة · فولاذ", burrMm: 98, stepUm: null, best: ["filter", "espresso"], desc: "أيقونة المقاهي والمحامص، تستخدم كثيرًا في التقطير والتذوق." }
];
const GRINDER_CATS = [
  { id: "all", name: "الكل" },
  { id: "manual", name: "يدوية" },
  { id: "electric", name: "أوتوماتيكية" }
];

/* ---------- الوصفات ---------- */
const RECIPES = [
  {
    cat: "filter", method: "v60", title: "طريقة 4:6", author: "تيتسو كاسويا (بطل العالم في البرورز 2016)",
    dose: 20, water: 300, ratio: "1:15", temp: "92°م", grind: "خشنة", time: "3:30",
    steps: [
      "5 صبّات كل صبّة 60غ، وكل صبّة بعد 45 ثانية تقريبًا.",
      "أول صبّتين (40% من الماء) تتحكم في الحلاوة والحموضة: صبّة أولى أصغر = حموضة أكثر، وصبّة أولى أكبر = حلاوة أكثر.",
      "الثلاث صبّات الباقية (60% من الماء) تتحكم في القوة: صبّات أكثر = فنجان أقوى.",
      "ارفع الدريبر عند 3:30."
    ]
  },
  {
    cat: "filter", method: "v60", title: "Ultimate V60", author: "James Hoffmann",
    dose: 30, water: 500, ratio: "1:16.7", temp: "قريب من الغليان", grind: "متوسطة-ناعمة", time: "≈ 3:30",
    steps: [
      "بلوم: 60غ ماء (ضعف وزن البن)، حرّك الدريبر بحركة دائرية لتبليل كل البن، وانتظر 45 ثانية.",
      "صب حتى 300غ خلال 30 ثانية.",
      "صب بهدوء حتى 500غ خلال 30 ثانية.",
      "قلّب بالملعقة مرة مع عقارب الساعة ومرة عكسها، ثم حرّك الدريبر حركة خفيفة.",
      "اترك القهوة تنزل. الهدف أن ينتهي التقطير حوالي 3:30."
    ]
  },
  {
    cat: "immersion", method: "aeropress", title: "Ultimate AeroPress", author: "James Hoffmann",
    dose: 11, water: 200, ratio: "1:18", temp: "قريب من الغليان", grind: "ناعمة-متوسطة", time: "≈ 3:00",
    steps: [
      "الوضع العادي (غير مقلوب) مع فلتر ورقي مغسول.",
      "حط البن وصب 200غ ماء بسرعة.",
      "ركّب المكبس فوق بمسافة بسيطة لعمل فراغ يمنع التنقيط، وانتظر دقيقتين.",
      "امسك الإيروبرس وحرّكه حركة دائرية خفيفة، وانتظر 30 ثانية.",
      "اضغط ببطء حوالي 30 ثانية."
    ]
  },
  {
    cat: "immersion", method: "french", title: "فرنش برس بدون رواسب", author: "James Hoffmann",
    dose: 30, water: 500, ratio: "1:16.7", temp: "قريب من الغليان", grind: "متوسطة", time: "9 – 12 دقيقة",
    steps: [
      "صب الماء على البن واترك 4 دقائق.",
      "اكسر الطبقة اللي فوق بالملعقة، وشيل الرغوة والحبيبات الطافية.",
      "انتظر 5 إلى 8 دقائق عشان الرواسب تنزل تحت.",
      "نزّل المكبس لحد سطح القهوة فقط (لا تضغط للنهاية)، وصبّ ببطء."
    ]
  },
  {
    cat: "filter", method: "chemex", title: "كيمكس كلاسيكي", author: "وصفة شائعة",
    dose: 30, water: 500, ratio: "1:16.7", temp: "93 – 96°م", grind: "متوسطة-خشنة", time: "4:00 – 4:30",
    steps: [
      "اغسل الفلتر السميك بماء حار وارمِ ماء الغسيل.",
      "بلوم بـ 60غ ماء لمدة 45 ثانية.",
      "صب على دفعات بحركة دائرية حتى 500غ.",
      "الهدف أن ينتهي التقطير بين 4:00 و4:30."
    ]
  },
  {
    cat: "filter", method: "flat", title: "كاليتا ويف بالصبّات", author: "وصفة شائعة",
    dose: 20, water: 320, ratio: "1:16", temp: "93°م", grind: "متوسطة", time: "≈ 3:30",
    steps: [
      "بلوم بـ 40غ ماء لمدة 30 – 40 ثانية.",
      "صب 70غ كل 20 ثانية تقريبًا حتى 320غ، مع المحافظة على مستوى ماء ثابت.",
      "الهدف أن ينتهي التقطير حوالي 3:30."
    ]
  },
  {
    cat: "espresso", method: "espresso", title: "إسبريسو كلاسيكي 1:2", author: "نقطة بداية معروفة",
    dose: 18, water: 36, ratio: "1:2", temp: "92 – 94°م", grind: "ناعمة", time: "25 – 30 ثانية",
    steps: [
      "18غ بن في السلة، وزّع واكبس بشكل مستوي.",
      "استخلص 36غ قهوة خلال 25 – 30 ثانية.",
      "إذا الطعم حامض وخفيف نعّم الطحنة، وإذا مر وقابض خشّنها."
    ]
  },
  {
    cat: "espresso", method: "espresso", title: "فلات وايت", author: "وصفة شائعة",
    dose: 18, water: 36, ratio: "1:2 + حليب", temp: "الحليب 55 – 65°م", grind: "ناعمة", time: "—",
    steps: [
      "حضّر إسبريسو مزدوج (أو ريستريتو مزدوج).",
      "بخّر الحليب برغوة ناعمة رقيقة (مايكروفوم).",
      "صب الحليب في كوب حجمه تقريبًا 150 – 180 مل."
    ]
  },
  {
    cat: "cold", method: "v60", title: "V60 مقطّر على الثلج", author: "وصفة شائعة (Japanese Iced)",
    dose: 20, water: 320, ratio: "1:16 (ماء + ثلج)", temp: "ماء حار 93°م", grind: "متوسطة-ناعمة", time: "≈ 3:00",
    steps: [
      "حط حوالي 40% من الماء الكلي ثلجًا في السيرفر (≈ 130غ).",
      "حضّر V60 عادي بالباقي ماء حار (≈ 190غ).",
      "خلّي الطحنة أنعم من العادي لأن كمية الماء الحار أقل.",
      "حرّك وقدّمها على ثلج جديد."
    ]
  },
  {
    cat: "cold", method: "coldbrew", title: "كولد برو مركّز", author: "وصفة شائعة",
    dose: 100, water: 800, ratio: "1:8", temp: "ماء بارد", grind: "خشنة جدًا", time: "12 – 18 ساعة",
    steps: [
      "اخلط البن مع الماء البارد وقلّب لين يتبلل كله.",
      "غطّه واتركه في الثلاجة 12 إلى 18 ساعة.",
      "صفّه بفلتر ورقي أو قماش.",
      "خفّفه بماء أو حليب بنسبة 1:1 حسب الذوق."
    ]
  },
  {
    cat: "traditional", method: "moka", title: "موكا بوت بدون حرقان", author: "وصفة شائعة",
    dose: "تعبئة السلة", water: "لحد الصمام", ratio: "—", temp: "ماء مغلي مسبقًا", grind: "متوسطة-ناعمة", time: "≈ 4 – 5 دقائق",
    steps: [
      "عبّئ الخزان بماء ساخن لحد تحت صمام الأمان.",
      "عبّئ السلة بالبن ومسّحها بدون كبس.",
      "حطها على نار هادئة واترك الغطاء مفتوح.",
      "أول ما تبدأ القهوة تفوّر وتصير فاتحة اللون، شيلها وبرّد القاعدة بماء بارد."
    ]
  },
  {
    cat: "traditional", method: "turkish", title: "قهوة تركية", author: "وصفة تقليدية",
    dose: 7, water: 70, ratio: "1:10", temp: "ماء بارد", grind: "ناعمة جدًا", time: "3 – 4 دقائق",
    steps: [
      "حط الماء البارد والبن (والسكر إذا تبي) في الركوة وحرّك.",
      "سخّنها على نار هادئة جدًا بدون تحريك.",
      "أول ما ترتفع الرغوة شيلها من النار قبل لا تفور، وصبّها بهدوء."
    ]
  }
];
const RECIPE_CATS = [
  { id: "all", name: "الكل" },
  { id: "filter", name: "التقطير" },
  { id: "immersion", name: "الغمر" },
  { id: "espresso", name: "الإسبريسو" },
  { id: "cold", name: "الباردة" },
  { id: "traditional", name: "تقليدية" }
];

/* ---------- المزارع ---------- */
const FARMS = [
  { name: "Hacienda La Esmeralda", country: "بنما", region: "بوكيتي (Boquete)", known: "جيشا", desc: "المزرعة اللي عرّفت العالم على الجيشا في المسابقات والمزادات من 2004." },
  { name: "Finca Deborah", country: "بنما", region: "فولكان (Volcán)", known: "جيشا · معالجات تجريبية", desc: "مزرعة عالية الارتفاع يملكها Jamison Savage، معروفة بمعالجاتها التجريبية وتظهر كثيرًا في المسابقات." },
  { name: "Ninety Plus Gesha Estates", country: "بنما", region: "فولكان (Volcán)", known: "جيشا", desc: "مزارع Ninety Plus المعروفة بأسعار قياسية وقهوة مسابقات." },
  { name: "Finca El Injerto", country: "غواتيمالا", region: "هويهويتينانغو (Huehuetenango)", known: "باكامارا · جيشا", desc: "مزرعة عائلية تاريخية فازت بمسابقة Cup of Excellence أكثر من مرة." },
  { name: "La Palma y El Tucán", country: "كولومبيا", region: "كونديناماركا (Cundinamarca)", known: "سيدرا · جيشا · تخمير", desc: "مشهورة بمعالجات التخمير المبتكرة وبرنامجها مع المزارعين المجاورين." },
  { name: "Finca El Paraíso", country: "كولومبيا", region: "كاوكا (Cauca)", known: "معالجات حرارية وتخمير", desc: "مزرعة Diego Bermúdez، معروفة بمعالجات بنكهات مكثفة جدًا." },
  { name: "Daterra", country: "البرازيل", region: "سيرادو مينيرو (Cerrado Mineiro)", known: "أصناف متعددة · استدامة", desc: "من أكبر مزارع القهوة المختصة وأكثرها تطورًا في البرازيل." },
  { name: "Fazenda Santa Inês", country: "البرازيل", region: "كارمو دي ميناس (Carmo de Minas)", known: "بوربون أصفر", desc: "سجّلت درجات قياسية في Cup of Excellence البرازيل." },
  { name: "Finca Takesi", country: "بوليفيا", region: "يونغاس (Yungas)", known: "جيشا · ارتفاعات عالية جدًا", desc: "من أعلى مزارع القهوة ارتفاعًا في العالم." },
  { name: "Gesha Village Coffee Estate", country: "إثيوبيا", region: "بنش ماجي (Bench Maji)", known: "جيشا من موطنها الأصلي", desc: "مزرعة قريبة من غابات جيشا الأصلية اللي أُخذ منها الصنف." },
  { name: "Hacienda La Minita", country: "كوستاريكا", region: "تارازو (Tarrazú)", known: "قهوة مغسولة نظيفة", desc: "من أشهر مزارع تارازو، وتعرف بالفرز الدقيق." },
  { name: "Wallenford Estate", country: "جامايكا", region: "الجبال الزرقاء (Blue Mountains)", known: "Jamaica Blue Mountain", desc: "من أعرق مزارع قهوة الجبال الزرقاء." },
  { name: "Greenwell Farms", country: "الولايات المتحدة (هاواي)", region: "كونا (Kona)", known: "Kona Coffee", desc: "مزرعة عائلية تاريخية من أشهر منتجي قهوة كونا." }
];

/* ---------- محامص الكويت ----------
 * status:
 *   "address" = في مصدر ذكر عنوان (من أدلة أماكن، ويُفضَّل التأكد)
 *   "area"    = المنطقة فقط مذكورة في مصدر
 *   "unknown" = ما لقينا موقع في المصادر، يحتاج تأكيد
 */
const ROASTERS = [
  { name: "% Arabica Kuwait Roastery", area: "الشويخ الصناعية", address: "قطعة 1، شارع 4، مبنى 3، الشويخ الصناعية", status: "address", desc: "محمصة وكافيه كبير، وتبيع البن للشركات (B2B) وتقدّم تدريب.", source: "أدلة أماكن (Wanderlog, Trip.com, VyMaps) وموقع 248am. ملاحظة: أحد الأدلة ذكر شارع مختلف.", q: "% Arabica Kuwait Roastery Shuwaikh" },
  { name: "Stockroom Coffee", area: "الشويخ الصناعية", address: "الشويخ الصناعية 3أ، شارع 75، مبنى 182، محل 14", status: "address", desc: "مصنّفة كمحمصة قهوة.", source: "دليل شركات (bestfoodimporters).", q: "Stockroom Coffee Kuwait" },
  { name: "ORU Roasters", area: "الشويخ الصناعية", address: null, status: "area", desc: "محمصة قهوة مختصة كويتية من 2018، ولها فروع داخل الكويت وتصدّر لدول الخليج والعراق.", source: "موقع ORU، ودليل مقاهي يذكرها ضمن محامص الشويخ الصناعية.", q: "ORU Roasters Kuwait" },
  { name: "Altitude Roasters", area: "الشويخ الصناعية", address: null, status: "area", desc: "محمصة وكافيه. صاحبها محمد العدساني، والمحمصة تستقبل الزوار للتذوق قبل الشراء.", source: "Deliveroo (المنطقة) ومقابلة في مجلة Coffee Magazine.", q: "Altitude Roasters Kuwait" },
  { name: "48 East Roastery", area: "الشويخ الصناعية", address: null, status: "area", desc: "محمصة مذكورة ضمن محامص الشويخ الصناعية.", source: "دليل مقاهي مدينة الكويت.", q: "48 East Roastery Kuwait" },
  { name: "Air Roastery", area: "الشويخ الصناعية", address: null, status: "area", desc: "محمصة مذكورة في الشويخ الصناعية.", source: "دراسة حالة على موقع Odoo.", q: "Air Roastery Kuwait" },
  { name: "Mug Coffee & Roastery", area: "الجهراء", address: "شارع عين جالوت، الجهراء", status: "address", desc: "من أشهر محامص القهوة المختصة في الجهراء.", source: "دليل Q8tly للقهوة المختصة.", q: "Mug Coffee Roastery Jahra" },
  { name: "VOL.1 Roast Lab", area: null, address: null, status: "unknown", desc: "كوفي بار ومحمصة صغيرة مستقلة أسستها نورة الرومي سنة 2013.", source: "مقال Entrepreneur Middle East.", q: "VOL.1 Roast Lab Kuwait" },
  { name: "% Arabica Al Shaheed Roastery", area: null, address: null, status: "unknown", desc: "فرع محمصة ثاني لـ % Arabica في الكويت.", source: "صفحة الفروع في موقع % Arabica.", q: "% Arabica Al Shaheed Roastery Kuwait" },
  { name: "Kaffa Specialty Coffee", area: null, address: null, status: "unknown", desc: "مذكورة في دليل مقاهي مدينة الكويت.", source: "دليل Daymark.", q: "Kaffa Specialty Coffee Kuwait" },
  { name: "Mazj Coffee Roasters", area: null, address: null, status: "unknown", desc: "مذكورة في دليل مقاهي مدينة الكويت.", source: "دليل Daymark.", q: "Mazj Coffee Roasters Kuwait" },
  { name: "Alegria Coffee Roasters", area: null, address: null, status: "unknown", desc: "مذكورة في دليل مقاهي مدينة الكويت.", source: "دليل Daymark.", q: "Alegria Coffee Roasters Kuwait" },
  { name: "Pause Coffee Roasters", area: null, address: null, status: "unknown", desc: "مذكورة في دليل مقاهي مدينة الكويت.", source: "دليل Daymark.", q: "Pause Coffee Roasters Kuwait" },
  { name: "قهوة بوتيك (The Coffee Boutique)", area: null, address: null, status: "unknown", desc: "تأسست في الكويت سنة 2020، وعندها عمليات تحميص وتصنيع.", source: "ملف الشركة في معرض فوديكس السعودية.", q: "The Coffee Boutique Kuwait" },
  { name: "Earth Roastery", area: null, address: null, status: "unknown", desc: "محمصة وموزّع لمكائن Dalla Corte في الكويت.", source: "مجلة Dalla Corte (2021).", q: "Earth Roastery Kuwait" }
];
const ROASTER_CATS = [
  { id: "all", name: "الكل" },
  { id: "shuwaikh", name: "الشويخ الصناعية" },
  { id: "other", name: "مناطق أخرى" },
  { id: "unknown", name: "بانتظار تأكيد الموقع" }
];

/* ---------- وصف طرق التحضير (صفحة كل طريقة) ---------- */
const METHOD_DESC = {
  turkish: "تُطحن القهوة ناعمة جدًا وتُغلى بالركوة مع الماء بدون فلترة، فتنزل الحبيبات في قاع الفنجان. قوام ثقيل ونكهة مركّزة.",
  espresso: "ماء ساخن يمر بضغط حوالي 9 بار خلال قرص بن مكبوس لمدة 25 – 30 ثانية تقريبًا. مركّز وقوامه ثقيل، وهو أساس مشروبات الحليب.",
  moka: "خزان ماء يُسخّن على النار، وضغط البخار يدفع الماء خلال البن للأعلى. قوي وقريب من الإسبريسو بس بضغط أقل.",
  aeropress: "غمر ثم ضغط خفيف بالمكبس خلال فلتر ورقي. مرن جدًا: يقدر يطلع فنجان خفيف مثل التقطير أو مركّز.",
  v60: "دريبر مخروطي بفتحة واحدة كبيرة، وسرعة الصب تتحكم في الاستخلاص. يبرز الحموضة والنكهات الزهرية والفاكهية.",
  flat: "دريبر بقاع مسطح وفتحات صغيرة يخلّي الماء يمر بشكل متساوٍ. أسهل في الثبات وأكثر توازنًا.",
  chemex: "إبريق زجاجي مع فلتر ورقي سميك يحجز الزيوت والرواسب. فنجان نظيف جدًا وخفيف القوام.",
  siphon: "البخار يرفع الماء للحجرة العلوية ويخلط مع البن، ولما تبعد الحرارة تنسحب القهوة للأسفل خلال الفلتر. نظيف وعطري.",
  french: "غمر كامل لعدة دقائق ثم فصل البن بفلتر معدني. قوام ثقيل وزيوت أكثر في الفنجان.",
  coldbrew: "نقع البن في ماء بارد لساعات طويلة. يطلع مركّز ناعم وقليل الحموضة، ويُخفّف بماء أو حليب."
};

/* ---------- صبّات الوصفات المشهورة (للمؤقت) ----------
 * at: الثانية اللي تبدأ فيها الخطوة، to: إجمالي الماء المطلوب بالغرام بعد الصبّة (null = خطوة بدون صب).
 * end: نهاية التحضير بالثواني. مأخوذة من خطوات كل وصفة كما هي مكتوبة فوق.
 */
const RECIPE_POURS = {
  "طريقة 4:6": { end: 210, pours: [
    { at: 0, to: 60, label: "الصبّة الأولى (حلاوة/حموضة)" }, { at: 45, to: 120, label: "الصبّة الثانية (حلاوة/حموضة)" },
    { at: 90, to: 180, label: "الصبّة الثالثة (القوة)" }, { at: 135, to: 240, label: "الصبّة الرابعة (القوة)" }, { at: 180, to: 300, label: "الصبّة الخامسة (القوة)" }] },
  "Ultimate V60": { end: 210, pours: [
    { at: 0, to: 60, label: "بلوم: صب 60غ وحرّك الدريبر" }, { at: 45, to: 300, label: "صب حتى 300غ خلال 30 ثانية" },
    { at: 75, to: 500, label: "صب بهدوء حتى 500غ خلال 30 ثانية" }, { at: 105, to: null, label: "قلّب مرة مع عقارب الساعة ومرة عكسها، وحرّك الدريبر" }] },
  "Ultimate AeroPress": { end: 180, pours: [
    { at: 0, to: 200, label: "صب 200غ وركّب المكبس" }, { at: 120, to: null, label: "حرّك الإيروبرس حركة دائرية خفيفة" },
    { at: 150, to: null, label: "اضغط ببطء حوالي 30 ثانية" }] },
  "فرنش برس بدون رواسب": { end: 540, pours: [
    { at: 0, to: 500, label: "صب 500غ واتركه" }, { at: 240, to: null, label: "اكسر الطبقة وشيل الرغوة" },
    { at: 540, to: null, label: "نزّل المكبس لحد السطح وصبّ" }] },
  "كيمكس كلاسيكي": { end: 255, pours: [
    { at: 0, to: 60, label: "بلوم: 60غ" }, { at: 45, to: 250, label: "صب بحركة دائرية حتى 250غ" },
    { at: 105, to: 500, label: "صب بحركة دائرية حتى 500غ" }] },
  "كاليتا ويف بالصبّات": { end: 210, pours: [
    { at: 0, to: 40, label: "بلوم: 40غ" }, { at: 40, to: 110, label: "صب 70غ" }, { at: 60, to: 180, label: "صب 70غ" },
    { at: 80, to: 250, label: "صب 70غ" }, { at: 100, to: 320, label: "صب 70غ" }] },
  "إسبريسو كلاسيكي 1:2": { end: 30, pours: [
    { at: 0, to: 36, label: "ابدأ الاستخلاص، الهدف 36غ خلال 25 – 30 ثانية" }] },
  "V60 مقطّر على الثلج": { end: 180, pours: [
    { at: 0, to: 40, label: "بلوم: 40غ" }, { at: 45, to: 120, label: "صب حتى 120غ" }, { at: 75, to: 190, label: "صب حتى 190غ" }] }
};
RECIPES.forEach((r) => { const p = RECIPE_POURS[r.title]; if (p) { r.pours = p.pours; r.brewEnd = p.end; } });
