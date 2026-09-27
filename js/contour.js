/* ═══════════════════════════════════════════════════════════
   Контурне поле героя.
   Це не абстрактний градієнт: це те, що бачиш, коли світло
   лампи ковзає по знятій поляризаційній плівці дисплея —
   інтерференційні смуги, які «розступаються» під курсором.
   Один canvas, без бібліотек, ~4 КБ.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var cv = document.getElementById('heroCanvas');
  if (!cv) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = cv.getContext('2d', { alpha: true });
  var W = 0, H = 0, dpr = 1;
  var t = 0, raf = null;
  var px = 0.5, py = 0.42;      // ціль курсора (0..1)
  var cx = 0.5, cy = 0.42;      // згладжена позиція
  var LINES, STEP;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    W = Math.max(320, r.width);
    H = Math.max(320, r.height);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Менше ліній на вузьких екранах — без втрати малюнка
    LINES = W < 620 ? 26 : W < 1000 ? 36 : 46;
    STEP = W < 620 ? 10 : 7;
  }

  function grad() {
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(92,228,255,.85)');
    g.addColorStop(0.55, 'rgba(30,144,255,.75)');
    g.addColorStop(1, 'rgba(11,65,224,.6)');
    return g;
  }

  var stroke = null;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!stroke) stroke = grad();

    cx += (px - cx) * 0.045;
    cy += (py - cy) * 0.045;

    var mx = cx * W, my = cy * H;
    var band = H / (LINES - 1);
    var pull = Math.min(W, H) * 0.42;   // радіус «розступання»

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;

    for (var i = 0; i < LINES; i++) {
      var depth = i / (LINES - 1);          // 0 — верх полотна, 1 — низ
      var baseY = i * band;
      // Найяскравіше там, де рельєф найвищий: світло ковзає по гребеню
      var centerFade = 1 - Math.abs(depth - 0.48) * 1.5;
      ctx.globalAlpha = Math.max(0, centerFade) * 0.62 + 0.09;
      ctx.beginPath();

      // Амплітуда наростає до середини — виходить дюна, а не рівна штриховка
      var amp = band * (1.1 + 4.8 * Math.sin(Math.PI * depth));

      for (var x = -STEP; x <= W + STEP; x += STEP) {
        var n = x / W;
        // Три хвилі з різними періодами: рельєф не повторюється
        var y = baseY
          + Math.sin(n * 1.9 + t * 0.28 + depth * 1.9) * amp
          + Math.sin(n * 4.6 - t * 0.17 + depth * 0.8) * amp * 0.28
          + Math.sin(n * 0.9 + t * 0.09) * amp * 0.55;

        // Курсор виштовхує рельєф — як палець під плівкою
        var dx = x - mx, dy = y - my;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < pull) {
          var f = 1 - d / pull;
          y += dy * f * f * 0.55;
        }

        if (x <= 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    t += 0.006;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  window.addEventListener('resize', function () {
    size(); stroke = null; draw();
  }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width;
    py = (e.clientY - r.top) / r.height;
  }, { passive: true });

  // Не крутимо анімацію, коли герой поза екраном або вкладка прихована
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  }

  size();
  start();
})();
