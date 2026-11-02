/* Simo landing: hədiyyələr, paketlər, kalkulyator, menyu, animasiyalar */
(function () {
  const t = (k, v) => window.SimoI18n.t(k, v);
  const lang = () => window.SimoI18n.lang;
  const $ = (s) => document.querySelector(s);

  // Mənbə: backend/prisma/seed.ts (eyni ID və qiymətlər)
  const GIFTS = [
    ['rose', 'Qızılgül', 'Роза', 'Rose', 1, 'popular'],
    ['heart', 'Ürək', 'Сердце', 'Heart', 5, 'popular'],
    ['kiss', 'Öpüş', 'Поцелуй', 'Kiss', 10, 'popular'],
    ['tea', 'Armudu çay', 'Чай в армуду', 'Armudu tea', 15, 'azerbaijan'],
    ['pomegranate', 'Nar', 'Гранат', 'Pomegranate', 20, 'azerbaijan'],
    ['chocolate', 'Şokolad', 'Шоколад', 'Chocolate', 30, 'popular'],
    ['teddy', 'Ayıcıq', 'Мишка', 'Teddy bear', 50, 'popular'],
    ['bouquet', 'Gül dəstəsi', 'Букет', 'Bouquet', 99, 'popular'],
    ['perfume', 'Ətir', 'Духи', 'Perfume', 199, 'luxury'],
    ['champagne', 'Şampan', 'Шампанское', 'Champagne', 299, 'luxury'],
    ['ring', 'Nişan üzüyü', 'Кольцо', 'Ring', 520, 'luxury'],
    ['crown', 'Tac', 'Корона', 'Crown', 999, 'luxury'],
    ['maiden_tower', 'Qız Qalası', 'Девичья башня', 'Maiden Tower', 1999, 'azerbaijan'],
    ['flame_towers', 'Alov Qüllələri', 'Пламенные башни', 'Flame Towers', 2999, 'azerbaijan'],
    ['sports_car', 'İdman avtomobili', 'Спорткар', 'Sports car', 4999, 'luxury'],
    ['yacht', 'Yaxta', 'Яхта', 'Yacht', 9999, 'luxury'],
    ['palace', 'Saray', 'Дворец', 'Palace', 19999, 'luxury'],
    ['love_planet', 'Sevgi planeti', 'Планета любви', 'Love planet', 29999, 'luxury'],
  ];
  let PACKAGES = [
    { id: 'coins_100', coins: 100, bonusCoins: 0, priceQepik: 199, popular: false },
    { id: 'coins_300', coins: 300, bonusCoins: 10, priceQepik: 499, popular: false },
    { id: 'coins_600', coins: 600, bonusCoins: 30, priceQepik: 999, popular: true },
    { id: 'coins_1300', coins: 1300, bonusCoins: 100, priceQepik: 1999, popular: false },
    { id: 'coins_3500', coins: 3500, bonusCoins: 350, priceQepik: 4999, popular: false },
    { id: 'coins_7500', coins: 7500, bonusCoins: 1000, priceQepik: 9999, popular: false },
    { id: 'coins_16000', coins: 16000, bonusCoins: 2400, priceQepik: 19999, popular: false },
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const azn = (q) => `${(q / 100).toFixed(2)} ₼`;
  const giftName = (g) => (lang() === 'ru' ? g[2] : lang() === 'en' ? g[3] : g[1]);

  function renderGifts() {
    const el = $('#giftGrid');
    if (!el) return;
    el.innerHTML = GIFTS.map((g) => `
      <div class="box gift reveal in ${g[5] === 'azerbaijan' ? 'az' : g[4] >= 199 ? 'lux' : ''}">
        <img src="assets/gifts/${g[0]}.svg" alt="" loading="lazy">
        <b>${esc(giftName(g))}</b>
        <span class="pr"><img src="assets/coin.svg" alt="">${fmt(g[4])}</span>
      </div>`).join('');
  }

  function renderPackages() {
    const el = $('#packages');
    if (!el) return;
    // Landing-də 4 əsas paket göstərilir
    const list = PACKAGES.filter((p) => ['coins_300', 'coins_600', 'coins_1300', 'coins_3500'].includes(p.id));
    el.innerHTML = list.map((p) => `
      <div class="box pkg reveal in ${p.popular ? 'pop' : ''}">
        ${p.popular ? `<span class="tag">${esc(t('js.popular'))}</span>` : ''}
        <img src="assets/coin.svg" alt="">
        <div class="num">${fmt(p.coins + p.bonusCoins)}</div>
        <div class="bonus">${fmt(p.coins)}${p.bonusCoins ? ` ${esc(t('js.bonus', { n: fmt(p.bonusCoins) }))}` : ''} · ${esc(t('js.firstGift', { n: fmt(Math.min(300, p.coins + p.bonusCoins)) }))}</div>
        <div class="price">${azn(p.priceQepik)}</div>
      </div>`).join('');
  }

  function renderMarquee() {
    const el = $('#marquee');
    if (!el) return;
    const items = t('js.marquee');
    const row = (Array.isArray(items) ? items : []).map((x) => `<span>${esc(x)}</span><span>✦</span>`).join('');
    el.innerHTML = row + row + row + row;
  }

  // Kalkulyator (docs/ECONOMY.md): Bürünc agentlikdə host payı 15% (Almaz), 1 mesaj = 30 Nar, 1 dəq video = 80 Nar, 10 Almaz = 1 ₼, 3% çıxarış haqqı
  function calc() {
    const m = +($('#rMsg')?.value ?? 0);
    const n = +($('#rMin')?.value ?? 0);
    const g = +($('#rGift')?.value ?? 0);
    $('#vMsg').textContent = m;
    $('#vMin').textContent = n;
    $('#vGift').textContent = fmt(g);
    const narPerDay = m * 30 + n * 80 + g;
    const azPerMonth = ((narPerDay * 0.15 * 30) / 100) * 0.97;
    $('#calcOut').textContent = `≈ ${fmt(Math.round(azPerMonth))} ₼`;
  }

  function renderAll() {
    renderGifts();
    renderPackages();
    renderMarquee();
  }

  document.addEventListener('simo:lang', renderAll);
  renderAll();

  ['#rMsg', '#rMin', '#rGift'].forEach((s) => $(s)?.addEventListener('input', calc));
  if ($('#rMsg')) calc();

  // Serverdən aktual paketlər (əlçatan deyilsə statik siyahı qalır)
  if (window.SIMO_API) {
    fetch(`${window.SIMO_API}/wallet/packages`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const items = d && (d.items || d.packages);
      if (Array.isArray(items) && items.length) {
        PACKAGES = items;
        renderPackages();
      }
    }).catch(() => {});
  }

  // Mobil menyu
  $('#burger')?.addEventListener('click', () => $('#menu')?.classList.toggle('open'));
  document.querySelectorAll('#menu a').forEach((a) => a.addEventListener('click', () => $('#menu')?.classList.remove('open')));

  // İl
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Görünəndə animasiya
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 }) : null;
  document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
})();
