/* Hüquqi səhifələrdə dilə görə bölmə göstərilir */
(function () {
  function show() {
    const l = window.SimoI18n ? window.SimoI18n.lang : 'az';
    document.querySelectorAll('article[data-doc]').forEach((a) => a.classList.toggle('hidden', a.getAttribute('data-doc') !== l));
  }
  document.addEventListener('simo:lang', show);
  show();
})();
