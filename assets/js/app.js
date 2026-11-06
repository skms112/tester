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
    accountTab: "posts",
    backend: "local",     // "claude" | "firebase" | "local"
    auth: null, authMode: "signup",
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

  const VIEWS = ["home", "method", "types", "beans", "grinders", "recipes", "farms", "roasters", "scanner", "community", "account", "profile", "suggest"];
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
    if (view === "profile") renderProfileView();
    if (view === "suggest") renderSuggest();
    if (!modal.hidden && S.modal && S.modal.type !== "brew") closeModal();
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
    S.members.forEach((mem) => (mem.posts || []).forEach((p) => { const x = { ...p, uid: mem.uid, member: mem }; if (!filterFn || filterFn(x)) out.push(x); }));
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function renderMethod() {
    const m = methodById(S.methodId);
    if (!m) return;
    const info = grindInfo((m.min + m.max) / 2);
    const recipes = RECIPES.map((r, i) => ({ ...r, _ref: "f:" + i })).filter((r) => r.method === m.id);
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
        ${r.idea ? `<p class="caption"><b>فكرة التحضير:</b> ${esc(r.idea)}</p>` : ""}
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
        ${r.pours && r.pours.length && r._ref ? `<div class="card-foot"><button type="button" class="btn btn-primary btn-sm" data-brew="${esc(r._ref)}">▶ ابدأ التحضير بالمؤقت</button><span class="muted small">⏱ ${r.pours.filter((x) => x.to != null).length} صبّات</span></div>` : ""}
        ${extra}
      </article>`;
  }
  function renderRecipes(cat) {
    $("#recipeGrid").innerHTML = RECIPES.map((r, i) => ({ ...r, _ref: "f:" + i })).filter((r) => cat === "all" || r.cat === cat).map((r) => recipeCard(r)).join("");
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

  /* ================= التواصل: متابعة، إعجاب، ترشيح ================= */
  const METHOD_HUE = { turkish: 18, espresso: 12, moka: 32, aeropress: 205, v60: 26, flat: 42, chemex: 185, siphon: 262, french: 348, coldbrew: 215 };
  const postKey = (uid, id) => `${uid}:${id}`;
  const memberById = (uid) => (uid === S.uid && S.profile ? { uid, ...S.profile } : S.members.find((m) => m.uid === uid));
  const followingOf = (uid) => { const m = memberById(uid); return (m && Array.isArray(m.following)) ? m.following : []; };
  const followersOf = (uid) => S.members.filter((m) => m.uid !== uid && (m.following || []).includes(uid)).map((m) => m.uid);
  const amFollowing = (uid) => followingOf(S.uid).includes(uid);
  const likeCount = (key) => S.members.filter((m) => (m.likes || []).includes(key)).length;
  const likedByMe = (key) => ((S.profile && S.profile.likes) || []).includes(key);
  function findPost(key) {
    const i = key.indexOf(":");
    const uid = key.slice(0, i), id = key.slice(i + 1);
    const m = memberById(uid);
    const post = m && (m.posts || []).find((p) => p.id === id);
    return post ? { ...post, uid, member: m } : null;
  }
  function recsToMe() {
    if (!S.uid) return [];
    const out = [];
    S.members.forEach((m) => (m.recs || []).forEach((r) => { if (r.to === S.uid && m.uid !== S.uid) out.push({ ...r, from: m.uid }); }));
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  const seenKey = () => "skmscoffee.recsSeen." + (S.uid || "");
  const unseenRecs = () => { const t = local.get(seenKey(), 0) || 0; return recsToMe().filter((r) => (r.createdAt || 0) > t).length; };

  function canSocial() {
    if (S.mode !== "cloud") return { ok: false, msg: "المتابعة والإعجاب والترشيح تحتاج حساب على المنصة." };
    if (!S.uid) return { ok: false, msg: `سجّل دخول أول. <a href="#account">حسابي</a>` };
    if (!S.profile || !S.profile.nickname) return { ok: false, msg: `أنشئ حسابك أول. <a href="#account">حسابي</a>` };
    return { ok: true };
  }
  async function updateMine(patch) {
    const c = canSocial(); if (!c.ok) return c;
    try { await writeMemberDoc({ ...S.profile, ...patch }); } catch (e) { return { ok: false, msg: errMsg(e) }; }
    rerenderLive();
    return { ok: true };
  }
  function toggleFollow(uid) {
    if (uid === S.uid) return Promise.resolve({ ok: false });
    const cur = (S.profile && S.profile.following) || [];
    const next = cur.includes(uid) ? cur.filter((x) => x !== uid) : [uid, ...cur].slice(0, 500);
    return updateMine({ following: next });
  }
  function toggleLike(key) {
    const cur = (S.profile && S.profile.likes) || [];
    const next = cur.includes(key) ? cur.filter((x) => x !== key) : [key, ...cur].slice(0, 1000);
    return updateMine({ likes: next });
  }
  function recommend(toList, key, note) {
    const cur = (S.profile && S.profile.recs) || [];
    const now = Date.now();
    const add = toList.map((to) => ({ id: uid8(), to, post: key, note, createdAt: now }));
    return updateMine({ recs: [...add, ...cur].slice(0, 100) });
  }

  /* ---------- الصورة الرمزية (حرف أول، وصورة الحساب إذا متوفرة) ---------- */
  function avatarHtml(uid, name, cls = "") {
    const letter = esc((name || "؟").trim().slice(0, 1) || "؟");
    return `<span class="avatar avatar-letter ${cls}" aria-hidden="true">${letter}<img data-avatar="${esc(uid)}" alt="" hidden></span>`;
  }
  async function hydrateAvatars(root) {
    if (!S.user || !root) return;
    const imgs = [...root.querySelectorAll("img[data-avatar]")];
    if (!imgs.length) return;
    const ps = await S.user.profiles([...new Set(imgs.map((i) => i.dataset.avatar))]);
    imgs.forEach((i) => {
      const p = ps[i.dataset.avatar];
      if (p && p.avatarUrl && !p.avatarUrl.startsWith("data:")) { i.src = p.avatarUrl; i.hidden = false; }
    });
  }

  /* ---------- صورة المنشور ---------- */
  function postArt(p, big) {
    const r = p.type === "recipe" ? (p.recipe || {}) : null;
    const hue = p.type === "scan" ? 140 : (METHOD_HUE[p.method] ?? 26);
    const m = methodById(p.method);
    const title = r ? r.title : (p.bean || "نتيجة سكانر");
    const sub = r ? (m ? m.name : "") : `سكانر · ${p.grind || ""}`;
    return `
      <div class="post-art${big ? " post-art-big" : ""}" style="--h:${hue}">
        <span class="post-art-icon">${icon(p.method, big ? 64 : 34)}</span>
        <b>${esc(title)}</b>
        <small>${esc(sub)}</small>
        ${r && r.pours && r.pours.length ? `<span class="post-art-tag">⏱ ${r.pours.filter((x) => x.to != null).length} صبّات</span>` : ""}
      </div>`;
  }

  function postHead(p) {
    const mem = p.member || {};
    const canDelete = p.uid === S.uid || (S.isOwner && S.backend === "claude");
    return `
      <div class="post-head">
        <button type="button" class="post-author" data-open-profile="${esc(p.uid)}">
          ${avatarHtml(p.uid, mem.nickname, "avatar-sm")}
          <span class="grow"><b>${esc(mem.nickname || "عضو")}</b><span class="muted small">${esc(fmtDate(p.createdAt))}</span></span>
        </button>
        <span class="chip">${p.type === "scan" ? "نتيجة سكانر" : "وصفة"}</span>
        ${canDelete ? `<button type="button" class="icon-btn" data-del-post="${esc(p.id)}" data-post-uid="${esc(p.uid)}" title="${p.uid === S.uid ? "احذف منشوري" : "إزالة (إدارة)"}" aria-label="حذف">🗑</button>` : ""}
      </div>`;
  }
  function postActionsBar(p) {
    const key = postKey(p.uid, p.id);
    const liked = likedByMe(key);
    const n = likeCount(key);
    const r = p.type === "recipe" ? p.recipe : null;
    return `
      <div class="post-actions">
        <button type="button" class="icon-btn${liked ? " liked" : ""}" data-like="${esc(key)}" aria-pressed="${liked}" aria-label="إعجاب">${liked ? "♥" : "♡"}</button>
        <button type="button" class="icon-btn" data-recommend="${esc(key)}" aria-label="رشّح لصديق">↗</button>
        ${r && r.pours && r.pours.length ? `<button type="button" class="btn btn-primary btn-sm" data-brew="p:${esc(key)}">▶ حضّرها</button>` : ""}
        <span class="grow"></span>
        <span class="muted small">${n ? `${n} إعجاب` : ""}</span>
      </div>`;
  }
  function postCaption(p) {
    const mem = p.member || {};
    const text = p.type === "recipe" ? ((p.recipe && p.recipe.idea) || "") : (p.note || "");
    return text ? `<p class="caption"><b>${esc(mem.nickname || "عضو")}</b> ${esc(text)}</p>` : "";
  }
  // بطاقة منشور في الخلاصة (أسلوب إنستغرام)
  function postCard(p) {
    const key = postKey(p.uid, p.id);
    return `
      <article class="card post">
        ${postHead(p)}
        <button type="button" class="post-art-btn" data-open-post="${esc(key)}" aria-label="افتح المنشور">${postArt(p, true)}</button>
        ${postActionsBar(p)}
        ${postCaption(p)}
        <button type="button" class="link-btn small" data-open-post="${esc(key)}">${p.type === "recipe" ? "عرض الوصفة كاملة" : "عرض النتيجة"}</button>
      </article>`;
  }
  function scanDetails(p) {
    const m = methodById(p.method);
    const g = grinderById(p.grinder);
    return `
      <div class="chips chips-top"><a class="chip chip-link" href="#m-${esc(p.method)}">${esc(m ? m.name : p.method)}</a></div>
      <div class="recipe-params">
        <div><small>الطحنة</small><b>${esc(p.grind)}</b></div>
        <div><small>الحبيبات</small><b>${Number(p.lo) || 0} – ${Number(p.hi) || 0}μ</b></div>
        <div><small>التحميص</small><b>${esc(ROAST_NAME[p.roast] || "—")}</b></div>
        <div><small>المعالجة</small><b>${esc(PROCESS_NAME[p.process] || "—")}</b></div>
        <div><small>المطحنة</small><b dir="ltr">${esc(g ? g.name : "—")}</b></div>
        <div><small>النقرات</small><b>${esc(p.clicks || "—")}</b></div>
      </div>`;
  }

  /* ---------- النافذة المنبثقة ---------- */
  const modal = document.createElement("div");
  modal.className = "modal"; modal.hidden = true;
  modal.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="تفاصيل"><button type="button" class="modal-close" aria-label="إغلاق">×</button><div id="modalBody"></div></div>`;
  document.body.appendChild(modal);
  function openModal(html, state) {
    $("#modalBody").innerHTML = html;
    S.modal = state || { type: "static" };
    modal.hidden = false;
    document.documentElement.classList.add("modal-open");
    hydrateAvatars($("#modalBody"));
    const f = modal.querySelector(".modal-close"); if (f) f.focus();
  }
  function closeModal() {
    if (S.modal && S.modal.type === "brew") stopBrew();
    modal.hidden = true; S.modal = null;
    document.documentElement.classList.remove("modal-open");
  }
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".modal-close")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  function postModalHtml(key) {
    const p = findPost(key);
    if (!p) return `<div class="empty">هذا المنشور انحذف.</div>`;
    const body = p.type === "recipe" ? recipeCard({ ...(p.recipe || {}), idea: "", _ref: "p:" + key }, "", "", true) : `<article class="card">${scanDetails(p)}</article>`;
    return `
      <div class="post post-modal">
        ${postHead(p)}
        ${postArt(p, true)}
        ${postActionsBar(p)}
        ${postCaption(p)}
        ${body}
      </div>`;
  }
  function openPost(key) { openModal(postModalHtml(key), { type: "post", key }); }

  function peopleRows(uids) {
    if (!uids.length) return `<div class="empty">ما في أحد هنا للحين.</div>`;
    return `<div class="people">${uids.map((uid) => {
      const m = memberById(uid) || {};
      return `
        <div class="person">
          <button type="button" class="post-author" data-open-profile="${esc(uid)}">
            ${avatarHtml(uid, m.nickname, "avatar-sm")}
            <span class="grow"><b>${esc(m.nickname || "عضو")}</b><span class="muted small">${esc(m.bio || "")}</span></span>
          </button>
          ${followBtn(uid, true)}
        </div>`;
    }).join("")}</div>`;
  }
  function followBtn(uid, small) {
    if (!S.uid || uid === S.uid || S.mode !== "cloud") return "";
    const on = amFollowing(uid);
    return `<button type="button" class="btn ${on ? "btn-ghost" : "btn-primary"}${small ? " btn-sm" : ""}" data-follow="${esc(uid)}">${on ? "تتابعه ✓" : "متابعة"}</button>`;
  }

  function recommendHtml(key) {
    const p = findPost(key);
    const friends = followingOf(S.uid);
    const title = p ? (p.type === "recipe" ? p.recipe.title : (p.bean || "نتيجة سكانر")) : "";
    return `
      <form id="recForm" data-key="${esc(key)}" class="form">
        <h3>رشّح «${esc(title)}» لأصحابك</h3>
        ${friends.length ? `
          <p class="hint">اختر واحد أو أكثر من الناس اللي تتابعهم.</p>
          <div class="pick-list">${friends.map((uid) => { const m = memberById(uid) || {}; return `<label class="pick"><input type="checkbox" name="to" value="${esc(uid)}"><span>${esc(m.nickname || "عضو")}</span></label>`; }).join("")}</div>
          <input id="recNote" class="input" maxlength="140" placeholder="رسالة قصيرة (اختياري): لازم تجربها!">
          <button type="submit" class="btn btn-primary">أرسل الترشيح</button>`
        : `<div class="empty">ما تتابع أحد للحين. تابع أصحابك من <a href="#community" data-goto-members>المجتمع ← الأعضاء</a> وبعدها تقدر ترشّح لهم.</div>`}
        <p class="form-msg" id="recMsg" role="status" hidden></p>
      </form>`;
  }

  /* ---------- الملف الشخصي (أسلوب إنستغرام) ---------- */
  function profileHeader(uid, m, isMe) {
    const posts = (m.posts || []).length;
    const followers = followersOf(uid).length;
    const following = (m.following || []).length;
    return `
      <div class="profile-head">
        ${avatarHtml(uid, m.nickname, "avatar-xl")}
        <div class="profile-main">
          <div class="profile-name-row">
            <h2>${esc(m.nickname || "عضو")}</h2>
            ${isBusiness(m) ? `<span class="chip chip-biz">${esc(typeOf(m).badge)}</span>` : ""}
            ${isMe ? `<button type="button" class="btn btn-ghost btn-sm" data-acc-tab="profile">تعديل الحساب</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-acc-tab="prefs">ذوقي</button>` : followBtn(uid)}
          </div>
          <div class="profile-counts">
            <div><b>${posts}</b><span>منشور</span></div>
            <button type="button" data-people="followers" data-uid="${esc(uid)}"><b>${followers}</b><span>متابِع</span></button>
            <button type="button" data-people="following" data-uid="${esc(uid)}"><b>${following}</b><span>يتابع</span></button>
          </div>
        </div>
      </div>
      ${m.bio ? `<p class="profile-bio">${esc(m.bio)}</p>` : ""}
      ${isBusiness(m) ? placeLine(m) : ""}
      ${prefSummaryFor(m.prefs || {}, isMe)}`;
  }
  function postGrid(uid, m) {
    const posts = [...(m.posts || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!posts.length) return "";
    return `<div class="post-grid">${posts.map((p) => {
      const key = postKey(uid, p.id);
      const n = likeCount(key);
      return `<button type="button" class="tile" data-open-post="${esc(key)}" aria-label="افتح المنشور">${postArt(p)}${n ? `<span class="tile-likes">♥ ${n}</span>` : ""}</button>`;
    }).join("")}</div>`;
  }
  function renderProfileView() {
    const box = $("#profileView");
    const uid = S.viewUid;
    if (uid && uid === S.uid) { location.hash = "#account"; return; }
    const m = uid && memberById(uid);
    if (!m) { box.innerHTML = `<div class="empty">ما لقينا هذا العضو. <a href="#community">ارجع للمجتمع</a></div>`; return; }
    box.innerHTML = `
      <a href="#community" class="back-link">→ المجتمع</a>
      ${profileHeader(uid, m, false)}
      <h3 class="sub-title">المنشورات</h3>
      ${postGrid(uid, m) || `<div class="empty">ما نشر شي للحين.</div>`}
      ${(m.products || []).length ? `<h3 class="sub-title">${isBusiness(m) ? "المنتجات" : "رفّه: قهوته ومطاحنه"}</h3>
        <div class="grid grid-3">${m.products.map((p) => productCard({ ...p, uid, member: m }, false)).join("")}</div>` : ""}`;
    hydrateAvatars(box);
  }

  /* ---------- مؤقت التحضير ---------- */
  const B = { r: null, timer: null, start: 0, acc: 0, running: false, idx: -1, done: false, sound: true, audio: null, wake: null };
  const mmss = (t) => { t = Math.max(0, Math.round(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  const parseTime = (s) => {
    s = String(s || "").trim().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    if (!s) return null;
    if (s.includes(":")) { const [a, b] = s.split(":"); const v = (parseInt(a, 10) || 0) * 60 + (parseInt(b, 10) || 0); return isNaN(v) ? null : v; }
    const n = parseFloat(s); return isNaN(n) ? null : Math.round(n);
  };
  function resolveBrew(ref) {
    const [kind, ...rest] = ref.split(":");
    const id = rest.join(":");
    if (kind === "f") return RECIPES[Number(id)];
    if (kind === "m") return S.myRecipes.find((r) => r.id === id);
    if (kind === "p") { const p = findPost(id); return p && p.recipe; }
    return null;
  }
  function brewEnd(r) {
    const last = r.pours[r.pours.length - 1].at;
    return Math.max(r.brewEnd || 0, last + 30);
  }
  function beep(times) {
    if (!B.sound) return;
    try {
      B.audio = B.audio || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = B.audio.createOscillator(), g = B.audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(B.audio.destination);
        const t0 = B.audio.currentTime + i * 0.25;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.start(t0); o.stop(t0 + 0.2);
      }
    } catch (_) {}
    try { navigator.vibrate && navigator.vibrate(times > 1 ? [150, 80, 150] : 150); } catch (_) {}
  }
  function brewElapsed() { return B.acc + (B.running ? (performance.now() - B.start) / 1000 : 0); }
  function openBrew(r) {
    if (!r || !r.pours || !r.pours.length) return;
    stopBrew();
    Object.assign(B, { r: { ...r, pours: [...r.pours].sort((a, b) => a.at - b.at) }, acc: 0, running: false, idx: -1, done: false });
    const m = methodById(r.method);
    const pourCount = B.r.pours.filter((p) => p.to != null).length;
    openModal(`
      <div class="brew">
        <div class="brew-top">
          <span class="method-icon">${icon(r.method, 32)}</span>
          <div class="grow"><b>${esc(r.title)}</b><div class="muted small">${esc(m ? m.name : "")} · ${esc(typeof r.dose === "number" ? r.dose + " غ بن" : r.dose)} · ${pourCount} صبّات</div></div>
        </div>
        <div class="brew-clock" id="brewClock">0:00</div>
        <div class="brew-progress"><i id="brewBar"></i></div>
        <div class="brew-now" id="brewNow">جهّز البن والماء، واضغط ابدأ.</div>
        <div class="brew-next muted" id="brewNext"></div>
        <div class="brew-buttons">
          <button type="button" class="btn btn-primary" id="brewToggle">ابدأ</button>
          <button type="button" class="btn btn-ghost" id="brewReset">إعادة</button>
          <label class="check"><input type="checkbox" id="brewSound" ${B.sound ? "checked" : ""}> صوت التنبيه</label>
        </div>
        <ol class="brew-steps" id="brewSteps">${B.r.pours.map((p, i) => `
          <li data-i="${i}"><span class="brew-at">${mmss(p.at)}</span><span class="grow">${esc(p.label || (p.to != null ? `صب حتى ${p.to} غ` : "خطوة"))}</span>${p.to != null ? `<b>${p.to} غ</b>` : ""}</li>`).join("")}
          <li data-i="end"><span class="brew-at">${mmss(brewEnd(B.r))}</span><span class="grow">النهاية: ارفع الدريبر وقدّم</span></li>
        </ol>
      </div>`, { type: "brew" });
    updateBrew();
  }
  async function wakeOn() { try { if ("wakeLock" in navigator) B.wake = await navigator.wakeLock.request("screen"); } catch (_) { B.wake = null; } }
  function wakeOff() { try { B.wake && B.wake.release(); } catch (_) {} B.wake = null; }
  function stopBrew() { clearInterval(B.timer); B.timer = null; B.running = false; wakeOff(); }
  function updateBrew() {
    if (!B.r || !$("#brewClock")) return;
    const t = brewElapsed();
    const end = brewEnd(B.r);
    const pours = B.r.pours;
    let idx = -1;
    pours.forEach((p, i) => { if (t >= p.at && (B.running || B.acc > 0)) idx = i; });
    const finished = t >= end;
    if (idx !== B.idx && idx >= 0) { B.idx = idx; beep(1); }
    if (finished && !B.done) { B.done = true; beep(3); stopBrew(); B.acc = end; }
    $("#brewClock").textContent = mmss(Math.min(t, end));
    $("#brewBar").style.width = Math.min(100, (t / end) * 100) + "%";
    const pourNums = []; let n = 0; pours.forEach((p) => { pourNums.push(p.to != null ? ++n : null); });
    const total = n;
    if (B.done) {
      $("#brewNow").innerHTML = `<b>خلصت! ☕</b> استمتع بقهوتك.`;
      $("#brewNext").textContent = "";
    } else if (idx >= 0) {
      const p = pours[idx];
      $("#brewNow").innerHTML = `${pourNums[idx] ? `<span class="chip">الصبّة ${pourNums[idx]} من ${total}</span> ` : ""}<b>${esc(p.label || "")}</b>${p.to != null ? `<div class="brew-target">صب حتى <b>${p.to} غ</b></div>` : ""}`;
      const nx = pours[idx + 1];
      $("#brewNext").textContent = nx ? `الخطوة التالية بعد ${mmss(nx.at - t)}${nx.to != null ? `: صب حتى ${nx.to} غ` : ""}` : `النهاية بعد ${mmss(end - t)}`;
    } else {
      $("#brewNow").textContent = "جهّز البن والماء، واضغط ابدأ.";
      $("#brewNext").textContent = pours[0] ? `أول خطوة: ${pours[0].label || ""}` : "";
    }
    document.querySelectorAll("#brewSteps li").forEach((li) => {
      const i = li.dataset.i === "end" ? pours.length : Number(li.dataset.i);
      li.classList.toggle("done", B.done || i < idx);
      li.classList.toggle("current", !B.done && i === idx);
    });
    $("#brewToggle").textContent = B.done ? "ابدأ من جديد" : B.running ? "إيقاف مؤقت" : (B.acc > 0 ? "كمّل" : "ابدأ");
  }
  document.addEventListener("click", (e) => {
    if (e.target.id === "brewToggle") {
      if (B.done) { Object.assign(B, { acc: 0, idx: -1, done: false }); }
      if (B.running) { B.acc = brewElapsed(); B.running = false; clearInterval(B.timer); wakeOff(); }
      else {
        if (B.sound) { try { B.audio = B.audio || new (window.AudioContext || window.webkitAudioContext)(); B.audio.resume(); } catch (_) {} }
        B.start = performance.now(); B.running = true; wakeOn();
        B.timer = setInterval(updateBrew, 200);
      }
      updateBrew();
    }
    if (e.target.id === "brewReset") { stopBrew(); Object.assign(B, { acc: 0, idx: -1, done: false }); updateBrew(); }
  });
  document.addEventListener("change", (e) => { if (e.target.id === "brewSound") B.sound = e.target.checked; });

  /* ---------- أحداث التواصل ---------- */
  function flashOn(btn, msg) { const old = btn.innerHTML; btn.innerHTML = msg; setTimeout(() => { if (btn.isConnected) btn.innerHTML = old; }, 2500); }
  document.addEventListener("click", async (e) => {
    const t = e.target;
    const brew = t.closest("[data-brew]");
    if (brew) { openBrew(resolveBrew(brew.dataset.brew)); return; }
    const op = t.closest("[data-open-post]");
    if (op) { openPost(op.dataset.openPost); return; }
    const pr = t.closest("[data-open-profile]");
    if (pr) { if (!modal.hidden) closeModal(); S.viewUid = pr.dataset.openProfile; if (location.hash === "#profile") renderProfileView(); else location.hash = pr.dataset.openProfile === S.uid ? "#account" : "#profile"; return; }
    const like = t.closest("[data-like]");
    if (like) {
      like.disabled = true;
      const res = await toggleLike(like.dataset.like);
      like.disabled = false;
      if (!res.ok && res.msg) openModal(`<div class="banner">${res.msg}</div>`);
      return;
    }
    const rec = t.closest("[data-recommend]");
    if (rec) { const c = canSocial(); openModal(c.ok ? recommendHtml(rec.dataset.recommend) : `<div class="banner">${c.msg}</div>`, { type: "rec" }); return; }
    const fol = t.closest("[data-follow]");
    if (fol) { fol.disabled = true; const res = await toggleFollow(fol.dataset.follow); fol.disabled = false; if (!res.ok && res.msg) fol.innerHTML = res.msg; return; }
    const ppl = t.closest("[data-people]");
    if (ppl) {
      const uid = ppl.dataset.uid;
      const list = ppl.dataset.people === "followers" ? followersOf(uid) : followingOf(uid);
      openModal(`<h3>${ppl.dataset.people === "followers" ? "المتابِعون" : "يتابع"}</h3>${peopleRows(list)}`, { type: "people", list: ppl.dataset.people, uid });
      return;
    }
    if (t.closest("[data-goto-members]")) { closeModal(); feedType = "members"; selectFeedTab("members"); }
    const at = t.closest("[data-acc-tab]");
    if (at) { S.accountTab = at.dataset.accTab; renderAccount(); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "recForm") return;
    e.preventDefault();
    const to = [...e.target.querySelectorAll('input[name="to"]:checked')].map((i) => i.value);
    const msg = $("#recMsg");
    if (!to.length) { showMsg(msg, "اختر شخص واحد على الأقل.", true); return; }
    const res = await recommend(to, e.target.dataset.key, $("#recNote").value.trim());
    showMsg(msg, res.ok ? `تم إرسال الترشيح لـ ${to.length} ✓` : res.msg, !res.ok);
    if (res.ok) e.target.querySelector("button[type=submit]").disabled = true;
  });

  function refreshModal() {
    if (!S.modal || modal.hidden) return;
    if (S.modal.type === "post") { $("#modalBody").innerHTML = postModalHtml(S.modal.key); hydrateAvatars($("#modalBody")); }
    if (S.modal.type === "people") {
      const list = S.modal.list === "followers" ? followersOf(S.modal.uid) : followingOf(S.modal.uid);
      $("#modalBody").innerHTML = `<h3>${S.modal.list === "followers" ? "المتابِعون" : "يتابع"}</h3>${peopleRows(list)}`;
      hydrateAvatars($("#modalBody"));
    }
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-post]");
    if (!btn) return;
    if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = "متأكد؟ اضغط مرة ثانية"; return; }
    btn.disabled = true;
    const res = await deletePost(btn.dataset.postUid, btn.dataset.delPost);
    if (!res.ok) { btn.disabled = false; btn.textContent = res.msg; }
  });

  /* ================= أنواع الحسابات والمنتجات ================= */
  const typeOf = (m) => ACCOUNT_TYPES.find((t) => t.id === ((m && m.accountType) || "person")) || ACCOUNT_TYPES[0];
  const isBusiness = (m) => typeOf(m).id !== "person";
  const kindName = (id) => (PRODUCT_KINDS.find((k) => k.id === id) || { name: "أخرى" }).name;
  function safeUrl(u) {
    try { const x = new URL(String(u || "").trim()); return x.protocol === "https:" ? x.href : ""; } catch (_) { return ""; }
  }
  function mapLink(m) {
    const pl = (m && m.place) || {};
    const direct = safeUrl(pl.mapUrl);
    if (direct) return direct;
    if (!pl.area && !pl.address) return "";
    const q = [m.nickname, pl.address, pl.area, "Kuwait"].filter(Boolean).join(" ");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }
  function placeLine(m) {
    const pl = (m && m.place) || {};
    const where = [pl.area, pl.address].filter(Boolean).join("، ");
    const link = mapLink(m);
    if (!where && !link) return "";
    return `<div class="place-line">📍 ${esc(where || "الموقع")}${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener">افتح في الخرائط</a>` : ""}</div>`;
  }
  function allProducts(filterFn) {
    const out = [];
    S.members.forEach((m) => (m.products || []).forEach((p) => { const x = { ...p, uid: m.uid, member: m }; if (!filterFn || filterFn(x)) out.push(x); }));
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  function productCard(p, showOwner = true) {
    const m = p.member || {};
    const biz = isBusiness(m);
    const g = p.grinderId && grinderById(p.grinderId);
    const link = safeUrl(p.link);
    const details = [];
    if (p.kind === "beans") {
      if (p.origin) details.push(["المنشأ", p.origin]);
      if (p.process) details.push(["المعالجة", PROCESS_NAME[p.process] || p.process]);
      if (p.roast) details.push(["التحميص", ROAST_NAME[p.roast] || p.roast]);
    }
    if (p.kind === "grinder" && g) details.push(["النوع", g.type === "manual" ? "يدوية" : "أوتوماتيكية"], ["الشفرات", g.burr]);
    const mine = p.uid === S.uid;
    return `
      <article class="card product">
        <div class="chips chips-top"><span class="chip">${esc(kindName(p.kind))}</span>${biz ? `<span class="chip chip-biz">${esc(typeOf(m).badge)}</span>` : `<span class="chip">من رفّ عضو</span>`}</div>
        <h3 dir="auto" class="ltr-title">${esc(p.name)}</h3>
        ${biz && p.price ? `<div class="price">${esc(Number(p.price).toFixed(3).replace(/\.?0+$/, ""))} د.ك</div>` : ""}
        ${details.length ? `<dl class="specs">${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
        ${showOwner ? `
          <button type="button" class="post-author owner-line" data-open-profile="${esc(p.uid)}">
            ${avatarHtml(p.uid, m.nickname, "avatar-sm")}
            <span class="grow"><b>${esc(m.nickname || "عضو")}</b><span class="muted small">${esc(typeOf(m).name)}</span></span>
          </button>` : ""}
        ${biz ? placeLine(m) : ""}
        <div class="card-foot">
          ${link ? `<a class="btn btn-ghost btn-sm" href="${esc(link)}" target="_blank" rel="noopener">زيارة الرابط ↗</a>` : ""}
          ${mine ? `<button type="button" class="btn btn-ghost btn-sm" data-del-product="${esc(p.id)}">احذف</button>` : ""}
        </div>
      </article>`;
  }

  /* ---------- نموذج إضافة منتج / عنصر لرفّي ---------- */
  function productFormHtml() {
    const biz = isBusiness(S.profile);
    const origins = BEANS.filter((b) => b.cat === "origin").map((b) => b.title);
    return `
      <form id="productForm" class="card form" autocomplete="off">
        <h3>${biz ? "أضف منتج" : "أضف قهوتك أو مطحنتك لرفّك"}</h3>
        <div class="field-row">
          <div class="field"><label for="prKind">النوع</label>
            <select id="prKind" class="input">${PRODUCT_KINDS.filter((k) => biz || k.id !== "drink").map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></div>
          <div class="field" data-for-kind="grinder" hidden><label for="prGrinder">اختر المطحنة</label>
            <select id="prGrinder" class="input"><option value="">مطحنة غير موجودة في القائمة</option>${GRINDERS.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label for="prName">الاسم</label><input id="prName" class="input" required maxlength="80" placeholder="${biz ? "مثال: إثيوبيا غوجي مجففة 250غ" : "مثال: كولومبي من محمصتي المفضلة"}"></div>
        <div class="field-row" data-for-kind="beans">
          <div class="field"><label for="prOrigin">المنشأ</label><select id="prOrigin" class="input"><option value="">—</option>${origins.map((o) => `<option>${esc(o)}</option>`).join("")}<option value="خلطة">خلطة</option></select></div>
          <div class="field"><label for="prProcess">المعالجة</label><select id="prProcess" class="input"><option value="">—</option>${["washed", "natural", "honey", "anaerobic"].map((k) => `<option value="${k}">${esc(PROCESS_NAME[k])}</option>`).join("")}</select></div>
          <div class="field"><label for="prRoast">التحميص</label><select id="prRoast" class="input"><option value="">—</option>${Object.entries(ROAST_NAME).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
        </div>
        ${biz ? `<div class="field-row">
          <div class="field"><label for="prPrice">السعر (د.ك)</label><input id="prPrice" type="number" class="input" min="0" step="0.001" placeholder="مثال: 5.500"></div>
          <div class="field"><label for="prLink">رابط المنتج (اختياري)</label><input id="prLink" class="input" dir="ltr" type="url" placeholder="https://"></div>
        </div>` : `<div class="field"><label for="prLink">رابط (اختياري)</label><input id="prLink" class="input" dir="ltr" type="url" placeholder="https://"></div>`}
        <div class="field"><label for="prDesc">وصف</label><input id="prDesc" class="input" maxlength="200" placeholder="${biz ? "نكهات، وزن، تاريخ التحميص…" : "رأيك فيها، من وين شريتها…"}"></div>
        ${biz && !mapLink(S.profile) ? `<div class="banner">أضف موقعك من <button type="button" class="link-btn" data-acc-tab="profile">تعديل الحساب</button> عشان يظهر مع منتجاتك.</div>` : ""}
        <button type="submit" class="btn btn-primary">${biz ? "أضف المنتج" : "أضف لرفّي"}</button>
        <p class="form-msg" id="prMsg" role="status" hidden></p>
      </form>`;
  }
  function syncProductKind() {
    const k = $("#prKind") && $("#prKind").value;
    document.querySelectorAll("#productForm [data-for-kind]").forEach((el) => { el.hidden = el.dataset.forKind !== k; });
  }
  document.addEventListener("change", (e) => {
    if (e.target.id === "prKind") syncProductKind();
    if (e.target.id === "prGrinder") { const g = grinderById(e.target.value); if (g) $("#prName").value = g.name; }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "productForm") return;
    e.preventDefault();
    const msg = $("#prMsg");
    const kind = $("#prKind").value;
    const linkRaw = $("#prLink").value.trim();
    if (linkRaw && !safeUrl(linkRaw)) { showMsg(msg, "الرابط لازم يبدأ بـ https://", true); return; }
    const item = {
      id: uid8(), createdAt: Date.now(), kind, name: $("#prName").value.trim(),
      origin: kind === "beans" ? $("#prOrigin").value : "", process: kind === "beans" ? $("#prProcess").value : "", roast: kind === "beans" ? $("#prRoast").value : "",
      grinderId: kind === "grinder" ? $("#prGrinder").value : "",
      price: $("#prPrice") ? (parseFloat($("#prPrice").value) || 0) : 0,
      link: safeUrl(linkRaw), desc: $("#prDesc").value.trim()
    };
    if (!item.name) return;
    const res = await saveProducts([item, ...((S.profile && S.profile.products) || [])].slice(0, 60));
    if (!res.ok) { showMsg(msg, res.msg, true); return; }
    renderAccount();
  });
  document.addEventListener("click", async (e) => {
    const d = e.target.closest("[data-del-product]");
    if (!d) return;
    if (d.dataset.confirm !== "1") { d.dataset.confirm = "1"; d.textContent = "متأكد؟"; return; }
    const res = await saveProducts(((S.profile && S.profile.products) || []).filter((p) => p.id !== d.dataset.delProduct));
    if (!res.ok) d.textContent = res.msg;
  });
  async function saveProducts(list) {
    if (S.mode === "cloud") return updateMine({ products: list });
    if (!S.profile) return { ok: false, msg: "أنشئ حسابك أول." };
    S.profile = { ...S.profile, products: list };
    if (!local.set(LOCAL_PROFILE, S.profile)) return { ok: false, msg: "المتصفح ما سمح بالحفظ." };
    return { ok: true };
  }
  function myProductsPane() {
    const mine = ((S.profile && S.profile.products) || []).map((p) => ({ ...p, uid: S.uid || "local", member: { uid: S.uid, ...S.profile } }));
    return `
      <div class="create-layout">
        ${productFormHtml()}
        <div>
          <h3 class="sub-title sub-title-tight">${isBusiness(S.profile) ? "منتجاتي" : "رفّي"} (${mine.length})</h3>
          ${mine.length ? `<div class="stack">${mine.map((p) => productCard(p, false)).join("")}</div>` : `<div class="empty">${isBusiness(S.profile) ? "ما أضفت منتجات للحين." : "أضف البن اللي تشربه والمطاحن اللي عندك."}</div>`}
        </div>
      </div>`;
  }

  /* ================= صفحة المقترحات ================= */
  let suggestTab = "foryou";
  let productKind = "all";
  makeTabs($("#suggestTabs"), [
    { id: "foryou", name: "مقترح لك" }, { id: "places", name: "أماكن شراء البن" },
    { id: "online", name: "متاجر أونلاين" }, { id: "market", name: "منتجات الأعضاء" }
  ], (id) => { suggestTab = id; renderSuggest(); });

  function renderSuggest() {
    const box = $("#suggestView");
    if (!box) return;
    const cloud = S.mode === "cloud";
    if (suggestTab === "online") {
      const group = (kind, title) => `
        <h3 class="sub-title">${title}</h3>
        <div class="grid grid-3">${ONLINE_STORES.filter((s) => s.kind === kind).map((s) => `
          <article class="card">
            <h3 dir="ltr" class="ltr-title">${esc(s.name)}</h3>
            <p>${esc(s.desc)}</p>
            <div class="card-foot"><a class="btn btn-ghost btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener">افتح المتجر ↗</a></div>
          </article>`).join("")}</div>`;
      box.innerHTML = group("specialty", "قهوة مختصة") + group("general", "متاجر عامة") +
        `<p class="note">المعلومات من مواقع المتاجر نفسها. تأكد من التوصيل والأسعار عند الطلب.</p>`;
      return;
    }
    if (suggestTab === "places") {
      const biz = S.members.filter((m) => m.nickname && isBusiness(m));
      box.innerHTML = `
        <h3 class="sub-title">محلات وكافيهات مسجّلة في المنصة</h3>
        ${!cloud ? `<div class="empty">تظهر هنا الحسابات التجارية لما تفتح المنصة من رابطها على claude.ai.</div>`
          : biz.length ? `<div class="grid grid-3">${biz.map((m) => `
            <article class="card">
              <button type="button" class="post-author" data-open-profile="${esc(m.uid)}">
                ${avatarHtml(m.uid, m.nickname)}
                <span class="grow"><b>${esc(m.nickname)}</b><span class="muted small">${esc(typeOf(m).name)} · ${(m.products || []).length} منتج</span></span>
              </button>
              ${m.bio ? `<p>${esc(m.bio)}</p>` : ""}
              ${placeLine(m)}
            </article>`).join("")}</div>`
          : `<div class="empty">ما في حسابات تجارية للحين. إذا عندك كافيه أو محمصة أو محل معدات، غيّر نوع حسابك من <a href="#account">حسابي ← تعديل الحساب</a>.</div>`}
        <h3 class="sub-title">محامص الكويت</h3>
        <div class="grid grid-3">${ROASTERS.filter((r) => r.status !== "unknown").map((r) => `
          <article class="card">
            <h3 dir="auto" class="ltr-title">${esc(r.name)}</h3>
            <div class="place-line">📍 ${esc(r.address || r.area)} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.q)}" target="_blank" rel="noopener">افتح في الخرائط</a></div>
          </article>`).join("")}</div>
        <p><a href="#roasters">كل المحامص مع المصادر</a></p>`;
      hydrateAvatars(box);
      return;
    }
    if (suggestTab === "market") {
      const kinds = [{ id: "all", name: "الكل" }, { id: "biz", name: "للبيع من المحلات" }, ...PRODUCT_KINDS];
      const list = allProducts((p) => productKind === "all" || (productKind === "biz" ? isBusiness(p.member) : p.kind === productKind));
      box.innerHTML = `
        <div class="tabs" id="productKindTabs">${kinds.map((k) => `<button type="button" class="tab" data-pkind="${k.id}" aria-selected="${productKind === k.id}">${esc(k.name)}</button>`).join("")}</div>
        ${!cloud ? `<div class="empty">منتجات الأعضاء تظهر لما تفتح المنصة من رابطها على claude.ai.</div>`
          : list.length ? `<div class="grid grid-3">${list.map((p) => productCard(p)).join("")}</div>`
          : `<div class="empty">ما في منتجات هنا للحين. أضف قهوتك أو مطحنتك أو منتجاتك من <a href="#account">حسابي</a>.</div>`}`;
      hydrateAvatars(box);
      return;
    }
    // مقترح لك
    const pr = prefs();
    const favM = myList("methods");
    const hasPrefs = Object.values(pr).some((v) => Array.isArray(v) && v.length);
    const famous = RECIPES.map((r, i) => ({ ...r, _ref: "f:" + i })).filter((r) => !favM.length || favM.includes(r.method)).slice(0, 4);
    const commRecipes = communityPosts((p) => p.type === "recipe" && p.uid !== S.uid && (!favM.length || favM.includes(p.method)))
      .sort((a, b) => likeCount(postKey(b.uid, b.id)) - likeCount(postKey(a.uid, a.id))).slice(0, 9);
    const beans = allProducts((p) => p.kind === "beans" && p.uid !== S.uid &&
      ((myList("origins").includes(p.origin)) || myList("roasts").includes(p.roast) || myList("processes").some((x) => PROCESS_NAME[p.process] === x || p.process === x)));
    const gCount = {};
    S.members.forEach((m) => ((m.prefs && m.prefs.grinders) || []).forEach((id) => { gCount[id] = (gCount[id] || 0) + 1; }));
    const popular = Object.entries(gCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    box.innerHTML = `
      ${!hasPrefs ? `<div class="banner">اختر ذوقك من <a href="#account" data-goto-prefs-link>حسابي ← ذوقي</a> عشان تصير المقترحات على مقاسك. الحين نعرض لك الأشهر.</div>` : ""}
      <h3 class="sub-title">وصفات مشهورة ${favM.length ? "لطرقك" : ""}</h3>
      <div class="grid grid-2">${famous.map((r) => recipeCard(r)).join("")}</div>
      <h3 class="sub-title">الأكثر إعجابًا من المجتمع</h3>
      ${!cloud ? `<div class="empty">تظهر لما تفتح المنصة من رابطها على claude.ai.</div>`
        : commRecipes.length ? `<div class="post-grid">${commRecipes.map((p) => { const key = postKey(p.uid, p.id); const n = likeCount(key); return `<button type="button" class="tile" data-open-post="${esc(key)}">${postArt(p)}${n ? `<span class="tile-likes">♥ ${n}</span>` : ""}</button>`; }).join("")}</div>`
        : `<div class="empty">ما في وصفات من الأعضاء ${favM.length ? "لطرقك " : ""}للحين.</div>`}
      ${cloud && hasPrefs ? `<h3 class="sub-title">بن يناسب ذوقك</h3>
        ${beans.length ? `<div class="grid grid-3">${beans.slice(0, 6).map((p) => productCard(p)).join("")}</div>` : `<div class="empty">ما لقينا بن من الأعضاء يطابق المناشئ أو التحميص اللي اخترتها للحين.</div>`}` : ""}
      ${cloud && popular.length ? `<h3 class="sub-title">المطاحن الأكثر استخدامًا بين الأعضاء</h3>
        <div class="people">${popular.map(([id, n]) => { const g = grinderById(id); return g ? `<div class="person"><span class="grow"><b dir="ltr">${esc(g.name)}</b><span class="muted small"> · ${g.type === "manual" ? "يدوية" : "أوتوماتيكية"}</span></span><span class="chip">${n} عضو</span></div>` : ""; }).join("")}</div>` : ""}`;
  }
  document.addEventListener("click", (e) => {
    const k = e.target.closest("[data-pkind]");
    if (k) { productKind = k.dataset.pkind; renderSuggest(); }
    if (e.target.closest("[data-goto-prefs-link]")) { S.accountTab = "prefs"; }
  });

  /* ================= صفحة المجتمع ================= */
  let feedType = "all";
  makeTabs($("#feedTypeTabs"), [{ id: "all", name: "الكل" }, { id: "following", name: "المتابَعين" }, { id: "mine", name: "يناسب ذوقي" }, { id: "recipe", name: "الوصفات" }, { id: "scan", name: "نتائج السكانر" }, { id: "members", name: "الأعضاء" }], (id) => { feedType = id; renderFeed(); });
  function selectFeedTab(id) {
    feedType = id;
    document.querySelectorAll("#feedTypeTabs .tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.id === id)));
    renderFeed();
  }
  $("#feedMethod").innerHTML = `<option value="">كل طرق التحضير</option>` + METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("#feedMethod").addEventListener("change", renderFeed);

  document.addEventListener("input", (e) => {
    if (e.target.id !== "memberSearch") return;
    S.memberQuery = e.target.value;
    const pos = e.target.selectionStart;
    renderFeed();
    const el = $("#memberSearch"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} }
  });
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
    const fol = followingOf(S.uid);
    $("#feedMethod").hidden = feedType === "members";
    const posts = communityPosts((p) =>
      (feedType === "all" || (feedType === "mine" ? favM.includes(p.method) : feedType === "following" ? fol.includes(p.uid) : p.type === feedType)) &&
      (!methodF || p.method === methodF));
    const memberCount = S.members.filter((m) => m.nickname).length;
    status.innerHTML = `
      <div class="stat-row">
        <span><b>${memberCount}</b> عضو</span>
        <span><b>${communityPosts().length}</b> منشور</span>
        ${S.feedNote ? `<span class="muted">${esc(S.feedNote)}</span>` : ""}
      </div>`;
    if (!S.feedLoaded) { feed.innerHTML = `<div class="empty">جاري تحميل المجتمع…</div>`; return; }
    if (feedType === "members") {
      const q = (S.memberQuery || "").trim().toLowerCase();
      const all = S.members.filter((m) => m.nickname && m.uid !== S.uid && (!q || m.nickname.toLowerCase().includes(q)))
        .sort((a, b) => followersOf(b.uid).length - followersOf(a.uid).length);
      feed.innerHTML = `
        <div class="feed-col">
          <input id="memberSearch" class="input" type="search" placeholder="ابحث عن عضو بالاسم…" value="${esc(S.memberQuery || "")}" aria-label="ابحث عن عضو">
          ${all.length ? peopleRows(all.map((m) => m.uid)) : `<div class="empty">${q ? "ما في عضو بهذا الاسم." : "ما في أعضاء غيرك للحين. شارك رابط المنصة مع أصحابك."}</div>`}
        </div>`;
      hydrateAvatars(feed);
      return;
    }
    if (feedType === "following" && !fol.length) { feed.innerHTML = `<div class="empty">ما تتابع أحد للحين. <button type="button" class="link-btn" data-goto-members>اكتشف الأعضاء</button></div>`; return; }
    if (feedType === "mine" && !favM.length) { feed.innerHTML = `<div class="empty">اختر طرق التحضير اللي تحبها من <a href="#account">حسابي ← ذوقي</a> عشان نعرض لك المنشورات المناسبة.</div>`; return; }
    feed.innerHTML = posts.length ? `<div class="feed-col">${posts.map(postCard).join("")}</div>`
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
    const n = S.mode === "cloud" ? unseenRecs() : 0;
    let badge = $("#navBadge");
    if (!badge) { badge = document.createElement("span"); badge.id = "navBadge"; badge.className = "badge"; $("#navAccount").appendChild(badge); }
    badge.textContent = n; badge.hidden = !n;
    if (S.me && S.me.avatarUrl && S.uid) { av.src = S.me.avatarUrl; av.hidden = false; } else av.hidden = true;
  }

  function renderAccount() {
    const box = $("#accountView");
    if (!S.ready) { box.innerHTML = `<div class="empty">جاري تحميل حسابك…</div>`; return; }
    if (S.backend === "firebase" && !S.uid) { box.innerHTML = authFormHtml(); return; }
    if (S.mode === "cloud" && !S.feedLoaded) { box.innerHTML = `<div class="empty">جاري تحميل حسابك…</div>`; return; }
    const localBanner = S.mode === "local"
      ? `<div class="banner">أنت في <b>الوضع المحلي</b>: حسابك ووصفاتك تنحفظ في هذا المتصفح فقط. الحسابات الحقيقية والمجتمع تشتغل على نسخة المنصة المربوطة بحسابات (claude.ai أو الموقع بعد ربطه بـ Firebase).</div>` : "";

    if (!S.profile || !S.profile.nickname) {
      box.innerHTML = `
        <header class="section-head">
          <h2>أنشئ حسابك</h2>
          <p>سجّل في SKMSCOFFEE عشان تحفظ وصفاتك وتبتكر وصفات جديدة وتنشرها في المجتمع.</p>
        </header>
        ${localBanner}
        <form id="profileForm" class="card form form-narrow" autocomplete="off">
          ${S.backend === "claude" && S.me ? `<div class="post-head"><img class="avatar" src="${esc(S.me.avatarUrl)}" alt=""><div class="grow"><b>${esc(S.me.name || "حسابك على claude.ai")}</b><div class="muted small">تسجيل الدخول عن طريق حسابك على claude.ai</div></div></div>` : ""}
          ${S.backend === "firebase" && S.me ? `<div class="post-head"><span class="avatar avatar-letter avatar-sm">@</span><div class="grow"><b dir="ltr">${esc(S.me.email || "")}</b><div class="muted small">مسجّل دخول بالإيميل</div></div></div>` : ""}
          ${profileFields({})}
          <button type="submit" class="btn btn-primary">أنشئ حسابي</button>
          <p class="form-msg" id="profileMsg" role="status" hidden></p>
        </form>`;
      return;
    }

    const p = S.profile;
    const inboxN = recsToMe().length;
    const unseen = unseenRecs();
    const TABS = [["posts", "المنشورات"], ["recipes", `وصفاتي الخاصة (${S.myRecipes.length})`], ["inbox", `الترشيحات${unseen ? ` <span class="badge">${unseen}</span>` : inboxN ? ` (${inboxN})` : ""}`], ["products", isBusiness(p) ? `منتجاتي (${(p.products || []).length})` : `رفّي (${(p.products || []).length})`], ["create", "ابتكر وصفة"], ["prefs", "ذوقي"], ["profile", "تعديل الحساب"]];
    box.innerHTML = `
      ${localBanner}
      ${S.backend === "firebase" && S.me && !S.me.emailVerified ? `<div class="banner">أرسلنا رابط تأكيد على إيميلك. أكّد إيميلك عشان تحمي حسابك. <button type="button" class="link-btn" data-resend-verify>أرسل الرابط مرة ثانية</button></div>` : ""}
      <div class="profile-card">
        ${profileHeader(S.uid || "local", p, true)}
        ${S.backend === "firebase" ? `<div class="account-side"><span class="muted small" dir="ltr">${esc(S.me && S.me.email || "")}</span><button type="button" class="btn btn-ghost btn-sm" data-signout>تسجيل الخروج</button></div>` : ""}
      </div>
      <div class="tabs profile-tabs" role="tablist" id="accountTabs">
        ${TABS.map(([id, name]) => `<button type="button" class="tab" role="tab" data-id="${id}" aria-selected="${S.accountTab === id}">${name}</button>`).join("")}
      </div>
      <div id="accountPane"></div>`;
    hydrateAvatars(box);
    $("#accountTabs").addEventListener("click", (e) => {
      const t = e.target.closest(".tab"); if (!t) return;
      S.accountTab = t.dataset.id; renderAccount();
    });
    renderAccountPane();
  }

  /* ---------- تسجيل الدخول بالإيميل (Firebase) ---------- */
  function authFormHtml() {
    const signup = S.authMode === "signup";
    const reset = S.authMode === "reset";
    return `
      <header class="section-head">
        <h2>${reset ? "استرجاع كلمة السر" : signup ? "أنشئ حسابك" : "تسجيل الدخول"}</h2>
        <p>${reset ? "اكتب إيميلك ونرسل لك رابط تغيير كلمة السر." : signup ? "سجّل بإيميلك عشان تحفظ وصفاتك وتختار ذوقك وتنشر في المجتمع." : "ادخل بإيميلك وكلمة السر."}</p>
      </header>
      <form id="authForm" class="card form form-narrow" autocomplete="on" novalidate>
        <div class="field">
          <label for="aEmail">الإيميل</label>
          <input id="aEmail" class="input" type="email" dir="ltr" autocomplete="email" required placeholder="name@example.com">
        </div>
        ${reset ? "" : `
        <div class="field">
          <label for="aPass">كلمة السر</label>
          <input id="aPass" class="input" type="password" dir="ltr" autocomplete="${signup ? "new-password" : "current-password"}" required minlength="6">
          ${signup ? `<small class="hint">6 حروف أو أرقام على الأقل.</small>` : ""}
        </div>`}
        ${signup ? `
        <div class="field">
          <label for="aPass2">أعد كتابة كلمة السر</label>
          <input id="aPass2" class="input" type="password" dir="ltr" autocomplete="new-password" required minlength="6">
        </div>` : ""}
        <button type="submit" class="btn btn-primary">${reset ? "أرسل الرابط" : signup ? "أنشئ حسابي" : "دخول"}</button>
        <p class="form-msg" id="authMsg" role="status" hidden></p>
        <div class="auth-switch">
          ${signup ? `عندك حساب؟ <button type="button" class="link-btn" data-auth-mode="login">سجّل دخول</button>`
            : reset ? `<button type="button" class="link-btn" data-auth-mode="login">رجوع لتسجيل الدخول</button>`
            : `ما عندك حساب؟ <button type="button" class="link-btn" data-auth-mode="signup">أنشئ حساب جديد</button>
               <br><button type="button" class="link-btn" data-auth-mode="reset">نسيت كلمة السر؟</button>`}
        </div>
      </form>`;
  }
  const AUTH_ERRORS = {
    "auth/invalid-email": "الإيميل مكتوب بشكل غلط.",
    "auth/missing-email": "اكتب إيميلك.",
    "auth/email-already-in-use": "هذا الإيميل مسجّل من قبل. جرّب تسجيل الدخول.",
    "auth/weak-password": "كلمة السر ضعيفة. استخدم 6 حروف أو أرقام على الأقل.",
    "auth/invalid-credential": "الإيميل أو كلمة السر غلط.",
    "auth/invalid-login-credentials": "الإيميل أو كلمة السر غلط.",
    "auth/wrong-password": "الإيميل أو كلمة السر غلط.",
    "auth/user-not-found": "الإيميل أو كلمة السر غلط.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر شوي وحاول مرة ثانية.",
    "auth/network-request-failed": "ما في اتصال بالإنترنت. تأكد من الاتصال وحاول مرة ثانية.",
    "auth/user-disabled": "هذا الحساب موقوف."
  };
  const authErr = (e) => AUTH_ERRORS[e && e.code] || "ما قدرنا نكمل. حاول مرة ثانية.";

  document.addEventListener("click", async (e) => {
    const m = e.target.closest("[data-auth-mode]");
    if (m) { S.authMode = m.dataset.authMode; renderAccount(); return; }
    if (e.target.closest("[data-signout]")) { try { await S.auth.signOut(); } catch (_) {} return; }
    const rv = e.target.closest("[data-resend-verify]");
    if (rv) {
      try { await S.auth.currentUser.sendEmailVerification(); rv.textContent = "انرسل ✓"; }
      catch (err) { rv.textContent = authErr(err); }
    }
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "authForm") return;
    e.preventDefault();
    const msg = $("#authMsg");
    const email = $("#aEmail").value.trim();
    const btn = e.target.querySelector("button[type=submit]");
    try {
      btn.disabled = true;
      if (S.authMode === "reset") {
        await S.auth.sendPasswordResetEmail(email);
        showMsg(msg, "إذا الإيميل مسجّل عندنا، بيوصلك رابط تغيير كلمة السر خلال دقائق.");
        return;
      }
      const pass = $("#aPass").value;
      if (S.authMode === "signup") {
        if (pass !== $("#aPass2").value) { showMsg(msg, "كلمتين السر مو متطابقتين.", true); return; }
        const cred = await S.auth.createUserWithEmailAndPassword(email, pass);
        try { await cred.user.sendEmailVerification(); } catch (_) {}
      } else {
        await S.auth.signInWithEmailAndPassword(email, pass);
      }
    } catch (err) {
      showMsg(msg, authErr(err), true);
    } finally {
      btn.disabled = false;
    }
  });

  function profileFields(p) {
    return `
      <div class="field">
        <label for="pNick">اسمك في المنصة</label>
        <input id="pNick" class="input" required maxlength="30" value="${esc(p.nickname || "")}" placeholder="مثال: أبو سعود">
      </div>
      <div class="field">
        <label for="pType">نوع الحساب</label>
        <select id="pType" class="input">${ACCOUNT_TYPES.map((t) => `<option value="${t.id}"${(p.accountType || "person") === t.id ? " selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
        <small class="hint">الكافيهات والمحامص ومحلات المعدات تقدر تضيف منتجاتها مع الأسعار وتربطها بموقعها.</small>
      </div>
      <fieldset class="pours" id="placeFields"${(p.accountType || "person") === "person" ? " hidden" : ""}>
        <legend>الموقع</legend>
        <div class="field-row">
          <div class="field"><label for="pArea">المنطقة</label><input id="pArea" class="input" maxlength="40" value="${esc((p.place && p.place.area) || "")}" placeholder="مثال: الشويخ الصناعية"></div>
          <div class="field"><label for="pAddress">العنوان</label><input id="pAddress" class="input" maxlength="80" value="${esc((p.place && p.place.address) || "")}" placeholder="قطعة، شارع، مبنى"></div>
        </div>
        <div class="field"><label for="pMap">رابط الموقع في خرائط Google (اختياري)</label><input id="pMap" class="input" dir="ltr" type="url" maxlength="300" value="${esc((p.place && p.place.mapUrl) || "")}" placeholder="https://maps.app.goo.gl/…"></div>
        <small class="hint">إذا ما حطيت رابط، نسوي بحث في الخرائط باسم حسابك والمنطقة.</small>
      </fieldset>
      <div class="field">
        <label for="pBio">نبذة عنك (اختياري)</label>
        <input id="pBio" class="input" maxlength="120" value="${esc(p.bio || "")}" placeholder="مثال: أحب الإثيوبي المغسول على V60">
      </div>`;
  }

  function prefSummaryFor(p, isMe) {
    const list = (k) => (Array.isArray(p[k]) ? p[k] : []);
    const items = [];
    list("methods").forEach((id) => { const m = methodById(id); if (m) items.push(`<a class="chip chip-link" href="#m-${id}">${esc(m.name)}</a>`); });
    ["serve", "roasts"].forEach((k) => {
      const g = PREF_GROUPS.find((x) => x.key === k);
      list(k).forEach((id) => { const o = g.options.find((x) => x.id === id); if (o) items.push(`<span class="chip">${esc(o.name)}</span>`); });
    });
    ["origins", "varieties", "processes", "drinks"].forEach((k) => list(k).forEach((t) => items.push(`<span class="chip">${esc(t)}</span>`)));
    list("grinders").forEach((id) => { const g = grinderById(id); if (g) items.push(`<span class="chip" dir="ltr">${esc(g.name)}</span>`); });
    if (p.otherGrinder) items.push(`<span class="chip">${esc(p.otherGrinder)}</span>`);
    return items.length ? `<div class="chips profile-prefs">${items.join("")}</div>` : (isMe ? `<p class="small">ما اخترت ذوقك للحين. <button type="button" class="link-btn" data-goto-prefs>اختر الحين</button></p>` : "");
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
  document.addEventListener("change", (e) => {
    if (e.target.closest("#prefsForm")) updatePickCounts();
    if (e.target.id === "pType") $("#placeFields").hidden = e.target.value === "person";
  });

  function renderAccountPane() {
    const pane = $("#accountPane");
    if (S.accountTab === "prefs") { pane.innerHTML = prefsFormHtml(); updatePickCounts(); return; }
    if (S.accountTab === "products") { pane.innerHTML = myProductsPane(); syncProductKind(); hydrateAvatars(pane); return; }
    if (S.accountTab === "posts") {
      if (S.mode !== "cloud") {
        pane.innerHTML = S.myRecipes.length
          ? `<p class="hint">في الوضع المحلي تظهر وصفاتك الخاصة هنا. النشر للمجتمع يحتاج حساب على المنصة.</p><div class="post-grid">${S.myRecipes.map((r) => `<button type="button" class="tile" data-brew-or-open="${esc(r.id)}">${postArt({ type: "recipe", method: r.method, recipe: r })}</button>`).join("")}</div>`
          : `<div class="empty">ما عندك وصفات للحين. <button type="button" class="link-btn" data-goto-create>ابتكر أول وصفة</button></div>`;
        return;
      }
      const grid = postGrid(S.uid, S.profile);
      pane.innerHTML = grid || `<div class="empty">ما نشرت شي للحين. <button type="button" class="link-btn" data-goto-create>ابتكر وصفة وانشرها</button> أو شارك نتيجة من <a href="#scanner">سكانر البن</a>.</div>`;
      return;
    }
    if (S.accountTab === "inbox") {
      const recs = recsToMe();
      local.set(seenKey(), Date.now());
      pane.innerHTML = recs.length ? `<div class="people">${recs.map((r) => {
        const from = memberById(r.from) || {};
        const post = findPost(r.post);
        const title = post ? (post.type === "recipe" ? post.recipe.title : (post.bean || "نتيجة سكانر")) : "منشور محذوف";
        return `
          <div class="person rec">
            <button type="button" class="post-author" data-open-profile="${esc(r.from)}">${avatarHtml(r.from, from.nickname, "avatar-sm")}</button>
            <div class="grow">
              <div><b>${esc(from.nickname || "عضو")}</b> رشّح لك <b>${esc(title)}</b></div>
              ${r.note ? `<div class="caption">«${esc(r.note)}»</div>` : ""}
              <div class="muted small">${esc(fmtDate(r.createdAt))}</div>
            </div>
            ${post ? `<button type="button" class="btn btn-primary btn-sm" data-open-post="${esc(r.post)}">افتح</button>` : ""}
          </div>`;
      }).join("")}</div>` : `<div class="empty">ما وصلك ترشيح للحين. لما أحد من أصحابك يرشّح لك وصفة بتظهر هنا.</div>`;
      hydrateAvatars(pane);
      updateNav();
      return;
    }
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
      ? `<div class="grid grid-2">${S.myRecipes.map((r) => recipeCard({ ...r, _ref: "m:" + r.id }, `
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
          <label for="rIdea">فكرة التحضير</label>
          <textarea id="rIdea" class="input" rows="3" maxlength="300" placeholder="شنو الفكرة ورا هالوصفة؟ مثال: صبّات قصيرة عشان أطلّع حلاوة الإثيوبي بدون مرارة"></textarea>
          <small class="hint">تظهر كوصف للمنشور لما تنشر الوصفة.</small>
        </div>
        <fieldset class="pours">
          <legend>الصبّات والمؤقت</legend>
          <div class="field-row">
            <div class="field"><label for="rPourCount">عدد الصبّات</label><input id="rPourCount" type="number" class="input" min="0" max="10" value="4"></div>
            <div class="field"><label for="rGap">بين كل صبّة (ثانية)</label><input id="rGap" type="number" class="input" min="5" max="300" value="45"></div>
            <div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost" id="rAutoPours">وزّع تلقائيًا</button></div>
          </div>
          <p class="hint">أول صبّة بلوم بضعف وزن البن، والباقي يتوزع بالتساوي. تقدر تعدّل الوقت والكمية لكل صبّة.</p>
          <div id="pourRows" class="pour-rows"></div>
        </fieldset>
        <div class="field">
          <label for="rSteps">ملاحظات إضافية للخطوات (كل خطوة في سطر)</label>
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
  const POUR_DEFAULTS = { v60: [4, 45], flat: [5, 30], chemex: [3, 60], aeropress: [1, 0], french: [1, 0], espresso: [1, 0], siphon: [1, 0], moka: [0, 0], turkish: [0, 0], coldbrew: [0, 0] };
  function applyDefaults() {
    const d = DEFAULTS[$("#rMethod").value];
    if (!d) return;
    $("#rDose").value = d.dose; $("#rRatio").value = d.ratio; $("#rTemp").value = d.temp;
    $("#rGrind").value = d.grind; $("#rTime").value = d.time;
    const pd = POUR_DEFAULTS[$("#rMethod").value] || [0, 45];
    $("#rPourCount").value = pd[0]; if (pd[1]) $("#rGap").value = pd[1];
    updateWater();
    autoPours();
  }
  function autoPours() {
    const n = Math.max(0, Math.min(10, parseInt($("#rPourCount").value, 10) || 0));
    const dose = parseFloat($("#rDose").value) || 0;
    const total = Math.round(dose * (parseFloat($("#rRatio").value) || 0));
    const gap = Math.max(5, parseInt($("#rGap").value, 10) || 45);
    const rows = [];
    if (n === 1) rows.push({ at: 0, to: total });
    else if (n > 1) {
      const bloom = Math.min(Math.round(dose * 2), total);
      rows.push({ at: 0, to: bloom });
      const rest = total - bloom;
      for (let i = 1; i < n; i++) rows.push({ at: i * gap, to: Math.round(bloom + (rest * i) / (n - 1)) });
    }
    renderPourRows(rows);
  }
  function renderPourRows(rows) {
    $("#pourRows").innerHTML = rows.length ? rows.map((r, i) => `
      <div class="pour-row">
        <span class="pour-num">${i + 1}</span>
        <label>الوقت <input class="input" data-pour-at value="${mmss(r.at)}" inputmode="numeric" aria-label="وقت الصبّة ${i + 1}"></label>
        <label>حتى (غ) <input class="input" data-pour-to type="number" min="0" value="${r.to}" aria-label="إجمالي الماء بعد الصبّة ${i + 1}"></label>
        <label class="pour-label">وصف <input class="input" data-pour-label maxlength="60" value="${esc(r.label || (i === 0 && rows.length > 1 ? "بلوم" : ""))}" aria-label="وصف الصبّة ${i + 1}"></label>
      </div>`).join("") : `<p class="hint">بدون صبّات، ما راح يظهر مؤقت لهذه الوصفة.</p>`;
  }
  function readPours() {
    return [...document.querySelectorAll("#pourRows .pour-row")].map((row) => ({
      at: parseTime(row.querySelector("[data-pour-at]").value) ?? 0,
      to: (() => { const v = parseFloat(row.querySelector("[data-pour-to]").value); return isNaN(v) ? null : v; })(),
      label: row.querySelector("[data-pour-label]").value.trim()
    })).sort((a, b) => a.at - b.at);
  }
  document.addEventListener("click", (e) => { if (e.target.id === "rAutoPours") autoPours(); });
  document.addEventListener("change", (e) => { if (e.target.id === "rPourCount" || e.target.id === "rGap") autoPours(); });
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
      const accountType = $("#pType").value;
      const mapRaw = $("#pMap").value.trim();
      if (mapRaw && !safeUrl(mapRaw)) { showMsg($("#profileMsg"), "رابط الخرائط لازم يبدأ بـ https://", true); return; }
      const place = accountType === "person" ? null : { area: $("#pArea").value.trim(), address: $("#pAddress").value.trim(), mapUrl: safeUrl(mapRaw) };
      const res = await saveProfile({ nickname, bio: $("#pBio").value.trim(), accountType, place });
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
      S.onboarding = false; S.accountTab = "posts";
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
        grinder: $("#rGrinder").value, clicks: $("#rClicks").value.trim(),
        idea: $("#rIdea").value.trim(),
        pours: readPours()
      };
      r.brewEnd = parseTime($("#rTime").value) || 0;
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
    const lt = e.target.closest("[data-brew-or-open]");
    if (lt) { const r = S.myRecipes.find((x) => x.id === lt.dataset.brewOrOpen); if (r) openModal(recipeCard({ ...r, _ref: "m:" + r.id }), { type: "static" }); return; }
    if (e.target.closest("[data-goto-prefs]")) { S.accountTab = "prefs"; renderAccount(); return; }
    if (e.target.closest("[data-skip-prefs]")) { S.onboarding = false; S.accountTab = "posts"; renderAccount(); return; }
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
    if (c === "invalid_argument" || c === "permission-denied") return NO_WRITE;
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
    if (S.view === "profile") renderProfileView();
    if (S.view === "suggest") renderSuggest();
    if (!document.activeElement?.closest("#modalBody form")) refreshModal();
    updateNav();
  }

  let unsubMine = null;
  function subscribeCommunity() {
    S.mode = "cloud";
    const timer = setTimeout(() => { S.feedNote = "الاتصال بطيء، ممكن البيانات مو محدّثة."; rerenderLive(); }, 10000);
    // المجتمع: كل الأعضاء، يتحدث مباشرة
    S.db.collection("community").onSnapshot((snap) => {
      S.members = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      syncOwnProfile();
      if (!snap.metadata.fromCache) { clearTimeout(timer); S.feedNote = ""; }
      S.feedLoaded = true;
      rerenderLive();
    }, () => { clearTimeout(timer); S.feedLoaded = true; S.feedNote = "ما قدرنا نحمّل المجتمع."; rerenderLive(); });
  }
  function syncOwnProfile() {
    const mine = S.uid && S.members.find((m) => m.uid === S.uid);
    if (mine) { const { uid, ...body } = mine; S.profile = body; }
  }
  function subscribeMine() {
    if (unsubMine) unsubMine();
    // وصفاتي الخاصة: لا يشوفها غيري
    unsubMine = S.db.collection("data/users/" + S.uid).onSnapshot((snap) => {
      S.myRecipes = snap.docs.filter((d) => d.id.startsWith("r_")).map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      rerenderLive();
    }, () => {});
  }

  /* ---------- Firebase: يشتغل فقط إذا انضافت الإعدادات في firebase-config.js ---------- */
  const FIREBASE_VERSION = "10.12.2";
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.onload = resolve; el.onerror = () => reject(new Error("load " + src));
      document.head.appendChild(el);
    });
  }
  async function startFirebase(config) {
    if (!window.firebase) {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
      await loadScript(base + "firebase-app-compat.js");
      await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
    }
    const app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(config);
    S.backend = "firebase";
    S.auth = app.auth();
    S.db = app.firestore();
    subscribeCommunity();
    S.auth.onAuthStateChanged((u) => {
      if (unsubMine) { unsubMine(); unsubMine = null; }
      if (u) {
        S.uid = u.uid;
        S.me = { id: u.uid, email: u.email, emailVerified: u.emailVerified, avatarUrl: null };
        S.profile = null; S.myRecipes = [];
        syncOwnProfile();
        subscribeMine();
      } else {
        S.uid = null; S.me = null; S.profile = null; S.myRecipes = []; S.accountTab = "recipes";
      }
      S.ready = true;
      lastPrefsJson = "-";
      rerenderLive();
      if (S.view === "account") renderAccount();
    });
  }

  function startLocal() {
    S.mode = "local"; S.backend = "local";
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
    if (db && S.uid) {
      S.backend = "claude"; S.db = db;
      subscribeCommunity(); subscribeMine();
    } else if (!user && window.SKMS_FIREBASE_CONFIG && window.SKMS_FIREBASE_CONFIG.apiKey) {
      try { await startFirebase(window.SKMS_FIREBASE_CONFIG); return; }
      catch (_) { startLocal(); S.firebaseFailed = true; }
    } else startLocal();
    S.ready = true;
    updateNav();
    rerenderLive();
    if (S.view === "account") renderAccount();
  }
  init();
})();
