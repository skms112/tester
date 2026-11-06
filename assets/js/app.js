/* SKMSCOFFEE: منطق الواجهة */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
    }
  };
  const methodById = (id) => METHODS.find((m) => m.id === id);
  const grinderById = (id) => GRINDERS.find((g) => g.id === id);
  const BEST_LABEL = { espresso: "إسبريسو", filter: "تقطير" };

  /* ---------- Tabs helper ---------- */
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

  /* ---------- Header ---------- */
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

  $("#heroStats").innerHTML = [
    [GRINDERS.length, "مطحنة"],
    [RECIPES.length, "وصفة مشهورة"],
    [BEANS.length, "نوع ومنشأ ومعالجة"],
    [FARMS.length, "مزرعة"],
    [ROASTERS.length, "محمصة كويتية"]
  ].map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join("");

  /* ---------- Specialty types ---------- */
  function renderTypes(cat) {
    const list = SPECIALTY_TYPES.filter((t) => cat === "all" || t.cat === cat);
    $("#typeGrid").innerHTML = list.map((t) => `
      <article class="card">
        <h3>${esc(t.title)}</h3>
        <div class="en">${esc(t.en)}</div>
        <p>${esc(t.desc)}</p>
      </article>`).join("");
  }
  makeTabs($("#typeTabs"), SPECIALTY_CATS, renderTypes);
  renderTypes("all");

  /* ---------- Beans ---------- */
  function renderBeans(cat) {
    const catName = Object.fromEntries(BEAN_CATS.map((c) => [c.id, c.name]));
    const list = BEANS.filter((b) => cat === "all" || b.cat === cat);
    $("#beanGrid").innerHTML = list.map((b) => `
      <article class="card">
        <h3>${esc(b.title)}</h3>
        <div class="en">${esc(b.en)}</div>
        <p>${esc(b.desc)}</p>
        <div class="chips"><span class="chip">${esc(catName[b.cat])}</span></div>
      </article>`).join("");
  }
  makeTabs($("#beanTabs"), BEAN_CATS, renderBeans);
  renderBeans("all");

  /* ---------- Grinders ---------- */
  let grinderCat = "all";
  function renderGrinders() {
    const q = $("#grinderSearch").value.trim().toLowerCase();
    const list = GRINDERS.filter((g) =>
      (grinderCat === "all" || g.type === grinderCat) &&
      (!q || (g.name + " " + g.brand).toLowerCase().includes(q))
    );
    $("#grinderGrid").innerHTML = list.length ? list.map((g) => `
      <article class="card">
        <div class="chips" style="margin:0 0 10px"><span class="chip">${g.type === "manual" ? "يدوية" : "أوتوماتيكية"}</span></div>
        <h3 dir="ltr" style="text-align:right">${esc(g.name)}</h3>
        <p>${esc(g.desc)}</p>
        <dl class="specs">
          <dt>الشفرات</dt><dd>${esc(g.burr)}</dd>
          ${g.burrMm ? `<dt>القطر</dt><dd>${g.burrMm} مم</dd>` : ""}
          ${g.stepUm ? `<dt>خطوة النقرة</dt><dd>≈ ${g.stepUm} ميكرون</dd>` : ""}
        </dl>
        <div class="chips">${g.best.map((b) => `<span class="chip">${BEST_LABEL[b]}</span>`).join("")}</div>
      </article>`).join("") : `<div class="empty">ما في نتائج.</div>`;
  }
  makeTabs($("#grinderTabs"), GRINDER_CATS, (id) => { grinderCat = id; renderGrinders(); });
  $("#grinderSearch").addEventListener("input", renderGrinders);
  renderGrinders();

  /* ---------- Recipes ---------- */
  function recipeCard(r, extra = "") {
    const m = methodById(r.method);
    return `
      <article class="card">
        <div class="chips" style="margin:0 0 10px"><span class="chip">${esc(m ? m.name : r.method)}</span></div>
        <h3>${esc(r.title)}</h3>
        ${r.author ? `<div class="recipe-author">${esc(r.author)}</div>` : ""}
        <div class="recipe-params">
          <div><small>البن</small><b>${esc(typeof r.dose === "number" ? r.dose + " غ" : r.dose)}</b></div>
          <div><small>${r.method === "espresso" ? "المُخرج" : "الماء"}</small><b>${esc(typeof r.water === "number" ? r.water + " غ" : r.water)}</b></div>
          <div><small>النسبة</small><b>${esc(r.ratio)}</b></div>
          <div><small>الحرارة</small><b>${esc(r.temp)}</b></div>
          <div><small>الطحنة</small><b>${esc(r.grind)}</b></div>
          <div><small>الوقت</small><b>${esc(r.time)}</b></div>
        </div>
        ${r.steps && r.steps.length ? `<ol class="recipe-steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
        ${r.notes ? `<p><b>التذوق:</b> ${esc(r.notes)}</p>` : ""}
        ${extra}
      </article>`;
  }
  function renderRecipes(cat) {
    $("#recipeGrid").innerHTML = RECIPES.filter((r) => cat === "all" || r.cat === cat).map((r) => recipeCard(r)).join("");
  }
  makeTabs($("#recipeTabs"), RECIPE_CATS, renderRecipes);
  renderRecipes("all");

  /* ---------- Create recipe ---------- */
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
  const form = $("#recipeForm");
  $("#rMethod").innerHTML = METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("#rMethod").value = "v60";
  $("#rGrind").innerHTML = GRIND_SCALE.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
  $("#rGrind").value = "mfine";

  function updateWater() {
    const dose = parseFloat($("#rDose").value) || 0;
    const ratio = parseFloat($("#rRatio").value) || 0;
    const w = Math.round(dose * ratio * 10) / 10;
    $("#rWater").textContent = w ? `${w} غ` : "—";
  }
  ["#rDose", "#rRatio"].forEach((s) => $(s).addEventListener("input", updateWater));
  updateWater();

  $("#rSuggest").addEventListener("click", () => {
    const d = DEFAULTS[$("#rMethod").value];
    if (!d) return;
    $("#rDose").value = d.dose;
    $("#rRatio").value = d.ratio;
    $("#rTemp").value = d.temp;
    $("#rGrind").value = d.grind;
    $("#rTime").value = d.time;
    updateWater();
  });

  const KEY = "skmscoffee.recipes";
  let mine = store.get(KEY, []);
  if (!Array.isArray(mine)) mine = [];

  function renderMine() {
    const box = $("#myRecipes");
    if (!mine.length) { box.innerHTML = `<div class="empty">ما عندك وصفات محفوظة. ابتكر أول وصفة!</div>`; return; }
    box.innerHTML = mine.map((r) => recipeCard(r, `
      <div class="card-foot">
        <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(r.id)}">انسخ الوصفة</button>
        <button type="button" class="btn btn-ghost btn-sm" data-del="${esc(r.id)}">احذف</button>
      </div>`)).join("");
  }
  function recipeText(r) {
    const m = methodById(r.method);
    return [
      `☕ ${r.title}: SKMSCOFFEE`,
      `الطريقة: ${m ? m.name : r.method}`,
      r.bean ? `البن: ${r.bean}` : "",
      `البن: ${r.dose} غ · الماء: ${r.water} غ · النسبة: ${r.ratio}`,
      r.temp ? `الحرارة: ${r.temp}` : "",
      `الطحنة: ${r.grind}`,
      r.time ? `الوقت: ${r.time}` : "",
      ...(r.steps || []).map((s, i) => `${i + 1}. ${s}`),
      r.notes ? `التذوق: ${r.notes}` : ""
    ].filter(Boolean).join("\n");
  }
  $("#myRecipes").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    const copy = e.target.closest("[data-copy]");
    if (del) {
      mine = mine.filter((r) => r.id !== del.dataset.del);
      store.set(KEY, mine);
      renderMine();
    } else if (copy) {
      const r = mine.find((x) => x.id === copy.dataset.copy);
      if (!r) return;
      try { await navigator.clipboard.writeText(recipeText(r)); copy.textContent = "تم النسخ ✓"; }
      catch (_) { copy.textContent = "ما قدرنا ننسخ"; }
      setTimeout(() => { copy.textContent = "انسخ الوصفة"; }, 1800);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dose = parseFloat($("#rDose").value);
    const ratio = parseFloat($("#rRatio").value);
    const method = $("#rMethod").value;
    const grind = GRIND_SCALE.find((g) => g.id === $("#rGrind").value);
    const temp = $("#rTemp").value;
    const r = {
      id: Date.now().toString(36),
      title: $("#rName").value.trim(),
      author: $("#rBean").value.trim() ? `البن: ${$("#rBean").value.trim()}` : "وصفتي",
      bean: $("#rBean").value.trim(),
      method,
      dose,
      water: Math.round(dose * ratio * 10) / 10,
      ratio: `1:${ratio}`,
      temp: temp ? `${temp}°م` : "—",
      grind: grind ? grind.name : "—",
      time: $("#rTime").value.trim() || "—",
      steps: $("#rSteps").value.split("\n").map((s) => s.trim()).filter(Boolean),
      notes: $("#rNotes").value.trim()
    };
    if (!r.title) return;
    mine.unshift(r);
    if (!store.set(KEY, mine)) alert("ما قدرنا نحفظ في المتصفح (ممكن التصفح الخاص مفعّل). الوصفة بتظهر لين تسكّر الصفحة.");
    renderMine();
    form.reset();
    $("#rMethod").value = method;
    updateWater();
  });
  renderMine();

  /* ---------- Farms ---------- */
  $("#farmGrid").innerHTML = FARMS.map((f) => `
    <article class="card">
      <h3 dir="ltr" style="text-align:right">${esc(f.name)}</h3>
      <div class="en">${esc(f.country)} · ${esc(f.region)}</div>
      <p>${esc(f.desc)}</p>
      <div class="chips"><span class="chip">${esc(f.known)}</span></div>
    </article>`).join("");

  /* ---------- Roasters ---------- */
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
        <div class="chips" style="margin:0 0 10px">${STATUS[r.status]}</div>
        <h3 dir="auto" style="text-align:right">${esc(r.name)}</h3>
        <dl class="specs">
          <dt>المنطقة</dt><dd>${r.area ? esc(r.area) : "غير مؤكدة"}</dd>
          ${r.address ? `<dt>العنوان</dt><dd>${esc(r.address)}</dd>` : ""}
        </dl>
        <p>${esc(r.desc)}</p>
        <p style="font-size:13px"><b>المصدر:</b> ${esc(r.source)}</p>
        <div class="card-foot">
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.q)}">📍 افتح في الخرائط</a>
        </div>
      </article>`).join("");
  }
  makeTabs($("#roasterTabs"), ROASTER_CATS, renderRoasters);
  renderRoasters("all");

  /* ---------- Scanner ---------- */
  const video = $("#scanVideo");
  const canvas = $("#scanCanvas");
  const img = $("#scanImg");
  const view = $("#scanView");
  const placeholder = $("#scanPlaceholder");
  let stream = null;

  $("#sMethod").innerHTML = METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("#sMethod").value = "v60";
  $("#sGrinder").innerHTML = `<option value="">— اختر (اختياري) —</option>` +
    `<optgroup label="يدوية">${GRINDERS.filter((g) => g.type === "manual").map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</optgroup>` +
    `<optgroup label="أوتوماتيكية">${GRINDERS.filter((g) => g.type === "electric").map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</optgroup>`;
  $("#sGrinder").value = store.get("skmscoffee.grinder", "") || "";
  $("#sGrinder").addEventListener("change", () => store.set("skmscoffee.grinder", $("#sGrinder").value));

  function stopCamera() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.hidden = true;
    $("#snapBtn").hidden = true;
    $("#camBtn").hidden = false;
  }

  $("#camBtn").addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $("#fileInput").click();
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      await video.play();
      video.hidden = false;
      img.hidden = true;
      placeholder.hidden = true;
      $("#snapBtn").hidden = false;
      $("#camBtn").hidden = true;
    } catch (_) {
      showScanMessage("ما قدرنا نفتح الكاميرا. ارفع صورة بدلها.");
      $("#fileInput").click();
    }
  });

  $("#snapBtn").addEventListener("click", () => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    img.src = canvas.toDataURL("image/jpeg", 0.85);
    img.hidden = false;
    stopCamera();
    runScan(img);
  });

  $("#fileInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    stopCamera();
    const url = URL.createObjectURL(file);
    img.onload = () => { runScan(img); };
    img.src = url;
    img.hidden = false;
    placeholder.hidden = true;
    e.target.value = "";
  });

  function showScanMessage(html) {
    const box = $("#scanResult");
    box.hidden = false;
    box.innerHTML = `<div>${html}</div>`;
  }

  // sRGB → CIE L* (lightness 0–100)
  function lightness(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
  }

  /* يقرأ ألوان منتصف الصورة (داخل الإطار) ويستبعد الخلفية الفاتحة جدًا والمحايدة. */
  function analyze(source) {
    const size = 160;
    const sw = source.naturalWidth || source.videoWidth;
    const sh = source.naturalHeight || source.videoHeight;
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
      // استبعاد الخلفيات البيضاء/الرمادية الفاتحة واللمعان
      if (L > 75 || (L > 55 && sat < 0.12)) continue;
      // الحبوب المحمصة لونها بني: الأحمر أكبر من الأزرق
      if (r < b) continue;
      n++; sr += r; sg += g; sb += b; Ls.push(L);
    }
    if (n < total * 0.12) return null;
    // الوسيط أثبت من المتوسط ضد حواف الحبوب واللمعان
    Ls.sort((a, b) => a - b);
    return { L: Ls[Math.floor(Ls.length / 2)], rgb: [sr / n, sg / n, sb / n].map(Math.round), coverage: n / total };
  }

  function roastFromL(L) {
    if (L >= 40) return "light";
    if (L >= 28) return "medium";
    return "dark";
  }
  const ROAST_NAME = { light: "فاتح", medium: "متوسط", dark: "غامق" };

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
        <div style="flex:1">
          <div>درجة التحميص التقديرية: <b>${ROAST_NAME[roast]}</b></div>
          <div class="roast-meter" aria-hidden="true"><i style="right:${pos}%"></i></div>
        </div>`;
      calculate();
    }, 900);
  }

  function grindInfo(um) {
    return GRIND_SCALE.find((g) => um <= g.upTo);
  }

  function calculate() {
    const m = methodById($("#sMethod").value);
    const roast = $("#sRoast").value;
    const process = $("#sProcess").value;
    const g = grinderById($("#sGrinder").value);
    if (!m) return;

    // التحميص الفاتح أكثف وأصعب في الاستخلاص فيحتاج طحنة أنعم، والغامق العكس
    const factor = { light: 0.9, medium: 1, dark: 1.1 }[roast];
    const mid = ((m.min + m.max) / 2) * factor;
    const half = (m.max - m.min) * 0.15;
    const lo = Math.round(Math.max(m.min * 0.85, mid - half) / 10) * 10;
    const hi = Math.round(Math.min(m.max * 1.15, mid + half) / 10) * 10;
    const target = Math.round(mid / 10) * 10;
    const info = grindInfo(target);

    const SCALE_MAX = 1400;
    const left = (lo / SCALE_MAX) * 100, width = ((hi - lo) / SCALE_MAX) * 100;

    let grinderHtml = "", grinderWarn = "";
    if (g) {
      const needsEspresso = m.id === "espresso" || m.id === "turkish";
      const ok = !needsEspresso || g.best.includes("espresso");
      grinderHtml += `<li><span>مطحنتك</span><b dir="ltr">${esc(g.name)}</b></li>`;
      if (g.stepUm) {
        const cLo = Math.round(lo / g.stepUm), cHi = Math.round(hi / g.stepUm);
        grinderHtml += `<li><span>نقرات تقريبية</span><b>${cLo} – ${cHi} نقرة</b></li>`;
      }
      if (!ok) {
        grinderWarn = `<div class="tip"><b>تنبيه:</b> ${esc(g.name)} مو مصممة لطحنة ${esc(m.name)} الناعمة. ممكن ما توصل للنعومة المطلوبة.</div>`;
      }
    }

    const tips = [];
    if (roast === "light") tips.push("التحميص الفاتح أكثف، فنعّمنا الطحنة شوي واستخدم ماء أحر.");
    if (roast === "dark") tips.push("التحميص الغامق يستخلص بسرعة، فخشّنّا الطحنة شوي واستخدم ماء أبرد قليلًا.");
    if (process === "natural" || process === "anaerobic") tips.push("المعالجة الطبيعية واللاهوائية غالبًا تستخلص بسهولة. إذا طلع الطعم مر أو ثقيل خشّن الطحنة نقرة أو نقرتين.");
    tips.push("إذا الطعم <b>حامض وخفيف</b> نعّم الطحنة، وإذا <b>مر وقابض</b> خشّنها.");
    if (g && g.stepUm) tips.push("عدد النقرات محسوب من نقطة الصفر (لما تتلامس الشفرات) وهو تقريبي. كل مطحنة تختلف، فابدأ منه وعدّل حسب الطعم.");

    $("#grindOut").innerHTML = `
      <h3><span class="step-num">3</span> النتيجة</h3>
      <div>
        <div class="muted">الطحنة المقترحة لـ ${esc(m.name)}</div>
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
    `;
  }

  $("#calcBtn").addEventListener("click", calculate);
  ["#sMethod", "#sRoast", "#sProcess", "#sGrinder"].forEach((s) =>
    $(s).addEventListener("change", () => { if ($("#grindOut .big-grind")) calculate(); })
  );
})();
