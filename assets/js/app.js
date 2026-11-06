/* SKMSCOFFEE: منطق المنصة
 * يشتغل بوضعين:
 *  - وضع المنصة (claude.ai): حسابات حقيقية عبر هوية المستخدم، وصفات خاصة لكل عضو، ومجتمع مشترك.
 *  - الوضع المحلي (أي متصفح ثاني): كل شي ينحفظ في هذا المتصفح فقط، والمجتمع غير متاح.
 */
(function () {
  "use strict";

  /* ================= أدوات ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const local = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  };
  const uid8 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const methodById = (id) => METHODS.find((m) => m.id === id);
  const grinderById = (id) => GRINDERS.find((g) => g.id === id);
  const BEST_LABEL = { espresso: "إسبريسو", filter: "تقطير" };
  const ROAST_NAME = { light: "فاتح", medium: "متوسط", dark: "غامق" };
  const PROCESS_NAME = { washed: "مغسولة", natural: "طبيعية", honey: "عسلية", anaerobic: "لاهوائية", unknown: "غير محددة" };
  const fmtDate = (t) => { try { return new Date(t).toLocaleDateString("ar-KW", { year: "numeric", month: "short", day: "numeric" }); } catch (_) { return ""; } };

  const ICON_PATHS = {
    v60: '<path d="M4 6h16l-6 9h-4z"/><path d="M9 15v2h6v-2M7 20h10"/>',
    flat: '<path d="M4 6h16l-3 8H7z"/><path d="M8 14v2h8v-2M6 19h12"/>',
    chemex: '<path d="M7 3h10l-4 8 4 10H7l4-10z"/><path d="M10 11h4"/>',
    french: '<rect x="6" y="7" width="11" height="13" rx="1"/><path d="M11.5 3v10M8 13h7M17 10h2v6h-2M9 3h5"/>',
    aeropress: '<rect x="8" y="3" width="8" height="12" rx="1"/><path d="M7 15h10M9 18h6M10 21h4M8 6h8"/>',
    espresso: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
    moka: '<path d="M8 3h8l1 6H7z"/><path d="M7 9l-1 3h12l-1-3M6 12l2 9h8l2-9M17 5h2v4"/>',
    turkish: '<path d="M6 8h10l-1 11H7z"/><path d="M16 10l5-3M5 8h12"/>',
    siphon: '<circle cx="12" cy="17" r="4"/><path d="M9 3h6l-1 7h-4zM12 10v3M6 21h12"/>',
    coldbrew: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M8 3h8M9 10h2v2H9zM13 13h2v2h-2zM9 16h2v2H9z"/>'
  };
  const icon = (id, size = 40) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[id] || ""}</svg>`;

  /* ================= خيارات الذوق (اختيار متعدد) ================= */
  const SERVE_STYLES = [
    { id: "black", name: "سادة بدون إضافات" },
    { id: "milk", name: "مع حليب" },
    { id: "sweet", name: "مُحلّاة" },
    { id: "iced", name: "باردة / مثلجة" },
    { id: "spiced", name: "مع هيل أو بهارات" }
  ];
  const ROAST_LEVELS = [
    { id: "light", name: "تحميص فاتح" },
    { id: "medium", name: "تحميص متوسط" },
    { id: "dark", name: "تحميص غامق" }
  ];
  const beanOpts = (cat) => BEANS.filter((b) => b.cat === cat).map((b) => ({ id: b.title, name: b.title }));
  const PREF_GROUPS = [
    { key: "methods", title: "طرق التحضير", hint: "اختر كل الطرق اللي تستخدمها", options: METHODS.map((m) => ({ id: m.id, name: m.name })) },
    { key: "serve", title: "طريقة الشرب", hint: "كيف تحب تشرب قهوتك؟", options: SERVE_STYLES },
    { key: "drinks", title: "المشروبات المفضلة", hint: "", options: SPECIALTY_TYPES.filter((t) => t.cat === "espresso" || t.cat === "cold" || t.cat === "traditional").map((t) => ({ id: t.title, name: t.title })) },
    { key: "roasts", title: "درجة التحميص", hint: "", options: ROAST_LEVELS },
    { key: "origins", title: "أنواع البن: المناشئ", hint: "", options: beanOpts("origin") },
    { key: "varieties", title: "أنواع البن: الأصناف", hint: "", options: beanOpts("species").concat(beanOpts("variety")) },
    { key: "processes", title: "أنواع البن: المعالجة", hint: "", options: beanOpts("process") },
    { key: "grinders", title: "مطاحنك", hint: "اختر كل المطاحن اللي عندك، اليدوية والأوتوماتيكية", options: GRINDERS.map((g) => ({ id: g.id, name: g.name, group: g.type === "manual" ? "يدوية" : "أوتوماتيكية" })) }
  ];
  const prefs = () => (S.profile && S.profile.prefs) || {};
  const myList = (key) => (Array.isArray(prefs()[key]) ? prefs()[key] : []);

  /* ================= الحالة ================= */
  const S = {
    mode: "local",        // "local" | "cloud"
    ready: false,         // انتهى فحص المنصة
    db: null, user: null, uid: null, me: null, isOwner: false,
    profile: null,        // ملف العضو (اسم مستعار، نبذة، طريقة مفضلة، منشورات)
    myRecipes: [],
    members: [],          // [{uid, nickname, bio, method, joined, posts:[]}]
    feedLoaded: false, feedNote: "",
    view: "home", methodId: null,
    accountTab: "recipes",
    lastScan: null,
    flash: ""
  };
  const LOCAL_PROFILE = "skmscoffee.profile";
  const LOCAL_RECIPES = "skmscoffee.recipes";

  /* ================= التبويبات ================= */
  function makeTabs(container, cats, onChange) {
    container.innerHTML = cats.map((c, i) =>
      `<button type="button" class="tab" role="tab" data-id="${c.id}" aria-selected="${i === 0}">${esc(c.name)}</button>`
    ).join("");
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      container.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === btn)));
      onChange(btn.dataset.id);
    });
  }

  /* ================= الهيدر والتوجيه ================= */
  const toggle = $(".nav-toggle");
  const nav = $(".nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });
  $("#year").textContent = new Date().getFullYear();

  const VIEWS = ["home", "method", "types", "beans", "grinders", "recipes", "farms", "roasters", "scanner", "community", "account"];
  function route() {
    const h = (location.hash || "").replace(/^#/, "");
    let view = "home", methodId = null;
    if (h.startsWith("m-") && methodById(h.slice(2))) { view = "method"; methodId = h.slice(2); }
    else if (VIEWS.includes(h) && h !== "method") view = h;
    S.view = view; S.methodId = methodId;
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== view; });
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const active = a.dataset.nav === view || (view === "method" && a.dataset.nav === "home");
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (view === "method") renderMethod();
    if (view === "community") renderFeed();
    if (view === "account") renderAccount();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ================= الرئيسية: شبكة الطرق ================= */
  function renderMethodGrid() {
    const fav = myList("methods");
    const list = [...METHODS].sort((x, y) => (fav.includes(y.id) ? 1 : 0) - (fav.includes(x.id) ? 1 : 0));
    $("#methodGrid").innerHTML = list.map((m) => {
      const info = grindInfo((m.min + m.max) / 2);
      const mine = fav.includes(m.id);
      return `
        <a class="method-tile${mine ? " method-tile-mine" : ""}" href="#m-${m.id}">
          ${mine ? `<span class="chip chip-me tile-badge">طريقتي</span>` : ""}
          <span class="method-icon">${icon(m.id)}</span>
          <b>${esc(m.name)}</b>
          <span class="method-meta">${esc(info.name)} · ${esc(m.ratio)}</span>
        </a>`;
    }).join("");
  }
  renderMethodGrid();

  /* ================= صفحة الطريقة ================= */
  function grindersFor(m) {
    const needFine = m.id === "espresso" || m.id === "turkish";
    return GRINDERS.filter((g) => g.best.includes(needFine ? "espresso" : "filter"));
  }
  function communityPosts(filterFn) {
    const out = [];
    S.members.forEach((mem) => (mem.posts || []).forEach((p) => { if (!filterFn || filterFn(p)) out.push({ ...p, uid: mem.uid, member: mem }); }));
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function renderMethod() {
    const m = methodById(S.methodId);
    if (!m) return;
    const info = grindInfo((m.min + m.max) / 2);
    const recipes = RECIPES.filter((r) => r.method === m.id);
    const owned = myList("grinders");
    const grinders = grindersFor(m).sort((x, y) => (owned.includes(y.id) ? 1 : 0) - (owned.includes(x.id) ? 1 : 0));
    const drinks = m.id === "espresso" ? SPECIALTY_TYPES.filter((t) => t.cat === "espresso") : [];
    const posts = communityPosts((p) => p.method === m.id);
    const SCALE_MAX = 1400;
    $("#methodView").innerHTML = `
      <a href="#home" class="back-link">→ كل طرق التحضير</a>
      <header class="method-head">
        <span class="method-icon method-icon-lg">${icon(m.id, 56)}</span>
        <div>
          <h2>${esc(m.name)}</h2>
          <p class="lead">${esc(METHOD_DESC[m.id] || "")}</p>
        </div>
      </header>

      <div class="method-facts">
        <div class="fact"><small>الطحنة</small><b>${esc(info.name)}</b><span>${esc(info.feel)}</span></div>
        <div class="fact"><small>حجم الحبيبات</small><b>${m.min} – ${m.max}</b><span>ميكرون</span></div>
        <div class="fact"><small>النسبة</small><b>${esc(m.ratio)}</b><span>بن : ماء</span></div>
        <div class="fact"><small>الحرارة</small><b>${esc(m.temp)}</b><span>&nbsp;</span></div>
      </div>
      <div class="grind-bar grind-bar-light" aria-hidden="true"><i style="right:${(m.min / SCALE_MAX) * 100}%;width:${((m.max - m.min) / SCALE_MAX) * 100}%"></i></div>
      <div class="grind-scale-labels"><span>ناعم جدًا</span><span>خشن جدًا</span></div>

      <div class="method-actions">
        <a class="btn btn-primary" href="#scanner" data-scan-method="${m.id}">امسح البن لهذه الطريقة</a>
        <a class="btn btn-ghost" href="#account" data-create-method="${m.id}">ابتكر وصفة ${esc(m.name)}</a>
      </div>

      ${drinks.length ? `
        <h3 class="sub-title">مشروبات الإسبريسو</h3>
        <div class="chips chips-lg">${drinks.map((d) => `<span class="chip" title="${esc(d.desc)}">${esc(d.title)}</span>`).join("")}</div>` : ""}

      <h3 class="sub-title">الوصفات المشهورة</h3>
      ${recipes.length ? `<div class="grid grid-2">${recipes.map((r) => recipeCard(r)).join("")}</div>` : `<div class="empty">ما عندنا وصفة مشهورة لهذه الطريقة للحين. ابتكر وحدة وشاركها!</div>`}

      <h3 class="sub-title">من المجتمع</h3>
      ${!S.ready ? `<div class="empty">جاري التحميل…</div>`
        : S.mode !== "cloud" ? `<div class="empty">وصفات الأعضاء تظهر لما تفتح المنصة من رابطها على claude.ai.</div>`
        : posts.length ? `<div class="grid grid-2">${posts.slice(0, 6).map(postCard).join("")}</div>${posts.length > 6 ? `<p><a href="#community">شوف الكل في المجتمع (${posts.length})</a></p>` : ""}`
        : `<div class="empty">ما في وصفات من الأعضاء لهذه الطريقة للحين. كن أول من يشارك.</div>`}

      <h3 class="sub-title">مطاحن مناسبة</h3>
      <div class="grid grid-3">${grinders.map((g) => grinderCard(g, owned.includes(g.id))).join("")}</div>
    `;
    hydrateAvatars($("#methodView"));
  }

  document.addEventListener("click", (e) => {
    const scan = e.target.closest("[data-scan-method]");
    if (scan) { $("#sMethod").value = scan.dataset.scanMethod; }
    const create = e.target.closest("[data-create-method]");
    if (create) { S.accountTab = "create"; S.presetMethod = create.dataset.createMethod; }
  });

  /* ================= القهوة المختصة ================= */
  function renderTypes(cat) {
    $("#typeGrid").innerHTML = SPECIALTY_TYPES.filter((t) => cat === "all" || t.cat === cat).map((t) => `
      <article class="card">
        <h3>${esc(t.title)}</h3>
        <div class="en">${esc(t.en)}</div>
        <p>${esc(t.desc)}</p>
      </article>`).join("");
  }
  makeTabs($("#typeTabs"), SPECIALTY_CATS, renderTypes);
  renderTypes("all");

  /* ================= البن ================= */
  function renderBeans(cat) {
    const catName = Object.fromEntries(BEAN_CATS.map((c) => [c.id, c.name]));
    $("#beanGrid").innerHTML = BEANS.filter((b) => cat === "all" || b.cat === cat).map((b) => `
      <article class="card">
        <h3>${esc(b.title)}</h3>
        <div class="en">${esc(b.en)}</div>
        <p>${esc(b.desc)}</p>
        <div class="chips"><span class="chip">${esc(catName[b.cat])}</span></div>
      </article>`).join("");
  }
  makeTabs($("#beanTabs"), BEAN_CATS, renderBeans);
  renderBeans("all");

  /* ================= المطاحن ================= */
  function grinderCard(g, owned) {
    return `
      <article class="card">
        <div class="chips chips-top"><span class="chip">${g.type === "manual" ? "يدوية" : "أوتوماتيكية"}</span>${owned ? `<span class="chip chip-me">عندي</span>` : ""}</div>
        <h3 dir="ltr" class="ltr-title">${esc(g.name)}</h3>
        <p>${esc(g.desc)}</p>
        <dl class="specs">
          <dt>الشفرات</dt><dd>${esc(g.burr)}</dd>
          ${g.burrMm ? `<dt>القطر</dt><dd>${g.burrMm} مم</dd>` : ""}
          ${g.stepUm ? `<dt>خطوة النقرة</dt><dd>≈ ${g.stepUm} ميكرون</dd>` : ""}
        </dl>
        <div class="chips">${g.best.map((b) => `<span class="chip">${BEST_LABEL[b]}</span>`).join("")}</div>
      </article>`;
  }
  let grinderCat = "all";
  function renderGrinders() {
    const q = $("#grinderSearch").value.trim().toLowerCase();
    const list = GRINDERS.filter((g) => (grinderCat === "all" || g.type === grinderCat) && (!q || (g.name + " " + g.brand).toLowerCase().includes(q)));
    $("#grinderGrid").innerHTML = list.length ? list.map((g) => grinderCard(g, myList("grinders").includes(g.id))).join("") : `<div class="empty">ما في نتائج.</div>`;
  }
  makeTabs($("#grinderTabs"), GRINDER_CATS, (id) => { grinderCat = id; renderGrinders(); });
  $("#grinderSearch").addEventListener("input", renderGrinders);
  renderGrinders();

  /* ================= الوصفات ================= */
  function recipeCard(r, extra = "", head = "") {
    const m = methodById(r.method);
    const num = (v) => (typeof v === "number" ? `${v} غ` : v);
    return `
      <article class="card">
        ${head}
        <div class="chips chips-top"><a class="chip chip-link" href="#m-${esc(r.method)}">${esc(m ? m.name : r.method)}</a></div>
        <h3>${esc(r.title)}</h3>
        ${r.author ? `<div class="recipe-author">${esc(r.author)}</div>` : ""}
        <div class="recipe-params">
          <div><small>البن</small><b>${esc(num(r.dose))}</b></div>
          <div><small>${r.method === "espresso" ? "المُخرج" : "الماء"}</small><b>${esc(num(r.water))}</b></div>
          <div><small>النسبة</small><b>${esc(r.ratio)}</b></div>
          <div><small>الحرارة</small><b>${esc(r.temp)}</b></div>
          <div><small>الطحنة</small><b>${esc(r.grind)}</b></div>
          <div><small>الوقت</small><b>${esc(r.time)}</b></div>
        </div>
        ${r.steps && r.steps.length ? `<ol class="recipe-steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
        ${r.grinder && grinderById(r.grinder) ? `<p class="small"><b>المطحنة:</b> <span dir="ltr">${esc(grinderById(r.grinder).name)}</span>${r.clicks ? ` · ${esc(r.clicks)}` : ""}</p>` : ""}
        ${r.notes ? `<p><b>التذوق:</b> ${esc(r.notes)}</p>` : ""}
        ${extra}
      </article>`;
  }
  function renderRecipes(cat) {
    $("#recipeGrid").innerHTML = RECIPES.filter((r) => cat === "all" || r.cat === cat).map((r) => recipeCard(r)).join("");
  }
  makeTabs($("#recipeTabs"), RECIPE_CATS, renderRecipes);
  renderRecipes("all");

  /* ================= المزارع والمحامص ================= */
  $("#farmGrid").innerHTML = FARMS.map((f) => `
    <article class="card">
      <h3 dir="ltr" class="ltr-title">${esc(f.name)}</h3>
      <div class="en">${esc(f.country)} · ${esc(f.region)}</div>
      <p>${esc(f.desc)}</p>
      <div class="chips"><span class="chip">${esc(f.known)}</span></div>
    </article>`).join("");

  const STATUS = {
    address: `<span class="chip chip-ok">عنوان من مصدر</span>`,
    area: `<span class="chip chip-ok">المنطقة من مصدر</span>`,
    unknown: `<span class="chip chip-warn">الموقع يحتاج تأكيد</span>`
  };
  function renderRoasters(cat) {
    const list = ROASTERS.filter((r) => {
      if (cat === "shuwaikh") return r.area === "الشويخ الصناعية";
      if (cat === "other") return r.area && r.area !== "الشويخ الصناعية";
      if (cat === "unknown") return r.status === "unknown";
      return true;
    });
    $("#roasterGrid").innerHTML = list.map((r) => `
      <article class="card">
        <div class="chips chips-top">${STATUS[r.status]}</div>
        <h3 dir="auto" class="ltr-title">${esc(r.name)}</h3>
        <dl class="specs">
          <dt>المنطقة</dt><dd>${r.area ? esc(r.area) : "غير مؤكدة"}</dd>
          ${r.address ? `<dt>العنوان</dt><dd>${esc(r.address)}</dd>` : ""}
        </dl>
        <p>${esc(r.desc)}</p>
        <p class="small"><b>المصدر:</b> ${esc(r.source)}</p>
        <div class="card-foot">
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.q)}">📍 افتح في الخرائط</a>
        </div>
      </article>`).join("");
  }
  makeTabs($("#roasterTabs"), ROASTER_CATS, renderRoasters);
  renderRoasters("all");

  /* ================= الطحنة ================= */
  function grindInfo(um) { return GRIND_SCALE.find((g) => um <= g.upTo); }

  function computeGrind(methodId, roast) {
    const m = methodById(methodId);
    const factor = { light: 0.9, medium: 1, dark: 1.1 }[roast] || 1;
    const mid = ((m.min + m.max) / 2) * factor;
    const half = (m.max - m.min) * 0.15;
    const lo = Math.round(Math.max(m.min * 0.85, mid - half) / 10) * 10;
    const hi = Math.round(Math.min(m.max * 1.15, mid + half) / 10) * 10;
    return { m, lo, hi, target: Math.round(mid / 10) * 10, info: grindInfo(mid) };
  }

  /* ================= السكانر ================= */
  const canvas = $("#scanCanvas");
  const img = $("#scanImg");
  const video = $("#scanVideo");
  const view = $("#scanView");
  const placeholder = $("#scanPlaceholder");
  let stream = null;

  $("#sMethod").innerHTML = METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("#sMethod").value = "v60";
  function grinderOptions(emptyLabel) {
    const owned = myList("grinders");
    const opt = (g) => `<option value="${g.id}">${esc(g.name)}</option>`;
    return `<option value="">${emptyLabel}</option>` +
      (owned.length ? `<optgroup label="مطاحني">${GRINDERS.filter((g) => owned.includes(g.id)).map(opt).join("")}</optgroup>` : "") +
      `<optgroup label="يدوية">${GRINDERS.filter((g) => g.type === "manual" && !owned.includes(g.id)).map(opt).join("")}</optgroup>` +
      `<optgroup label="أوتوماتيكية">${GRINDERS.filter((g) => g.type === "electric" && !owned.includes(g.id)).map(opt).join("")}</optgroup>`;
  }
  function renderScannerGrinders() {
    const sel = $("#sGrinder");
    const keep = sel.value || local.get("skmscoffee.grinder", "") || "";
    sel.innerHTML = grinderOptions("— اختر (اختياري) —");
    const owned = myList("grinders");
    sel.value = keep && GRINDERS.some((g) => g.id === keep) ? keep : (owned[0] || "");
  }
  renderScannerGrinders();
  $("#sGrinder").addEventListener("change", () => local.set("skmscoffee.grinder", $("#sGrinder").value));

  // زر "صوّر البن" يفتح الكاميرا عبر منتقي الصور (يشتغل بكل مكان)
  function onImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    stopLive();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => runScan(img);
      img.src = reader.result;
      img.hidden = false;
      placeholder.hidden = true;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  $("#camInput").addEventListener("change", onImage);
  $("#fileInput").addEventListener("change", onImage);

  // كاميرا مباشرة: تظهر فقط إذا المتصفح يدعمها، وتختفي إذا رُفضت (مثل داخل claude.ai)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) $("#liveBtn").hidden = false;
  function stopLive() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.hidden = true;
    $("#snapBtn").hidden = true;
  }
  $("#liveBtn").addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      await video.play();
      video.hidden = false; img.hidden = true; placeholder.hidden = true;
      $("#snapBtn").hidden = false; $("#liveBtn").hidden = true;
    } catch (_) {
      stopLive();
      $("#liveBtn").hidden = true;
      showScanMessage("الكاميرا المباشرة مو متاحة هنا. استخدم زر <b>صوّر البن</b> وبيفتح لك كاميرا الجوال.");
    }
  });
  $("#snapBtn").addEventListener("click", () => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    img.onload = () => runScan(img);
    img.src = canvas.toDataURL("image/jpeg", 0.85);
    img.hidden = false;
    stopLive();
    $("#liveBtn").hidden = false;
  });

  function showScanMessage(html) {
    const box = $("#scanResult");
    box.hidden = false;
    box.innerHTML = `<div>${html}</div>`;
  }

  function lightness(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
  }

  /* يقرأ ألوان منتصف الصورة ويستبعد الخلفية الفاتحة واللمعان، ثم يأخذ الوسيط */
  function analyze(source) {
    const size = 160;
    const sw = source.naturalWidth, sh = source.naturalHeight;
    const scale = size / Math.max(sw, sh);
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    const x0 = Math.floor(w * 0.22), y0 = Math.floor(h * 0.22);
    const data = ctx.getImageData(x0, y0, w - 2 * x0, h - 2 * y0).data;
    let n = 0, total = 0, sr = 0, sg = 0, sb = 0;
    const Ls = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      total++;
      const L = lightness(r, g, b);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max ? (max - min) / max : 0;
      if (L > 75 || (L > 55 && sat < 0.12)) continue;
      if (r < b) continue;
      n++; sr += r; sg += g; sb += b; Ls.push(L);
    }
    if (n < total * 0.12) return null;
    Ls.sort((a, b) => a - b);
    return { L: Ls[Math.floor(Ls.length / 2)], rgb: [sr / n, sg / n, sb / n].map(Math.round) };
  }
  function roastFromL(L) { return L >= 40 ? "light" : L >= 28 ? "medium" : "dark"; }

  function runScan(source) {
    view.classList.add("scanning");
    setTimeout(() => {
      view.classList.remove("scanning");
      let res = null;
      try { res = analyze(source); } catch (_) { res = null; }
      if (!res) {
        showScanMessage("ما قدرنا نميّز حبوب البن في الصورة. قرّب الكاميرا من الحبوب وخلها تعبّي الإطار، أو اختر درجة التحميص يدويًا.");
        return;
      }
      const roast = roastFromL(res.L);
      $("#sRoast").value = roast;
      $("#roastHint").textContent = "تم التقدير من الصورة. عدّله إذا تعرف التحميص من الكيس.";
      const pos = Math.min(100, Math.max(0, ((res.L - 15) / 40) * 100));
      const box = $("#scanResult");
      box.hidden = false;
      box.innerHTML = `
        <span class="swatch" style="background:rgb(${res.rgb.join(",")})"></span>
        <div class="grow">
          <div>درجة التحميص التقديرية: <b>${ROAST_NAME[roast]}</b></div>
          <div class="roast-meter" aria-hidden="true"><i style="right:${pos}%"></i></div>
        </div>`;
      calculate();
    }, 900);
  }

  function calculate() {
    const methodId = $("#sMethod").value;
    const roast = $("#sRoast").value;
    const process = $("#sProcess").value;
    const g = grinderById($("#sGrinder").value);
    const { m, lo, hi, info } = computeGrind(methodId, roast);
    const SCALE_MAX = 1400;
    const left = (lo / SCALE_MAX) * 100, width = ((hi - lo) / SCALE_MAX) * 100;
    let grinderHtml = "", grinderWarn = "", clicks = null;
    if (g) {
      const needsFine = m.id === "espresso" || m.id === "turkish";
      grinderHtml += `<li><span>مطحنتك</span><b dir="ltr">${esc(g.name)}</b></li>`;
      if (g.stepUm) {
        clicks = `${Math.round(lo / g.stepUm)} – ${Math.round(hi / g.stepUm)}`;
        grinderHtml += `<li><span>نقرات تقريبية</span><b>${clicks} نقرة</b></li>`;
      }
      if (needsFine && !g.best.includes("espresso")) {
        grinderWarn = `<div class="tip"><b>تنبيه:</b> ${esc(g.name)} مو مصممة لطحنة ${esc(m.name)} الناعمة. ممكن ما توصل للنعومة المطلوبة.</div>`;
      }
    }
    const tips = [];
    if (roast === "light") tips.push("التحميص الفاتح أكثف، فنعّمنا الطحنة شوي واستخدم ماء أحر.");
    if (roast === "dark") tips.push("التحميص الغامق يستخلص بسرعة، فخشّنّا الطحنة شوي واستخدم ماء أبرد قليلًا.");
    if (process === "natural" || process === "anaerobic") tips.push("المعالجة الطبيعية واللاهوائية غالبًا تستخلص بسهولة. إذا طلع الطعم مر أو ثقيل خشّن الطحنة نقرة أو نقرتين.");
    tips.push("إذا الطعم <b>حامض وخفيف</b> نعّم الطحنة، وإذا <b>مر وقابض</b> خشّنها.");
    if (g && g.stepUm) tips.push("عدد النقرات محسوب من نقطة الصفر (لما تتلامس الشفرات) وهو تقريبي. ابدأ منه وعدّل حسب الطعم.");

    S.lastScan = { method: m.id, roast, process, grinder: g ? g.id : "", lo, hi, grind: info.name, clicks };

    $("#grindOut").innerHTML = `
      <h3><span class="step-num">3</span> النتيجة</h3>
      <div>
        <div class="muted">الطحنة المقترحة لـ <a href="#m-${m.id}">${esc(m.name)}</a></div>
        <div class="big-grind">${esc(info.name)}</div>
        <div class="muted">${esc(info.feel)}</div>
      </div>
      <div>
        <div class="grind-bar" aria-hidden="true"><i style="right:${left}%;width:${Math.max(width, 2)}%"></i></div>
        <div class="grind-scale-labels"><span>ناعم</span><span>خشن</span></div>
      </div>
      <ul class="result-list">
        <li><span>حجم الحبيبات</span><b>${lo} – ${hi} ميكرون</b></li>
        <li><span>التحميص</span><b>${ROAST_NAME[roast]}</b></li>
        <li><span>النسبة</span><b>${esc(m.ratio)}</b></li>
        <li><span>الحرارة</span><b>${esc(m.temp)}</b></li>
        ${grinderHtml}
      </ul>
      ${grinderWarn}
      ${tips.map((t) => `<div class="tip">${t}</div>`).join("")}
      <form class="share-box" id="shareScan" autocomplete="off">
        <b>شارك النتيجة في المجتمع</b>
        <input id="scanBean" class="input" maxlength="60" placeholder="اسم البن (مثال: إثيوبي غوجي، محمصة …)">
        <input id="scanNote" class="input" maxlength="140" placeholder="ملاحظتك على الطعم (اختياري)">
        <button type="submit" class="btn btn-primary btn-block">انشر في المجتمع</button>
        <p class="form-msg" id="shareScanMsg" role="status" hidden></p>
      </form>
    `;
  }
  $("#calcBtn").addEventListener("click", calculate);
  ["#sMethod", "#sRoast", "#sProcess", "#sGrinder"].forEach((s) =>
    $(s).addEventListener("change", () => { if ($("#grindOut .big-grind")) calculate(); })
  );
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "shareScan") return;
    e.preventDefault();
    const msg = $("#shareScanMsg");
    if (!S.lastScan) return;
    const post = {
      id: uid8(), type: "scan", createdAt: Date.now(), ...S.lastScan,
      bean: $("#scanBean").value.trim(), note: $("#scanNote").value.trim()
    };
    const res = await publishPost(post);
    msg.hidden = false;
    msg.className = "form-msg" + (res.ok ? "" : " form-msg-warn");
    msg.innerHTML = res.ok ? `تم النشر ✓ <a href="#community">افتح المجتمع</a>` : res.msg;
  });

  /* ================= بطاقات المجتمع ================= */
  function authorHead(p) {
    const mem = p.member || {};
    const mine = p.uid === S.uid;
    return `
      <div class="post-head">
        <img class="avatar avatar-sm" data-avatar="${esc(p.uid)}" alt="">
        <div class="grow">
          <b>${esc(mem.nickname || "عضو")}</b>${mine ? ` <span class="chip chip-me">أنت</span>` : ""}
          <div class="muted small">${esc(fmtDate(p.createdAt))}</div>
        </div>
        <span class="chip">${p.type === "scan" ? "نتيجة سكانر" : "وصفة"}</span>
      </div>`;
  }
  function postActions(p) {
    const canDelete = p.uid === S.uid || S.isOwner;
    return canDelete ? `<div class="card-foot"><button type="button" class="btn btn-ghost btn-sm" data-del-post="${esc(p.id)}" data-post-uid="${esc(p.uid)}">${p.uid === S.uid ? "احذف منشوري" : "إزالة (إدارة)"}</button></div>` : "";
  }
  function postCard(p) {
    if (p.type === "recipe") return recipeCard(p.recipe || {}, postActions(p), authorHead(p));
    const m = methodById(p.method);
    const g = grinderById(p.grinder);
    return `
      <article class="card">
        ${authorHead(p)}
        <div class="chips chips-top"><a class="chip chip-link" href="#m-${esc(p.method)}">${esc(m ? m.name : p.method)}</a></div>
        <h3>${esc(p.bean || "نتيجة سكانر")}</h3>
        <div class="recipe-params">
          <div><small>الطحنة</small><b>${esc(p.grind)}</b></div>
          <div><small>الحبيبات</small><b>${Number(p.lo) || 0} – ${Number(p.hi) || 0}μ</b></div>
          <div><small>التحميص</small><b>${esc(ROAST_NAME[p.roast] || "—")}</b></div>
          <div><small>المعالجة</small><b>${esc(PROCESS_NAME[p.process] || "—")}</b></div>
          <div><small>المطحنة</small><b dir="ltr">${esc(g ? g.name : "—")}</b></div>
          <div><small>النقرات</small><b>${esc(p.clicks || "—")}</b></div>
        </div>
        ${p.note ? `<p>${esc(p.note)}</p>` : ""}
        ${postActions(p)}
      </article>`;
  }

  async function hydrateAvatars(root) {
    const imgs = [...root.querySelectorAll("img[data-avatar]")];
    if (!imgs.length) return;
    if (!S.user) { imgs.forEach((i) => { i.hidden = true; }); return; }
    const ids = [...new Set(imgs.map((i) => i.dataset.avatar))];
    const ps = await S.user.profiles(ids);
    imgs.forEach((i) => { const p = ps[i.dataset.avatar]; if (p) i.src = p.avatarUrl; });
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-post]");
    if (!btn) return;
    if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = "متأكد؟ اضغط مرة ثانية"; return; }
    btn.disabled = true;
    const res = await deletePost(btn.dataset.postUid, btn.dataset.delPost);
    if (!res.ok) { btn.disabled = false; btn.textContent = res.msg; }
  });

  /* ================= صفحة المجتمع ================= */
  let feedType = "all";
  makeTabs($("#feedTypeTabs"), [{ id: "all", name: "الكل" }, { id: "mine", name: "يناسب ذوقي" }, { id: "recipe", name: "الوصفات" }, { id: "scan", name: "نتائج السكانر" }], (id) => { feedType = id; renderFeed(); });
  $("#feedMethod").innerHTML = `<option value="">كل طرق التحضير</option>` + METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("#feedMethod").addEventListener("change", renderFeed);

  function renderFeed() {
    const status = $("#communityStatus");
    const feed = $("#feed");
    if (!S.ready) { status.innerHTML = ""; feed.innerHTML = `<div class="empty">جاري التحميل…</div>`; return; }
    $("#community-toolbar").hidden = S.mode !== "cloud";
    if (S.mode !== "cloud") {
      status.innerHTML = `<div class="banner">المجتمع يحتاج المنصة: افتح SKMSCOFFEE من رابطها على claude.ai وأنت مسجّل دخول عشان تشوف منشورات الأعضاء وتنشر.</div>`;
      feed.innerHTML = "";
      return;
    }
    const methodF = $("#feedMethod").value;
    const favM = myList("methods");
    const posts = communityPosts((p) =>
      (feedType === "all" || (feedType === "mine" ? favM.includes(p.method) : p.type === feedType)) &&
      (!methodF || p.method === methodF));
    const memberCount = S.members.filter((m) => m.nickname).length;
    status.innerHTML = `
      <div class="stat-row">
        <span><b>${memberCount}</b> عضو</span>
        <span><b>${communityPosts().length}</b> منشور</span>
        ${S.feedNote ? `<span class="muted">${esc(S.feedNote)}</span>` : ""}
      </div>`;
    if (!S.feedLoaded) { feed.innerHTML = `<div class="empty">جاري تحميل المجتمع…</div>`; return; }
    if (feedType === "mine" && !favM.length) { feed.innerHTML = `<div class="empty">اختر طرق التحضير اللي تحبها من <a href="#account">حسابي ← ذوقي</a> عشان نعرض لك المنشورات المناسبة.</div>`; return; }
    feed.innerHTML = posts.length ? posts.map(postCard).join("")
      : `<div class="empty">ما في منشورات هنا للحين. شارك وصفة من <a href="#account">حسابي</a> أو نتيجة من <a href="#scanner">سكانر البن</a>.</div>`;
    hydrateAvatars(feed);
  }

  /* ================= الحساب ================= */
  const GRIND_OPTIONS = GRIND_SCALE.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
  const METHOD_OPTIONS = METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  const DEFAULTS = {
    turkish: { dose: 7, ratio: 10, temp: "", grind: "xfine", time: "3:00" },
    espresso: { dose: 18, ratio: 2, temp: 93, grind: "fine", time: "0:28" },
    moka: { dose: 15, ratio: 7, temp: "", grind: "mfine", time: "4:30" },
    aeropress: { dose: 15, ratio: 15, temp: 90, grind: "mfine", time: "2:30" },
    v60: { dose: 15, ratio: 16, temp: 94, grind: "mfine", time: "3:00" },
    flat: { dose: 20, ratio: 16, temp: 93, grind: "medium", time: "3:30" },
    chemex: { dose: 30, ratio: 16, temp: 94, grind: "medium", time: "4:15" },
    siphon: { dose: 20, ratio: 15, temp: 92, grind: "mfine", time: "2:30" },
    french: { dose: 30, ratio: 16, temp: 96, grind: "coarse", time: "4:00" },
    coldbrew: { dose: 100, ratio: 8, temp: "", grind: "xcoarse", time: "16 ساعة" }
  };

  function updateNav() {
    const label = $("#navAccountLabel");
    const av = $("#navAvatar");
    label.textContent = S.profile && S.profile.nickname ? S.profile.nickname : "حسابي";
    if (S.me && S.mode === "cloud") { av.src = S.me.avatarUrl; av.hidden = false; } else av.hidden = true;
  }

  function renderAccount() {
    const box = $("#accountView");
    if (!S.ready || (S.mode === "cloud" && !S.feedLoaded)) { box.innerHTML = `<div class="empty">جاري تحميل حسابك…</div>`; return; }
    const localBanner = S.mode === "local"
      ? `<div class="banner">أنت في <b>الوضع المحلي</b>: حسابك ووصفاتك تنحفظ في هذا المتصفح فقط. الحسابات الحقيقية والمجتمع تشتغل لما تفتح المنصة من رابطها على claude.ai وأنت مسجّل دخول.</div>` : "";

    if (!S.profile || !S.profile.nickname) {
      box.innerHTML = `
        <header class="section-head">
          <h2>أنشئ حسابك</h2>
          <p>سجّل في SKMSCOFFEE عشان تحفظ وصفاتك وتبتكر وصفات جديدة وتنشرها في المجتمع.</p>
        </header>
        ${localBanner}
        <form id="profileForm" class="card form form-narrow" autocomplete="off">
          ${S.me && S.mode === "cloud" ? `<div class="post-head"><img class="avatar" src="${esc(S.me.avatarUrl)}" alt=""><div class="grow"><b>${esc(S.me.name || "حسابك على claude.ai")}</b><div class="muted small">تسجيل الدخول عن طريق حسابك على claude.ai</div></div></div>` : ""}
          ${profileFields({})}
          <button type="submit" class="btn btn-primary">أنشئ حسابي</button>
          <p class="form-msg" id="profileMsg" role="status" hidden></p>
        </form>`;
      return;
    }

    const p = S.profile;
    const myPosts = (p.posts || []).length;
    box.innerHTML = `
      ${localBanner}
      <div class="account-card card">
        ${S.me && S.mode === "cloud" ? `<img class="avatar avatar-lg" src="${esc(S.me.avatarUrl)}" alt="">` : `<span class="avatar avatar-lg avatar-letter">${esc((p.nickname || "؟").slice(0, 1))}</span>`}
        <div class="grow">
          <h2>${esc(p.nickname)}</h2>
          ${p.bio ? `<p>${esc(p.bio)}</p>` : ""}
          <div class="stat-row">
            <span><b>${S.myRecipes.length}</b> وصفة محفوظة</span>
            <span><b>${myPosts}</b> منشور في المجتمع</span>
            ${myList("grinders").length ? `<span><b>${myList("grinders").length}</b> مطحنة</span>` : ""}
            ${p.joined ? `<span class="muted">عضو من ${esc(fmtDate(p.joined))}</span>` : ""}
          </div>
          ${prefSummary()}
        </div>
      </div>
      <div class="tabs" role="tablist" id="accountTabs">
        <button type="button" class="tab" role="tab" data-id="recipes" aria-selected="${S.accountTab === "recipes"}">وصفاتي</button>
        <button type="button" class="tab" role="tab" data-id="create" aria-selected="${S.accountTab === "create"}">ابتكر وصفة</button>
        <button type="button" class="tab" role="tab" data-id="prefs" aria-selected="${S.accountTab === "prefs"}">ذوقي</button>
        <button type="button" class="tab" role="tab" data-id="profile" aria-selected="${S.accountTab === "profile"}">تعديل الحساب</button>
      </div>
      <div id="accountPane"></div>`;
    $("#accountTabs").addEventListener("click", (e) => {
      const t = e.target.closest(".tab"); if (!t) return;
      S.accountTab = t.dataset.id; renderAccount();
    });
    renderAccountPane();
  }

  function profileFields(p) {
    return `
      <div class="field">
        <label for="pNick">اسمك في المنصة</label>
        <input id="pNick" class="input" required maxlength="30" value="${esc(p.nickname || "")}" placeholder="مثال: أبو سعود">
      </div>
      <div class="field">
        <label for="pBio">نبذة عنك (اختياري)</label>
        <input id="pBio" class="input" maxlength="120" value="${esc(p.bio || "")}" placeholder="مثال: أحب الإثيوبي المغسول على V60">
      </div>`;
  }

  function prefSummary() {
    const p = prefs();
    const items = [];
    myList("methods").forEach((id) => { const m = methodById(id); if (m) items.push(`<a class="chip chip-link" href="#m-${id}">${esc(m.name)}</a>`); });
    ["serve", "roasts"].forEach((k) => {
      const g = PREF_GROUPS.find((x) => x.key === k);
      myList(k).forEach((id) => { const o = g.options.find((x) => x.id === id); if (o) items.push(`<span class="chip">${esc(o.name)}</span>`); });
    });
    ["origins", "varieties", "processes", "drinks"].forEach((k) => myList(k).forEach((t) => items.push(`<span class="chip">${esc(t)}</span>`)));
    myList("grinders").forEach((id) => { const g = grinderById(id); if (g) items.push(`<span class="chip" dir="ltr">${esc(g.name)}</span>`); });
    if (p.otherGrinder) items.push(`<span class="chip">${esc(p.otherGrinder)}</span>`);
    return items.length ? `<div class="chips">${items.join("")}</div>` : `<p class="small">ما اخترت ذوقك للحين. <button type="button" class="link-btn" data-goto-prefs>اختر الحين</button></p>`;
  }

  function prefsFormHtml() {
    const sel = prefs();
    const group = (g) => {
      const chosen = Array.isArray(sel[g.key]) ? sel[g.key] : [];
      const chip = (o) => `<label class="pick"><input type="checkbox" name="${g.key}" value="${esc(o.id)}"${chosen.includes(o.id) ? " checked" : ""}><span${g.key === "grinders" ? ' dir="ltr"' : ""}>${esc(o.name)}</span></label>`;
      const sub = [...new Set(g.options.map((o) => o.group).filter(Boolean))];
      const body = sub.length
        ? sub.map((name) => `<div class="pick-sub">${esc(name)}</div><div class="pick-list">${g.options.filter((o) => o.group === name).map(chip).join("")}</div>`).join("")
        : `<div class="pick-list">${g.options.map(chip).join("")}</div>`;
      return `
        <fieldset class="pick-group">
          <legend>${esc(g.title)} <span class="pick-count" data-count="${g.key}"></span></legend>
          ${g.hint ? `<p class="hint">${esc(g.hint)}</p>` : ""}
          ${body}
          ${g.key === "grinders" ? `<input id="prefOtherGrinder" class="input" maxlength="60" placeholder="مطحنة غير موجودة في القائمة؟ اكتب اسمها" value="${esc(sel.otherGrinder || "")}">` : ""}
        </fieldset>`;
    };
    return `
      <form id="prefsForm" class="card form" autocomplete="off">
        ${S.onboarding ? `<div class="banner banner-ok"><b>أهلًا ${esc(S.profile.nickname)}!</b> تم إنشاء حسابك. اختر ذوقك في القهوة وتقدر تختار أكثر من خيار في كل قسم، وتقدر تغيّرها بأي وقت.</div>` : ""}
        ${PREF_GROUPS.map(group).join("")}
        <div class="form-actions sticky-actions">
          <button type="submit" class="btn btn-primary">احفظ ذوقي</button>
          ${S.onboarding ? `<button type="button" class="btn btn-ghost" data-skip-prefs>تخطّي الحين</button>` : ""}
        </div>
        <p class="form-msg" id="prefsMsg" role="status" hidden></p>
      </form>`;
  }
  function updatePickCounts() {
    document.querySelectorAll("#prefsForm [data-count]").forEach((el) => {
      const n = document.querySelectorAll(`#prefsForm input[name="${el.dataset.count}"]:checked`).length;
      el.textContent = n ? `(${n})` : "";
    });
  }
  document.addEventListener("change", (e) => { if (e.target.closest("#prefsForm")) updatePickCounts(); });

  function renderAccountPane() {
    const pane = $("#accountPane");
    if (S.accountTab === "prefs") { pane.innerHTML = prefsFormHtml(); updatePickCounts(); return; }
    if (S.accountTab === "profile") {
      pane.innerHTML = `
        <form id="profileForm" class="card form form-narrow" autocomplete="off">
          ${profileFields(S.profile)}
          <button type="submit" class="btn btn-primary">احفظ التعديلات</button>
          <p class="form-msg" id="profileMsg" role="status" hidden></p>
        </form>`;
      return;
    }
    if (S.accountTab === "create") {
      pane.innerHTML = createFormHtml();
      const mId = S.presetMethod || myList("methods")[0] || "v60";
      S.presetMethod = null;
      $("#rMethod").value = mId;
      $("#rGrinder").value = myList("grinders")[0] || "";
      applyDefaults();
      return;
    }
    pane.innerHTML = S.myRecipes.length
      ? `<div class="grid grid-2">${S.myRecipes.map((r) => recipeCard(r, `
          <div class="card-foot">
            <button type="button" class="btn btn-primary btn-sm" data-share="${esc(r.id)}">${isShared(r.id) ? "منشورة في المجتمع ✓" : "انشر في المجتمع"}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(r.id)}">انسخ</button>
            <button type="button" class="btn btn-ghost btn-sm" data-del="${esc(r.id)}">احذف</button>
          </div>`)).join("")}</div>`
      : `<div class="empty">ما عندك وصفات محفوظة. <button type="button" class="link-btn" data-goto-create>ابتكر أول وصفة</button></div>`;
  }
  const isShared = (rid) => (S.profile && S.profile.posts || []).some((p) => p.type === "recipe" && p.recipeId === rid);

  function createFormHtml() {
    return `
      <form id="recipeForm" class="card form" autocomplete="off">
        <div class="field">
          <label for="rName">اسم الوصفة</label>
          <input id="rName" class="input" required maxlength="60" placeholder="مثال: V60 صباحي فاكهي">
        </div>
        <div class="field-row">
          <div class="field"><label for="rMethod">طريقة التحضير</label><select id="rMethod" class="input">${METHOD_OPTIONS}</select></div>
          <div class="field"><label for="rBean">البن المستخدم</label><input id="rBean" class="input" maxlength="60" placeholder="مثال: إثيوبي غوجي مجفف"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="rDose">كمية البن (غ)</label><input id="rDose" type="number" class="input" min="1" max="200" step="0.1" value="15" required></div>
          <div class="field"><label for="rRatio">النسبة 1:</label><input id="rRatio" type="number" class="input" min="1" max="25" step="0.1" value="16" required></div>
          <div class="field"><label>الماء / الناتج</label><output id="rWater" class="input output">240 غ</output></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="rTemp">حرارة الماء (°م)</label><input id="rTemp" type="number" class="input" min="0" max="100" value="93"></div>
          <div class="field"><label for="rTime">الوقت الكلي</label><input id="rTime" class="input" maxlength="20" placeholder="مثال: 3:00"></div>
          <div class="field"><label for="rGrind">الطحنة</label><select id="rGrind" class="input">${GRIND_OPTIONS}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="rGrinder">المطحنة</label><select id="rGrinder" class="input">${grinderOptions("—")}</select></div>
          <div class="field"><label for="rClicks">ضبط المطحنة</label><input id="rClicks" class="input" maxlength="30" placeholder="مثال: 22 نقرة"></div>
        </div>
        <div class="field">
          <label for="rSteps">الخطوات (كل خطوة في سطر)</label>
          <textarea id="rSteps" class="input" rows="5" placeholder="بلوم 45 ثانية بـ 50غ ماء&#10;صب حتى 150غ&#10;صب حتى 240غ"></textarea>
        </div>
        <div class="field">
          <label for="rNotes">ملاحظات التذوق</label>
          <input id="rNotes" class="input" maxlength="120" placeholder="مثال: حمضية لطيفة، توت، شوكولاتة">
        </div>
        <label class="check"><input type="checkbox" id="rShare"> انشرها في المجتمع بعد الحفظ</label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">احفظ الوصفة</button>
        </div>
        <p class="hint">لما تغيّر طريقة التحضير تتعبى قيم مقترحة تقدر تعدلها.</p>
        <p class="form-msg" id="rMsg" role="status" hidden></p>
      </form>`;
  }
  function applyDefaults() {
    const d = DEFAULTS[$("#rMethod").value];
    if (!d) return;
    $("#rDose").value = d.dose; $("#rRatio").value = d.ratio; $("#rTemp").value = d.temp;
    $("#rGrind").value = d.grind; $("#rTime").value = d.time;
    updateWater();
  }
  function updateWater() {
    const dose = parseFloat($("#rDose").value) || 0;
    const ratio = parseFloat($("#rRatio").value) || 0;
    const w = Math.round(dose * ratio * 10) / 10;
    $("#rWater").textContent = w ? `${w} غ` : "—";
  }
  document.addEventListener("input", (e) => { if (e.target.id === "rDose" || e.target.id === "rRatio") updateWater(); });
  document.addEventListener("change", (e) => { if (e.target.id === "rMethod") applyDefaults(); });

  function recipeText(r) {
    const m = methodById(r.method);
    return [
      `☕ ${r.title}: SKMSCOFFEE`, `الطريقة: ${m ? m.name : r.method}`, r.bean ? `البن: ${r.bean}` : "",
      `البن: ${r.dose} غ · الماء: ${r.water} غ · النسبة: ${r.ratio}`, r.temp ? `الحرارة: ${r.temp}` : "",
      `الطحنة: ${r.grind}`, r.time ? `الوقت: ${r.time}` : "",
      ...(r.steps || []).map((s, i) => `${i + 1}. ${s}`), r.notes ? `التذوق: ${r.notes}` : ""
    ].filter(Boolean).join("\n");
  }

  function showMsg(el, text, warn) {
    if (!el) return;
    el.hidden = false;
    el.className = "form-msg" + (warn ? " form-msg-warn" : "");
    el.innerHTML = text;
  }

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "profileForm") {
      e.preventDefault();
      const nickname = $("#pNick").value.trim();
      if (!nickname) return;
      const isNew = !S.profile || !S.profile.nickname;
      const res = await saveProfile({ nickname, bio: $("#pBio").value.trim() });
      if (res.ok) { S.accountTab = isNew ? "prefs" : "recipes"; S.onboarding = isNew; renderAccount(); }
      else showMsg($("#profileMsg"), res.msg, true);
    }
    if (e.target.id === "prefsForm") {
      e.preventDefault();
      const next = {};
      PREF_GROUPS.forEach((g) => { next[g.key] = [...document.querySelectorAll(`#prefsForm input[name="${g.key}"]:checked`)].map((i) => i.value); });
      next.otherGrinder = ($("#prefOtherGrinder") && $("#prefOtherGrinder").value.trim()) || "";
      const res = await saveProfile({ prefs: next });
      if (!res.ok) { showMsg($("#prefsMsg"), res.msg, true); return; }
      S.onboarding = false; S.accountTab = "recipes";
      renderMethodGrid(); renderScannerGrinders(); renderGrinders();
      renderAccount();
      const note = document.createElement("p");
      note.className = "form-msg"; note.setAttribute("role", "status"); note.textContent = "تم حفظ ذوقك ✓ رتّبنا طرقك ومطاحنك في المنصة.";
      $("#accountPane").prepend(note);
      setTimeout(() => note.remove(), 4000);
      return;
    }
    if (e.target.id === "recipeForm") {
      e.preventDefault();
      const dose = parseFloat($("#rDose").value), ratio = parseFloat($("#rRatio").value);
      const grind = GRIND_SCALE.find((g) => g.id === $("#rGrind").value);
      const temp = $("#rTemp").value;
      const bean = $("#rBean").value.trim();
      const r = {
        id: uid8(), createdAt: Date.now(),
        title: $("#rName").value.trim(), author: bean ? `البن: ${bean}` : "", bean,
        method: $("#rMethod").value, dose, water: Math.round(dose * ratio * 10) / 10, ratio: `1:${ratio}`,
        temp: temp ? `${temp}°م` : "—", grind: grind ? grind.name : "—", time: $("#rTime").value.trim() || "—",
        steps: $("#rSteps").value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20),
        notes: $("#rNotes").value.trim(),
        grinder: $("#rGrinder").value, clicks: $("#rClicks").value.trim()
      };
      if (!r.title) return;
      const share = $("#rShare").checked;
      const res = await saveRecipe(r);
      if (!res.ok) { showMsg($("#rMsg"), res.msg, true); return; }
      let msg = "تم حفظ الوصفة ✓";
      if (share) {
        const pr = await shareRecipe(r);
        msg += pr.ok ? " ونُشرت في المجتمع ✓" : `، بس ما انتشرت: ${pr.msg}`;
      }
      S.accountTab = "recipes";
      renderAccount();
      const note = document.createElement("p");
      note.className = "form-msg"; note.setAttribute("role", "status"); note.textContent = msg;
      $("#accountPane").prepend(note);
      setTimeout(() => note.remove(), 4000);
    }
  });

  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-goto-create]")) { S.accountTab = "create"; renderAccount(); return; }
    if (e.target.closest("[data-goto-prefs]")) { S.accountTab = "prefs"; renderAccount(); return; }
    if (e.target.closest("[data-skip-prefs]")) { S.onboarding = false; S.accountTab = "recipes"; renderAccount(); return; }
    const del = e.target.closest("[data-del]");
    if (del) {
      if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.textContent = "متأكد؟"; return; }
      const res = await deleteRecipe(del.dataset.del);
      if (!res.ok) del.textContent = res.msg; else renderAccount();
      return;
    }
    const share = e.target.closest("[data-share]");
    if (share) {
      const r = S.myRecipes.find((x) => x.id === share.dataset.share);
      if (!r || isShared(r.id)) return;
      share.disabled = true;
      const res = await shareRecipe(r);
      if (res.ok) renderAccount(); else { share.disabled = false; share.textContent = res.msg; }
      return;
    }
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      const r = S.myRecipes.find((x) => x.id === copy.dataset.copy);
      if (!r) return;
      try { await navigator.clipboard.writeText(recipeText(r)); copy.textContent = "تم النسخ ✓"; }
      catch (_) {
        const card = copy.closest(".card");
        let ta = card.querySelector("textarea.copy-box");
        if (!ta) { ta = document.createElement("textarea"); ta.className = "input copy-box"; ta.rows = 6; ta.readOnly = true; card.appendChild(ta); }
        ta.value = recipeText(r); ta.focus(); ta.select();
        copy.textContent = "حدد النص وانسخه";
      }
    }
  });

  /* ================= التخزين: سحابي أو محلي ================= */
  const NO_WRITE = "ما عندك صلاحية الكتابة في المنصة. اطلب من صاحب المنصة يعطيك صلاحية مساهم (Contributor).";
  const errMsg = (e) => {
    const c = e && e.code;
    if (c === "invalid_argument") return NO_WRITE;
    if (c === "quota_exceeded") return "المساحة امتلت. احذف بعض الوصفات القديمة وحاول مرة ثانية.";
    if (c === "resource_exhausted") return "طلبات كثيرة بوقت قصير. انتظر شوي وحاول مرة ثانية.";
    return "صار خطأ في الاتصال. حاول مرة ثانية بعد شوي.";
  };

  // كتابة واحدة في كل مرة على مستند العضو في المجتمع
  let memberWrite = Promise.resolve();
  function writeMemberDoc(next) {
    const run = memberWrite.then(async () => {
      await S.db.doc("community/" + S.uid).set(next);
      S.profile = next;
    });
    memberWrite = run.catch(() => {});
    return run;
  }

  async function saveProfile(fields) {
    const base = S.profile || { posts: [], joined: Date.now() };
    const next = { ...base, ...fields, joined: base.joined || Date.now(), posts: base.posts || [] };
    if (S.mode === "cloud") {
      try { await writeMemberDoc(next); } catch (e) { return { ok: false, msg: errMsg(e) }; }
    } else {
      S.profile = next;
      if (!local.set(LOCAL_PROFILE, next)) return { ok: false, msg: "المتصفح ما سمح بالحفظ (ممكن التصفح الخاص مفعّل)." };
    }
    updateNav();
    return { ok: true };
  }

  async function saveRecipe(r) {
    if (S.mode === "cloud") {
      try { await S.db.collection("data/users/" + S.uid).doc("r_" + r.id).set(r); }
      catch (e) { return { ok: false, msg: errMsg(e) }; }
      if (!S.myRecipes.some((x) => x.id === r.id)) S.myRecipes = [r, ...S.myRecipes];
      return { ok: true };
    }
    S.myRecipes = [r, ...S.myRecipes];
    if (!local.set(LOCAL_RECIPES, S.myRecipes)) return { ok: false, msg: "المتصفح ما سمح بالحفظ الدائم (ممكن التصفح الخاص مفعّل)." };
    return { ok: true };
  }

  async function deleteRecipe(id) {
    if (S.mode === "cloud") {
      try { await S.db.collection("data/users/" + S.uid).doc("r_" + id).delete(); }
      catch (e) { return { ok: false, msg: errMsg(e) }; }
    }
    S.myRecipes = S.myRecipes.filter((r) => r.id !== id);
    if (S.mode !== "cloud") local.set(LOCAL_RECIPES, S.myRecipes);
    return { ok: true };
  }

  async function publishPost(post) {
    if (S.mode !== "cloud") return { ok: false, msg: "النشر في المجتمع يحتاج المنصة على claude.ai وأنت مسجّل دخول." };
    if (!S.profile || !S.profile.nickname) return { ok: false, msg: `لازم تسجّل أول. <a href="#account">أنشئ حسابك</a>` };
    const next = { ...S.profile, posts: [post, ...(S.profile.posts || [])].slice(0, 50) };
    try { await writeMemberDoc(next); } catch (e) { return { ok: false, msg: errMsg(e) }; }
    return { ok: true };
  }
  function shareRecipe(r) {
    const { id, createdAt, ...recipe } = r;
    return publishPost({ id: uid8(), type: "recipe", createdAt: Date.now(), method: r.method, recipeId: id, recipe: { ...recipe, method: r.method } });
  }

  async function deletePost(ownerUid, postId) {
    if (S.mode !== "cloud") return { ok: false, msg: "غير متاح" };
    try {
      if (ownerUid === S.uid) {
        await writeMemberDoc({ ...S.profile, posts: (S.profile.posts || []).filter((p) => p.id !== postId) });
      } else if (S.isOwner) {
        const mem = S.members.find((m) => m.uid === ownerUid);
        if (!mem) return { ok: false, msg: "ما لقينا المنشور" };
        const { uid, ...body } = mem;
        await S.db.doc("community/" + ownerUid).set({ ...body, posts: (mem.posts || []).filter((p) => p.id !== postId) });
      } else return { ok: false, msg: "غير مسموح" };
    } catch (e) { return { ok: false, msg: errMsg(e) }; }
    return { ok: true };
  }

  let lastPrefsJson = "";
  function rerenderLive() {
    const pj = JSON.stringify(prefs());
    if (pj !== lastPrefsJson) { lastPrefsJson = pj; renderMethodGrid(); renderScannerGrinders(); renderGrinders(); }
    if (S.view === "community") renderFeed();
    if (S.view === "method") renderMethod();
    if (S.view === "account" && !document.activeElement?.closest("#accountView form")) renderAccount();
    updateNav();
  }

  async function startCloud() {
    S.mode = "cloud";
    // المجتمع: كل الأعضاء، يتحدث مباشرة
    const timer = setTimeout(() => { S.feedNote = "الاتصال بطيء، ممكن البيانات مو محدّثة."; rerenderLive(); }, 10000);
    S.db.collection("community").onSnapshot((snap) => {
      S.members = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      const mine = S.members.find((m) => m.uid === S.uid);
      if (mine) { const { uid, ...body } = mine; S.profile = body; }
      if (!snap.metadata.fromCache) { clearTimeout(timer); S.feedNote = ""; }
      S.feedLoaded = true;
      rerenderLive();
    }, () => { clearTimeout(timer); S.feedLoaded = true; S.feedNote = "ما قدرنا نحمّل المجتمع."; rerenderLive(); });

    // وصفاتي الخاصة: لا يشوفها غيري
    S.db.collection("data/users/" + S.uid).onSnapshot((snap) => {
      S.myRecipes = snap.docs.filter((d) => d.id.startsWith("r_")).map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      rerenderLive();
    }, () => {});
  }

  function startLocal() {
    S.mode = "local";
    S.profile = local.get(LOCAL_PROFILE, null);
    const rs = local.get(LOCAL_RECIPES, []);
    S.myRecipes = Array.isArray(rs) ? rs.map((r) => ({ createdAt: 0, ...r })) : [];
  }

  async function init() {
    route();
    let db = null, user = null;
    if (window.claude && typeof window.claude.use === "function") {
      try { [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); } catch (_) { db = null; user = null; }
    }
    S.user = user;
    if (user) {
      S.me = await user.me();
      S.uid = S.me.id;
      S.isOwner = !!S.me.isOwner;
    }
    if (db && S.uid) { S.db = db; await startCloud(); } else startLocal();
    S.ready = true;
    updateNav();
    rerenderLive();
    if (S.view === "account") renderAccount();
  }
  init();
})();
