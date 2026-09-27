/* ═══════════════════════════════════════════════════════════
   Apple Service Kharkiv — інтерфейсна логіка.
   Без залежностей. Усі дані каталогу приходять з js/catalog.js,
   який збирається з data/devices.js.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Мова ──────────────────────────────────────────────────
     Беремо з <html lang>, який ставить збірка. Усе, що скрипт
     дописує в сторінку, має бути тією ж мовою, що й розмітка.
     Рядки, які залежать від сторінки (підказки калькулятора),
     приходять із data-атрибутів — там їх формує шаблон.        */
  var LANG = (document.documentElement.lang || 'uk').slice(0, 2) === 'ru' ? 'ru' : 'uk';
  var DICT = {
    uk: {
      models: ['модель', 'моделі', 'моделей'],
      chosen: '· обрано ',
      notFound: 'Нічого не знайшли. Спробуйте «15 pro» або «air m2» — або <a href="{c}">напишіть нам</a>, підкажемо модель за серійним номером.',
      contacts: '/kontakty',
      formNoName: 'Напишіть, як до вас звертатися.',
      formNoPhone: 'Перевірте номер телефону — здається, бракує цифр.',
      pickPopular: 'Часті моделі',
      pickFound: 'Знайдено',
      pickNone: 'Немає такої моделі в каталозі — напишіть назву своїми словами.',
      formSending: 'Надсилаємо…',
      formSentApi: 'Заявку надіслано. Передзвонимо протягом 15 хвилин.',
      formSentTg: 'Заявку сформовано. Відкрили Telegram — надішліть повідомлення, і ми передзвонимо протягом 15 хвилин.',
      formSentTel: function (n, p) { return 'Записали: ' + n + ', ' + p + '. Форма поки не надсилає заявки автоматично — зателефонуйте, будь ласка, і ми одразу візьмемо пристрій у роботу.'; },
      req: 'Заявка з сайту', reqName: 'Ім’я', reqPhone: 'Телефон', reqDev: 'Пристрій', reqProblem: 'Проблема'
    },
    ru: {
      models: ['модель', 'модели', 'моделей'],
      chosen: '· выбрано ',
      notFound: 'Ничего не нашли. Попробуйте «15 pro» или «air m2» — или <a href="{c}">напишите нам</a>, подскажем модель по серийному номеру.',
      contacts: '/ru/kontakty',
      formNoName: 'Напишите, как к вам обращаться.',
      formNoPhone: 'Проверьте номер телефона — кажется, не хватает цифр.',
      pickPopular: 'Частые модели',
      pickFound: 'Найдено',
      pickNone: 'Такой модели в каталоге нет — напишите название своими словами.',
      formSending: 'Отправляем…',
      formSentApi: 'Заявка отправлена. Перезвоним в течение 15 минут.',
      formSentTg: 'Заявка сформирована. Открыли Telegram — отправьте сообщение, и мы перезвоним в течение 15 минут.',
      formSentTel: function (n, p) { return 'Записали: ' + n + ', ' + p + '. Форма пока не отправляет заявки автоматически — позвоните, пожалуйста, и мы сразу возьмём устройство в работу.'; },
      req: 'Заявка с сайта', reqName: 'Имя', reqPhone: 'Телефон', reqDev: 'Устройство', reqProblem: 'Проблема'
    }
  };
  var D = DICT[LANG];

  // «1 модель», «3 моделі», «10 моделей» — правило спільне для обох мов
  function plural(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return D.models[0];
    if (t >= 2 && t <= 4 && (h < 10 || h >= 20)) return D.models[1];
    return D.models[2];
  }

  /* ── Шапка: тінь після скролу ──────────────────────────── */
  var hdr = $('.hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Плаваючий блок звʼязку ────────────────────────────────
     Показуємо після першого екрана: доти на сторінці вже є дві
     великі кнопки, і третя була б зайвим шумом.               */
  var dock = $('#dock');
  if (dock) {
    var dockOn = function () { dock.classList.toggle('is-on', window.scrollY > 420); };
    dockOn();
    window.addEventListener('scroll', dockOn, { passive: true });
  }

  /* ── Мобільна шухляда ──────────────────────────────────── */
  var drawer = $('#drawer'), burger = $('#burger');
  if (drawer && burger) {
    var setDrawer = function (open) {
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      // Плаваючі кнопки не мають висіти поверх відкритого меню
      if (dock) dock.classList.toggle('is-hidden', open);
      if (open) { var f = drawer.querySelector('a, button'); if (f) f.focus(); }
    };
    burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('is-open')); });
    $$('.drawer__close, .drawer a', drawer).forEach(function (el) {
      el.addEventListener('click', function () { setDrawer(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setDrawer(false); burger.focus(); }
    });
  }

  /* ── Поява блоків при скролі ───────────────────────────── */
  var rises = $$('.rise');
  if (rises.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      rises.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      rises.forEach(function (el) { io.observe(el); });
    }
  }

  /* ── Пляма світла під курсором на картках ──────────────── */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.cat, .mcard');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ── Дані каталогу ─────────────────────────────────────── */
  var DATA = window.ASK || null;

  // Заміни робимо ПОТОКЕННО, а не регуляркою по всьому рядку:
  // \b у JS не бачить кирилицю, тож /про\b/ ніколи не спрацював би
  // на «айфон 15 про».
  var ALIAS = {
    'айфон': 'iphone', 'айфони': 'iphone', 'айфона': 'iphone',
    'айпад': 'ipad', 'айпед': 'ipad',
    'макбук': 'macbook', 'мак': 'macbook', 'мекбук': 'macbook',
    'годинник': 'watch', 'годинники': 'watch', 'часы': 'watch', 'вотч': 'watch',
    'эпл': 'apple', 'епл': 'apple', 'эппл': 'apple',
    'про': 'pro', 'макс': 'max', 'плюс': 'plus',
    'мини': 'mini', 'міні': 'mini',
    'эйр': 'air', 'ейр': 'air', 'эир': 'air', 'аір': 'air',
    'ультра': 'ultra', 'серія': 'series', 'серия': 'series',
    // Чипи й моделі кирилицею: «макбук ейр м2», «айфон ікс».
    // Без цього запит виглядав правильним, а знаходив нуль.
    'м1': 'm1', 'м2': 'm2', 'м3': 'm3', 'м4': 'm4',
    'ікс': 'x', 'икс': 'x', 'се': 'se',
    'мм': 'mm',
    'ремонт': '', 'заміна': '', 'замена': ''
  };

  function norm(s) {
    return String(s)
      .toLowerCase()
      .replace(/["”″'’]/g, '')
      .replace(/промакс/g, 'pro max')
      // «икс эс» — це два слова в запиті, але одне в назві (XS).
      // Зшиваємо ДО розбиття на токени, інакше «эс» лишиться
      // сиротою й не знайдеться ніде. Довші форми — першими.
      .replace(/[іи]кс\s*[еэ]с/g, 'xs')
      .replace(/[іи]кс\s*[еэ]р/g, 'xr')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
      .trim()
      .split(' ')
      .map(function (t) { return ALIAS.hasOwnProperty(t) ? ALIAS[t] : t; })
      .filter(Boolean)
      .join(' ');
  }

  // Процесор навмисно не в стозі сіна: «A15» містить «15», і пошук
  // «iphone 15» витягував би заодно всі 13-ті на A15.
  function matches(model, q) {
    var hay = norm(model.n + ' ' + model.f);
    var toks = hay.split(' ');
    var terms = q.split(' ').filter(Boolean);
    return terms.every(function (t) {
      // Однобуквений термін звіряємо з цілим словом. «айфон ікс»
      // дає запит «iphone x», а підрядок «x» сидить у «max» —
      // і замість iPhone X виходили всі Pro Max.
      return t.length === 1 ? toks.indexOf(t) !== -1 : hay.indexOf(t) !== -1;
    });
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function highlight(name, q) {
    var out = esc(name);
    var terms = q.split(' ').filter(function (t) { return t.length > 1; });
    if (!terms.length) return out;
    var re = new RegExp('(' + terms.map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join('|') + ')', 'ig');
    return out.replace(re, "<mark>$1</mark>");
  }

  var money = function (n) { return n.toLocaleString('uk-UA') + ' ₴'; };

  /* ── Пошук моделі з автодоповненням ────────────────────── */
  var finder = $('#finder');
  if (finder && DATA) {
    var input = $('input', finder);
    var list = $('.finder__list', finder);
    var count = $('.finder__count', finder);
    var clear = $('.finder__clear', finder);
    var active = -1, shown = [];
    var scope = finder.dataset.cat;
    var POOL = scope ? DATA.models.filter(function (m) { return m.c === scope; }) : DATA.models;

    var render = function (q) {
      if (!q) {
        finder.classList.remove('is-open', 'has-query');
        list.innerHTML = '';
        if (count) count.textContent = POOL.length + ' ' + plural(POOL.length);
        return;
      }
      finder.classList.add('has-query');
      shown = POOL.filter(function (m) { return matches(m, q); });
      if (count) count.textContent = shown.length + ' ' + plural(shown.length);

      if (!shown.length) {
        list.innerHTML = '<div class="finder__empty">' + D.notFound.replace('{c}', D.contacts) + '</div>';
      } else {
        list.innerHTML = shown.slice(0, 9).map(function (m, i) {
          return '<a class="finder__item" href="/' + m.s + '" role="option" id="fi-' + i + '">' +
            '<b>' + highlight(m.n, q) + '</b>' +
            '<span class="mono">' + m.y + '</span></a>';
        }).join('');
      }
      active = -1;
      finder.classList.add('is-open');
    };

    input.addEventListener('input', function () { render(norm(input.value)); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(norm(input.value)); });

    input.addEventListener('keydown', function (e) {
      var items = $$('.finder__item', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        active = e.key === 'ArrowDown'
          ? (active + 1) % items.length
          : (active - 1 + items.length) % items.length;
        items.forEach(function (el, i) { el.classList.toggle('is-active', i === active); });
        items[active].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', items[active].id);
      } else if (e.key === 'Enter') {
        if (items.length) { e.preventDefault(); (items[active] || items[0]).click(); }
      } else if (e.key === 'Escape') {
        input.value = ''; render(''); input.blur();
      }
    });

    if (clear) clear.addEventListener('click', function () { input.value = ''; render(''); input.focus(); });

    document.addEventListener('click', function (e) {
      if (!finder.contains(e.target)) finder.classList.remove('is-open');
    });
    render('');
  }

  /* ── Фільтри каталогу ──────────────────────────────────────
     URL навмисно не чіпаємо: фільтри не повинні плодити
     дублікати сторінок в індексі Google.

     Головне правило: у глухий кут завести не можна. Перед
     кожним перемальовуванням рахуємо, скільки моделей дасть
     кожен варіант з урахуванням решти обраного, і вимикаємо ті,
     що дали б нуль. Тому «2021 + A19 Pro» просто не клікається.  */
  var catalog = $('#catalog');
  if (catalog) {
    var cards = $$('.mcard', catalog);
    var groups = $$('.family', catalog);
    var chips = $$('.chip', catalog);
    var empty = $('#catalogEmpty');
    var totalEl = $('#catalogCount');
    var wordEl = $('#catalogCountWord');
    var chosenEl = $('#catalogChosen');
    var resetBtn = $('.filters__reset', catalog);

    // Знімок карток один раз: далі рахуємо по масиву, а не по DOM
    var items = cards.map(function (el) {
      return { el: el, d: el.dataset };
    });

    // state: { ключ: Set(значень) } — усередині групи «або», між групами «і»
    var state = {};

    var wordFor = plural;

    var matches = function (d, skipKey) {
      for (var k in state) {
        if (k === skipKey) continue;
        if (!state[k].size) continue;
        if (!state[k].has(d[k] || '')) return false;
      }
      return true;
    };

    var apply = function () {
      var shown = 0;

      items.forEach(function (it) {
        var ok = matches(it.d);
        it.visible = ok;
        it.el.classList.toggle('is-hidden', !ok);
        if (ok) shown++;
      });

      // Порожні групи серій ховаємо цілком
      groups.forEach(function (g) {
        g.style.display = $$('.mcard:not(.is-hidden)', g).length ? '' : 'none';
      });

      // Скільки дасть кожен варіант, якщо його додати до решти обраного
      chips.forEach(function (chip) {
        var key = chip.dataset.key, val = chip.dataset.val;
        var on = state[key] && state[key].has(val);
        var n = 0;
        for (var i = 0; i < items.length; i++) {
          var d = items[i].d;
          if ((d[key] || '') === val && matches(d, key)) n++;
        }
        var num = chip.querySelector('.chip__n');
        if (num) num.textContent = n ? n : '';
        // Обраний варіант не вимикаємо ніколи — інакше його не зняти
        var dead = n === 0 && !on;
        chip.disabled = dead;
        chip.classList.toggle('is-dead', dead);
      });

      // Група, у якій усе згасло, зникає цілком: суцільно сірий рядок
      // тільки збиває з пантелику. Наприклад, «Камери ззаду» не має
      // сенсу, коли обрано Apple Watch.
      $$('.filters__group', catalog).forEach(function (g) {
        var live = $$('.chip', g).filter(function (c) { return !c.classList.contains('is-dead'); }).length;
        g.hidden = live === 0;
      });
      var visualBox = $('.filters__visual', catalog);
      if (visualBox) {
        visualBox.hidden = $$('.filters__group', visualBox).every(function (g) { return g.hidden; });
      }

      if (totalEl) totalEl.textContent = shown;
      if (wordEl) wordEl.textContent = wordFor(shown);

      // Що саме обрано — щоб було видно, чому список короткий
      var picked = [];
      chips.forEach(function (c) {
        if (c.getAttribute('aria-pressed') === 'true') {
          picked.push(c.querySelector('.chip__t').textContent);
        }
      });
      if (chosenEl) chosenEl.textContent = picked.length ? picked.join(' · ') : '';

      // Скільки уточнень активні у складеній групі
      var moreBox = $('#filtersMore');
      var toggleN = $('.filters__toggle-n');
      if (moreBox && toggleN) {
        var inMore = $$('.chip[aria-pressed="true"]', moreBox).length;
        toggleN.textContent = inMore ? D.chosen + inMore : '';
      }

      if (resetBtn) resetBtn.hidden = !picked.length;
      if (empty) empty.classList.toggle('is-on', shown === 0);
      catalog.classList.toggle('is-filtered', picked.length > 0);
    };

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.disabled) return;
        var key = chip.dataset.key, val = chip.dataset.val;
        if (!state[key]) state[key] = new Set();
        var on = state[key].has(val);
        if (on) state[key].delete(val); else state[key].add(val);
        chip.setAttribute('aria-pressed', String(!on));
        apply();
      });
    });

    if (resetBtn) resetBtn.addEventListener('click', function () {
      state = {};
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      apply();
    });

    /* Технічні групи на вузькому екрані складені: інакше до першої
       картки треба прокрутити майже тисячу пікселів чипів. Візуальні
       питання лишаються відкритими — вони потрібні саме тим, хто не
       знає назви моделі. */
    var toggle = $('#filtersToggle'), more = $('#filtersMore');
    if (toggle && more) {
      var setMore = function (open) {
        more.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      };
      toggle.addEventListener('click', function () {
        setMore(more.hidden);
      });
      if (window.matchMedia('(max-width: 720px)').matches) setMore(false);
    }

    apply();
  }

  /* ── Калькулятор вартості ──────────────────────────────── */
  var calc = $('#calc');
  if (calc && DATA) {
    var selCat = $('#calcCat'), selModel = $('#calcModel'), selSvc = $('#calcSvc');
    var out = $('#calcOut'), note = $('#calcNote'), link = $('#calcLink');
    var C = calc.dataset;                       // підписи з шаблону, вже потрібною мовою
    var SVC = DATA.services[LANG] || DATA.services;

    var fillModels = function () {
      var cat = selCat.value;
      var ms = DATA.models.filter(function (m) { return m.c === cat; });
      selModel.innerHTML = '<option value="">' + C.pickModel + '</option>' + ms.map(function (m) {
        return '<option value="' + m.s + '">' + m.n + '</option>';
      }).join('');
      selModel.disabled = !cat;
      selSvc.innerHTML = '<option value="">' + C.firstModel + '</option>';
      selSvc.disabled = true;
      show(null);
    };

    var fillServices = function () {
      var m = DATA.models.find(function (x) { return x.s === selModel.value; });
      if (!m) { selSvc.disabled = true; return; }
      var ids = DATA.cats[m.c];
      selSvc.innerHTML = '<option value="">' + C.pickWork + '</option>' + ids.map(function (id, i) {
        if (m.p[i] === null || m.p[i] === undefined) return '';
        return '<option value="' + i + '">' + SVC[id] + '</option>';
      }).join('');
      selSvc.disabled = false;
      show(null);
    };

    var show = function (res) {
      // Райдужна заливка тексту на самому лише тире виглядає як артефакт
      out.classList.toggle('iris-text', !!res);
      if (!res) {
        out.textContent = '—';
        note.textContent = C.hint;
        link.style.display = 'none';
        return;
      }
      out.textContent = res.price === 0 ? C.free : C.from + ' ' + money(res.price);
      note.textContent = res.price === 0 ? C.noteFree : C.note.replace('{m}', res.model);
      link.href = (LANG === 'ru' ? '/ru/' : '/') + res.slug;
      link.textContent = C.link.replace('{m}', res.model);
      link.style.display = '';
    };

    selCat.addEventListener('change', fillModels);
    selModel.addEventListener('change', fillServices);
    selSvc.addEventListener('change', function () {
      var m = DATA.models.find(function (x) { return x.s === selModel.value; });
      var i = parseInt(selSvc.value, 10);
      if (!m || isNaN(i)) return show(null);
      show({ price: m.p[i], model: m.n, slug: m.s });
    });

    // Якщо калькулятор стоїть на сторінці моделі — підставляємо її
    var pre = calc.dataset.model;
    if (pre) {
      var pm = DATA.models.find(function (x) { return x.s === pre; });
      if (pm) { selCat.value = pm.c; fillModels(); selModel.value = pm.s; fillServices(); }
    }
  }

  /* ── Проморолік ────────────────────────────────────────────
     Файл на 2.7 МБ не тягнемо, доки секція не наблизиться до
     екрана. При економії трафіку чи reduced-motion не тягнемо
     взагалі — лишається кнопка, людина вирішує сама.          */
  var stage = $('#promoStage');
  if (stage) {
    var vid = $('#promoVideo', stage);
    var btn = $('#promoBtn', stage);
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var loaded = false;

    var label = function (icon, text, pressed) {
      btn.innerHTML = icon + '<span>' + text + '</span>';
      btn.setAttribute('aria-pressed', String(!!pressed));
    };
    var ICO = {
      play: btn.querySelector('svg') ? btn.querySelector('svg').outerHTML : '',
      vol: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 9.2a4 4 0 0 1 0 5.6M19 6.5a8 8 0 0 1 0 11"/></svg>',
      mute: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m17 10 4 4M21 10l-4 4"/></svg>'
    };

    var load = function () {
      if (loaded) return;
      loaded = true;
      vid.src = vid.dataset.src;
      vid.addEventListener('loadeddata', function () {
        stage.classList.add('is-playing');
        label(ICO.vol, btn.dataset.sound, false);
      }, { once: true });
      // Ролик не завантажився — не лишаємо порожню діру в макеті
      vid.addEventListener('error', function () {
        stage.style.display = 'none';
      }, { once: true });
      var p = vid.play();
      if (p && p.catch) p.catch(function () { label(ICO.play, btn.dataset.play, false); });
    };

    btn.addEventListener('click', function () {
      if (!loaded) { load(); return; }
      if (vid.paused) { vid.play(); }
      vid.muted = !vid.muted;
      label(vid.muted ? ICO.vol : ICO.mute,
            vid.muted ? btn.dataset.sound : btn.dataset.mute,
            !vid.muted);
    });

    if (!saveData && !reduce && 'IntersectionObserver' in window) {
      // Секція стоїть одразу під героєм, тож спостерігач спрацював би
      // ще до першого малювання і 2.7 МБ конкурували б зі шрифтами та
      // стилями. Чекаємо, доки сторінка домалюється.
      var watch = function () {
        var vio = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { load(); vio.disconnect(); }
        }, { rootMargin: '300px' });
        vio.observe(stage);
      };
      if (document.readyState === 'complete') watch();
      else window.addEventListener('load', watch, { once: true });
    }
  }

  /* ── Форма запису ──────────────────────────────────────── */
  $$('form[data-book]').forEach(function (form) {
    var status = $('.form-status', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = (fd.get('name') || '').toString().trim();
      var phone = (fd.get('phone') || '').toString().trim();
      if (name.length < 2) { say(D.formNoName); return; }
      if (phone.replace(/\D/g, '').length < 9) { say(D.formNoPhone); return; }

      var text = [D.req,
        D.reqName + ': ' + name,
        D.reqPhone + ': ' + phone,
        fd.get('device') ? D.reqDev + ': ' + fd.get('device') : '',
        fd.get('problem') ? D.reqProblem + ': ' + fd.get('problem') : ''
      ].filter(Boolean).join('\n');

      var tg = form.dataset.telegram;

      // Спершу пробуємо надіслати напряму через /api/lead — тоді
      // заявка падає в Telegram сама, людині нічого не треба тиснути.
      // Якщо функція не налаштована або недоступна, тихо відкочуємось
      // на старий шлях: краще відкрити месенджер, ніж загубити заявку.
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      say(D.formSending);

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name, phone: phone,
          device: (fd.get('device') || '').toString(),
          deviceSlug: (fd.get('deviceSlug') || '').toString(),
          problem: (fd.get('problem') || '').toString(),
          company: (fd.get('company') || '').toString(),
          page: location.pathname,
          lang: document.documentElement.lang || 'uk'
        })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          if (!d || !d.ok) return Promise.reject('bad');
          say(D.formSentApi, true);
          form.reset();
        })
        .catch(function () { fallback(); })
        .then(function () { if (btn) btn.disabled = false; });

      function fallback() {
        if (tg) {
          window.open(tg + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
          say(D.formSentTg, true);
        } else {
        // Месенджер ще не підключений — не вдаємо, що заявку прийнято.
        // Копіюємо текст і ведемо людину на дзвінок.
          var tel = form.dataset.phone || '';
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          say(D.formSentTel(name, phone), true);
          if (tel) window.location.href = 'tel:' + tel;
        }
        form.reset();
      }
    });

    function say(msg, ok) {
      if (!status) { alert(msg); return; }
      status.textContent = msg;
      status.classList.add('is-on');
      status.classList.toggle('is-ok', !!ok);
    }
  });

  /* ── Вибір моделі у формі заявки ───────────────────────
     Той самий норматор і той самий matches(), що в пошуку
     каталогу: «айфон 15 про» має знаходити iPhone 15 Pro і тут,
     і там. Другий, окремий матчер розійшовся б із першим за
     тиждень. */
  $$('[data-pick]').forEach(function (pick) {
    var input = $('input[name="device"]', pick);
    var list = $('.pick__list', pick);
    var clear = $('.pick__clear', pick);
    var slug = pick.parentNode ? $('input[name="deviceSlug"]', pick.parentNode) : null;
    if (!input || !list || !DATA || !DATA.models) return;

    var CAT = { iphone: 'iPhone', ipad: 'iPad', watch: 'Apple Watch', mac: 'MacBook' };
    var active = -1, items = [];

    function toggleValue() { pick.classList.toggle('has-value', !!input.value); }

    function close() {
      pick.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      active = -1;
    }

    function pickModel(m) {
      input.value = m.n;
      if (slug) slug.value = m.s;
      toggleValue();
      close();
      input.focus();
    }

    function render(q) {
      var found;
      if (!q) {
        // Порожнє поле — показуємо найновіші, по одній з кожної
        // категорії спочатку: так видно, що вибір узагалі є.
        var seen = {}, head = [], rest = [];
        DATA.models.forEach(function (m) {
          if (!seen[m.c]) { seen[m.c] = 1; head.push(m); } else if (rest.length < 20) rest.push(m);
        });
        found = head.concat(rest).slice(0, 8);
      } else {
        found = DATA.models.filter(function (m) { return matches(m, q); }).slice(0, 8);
      }

      if (!found.length) {
        list.innerHTML = '<div class="pick__empty">' + D.pickNone + '</div>';
        items = [];
      } else {
        list.innerHTML =
          '<p class="pick__head">' + esc(q ? D.pickFound : D.pickPopular) + '</p>' +
          found.map(function (m, i) {
            return '<button class="pick__item" type="button" role="option" data-i="' + i + '">' +
              '<b>' + (q ? highlight(m.n, q) : esc(m.n)) + '</b>' +
              '<span class="mono">' + esc(CAT[m.c] || '') + ' · ' + m.y + '</span>' +
              '</button>';
          }).join('');
        items = found;
      }
      pick.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
      active = -1;
    }

    input.addEventListener('input', function () {
      if (slug) slug.value = '';       // набрали руками — прив'язка до моделі втрачена
      toggleValue();
      render(norm(input.value));
    });
    input.addEventListener('focus', function () { render(norm(input.value)); });

    list.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.pick__item') : null;
      if (btn) pickModel(items[+btn.dataset.i]);
    });

    input.addEventListener('keydown', function (e) {
      var btns = $$('.pick__item', list);
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!btns.length) return;
        e.preventDefault();
        active = e.key === 'ArrowDown'
          ? (active + 1) % btns.length
          : (active <= 0 ? btns.length - 1 : active - 1);
        btns.forEach(function (b, i) { b.classList.toggle('is-active', i === active); });
        btns[active].scrollIntoView({ block: 'nearest' });
        return;
      }
      // Enter вибирає підсвічене, але НЕ ковтає звичайну відправку
      // форми, коли в списку нічого не виділено.
      if (e.key === 'Enter' && active > -1 && btns[active]) {
        e.preventDefault();
        pickModel(items[active]);
      }
    });

    if (clear) clear.addEventListener('click', function () {
      input.value = '';
      if (slug) slug.value = '';
      toggleValue();
      render('');
      input.focus();
    });

    document.addEventListener('click', function (e) { if (!pick.contains(e.target)) close(); });
    toggleValue();
  });

  /* ── Рік у підвалі ─────────────────────────────────────── */
  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
