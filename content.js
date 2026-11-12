/* ===== VK Video Wide-Screen Mode =====
   «Широкоэкранный» (театральный) режим для vkvideo.ru: плеер занимает всю
   ширину окна браузера, высота = окно минус шапка.
   Своих кнопок расширение не добавляет: переключателем служит родная кнопка
   плеера со стрелками (театральный режим VK, горячая клавиша T) в правой части
   панели управления. Расширение «дожимает» этот режим до полноценного
   широкого экрана (как театральный режим YouTube). */
(() => {
  'use strict';

  const FLAG = 'vws-on'; // класс-состояние на <html>: следует за родным театром
  const CLS = {
    main: 'vws-main',   // основная колонка страницы видео
    hide: 'vws-hide',   // правый сайдбар (скрывается в широком режиме)
    unpad: 'vws-unpad', // обёртка контента (убираем боковые отступы)
  };

  const isOn = () => document.documentElement.classList.contains(FLAG);

  /** Плеер должен занимать весь экран, как театральный режим YouTube: если
      страница прокручена, под плеером виден заголовок — сдвигаем страницу
      наверх. Повторяем через паузу: VK умеет сам восстанавливать прокрутку
      после навигации. */
  function scrollTopSoon() {
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 300);
  }

  /** Секция основной колонки страницы видео */
  function getMainSection() {
    return document.querySelector('section[class*="Page__container"]');
  }

  /** Видимый контейнер плеера (на странице их два: второй — скрытая копия) */
  function getPlayerBox() {
    const boxes = document.querySelectorAll(
      'div[class*="VideoPlayer__aspectRatio"]:not([class*="VideoPlayer__hidden"])'
    );
    for (const b of boxes) {
      if (b.getBoundingClientRect().width > 0) return b;
    }
    return null;
  }

  /* --- родная кнопка театрального режима (кнопка со стрелками) --- */

  /** Хост, в Shadow DOM которого живёт панель управления плеера */
  function getShadowHost() {
    for (const h of document.querySelectorAll('div.shadow-root-container')) {
      if (h.shadowRoot) return h;
    }
    // запасной путь: любой открытый shadow root с театральной кнопкой
    for (const el of document.querySelectorAll('vk-video-player, div[class*="Player"]')) {
      if (el.shadowRoot && el.shadowRoot.querySelector('button[data-testid^="theater-mode"]')) return el;
    }
    return null;
  }

  /** Кнопка «театральный режим» со стрелками в панели управления плеера */
  function getTheaterButton() {
    const host = getShadowHost();
    return host ? host.shadowRoot.querySelector('button[data-testid^="theater-mode"]') : null;
  }

  /** Состояние родного театра: true — широкий экран, false — обычный,
      null — плеера на странице нет. data-testid отражает состояние:
      theater-mode-on = театр включён (плеер во всю ширину окна). */
  function theaterState() {
    const btn = getTheaterButton();
    if (btn) {
      const t = btn.getAttribute('data-testid');
      if (t === 'theater-mode-on') return true;
      if (t === 'theater-mode-off') return false;
      // запасной разбор по подписи: «Экран по умолчанию» = сейчас широкий
      return /по умолчанию/i.test(btn.getAttribute('aria-label') || '');
    }
    const box = getPlayerBox();
    if (box) return box.getBoundingClientRect().width > window.innerWidth * 0.85;
    return null;
  }

  /** Приводим класс-состояние к состоянию родного театрального режима */
  function syncWithTheater() {
    const st = theaterState();
    if (st === null || st === isOn()) return;
    document.documentElement.classList.toggle(FLAG, st);
    if (st) scrollTopSoon(); // театр: плеер целиком в кадре
    mark();
  }

  /* --- подписка на переключения родной кнопки --- */

  const attachedHosts = new WeakSet();
  const observedButtons = new WeakSet();

  function attachTheaterSync() {
    const host = getShadowHost();
    if (!host) return;

    if (!attachedHosts.has(host)) {
      attachedHosts.add(host);
      // клик по панели плеера → мгновенная синхронизация
      host.addEventListener('click', () => setTimeout(syncWithTheater, 30), true);
      // перерисовка панели (SPA-навигация, пересоздание кнопок)
      new MutationObserver(() => setTimeout(syncWithTheater, 30))
        .observe(host.shadowRoot, { childList: true, subtree: true });
    }

    const btn = getTheaterButton();
    if (btn && !observedButtons.has(btn)) {
      observedButtons.add(btn);
      // смена состояния кнопки (клик, горячая клавиша T)
      new MutationObserver(() => setTimeout(syncWithTheater, 30))
        .observe(btn, { attributes: true, attributeFilter: ['data-testid', 'aria-label', 'class'] });
    }
  }

  /** Размечает страницу под широкий режим. Идемпотентна, вызывается многократно. */
  let lastURL = location.href;
  function mark() {
    // SPA-переход к другому видео: в широком режиме начинаем сверху,
    // чтобы плеер снова занимал весь экран (как на YouTube)
    if (location.href !== lastURL) {
      lastURL = location.href;
      if (isOn() && getPlayerBox()) scrollTopSoon();
    }

    const section = getMainSection();
    if (!section) return;

    if (!section.classList.contains(CLS.main)) section.classList.add(CLS.main);

    // правый сайдбар раскладки (соседняя колонка с рекомендациями)
    const mainCol = section.closest('[class*="vkuiSplitCol__host"]');
    if (mainCol && mainCol.parentElement) {
      for (const sib of mainCol.parentElement.children) {
        if (sib === mainCol) continue;
        if (sib.getBoundingClientRect().width > 50 && !sib.classList.contains(CLS.hide)) {
          sib.classList.add(CLS.hide);
        }
      }
    }

    // обёртка с боковыми отступами вокруг раскладки
    const layout = mainCol && mainCol.closest('[class*="vkuiSplitLayout__host"]');
    const wrap = layout && layout.parentElement;
    if (wrap && wrap !== document.body &&
        getComputedStyle(wrap).paddingLeft !== '0px' &&
        !wrap.classList.contains(CLS.unpad)) {
      wrap.classList.add(CLS.unpad);
    }
  }

  /* --- подстраховка: регулярная синхронизация (горячая клавиша T и т.п.) --- */
  setInterval(() => {
    attachTheaterSync();
    syncWithTheater();
  }, 700);

  /* --- SPA-навигация: VK Видео перерисовывает страницу без перезагрузки --- */
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      mark();
      attachTheaterSync();
      syncWithTheater();
    }, 120);
  };
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  /* --- мгновенная реакция на клавишу T (сами нажатия не перехватываем:
         родную горячую клавишу театра обрабатывает сам плеер) --- */
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      setTimeout(syncWithTheater, 60);
    }
  }, true);

  /* --- клик по иконке расширения на панели: нажимаем родную кнопку --- */
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'VWS_TOGGLE') {
        const btn = getTheaterButton();
        if (btn) btn.click();
      }
    });
  } catch (e) { /* chrome.runtime недоступен — ок */ }

  /* --- старт --- */
  mark();
  attachTheaterSync();
  syncWithTheater();
})();
