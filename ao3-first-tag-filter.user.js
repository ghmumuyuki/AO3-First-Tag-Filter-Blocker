// ==UserScript==
// @name         AO3 First Tag Filter
// @name:zh-CN   AO3 首位 Tag 过滤器
// @namespace    local.first-tag-filter
// @version      1.3.6
// @description  Minimalist square draggable AO3 filter bubble with premium settings UI.
// @match        https://archiveofourown.org/*
// @match        https://www.archiveofourown.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  if (!/^(archiveofourown\.org|www\.archiveofourown\.org)$/i.test(location.hostname)) return;
  if (document.getElementById('ftf-launcher')) return;

  // ---------- 配置 ----------
  const KEY_ACTIVE = 'ftf_active_v1';
  const KEY_QUERY = 'ftf_query_v1';
  const KEY_POSITION = 'ftf_pos_v1';
  const KEY_THEME = 'ftf_theme_v1';
  const KEY_LANG = 'ftf_lang_v1';
  const KEY_HISTORY = 'ftf_history_v1';

  const DEFAULT_THEME = { bg: '#970000' };
  
  // 预设色块：AO3红、AO3蓝、莫兰迪灰绿、莫兰迪灰紫
  const PRESET_COLORS = ['#970000', '#2d7396', '#5F7161', '#6C5B68'];

  const LAUNCHER_W = 22;
  const LAUNCHER_H = 34;
  const PANEL_SIZE = 250; 
  const TAIL_DEPTH = 12;
  const LIMIT_Y = 75; 

  const IGNORED_TAGS = new Set([
    'general audiences', 'teen and up audiences', 'mature', 'explicit', 'not rated',
    'creator chose not to use archive warnings', 'no archive warnings apply',
    'graphic depictions of violence', 'major character death', 'rape/non-con', 'underage',
    'no warnings apply', 'choose not to use archive warnings',
    'f/m', 'm/m', 'f/f', 'multi', 'gen', 'other'
  ]);

  const I18N = {
    en: {
      title: 'First Tag Filter',
      placeholder: 'Enter Keywords',
      statusFiltered: 'Filtered on this page: ',
      statusSuffix: '',
      helpTitle: 'About',
      helpText: `
        <p><strong>Core Function</strong><br>Guarantees your favorite ship or character is the first tag, filtering out fics where they are just side characters.</p>
        <p><strong>How it works</strong><br>Only runs on pages with a work list, checking the first valid tag on each card, skipping Fandoms, Ratings, and Warnings.</p>
      `,
      setTitle: 'Settings',
      setColor: 'Theme Color',
      setLang: 'Language',
      setReset: 'Restore Defaults',
      customTitle: 'Custom Color',
      recentColors: 'Recent',
      palette: 'Palette'
    },
    zh: {
      title: '首位 Tag 过滤器',
      placeholder: '输入关键词',
      statusFiltered: '本页过滤了 ',
      statusSuffix: ' 篇',
      helpTitle: '关于本插件',
      helpText: `
        <p><strong>核心功能</strong><br>确保喜欢的 CP 或角色是文章的首位有效 Tag，过滤掉他们只是配角的文章。</p>
        <p><strong>工作原理</strong><br>仅在包含作品列表的页面运行，检查卡片上的首个有效 Tag，自动跳过分级、警告和 Fandom。</p>
      `,
      setTitle: '设置',
      setColor: '主题颜色',
      setLang: '语言',
      setReset: '恢复默认',
      customTitle: '自定义颜色',
      recentColors: '最近使用',
      palette: '调色盘'
    }
  };

  // ---------- 工具 ----------
  const safeGet = (k, d) => { try { return GM_getValue(k, d); } catch { return d; } };
  const safeSet = (k, v) => { try { GM_setValue(k, v); } catch {} };
  const norm = s => (s || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  function loadObject(key, fallback) {
    try {
      const raw = safeGet(key, null);
      if (!raw) return { ...fallback };
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...fallback, ...(parsed || {}) };
    } catch { return { ...fallback }; }
  }

  function getSafePosition(x, y) {
    const safeX = Math.max(0, Math.min(innerWidth - LAUNCHER_W, x));
    const minY = LIMIT_Y;
    const maxY = Math.max(minY, innerHeight - LAUNCHER_H - LIMIT_Y);
    const safeY = Math.max(minY, Math.min(maxY, y));
    return { x: safeX, y: safeY };
  }

  // ---------- 状态初始化 ----------
  let active = !!safeGet(KEY_ACTIVE, false);
  let query = String(safeGet(KEY_QUERY, '') || '');
  let currentLang = String(safeGet(KEY_LANG, 'en'));
  let theme = loadObject(KEY_THEME, DEFAULT_THEME);
  
  // 加载历史颜色（最多保留5个）
  let historyColors = [];
  try {
    const rawHistory = safeGet(KEY_HISTORY, '[]');
    historyColors = JSON.parse(rawHistory);
    if (!Array.isArray(historyColors)) historyColors = [];
  } catch { historyColors = []; }

  let savedPosition = loadObject(KEY_POSITION, {
    x: Math.max(0, innerWidth - LAUNCHER_W),
    y: Math.round(innerHeight * 0.6)
  });
  savedPosition = getSafePosition(savedPosition.x || 0, savedPosition.y || 0);

  let panelOpen = false;
  const originalDisplay = new WeakMap();

  // ---------- UI 构建 ----------
  const launcher = document.createElement('button');
  launcher.id = 'ftf-launcher';
  launcher.type = 'button';
  
  const panel = document.createElement('section');
  panel.id = 'ftf-panel';
  panel.setAttribute('role', 'dialog');
  
  const style = document.createElement('style');
  style.textContent = `
    #ftf-launcher {
      position: fixed; width: ${LAUNCHER_W}px; height: ${LAUNCHER_H}px;
      padding: 0 !important; margin: 0 !important; border: none !important; border-radius: 0 !important;
      z-index: 2147483646; cursor: grab; touch-action: none;
      background: var(--ftf-bg, #970000) !important; background-image: none !important; box-shadow: none !important;
      transition: transform 0.1s ease;
    }
    #ftf-launcher:hover, #ftf-launcher:active, #ftf-launcher:focus {
      background: var(--ftf-bg, #970000) !important; outline: none !important;
    }
    #ftf-launcher::before, #ftf-launcher::after { display: none !important; }

    #ftf-panel {
      display: none; position: fixed; z-index: 2147483647;
      width: ${PANEL_SIZE}px; height: ${PANEL_SIZE}px; box-sizing: border-box;
      font-family: "Lucida Grande", "Lucida Sans Unicode", Verdana, Helvetica, sans-serif;
      color: #ffffff; user-select: none; filter: drop-shadow(0 6px 16px rgba(0,0,0,0.25)); background: transparent;
    }
    
    #ftf-bg-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }

    .ftf-view { display: none; flex-direction: column; align-items: center; justify-content: center; padding: 20px; width: 100%; height: 100%; box-sizing: border-box; }
    .ftf-view.active { display: flex; }

    .ftf-title { text-align: center; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; letter-spacing: 0.5px; white-space: nowrap; }

    .ftf-input-wrap { background: #ffffff; border-radius: 99px; padding: 0 12px; margin-bottom: 20px; display: flex; align-items: center; width: 90%; box-sizing: border-box; }
    #ftf-query { width: 100%; border: none; outline: none; background: transparent; font-size: 13px; padding: 8px 0; color: #333333; font-family: inherit; text-align: center; }
    #ftf-query::placeholder { color: #999999; font-weight: normal; }

    #ftf-action {
      width: 48px !important; height: 48px !important; min-width: 48px !important; min-height: 48px !important;
      aspect-ratio: 1 / 1 !important; border-radius: 50% !important; padding: 0 !important; margin: 0 auto !important;
      box-sizing: border-box !important; background: #ffffff !important; border: none !important; cursor: pointer;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      transition: transform 0.15s, filter 0.15s; flex-shrink: 0;
    }
    #ftf-action:hover { transform: scale(1.05); filter: brightness(0.95); }
    #ftf-action:active { transform: scale(0.95); }
    
    #ftf-action.play::after { content: ''; display: block; width: 0; height: 0; border-left: 16px solid var(--ftf-bg, #970000); border-top: 9px solid transparent; border-bottom: 9px solid transparent; margin-left: 6px; }
    #ftf-action.stop::after { content: ''; display: block; width: 12px; height: 16px; border-left: 4px solid var(--ftf-bg, #970000); border-right: 4px solid var(--ftf-bg, #970000); box-sizing: border-box; }

    #ftf-status { text-align: center; font-size: 11px; margin: 14px 0 0 0; min-height: 16px; opacity: 0.9; white-space: nowrap; }

    .ftf-bottom-right { position: absolute; bottom: 12px; right: 12px; display: flex; gap: 8px; }
    .ftf-icon { background: none !important; border: none !important; color: #ffffff !important; font-size: 15px; cursor: pointer; padding: 4px; opacity: 0.7; transition: opacity 0.2s; }
    .ftf-icon:hover { opacity: 1; }
    .ftf-back { position: absolute; top: 12px; left: 12px; font-size: 18px; }

    .ftf-content { font-size: 11px; line-height: 1.4; width: 100%; max-height: 155px; overflow-y: auto; margin-top: 8px; text-align: left; }
    .ftf-content::-webkit-scrollbar { display: none; }
    .ftf-content p { margin: 0 0 8px 0; }
    .ftf-content strong { font-weight: bold; font-size: 11.5px; }

    /* 设置页排版 */
    .ftf-setting-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.15); }
    .ftf-setting-row:first-child { border-top: 1px solid rgba(255,255,255,0.15); }
    .ftf-setting-label { font-size: 12px; opacity: 0.9; }
    
    /* 色块样式 */
    .ftf-color-btn { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; box-sizing: border-box; transition: transform 0.1s; flex-shrink: 0; }
    .ftf-color-btn:hover { transform: scale(1.15); }
    .ftf-color-btn.active { border-color: #ffffff; box-shadow: 0 0 0 2px rgba(255,255,255,0.3); }
    
    /* 加号按钮 */
    .ftf-btn-custom {
      background: rgba(255,255,255,0.15) !important;
      border: 1px dashed rgba(255,255,255,0.5) !important;
      position: relative; display: flex; align-items: center; justify-content: center;
    }
    .ftf-btn-custom::after {
      content: '+'; color: #fff; font-size: 14px; font-weight: 600;
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -52%);
      line-height: 1;
    }

    /* 自定义颜色页面专属 */
    .ftf-custom-section { width: 100%; padding: 0 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }
    .ftf-custom-title { font-size: 11px; opacity: 0.7; margin-bottom: 6px; display: block; }
    .ftf-history-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; min-height: 24px; }
    
    .ftf-picker-row { display: flex; gap: 8px; align-items: center; }
    
    /* 美化原生取色器 */
    input[type="color"] {
      -webkit-appearance: none; border: none; padding: 0;
      width: 32px; height: 32px; border-radius: 50%; overflow: hidden; cursor: pointer;
      background: transparent;
    }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: 2px solid #fff; border-radius: 50%; }

    .ftf-hex-input {
      flex: 1; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); outline: none;
      background: rgba(255,255,255,0.9); color: #333; font-size: 13px; padding: 0 10px;
      text-align: center; font-family: monospace; box-sizing: border-box;
    }

    /* 语言切换 */
    .ftf-lang-switch { display: flex; background: rgba(0,0,0,0.2); border-radius: 99px; padding: 2px; }
    .ftf-lang-btn { border: none !important; background: transparent !important; color: #fff; padding: 4px 10px; border-radius: 99px; cursor: pointer; font-size: 10.5px; opacity: 0.6; transition: all 0.2s; }
    .ftf-lang-btn.active { background: #ffffff !important; color: var(--ftf-bg, #970000) !important; opacity: 1; font-weight: bold; }

    /* 重置按钮 */
    .ftf-btn-reset { background: transparent !important; border: none !important; color: rgba(255,255,255,0.7) !important; font-size: 11px; cursor: pointer; margin-top: 16px; padding: 6px 12px; text-decoration: underline; transition: color 0.2s; }
    .ftf-btn-reset:hover { color: #ffffff !important; }
  `;

  panel.innerHTML = `
    <svg id="ftf-bg-svg"><path id="ftf-path" fill="var(--ftf-bg, #970000)" /></svg>

    <div id="view-main" class="ftf-view active">
      <h2 class="ftf-title" data-i18n="title"></h2>
      <div class="ftf-input-wrap">
        <input id="ftf-query" type="text" spellcheck="false">
      </div>
      <button id="ftf-action" class="play"></button>
      <p id="ftf-status"></p>
      <div class="ftf-bottom-right">
        <button class="ftf-icon" id="btn-help" title="Help">?</button>
        <button class="ftf-icon" id="btn-settings" title="Settings">⚙</button>
      </div>
    </div>

    <div id="view-help" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-help">←</button>
      <h3 style="text-align:center;margin:0 0 6px 0;font-size:14px;" data-i18n="helpTitle"></h3>
      <div class="ftf-content" data-i18n="helpText"></div>
    </div>

    <!-- 设置主页面 -->
    <div id="view-settings" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-set">←</button>
      <h3 style="text-align:center;margin:0 0 10px 0;font-size:14px;" data-i18n="setTitle"></h3>
      
      <div style="width: 100%; padding: 0 10px; box-sizing: border-box;">
        <div class="ftf-setting-row">
          <span class="ftf-setting-label" data-i18n="setColor"></span>
          <div class="ftf-history-row" id="settings-preset-row">
            <!-- 4个预设 + 加号按钮 由 JS 渲染 -->
          </div>
        </div>
        
        <div class="ftf-setting-row">
          <span class="ftf-setting-label" data-i18n="setLang"></span>
          <div class="ftf-lang-switch">
            <button id="lang-en" class="ftf-lang-btn">EN</button>
            <button id="lang-zh" class="ftf-lang-btn">中文</button>
          </div>
        </div>

        <div style="text-align: center;">
          <button id="btn-reset" class="ftf-btn-reset" data-i18n="setReset"></button>
        </div>
      </div>
    </div>

    <!-- 自定义颜色独立页面 -->
    <div id="view-custom" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-custom">←</button>
      <h3 style="text-align:center;margin:0 0 16px 0;font-size:14px;" data-i18n="customTitle"></h3>
      
      <div class="ftf-custom-section">
        <!-- 上方：历史颜色 -->
        <div>
          <span class="ftf-custom-title" data-i18n="recentColors"></span>
          <div class="ftf-history-row" id="custom-history-row">
            <!-- 动态渲染最多5个历史色块 -->
          </div>
        </div>
        
        <!-- 下方：调色盘 -->
        <div>
          <span class="ftf-custom-title" data-i18n="palette"></span>
          <div class="ftf-picker-row">
            <input type="color" id="custom-picker" value="#970000">
            <input type="text" id="custom-hex" class="ftf-hex-input" placeholder="#HEX" maxlength="7">
          </div>
        </div>
      </div>
    </div>
  `;

  document.head.appendChild(style);
  document.body.append(launcher, panel);

  const $query = panel.querySelector('#ftf-query');
  const $action = panel.querySelector('#ftf-action');
  const $status = panel.querySelector('#ftf-status');
  const $path = panel.querySelector('#ftf-path');
  const $langBtns = { en: panel.querySelector('#lang-en'), zh: panel.querySelector('#lang-zh') };
  
  const $settingsPresetRow = panel.querySelector('#settings-preset-row');
  const $customHistoryRow = panel.querySelector('#custom-history-row');
  const $customPicker = panel.querySelector('#custom-picker');
  const $customHex = panel.querySelector('#custom-hex');

  // ---------- 渲染色块 ----------
  function renderColorBtns() {
    // 1. 渲染设置主页的预设（4个预设 + 加号）
    $settingsPresetRow.innerHTML = '';
    PRESET_COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'ftf-color-btn';
      btn.dataset.color = color;
      btn.style.background = color;
      if (color === theme.bg) btn.classList.add('active');
      
      btn.addEventListener('click', () => {
        theme.bg = color;
        safeSet(KEY_THEME, JSON.stringify(theme));
        applyTheme();
      });
      $settingsPresetRow.appendChild(btn);
    });

    const customBtn = document.createElement('button');
    customBtn.className = 'ftf-color-btn ftf-btn-custom';
    customBtn.title = 'Custom Color';
    customBtn.addEventListener('click', () => {
      switchView('view-custom');
      // 同步当前颜色到调色盘
      $customPicker.value = theme.bg;
      $customHex.value = theme.bg.toUpperCase();
    });
    $settingsPresetRow.appendChild(customBtn);

    // 2. 渲染自定义页面的历史颜色
    $customHistoryRow.innerHTML = '';
    const recent5 = historyColors.slice(0, 5);
    if (recent5.length === 0) {
      $customHistoryRow.innerHTML = '<span style="font-size:11px;opacity:0.5;">None</span>';
    } else {
      recent5.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'ftf-color-btn';
        btn.dataset.color = color;
        btn.style.background = color;
        if (color === theme.bg) btn.classList.add('active');
        
        btn.addEventListener('click', () => {
          theme.bg = color;
          safeSet(KEY_THEME, JSON.stringify(theme));
          applyTheme();
          switchView('view-settings');
        });
        $customHistoryRow.appendChild(btn);
      });
    }
  }

  // 调色盘监听
  $customPicker.addEventListener('input', (e) => {
    const hex = e.target.value.toUpperCase();
    $customHex.value = hex;
    theme.bg = hex;
    safeSet(KEY_THEME, JSON.stringify(theme));
    applyTheme();
  });

  // HEX 输入监听
  $customHex.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let val = $customHex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const hex = val.toUpperCase();
        theme.bg = hex;
        safeSet(KEY_THEME, JSON.stringify(theme));
        
        // 更新历史记录
        if (!PRESET_COLORS.includes(hex)) {
          historyColors = historyColors.filter(c => c !== hex);
          historyColors.unshift(hex);
          if (historyColors.length > 5) historyColors.pop();
          safeSet(KEY_HISTORY, JSON.stringify(historyColors));
        }
        
        renderColorBtns();
        applyTheme();
        switchView('view-settings');
      }
    }
  });

  // 当调色盘选完关闭时（change事件），也记入历史
  $customPicker.addEventListener('change', () => {
    const hex = $customPicker.value.toUpperCase();
    if (!PRESET_COLORS.includes(hex)) {
      historyColors = historyColors.filter(c => c !== hex);
      historyColors.unshift(hex);
      if (historyColors.length > 5) historyColors.pop();
      safeSet(KEY_HISTORY, JSON.stringify(historyColors));
      renderColorBtns();
    }
  });

  // ---------- 渲染与逻辑 ----------
  function applyTheme() {
    document.documentElement.style.setProperty('--ftf-bg', theme.bg);
    panel.querySelectorAll('.ftf-color-btn').forEach(btn => {
      if (btn.dataset.color === theme.bg) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function renderText() {
    const dict = I18N[currentLang];
    panel.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.innerHTML = dict[key];
    });
    $query.placeholder = dict.placeholder;
    $langBtns.en.classList.toggle('active', currentLang === 'en');
    $langBtns.zh.classList.toggle('active', currentLang === 'zh');
    updateStatusText(); 
  }

  function updateStatusText() {
    if (active) {
      const visibleCount = getCards().filter(c => c.style.display !== 'none').length;
      const dict = I18N[currentLang];
      const suffix = dict.statusSuffix || '';
      $status.textContent = dict.statusFiltered + visibleCount + suffix;
    } else {
      $status.textContent = '';
    }
  }

  function placeLauncher() {
    launcher.style.left = `${savedPosition.x}px`;
    launcher.style.top = `${savedPosition.y}px`;
    launcher.style.clipPath = savedPosition.x > innerWidth / 2 ? 'polygon(100% 0, 100% 100%, 0 50%)' : 'polygon(0 0, 0 100%, 100% 50%)';
  }

  function placePanel() {
    const onRight = savedPosition.x > innerWidth / 2;
    const bite = 4; 
    let left = onRight ? (savedPosition.x + bite) - PANEL_SIZE : (savedPosition.x + LAUNCHER_W - bite);
    let top = savedPosition.y + (LAUNCHER_H / 2) - (PANEL_SIZE / 2);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;

    const launcherCenterY = savedPosition.y + LAUNCHER_H / 2;
    let tailTop = launcherCenterY - top;

    const r = 20, w = PANEL_SIZE, h = PANEL_SIZE;
    let d = '';
    if (!onRight) {
      d = `M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${tailTop+10} L ${TAIL_DEPTH} ${tailTop} L 0 ${tailTop-10} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    } else {
      d = `M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${tailTop-10} L ${w-TAIL_DEPTH} ${tailTop} L ${w} ${tailTop+10} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    $path.setAttribute('d', d);
  }

  function switchView(viewId) {
    panel.querySelectorAll('.ftf-view').forEach(v => v.classList.remove('active'));
    panel.querySelector(`#${viewId}`).classList.add('active');
  }

  function togglePanel(force) {
    panelOpen = typeof force === 'boolean' ? force : !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    if (panelOpen) {
      switchView('view-main');
      if (active) $action.classList.replace('play', 'stop');
      else $action.classList.replace('stop', 'play');
      updateStatusText();
      requestAnimationFrame(placePanel);
    }
  }

  // ---------- 拖拽与吸附 ----------
  let dragging = false, moved = false, dragStart = null;

  launcher.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true; moved = false;
    dragStart = { x: e.clientX, y: e.clientY, sx: savedPosition.x, sy: savedPosition.y };
    launcher.style.cursor = 'grabbing';
    try { launcher.setPointerCapture(e.pointerId); } catch {}
  });

  launcher.addEventListener('pointermove', e => {
    if (!dragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    moved = true;
    e.preventDefault();
    savedPosition = getSafePosition(dragStart.sx + dx, dragStart.sy + dy);
    placeLauncher();
    if (panelOpen) placePanel();
  });

  function finishDrag(e) {
    if (!dragging) return;
    dragging = false;
    launcher.style.cursor = 'grab';
    try { launcher.releasePointerCapture(e.pointerId); } catch {}
    if (moved) {
      let targetX = savedPosition.x < innerWidth / 2 ? 0 : innerWidth - LAUNCHER_W;
      savedPosition = getSafePosition(targetX, savedPosition.y);
      placeLauncher();
      if (panelOpen) placePanel();
      safeSet(KEY_POSITION, JSON.stringify(savedPosition));
      let blockClick = ev => { ev.stopPropagation(); ev.preventDefault(); };
      launcher.addEventListener('click', blockClick, { once: true });
      setTimeout(() => launcher.removeEventListener('click', blockClick), 300);
    } else {
      togglePanel();
    }
    dragStart = null;
  }

  launcher.addEventListener('pointerup', finishDrag);
  launcher.addEventListener('pointercancel', finishDrag);

  // ---------- 事件绑定 ----------
  $query.addEventListener('input', () => { query = $query.value.trim(); safeSet(KEY_QUERY, query); });

  $action.addEventListener('click', () => {
    if (!active) {
      if (!query) { $query.focus(); return; }
      active = true; safeSet(KEY_ACTIVE, true);
      $action.classList.replace('play', 'stop');
      applyFilter();
    } else {
      active = false; safeSet(KEY_ACTIVE, false);
      $action.classList.replace('stop', 'play');
      restoreCards();
      updateStatusText();
    }
  });

  panel.querySelector('#btn-help').addEventListener('click', () => switchView('view-help'));
  panel.querySelector('#btn-settings').addEventListener('click', () => switchView('view-settings'));
  panel.querySelector('#btn-back-help').addEventListener('click', () => switchView('view-main'));
  panel.querySelector('#btn-back-set').addEventListener('click', () => switchView('view-main'));
  panel.querySelector('#btn-back-custom').addEventListener('click', () => switchView('view-settings'));

  $langBtns.en.addEventListener('click', () => { currentLang = 'en'; safeSet(KEY_LANG, 'en'); renderText(); });
  $langBtns.zh.addEventListener('click', () => { currentLang = 'zh'; safeSet(KEY_LANG, 'zh'); renderText(); });

  panel.querySelector('#btn-reset').addEventListener('click', () => {
    theme = { ...DEFAULT_THEME };
    safeSet(KEY_THEME, JSON.stringify(theme));
    historyColors = [];
    safeSet(KEY_HISTORY, JSON.stringify(historyColors));
    renderColorBtns();
    applyTheme();
    currentLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    safeSet(KEY_LANG, currentLang);
    renderText();
  });

  window.addEventListener('resize', () => {
    savedPosition = getSafePosition(savedPosition.x, savedPosition.y);
    placeLauncher();
    if (panelOpen) placePanel();
  });

  // ---------- 筛选核心 ----------
  let cachedList = null;
  function getList() {
    if (cachedList && cachedList.isConnected) return cachedList;
    const sels = ['ol.work.index.group', 'ol.work.index', 'ol.bookmark.index.group', 'ol.bookmark.index'];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        if (el.querySelector('li.work.blurb, li.blurb.work, li.bookmark.blurb, li.blurb.bookmark')) {
          cachedList = el; return el;
        }
      }
    }
    return null;
  }

  function getCards() {
    const list = getList();
    if (!list) return [];
    return [...list.children].filter(el => el.tagName === 'LI' && el.querySelector('a.tag'));
  }

  function firstEffectiveTag(card) {
    const links = card.querySelectorAll('a.tag');
    for (const a of links) {
      if (a.closest('.required-tags, .rating, .warnings, .warning, .category, .fandoms, .fandom')) continue;
      const label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!label) continue;
      const n = norm(label);
      if (IGNORED_TAGS.has(n)) continue;
      if (/^(creator chose not to use archive warnings|no archive warnings apply|graphic depictions of violence|major character death|rape\/non-con|underage)(\b|$)/i.test(label)) continue;
      return { label, href: a.href || '' };
    }
    return { label: '', href: '' };
  }

  function restoreCards() {
    for (const card of getCards()) {
      if (originalDisplay.has(card)) {
        const prev = originalDisplay.get(card);
        if (prev !== 'none') card.style.display = prev;
        originalDisplay.delete(card);
      } else if (card.dataset.ftfHidden === '1') {
        card.style.display = '';
      }
      delete card.dataset.ftfHidden;
    }
  }

  function applyFilter() {
    const q = norm(query);
    if (!q) return;
    const cards = getCards();
    let matched = 0;
    for (const card of cards) {
      const tag = firstEffectiveTag(card);
      const keep = !!tag.label && norm(tag.label).includes(q);
      if (keep) {
        if (originalDisplay.has(card)) {
          const prev = originalDisplay.get(card);
          if (prev !== 'none') card.style.display = prev;
          originalDisplay.delete(card);
        }
        delete card.dataset.ftfHidden;
        matched++;
      } else {
        if (!originalDisplay.has(card)) originalDisplay.set(card, card.style.display || '');
        card.style.display = 'none';
        card.dataset.ftfHidden = '1';
      }
    }
    const dict = I18N[currentLang];
    $status.textContent = dict.statusFiltered + matched + (dict.statusSuffix || '');
  }

  // ---------- 初始化 ----------
  renderColorBtns();
  applyTheme();
  renderText();
  placeLauncher();
  $query.value = query;

  if (active && query) {
    $action.classList.replace('play', 'stop');
    setTimeout(() => { if (getList()) applyFilter(); }, 500);
  }

})();
