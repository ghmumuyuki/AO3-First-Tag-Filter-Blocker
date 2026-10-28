// ==UserScript==
// @name         AO3 First Tag Filter & Blocker
// @name:zh-CN   AO3 首位 Tag 过滤器 & 屏蔽助手
// @namespace    local.first-tag-filter
// @version      3.9.5
// @description  Minimalist square draggable AO3 filter bubble with ultimate blocklist.
// @match        https://archiveofourown.org/*
// @match        https://www.archiveofourown.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      archiveofourown.org
// @connect      www.archiveofourown.org
// @require      https://cdn.jsdelivr.net/npm/pinyin-pro@3.24.3/dist/index.js
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';
  if (!/^(archiveofourown\.org|www\.archiveofourown\.org)$/i.test(location.hostname)) return;
  if (document.getElementById('ftf-launcher')) return;

  const K_P='ftf_pos_v2', K_T='ftf_theme_v2', K_L='ftf_lang_v2', K_H='ftf_history_v2', K_BW='ftf_bw_v2', K_BT='ftf_bt_v2', K_BS='ftf_bs_v2', K_HIDE='ftf_hide_reading_v2', K_RF='ftf_refill_active_v2';
  const S_KEY='ftf_refilled_ids_v2';
  const S_STATE='ftf_session_state_v2';

  const DEF_T={bg:'#970000'}, COLORS=['#970000','#2d7396','#5F7161','#6C5B68'], L_W=22, L_H=34, P_S=250, T_D=12, L_Y=75;
  const TARGET_VISIBLE=20, MAX_FETCH_PAGES=10, FETCH_DELAY_MS=600, MAX_SESSION_IDS=5000;
  const NEXT_SELECTORS = ['.pagination a[rel="next"]', 'ol.pagination a[rel="next"]', 'ul.pagination a[rel="next"]', 'nav.pagination a[rel="next"]', 'li.next a', 'li[rel="next"] a', 'a[rel="next"]', 'a.next', '.next a'];
  const IGNORE=new Set(['general audiences','teen and up audiences','mature','explicit','not rated','creator chose not to use archive warnings','no archive warnings apply','graphic depictions of violence','major character death','rape/non-con','underage','no warnings apply','choose not to use archive warnings','f/m','m/m','f/f','multi','gen','other']);

  const CAT_IMG_SRC = 'data:image/png;base64,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';

  const I18N={
    en:{
      title:'First Tag Filter & Blocker', placeholder:'Enter Keywords', helpTitle:'About',
      helpText:`<p>1. Core Function<br>Ensures your favorite ship/character is the first valid tag to block fics where they are just side characters. Also supports blocking specific works, tags, authors, or custom keywords.</p><p>2. How to Use<br>① Enter keywords and click ▶ to filter; only works whose first valid tag contains the keyword are kept. Click ⏸ to restore.<br>② On result pages, click the 🐱 icon next to the AO3 title to append tags from your local blocklist to the current native filters and generate a new URL.<br>③ Enter a keyword and click ＋ to add it to the Keyword blocklist. (Matching range: title, summary, author, and all tags).<br>④ Click the 🚫 icon at the end of the tags on a work card to open a panel and select specific Authors, Fandoms, Relationships, Characters, or Tags to add to the Tag blocklist.<br>⑤ Click the top-right folded corner of a work card to add it to the Work blocklist.<br>⑥ Turn on "Refill" to auto-fetch more works if the current results are under 20 (Recommended only in a stable network environment).<br>⑦ Manage your blocklists in the "Manage Blocklist" panel. Supports backup and migration.</p><p>3. How it Works<br>Applies only to the currently displayed search and filter result lists on AO3.<br>· First Tag Filter: Skips ratings, warnings, fandoms, and other fixed tags; only checks the first valid tag.<br>· Block: Works by comparing IDs, tags, authors, and matching card titles and summaries.<br>· Refill: Fetches works from subsequent pages matching the filter/block rules to fill up to 20. Fetched works are hidden on their original pages to avoid duplicates.<br>· Excluded URL: Writes tags into work_search[excluded_tag_names], letting the AO3 server handle the exclusion.</p>`,
      setTitle:'Settings', setColor:'Color', setLang:'Language', setReset:'Restore Defaults', customTitle:'Custom Color', recentColors:'Recent', palette:'Palette', manageBlocklist:'Manage Blocklist',
      tabKeywords:'Keywords', tabTags:'Tags', tabWorks:'Works', select:'Select', cancel:'Cancel', selectAll:'All', delSelected:'Delete', exportBtn:'Export', importBtn:'Import', impTitle:'Import Preview', impPlaceholder:'Paste Code here...', confirm:'Confirm', copied:'Copied!', invalidKey:'Invalid', mergeSuccess:'Imported!', noNewData:'No new data', unknownWork:'Unknown Work', blockTooltip:'Block permanently', emptyList:'List is empty', noneLabel:'None',
      hideReading:'Hide on Reading Page', pickerTitle:'Click to Block', pickerAuthor:'Author', pickerFandom:'Fandom', pickerRelation:'Relationship', pickerChar:'Character', pickerTag:'Tag', addedWork:'Added to blocked works',
      quickBlockAdded:'Added to Keywords', quickBlockExists:'Already in list',
      refilling:'Loading more...', refillFetched:'{n} fetched', refillFailed:'Refill failed', refillIdle:'Ready',
      refilledFromPage:'From page {n}',
      refillLabel:'Refill', addBlockTooltip:'Add to Keywords', refillCount:'{n} results',
      slTitle:'Select tags to exclude',
      slSelectAll:'Select All', slSelectNone:'Deselect All',
      slDone:'Done',
      slEmptyTags:'No tags in list',
      slExpand:'Expand', slCollapse:'Collapse',
      searchPlaceholder:'Fuzzy search (pinyin/initials)...'
    },
    zh:{
      title:'首位 Tag 过滤器 & 屏蔽助手', placeholder:'输入关键词', helpTitle:'关于本插件',
      helpText:`<p>1. 核心功能<br>确保喜欢的 CP 或角色处于作品的首位有效 Tag 中，屏蔽其只是配角的作品；同时支持屏蔽指定作品、Tag、作者或自定义关键词。</p><p>2. 操作方法<br>① 输入关键词点 ▶ 过滤，仅保留首位有效 Tag 包含该关键词的作品，点 ⏸ 恢复原状；<br>② 在 AO3 结果列表页，点击大标题末尾的 🐱 图标，即可基于当前页面的原生搜索条件，追加本地屏蔽名单里的标签，生成全新的结果链接；<br>③ 输入关键词点输入框右侧的 ＋ 加入关键词屏蔽名单，匹配范围包含标题、简介、作者和所有 Tag；<br>④ 点击作品卡片标签末尾的 🚫 图标，可弹出面板挑选作者、Fandom、关系、角色等真实 Tag 加入标签屏蔽名单；<br>⑤ 点击作品卡片右上角折角加入作品屏蔽名单；<br>⑥ 开启「补位」，当前页结果不足 20 条时自动向后抓取并补齐 (仅建议在网络环境稳定的条件下开启)；<br>⑦ 在“屏蔽管理”面板中对屏蔽名单进行管理，支持备份与迁移。</p><p>3. 工作原理<br>本插件仅基于 AO3 原站当前的搜索及过滤结果列表生效。<br>· 首位过滤：跳过分级、警告和 Fandom 等固定 Tag，仅检查作品的第一个有效 Tag；<br>· 屏蔽：通过比对作品 ID、Tag、作者，以及匹配卡片标题与简介实现；<br>· 补位：从后续页抓取符合过滤与屏蔽规则的作品补齐 20 条，补过的作品在原页自动隐藏防重复；<br>· 排除链接：把标签写入 work_search[excluded_tag_names]，交由 AO3 服务器端排除。</p>`,
      setTitle:'设置', setColor:'颜色', setLang:'语言', setReset:'恢复默认', customTitle:'自定义颜色', recentColors:'最近使用', palette:'调色盘', manageBlocklist:'屏蔽管理',
      tabKeywords:'关键词', tabTags:'标签', tabWorks:'作品', select:'选择', cancel:'取消', selectAll:'全选', delSelected:'删除选中', exportBtn:'导出', importBtn:'导入', impTitle:'导入预览', impPlaceholder:'在此粘贴密钥...', confirm:'确认合并', copied:'已复制密钥!', invalidKey:'密钥无效', mergeSuccess:'导入成功!', noNewData:'无新数据', unknownWork:'未知作品', blockTooltip:'永久屏蔽', emptyList:'列表为空', noneLabel:'无',
      hideReading:'阅读页自动隐藏', pickerTitle:'点击屏蔽', pickerAuthor:'作者', pickerFandom:'Fandom', pickerRelation:'关系', pickerChar:'角色', pickerTag:'标签', addedWork:'已加入作品黑名单',
      quickBlockAdded:'已加入关键词', quickBlockExists:'已在名单中',
      refilling:'补位中...', refillFetched:'已向后抓取 {n} 条', refillFailed:'补位失败', refillIdle:'待补位',
      refilledFromPage:'来自第 {n} 页',
      refillLabel:'补位', addBlockTooltip:'加入关键词', refillCount:'当前结果 {n} 条',
      slTitle:'选择要排除的标签',
      slSelectAll:'全选', slSelectNone:'全不选',
      slDone:'完成',
      slEmptyTags:'列表为空',
      slExpand:'展开', slCollapse:'收起',
      searchPlaceholder:'模糊搜索 (支持拼音/英文首字母)...'
    }
  };

  const gV=(k,d)=>{try{return GM_getValue(k,d)}catch{return d}}, sV=(k,v)=>{try{GM_setValue(k,v)}catch{}},
        norm=s=>(s||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim().toLowerCase(),
        esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
        lO=(k,f)=>{try{const r=gV(k,null);if(!r)return{...f};const p=typeof r==='string'?JSON.parse(r):r;return{...f,...(p||{})}}catch{return{...f}}},
        lA=(k)=>{try{const r=gV(k,'[]');const p=typeof r==='string'?JSON.parse(r):r;return Array.isArray(p)?p:[]}catch{return[]}},
        safePos=(x,y)=>({x:Math.max(0,Math.min(innerWidth-L_W,x)),y:Math.max(L_Y,Math.min(Math.max(L_Y,innerHeight-L_H-L_Y),y))}),
        encodeB64 = (str) => btoa(encodeURIComponent(str)),
        decodeB64 = (str) => decodeURIComponent(atob(str));

  function getPageFingerprint() {
    try {
      const u = new URL(location.href);
      u.searchParams.delete('page');
      u.hash = '';
      return u.toString();
    } catch { return location.href.split('?')[0]; }
  }

  function loadSessionState() {
    try {
      const raw = sessionStorage.getItem(S_STATE);
      if (!raw) return { q: '', a: false };
      const data = JSON.parse(raw);
      if (data.fp !== getPageFingerprint()) return { q: '', a: false };
      return { q: data.q || '', a: !!data.a };
    } catch { return { q: '', a: false }; }
  }
  function saveSessionState() {
    try {
      sessionStorage.setItem(S_STATE, JSON.stringify({ fp: getPageFingerprint(), q: query, a: active }));
    } catch {}
  }

  const sessState = loadSessionState();

  let active = sessState.a, query = sessState.q;
  let lang=String(gV(K_L,'en')), theme=lO(K_T,DEF_T), history=lA(K_H), blockedWorks=lA(K_BW), blockedTags=lA(K_BT);
  let blockedTagSources = lO(K_BS, {});
  if (blockedTags.length && Object.keys(blockedTagSources).length === 0) {
    blockedTags.forEach(t => { blockedTagSources[t] = 'tag'; });
    sV(K_BS, JSON.stringify(blockedTagSources));
  }
  let refillActive = gV(K_RF, true) !== false;
  let refillState = { kind: 'idle', n: 0 };
  let refillToken = 0;
  let hideReading = gV(K_HIDE, true), tempImportList = {keywords:[],tags:[],works:[]};
  let currentExtraH = 0;
  let currentViewId = 'view-main';

  let _blockedTagsNorm = null, _blockedWorkIds = null;
  function invalidateBlockCaches() { _blockedTagsNorm = null; _blockedWorkIds = null; }
  function getBlockedTagsNorm() {
    if (!_blockedTagsNorm) _blockedTagsNorm = blockedTags.map(norm);
    return _blockedTagsNorm;
  }
  function getBlockedWorkIds() {
    if (!_blockedWorkIds) _blockedWorkIds = new Set(blockedWorks.map(w => w.id));
    return _blockedWorkIds;
  }

  let savedPos = Object.values(lO(K_P,{x:Math.max(0,innerWidth-L_W),y:Math.round(innerHeight*0.6)}));
  let isDockedLeft = savedPos[0] <= innerWidth / 2;
  let pos = {
    x: isDockedLeft ? 0 : innerWidth - L_W,
    y: Math.max(L_Y, Math.min(Math.max(L_Y,innerHeight-L_H-L_Y), savedPos[1]))
  };

  let isOpen = false;
  let origDisp = new WeakMap();
  let pageLoadSessionIds = new Set();
  let currentTab = 'tags', isSelectMode = false, selectedItems = new Set();
  let slExpanded = false;
  let slChecked = new Set();
  let isFromNativePage = false;

  // 新增：搜索状态变量
  let manageSearchQuery = '';
  let slSearchQuery = '';

  const btn=document.createElement('button'); btn.id='ftf-launcher'; btn.type='button';
  const pnl=document.createElement('section'); pnl.id='ftf-panel';
  const sty=document.createElement('style');

  sty.textContent=`
    #ftf-launcher{position:fixed;width:${L_W}px;height:${L_H}px;padding:0!important;margin:0!important;border:none!important;border-radius:0!important;z-index:2147483646;cursor:grab;touch-action:none;background:var(--ftf-bg,#970000)!important;background-image:none!important;box-shadow:none!important;transition:opacity .3s;opacity:1;outline:none!important;}
    #ftf-launcher:hover{opacity:1!important;}
    #ftf-launcher.ftf-translucent{opacity:0.3!important;}
    #ftf-panel{display:none;position:fixed;z-index:2147483647;width:${P_S}px;height:${P_S}px;box-sizing:border-box;font-family:"Lucida Grande",Verdana,sans-serif;color:#fff;user-select:none;filter:drop-shadow(0 6px 16px rgba(0,0,0,.25));background:transparent;opacity:0;transform:scale(0.95);transition:opacity 0.2s ease-out,transform 0.2s ease-out;}
    #ftf-bg-svg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none}
    .ftf-view{display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;width:100%;height:100%;box-sizing:border-box}
    .ftf-view.active{display:flex}
    .ftf-title{text-align:center;font-size:14px;font-weight:600;margin:0 0 10px 0;white-space:nowrap}

    .ftf-search-row{position:relative;display:flex;align-items:center;justify-content:center;width:88%;margin:0 auto 12px;box-sizing:border-box;}
    .ftf-input-wrap{
      position:relative; background:#fff; border-radius:99px; padding:0 12px;
      display:flex; align-items:center; width:100%;
      box-sizing:border-box; overflow:hidden;
    }
    #ftf-query{
      width:100%; border:none; outline:none; background:transparent;
      padding:8px 24px; box-sizing:border-box;
      font-size:13px; text-align:center;
      color: #333 !important;
      -webkit-text-fill-color: #333 !important;
      caret-color: #333 !important;
      transition: color 0.2s;
      -webkit-appearance: none !important;
      appearance: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    #ftf-query:focus { outline: none !important; box-shadow: none !important; -webkit-appearance: none !important; }
    #ftf-query::placeholder { color: #b0b0b0 !important; -webkit-text-fill-color: #b0b0b0 !important; }
    #ftf-query:focus::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; opacity: 0 !important; }
    #ftf-query:-webkit-autofill, #ftf-query:-webkit-autofill:hover, #ftf-query:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px #fff inset !important;
      -webkit-text-fill-color: #333 !important;
      transition: background-color 5000s ease-in-out 0s;
    }
    #ftf-query::selection { background: rgba(151, 0, 0, 0.2); color: #333; }

    #btn-clear-query{
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      width:16px; height:16px; display:none; align-items:center; justify-content:center;
      background:none; border:none; padding:0; cursor:pointer;
      color:rgba(0,0,0,0.3); font-size:16px; font-family:monospace; line-height:1;
      transition:color 0.2s; -webkit-tap-highlight-color: transparent;
    }
    #btn-clear-query:hover { color:rgba(0,0,0,0.7); }

    #btn-add-block{
      position:absolute;right:-28px;top:50%;transform:translateY(-50%);
      width:28px!important;height:28px!important;min-width:28px!important;
      background:none!important;border:none!important;padding:0!important;margin:0!important;
      color:#fff!important;
      font-size:24px!important;font-weight:900!important;line-height:1!important;
      cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:opacity .15s,transform .15s;opacity:.9;
      -webkit-tap-highlight-color:transparent;z-index:3;
    }
    #btn-add-block:hover{opacity:1;transform:translateY(-50%) scale(1.08);}
    #btn-add-block:active{transform:translateY(-50%) scale(0.95);}

    .ftf-action-row{display:flex;gap:20px;align-items:center;justify-content:center;margin-bottom:6px}
    #ftf-action{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;aspect-ratio:1/1!important;border-radius:50%!important;padding:0!important;margin:0!important;box-sizing:border-box!important;border:none!important;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;transition:transform .15s,filter .15s;background:#fff!important;box-shadow:0 3px 8px rgba(0,0,0,.15);}
    #ftf-action.play::after{content:'';display:block;width:0;height:0;border-left:16px solid var(--ftf-bg,#970000);border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:6px}
    #ftf-action.stop::after{content:'';display:block;width:12px;height:16px;border-left:4px solid var(--ftf-bg,#970000);border-right:4px solid var(--ftf-bg,#970000);box-sizing:border-box}
    @keyframes ftf-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
    #ftf-query.ftf-shake{animation:ftf-shake .35s ease;}

    .ftf-bottom-right{position:absolute;bottom:12px;right:12px;display:flex;gap:8px}
    .ftf-icon{background:none!important;border:none!important;color:#fff!important;font-size:15px;cursor:pointer;padding:4px;opacity:.7}
    .ftf-icon:hover{opacity:1}
    .ftf-back{position:absolute;top:12px;left:12px;font-size:18px}
    .ftf-back-inline{position:static;flex-shrink:0;font-size:16px;padding:0 2px}
    .ftf-content{font-size:11px;line-height:1.4;width:100%;max-height:155px;overflow-y:auto;margin-top:8px;text-align:left}
    .ftf-setting-row{display:flex;justify-content:space-between;align-items:center;width:100%;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.15);cursor:pointer}
    .ftf-setting-row:first-child{border-top:1px solid rgba(255,255,255,.15)}
    .ftf-setting-label{font-size:12px;opacity:.9;flex-shrink:0;}
    .ftf-switch { position: relative; display: inline-block; width: 32px; height: 18px; flex-shrink: 0; }
    .ftf-switch input { opacity: 0; width: 0; height: 0; }
    .ftf-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.3); transition: .3s; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); }
    .ftf-slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
    .ftf-switch input:checked + .ftf-slider { background-color: #ffffff; border-color: #ffffff; }
    .ftf-switch input:checked + .ftf-slider:before { transform: translateX(14px); background-color: var(--ftf-bg, #970000); }

    .ftf-refill-toggle {
      position: absolute; top: 16px; right: 16px; z-index: 3;
      width: 54px; height: 24px; border-radius: 12px;
      background: linear-gradient(145deg, #ffffff, #e2e2e2);
      box-shadow: 2px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 3px rgba(0,0,0,0.1);
      border: 1px solid rgba(255,255,255,0.3);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 6px; box-sizing: border-box; padding: 0 8px;
      transition: all 0.2s cubic-bezier(.4,0,.2,1);
      user-select: none; -webkit-tap-highlight-color: transparent;
    }
    .ftf-refill-toggle:hover:not(:active) { filter: brightness(1.05); transform: translateY(-1px); }
    .ftf-refill-toggle:active { transform: translateY(1px) scale(0.98); box-shadow: 1px 1px 2px rgba(0,0,0,0.2), inset 2px 2px 5px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.5); }
    .ftf-refill-toggle .ftf-refill-dot { width: 6px; height: 6px; border-radius: 50%; background: #b0b0b0; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.3); transition: all 0.2s cubic-bezier(.4,0,.2,1); flex-shrink: 0; position: relative; z-index: 2; }
    .ftf-refill-toggle .ftf-refill-text { font-size: 10px; font-weight: 700; color: #666; text-shadow: 0 1px 1px rgba(255,255,255,0.8); transition: all 0.2s cubic-bezier(.4,0,.2,1); white-space: nowrap; position: relative; z-index: 2; }
    .ftf-refill-toggle.on { background: var(--ftf-bg, #970000); box-shadow: 2px 3px 8px rgba(0,0,0,0.4), inset 1px 1px 3px rgba(255,255,255,0.4), inset -1px -1px 3px rgba(0,0,0,0.3); border: 1px solid transparent; }
    .ftf-refill-toggle.on:active { box-shadow: 1px 1px 2px rgba(0,0,0,0.2), inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.2); }
    .ftf-refill-toggle.on .ftf-refill-dot { background: #ffffff; box-shadow: 0 0 8px rgba(255,255,255,0.9), 0 0 2px rgba(255,255,255,1), inset -1px -1px 2px rgba(0,0,0,0.15); }
    .ftf-refill-toggle.on .ftf-refill-text { color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(255,255,255,0.3); }

    .ftf-refill-info { position: absolute; bottom: 14px; left: 16px; display: flex; flex-direction: column; gap: 4px; z-index: 2; pointer-events: none; }
    .ftf-refill-info-row { display: flex; align-items: center; gap: 6px; font-size: 10px; white-space: nowrap; }
    .ftf-refill-info-dot { width: 6px; height: 6px; border-radius: 50%; background: #ffffff; flex-shrink: 0; box-shadow: 0 0 4px rgba(255,255,255,0.6); }
    .ftf-refill-info-text { color: rgba(255,255,255,0.85); }
    .ftf-refill-info-row.ftf-success .ftf-refill-info-text { color: #b6ffb6; }
    .ftf-refill-info-row.ftf-failed  .ftf-refill-info-text { color: #ffb6b6; }
    .ftf-refill-info-row.ftf-success .ftf-refill-info-dot { background: #b6ffb6; box-shadow: 0 0 4px rgba(182,255,182,0.7); }
    .ftf-refill-info-row.ftf-failed  .ftf-refill-info-dot { background: #ffb6b6; box-shadow: 0 0 4px rgba(255,182,182,0.7); }
    .ftf-refill-status-row.hidden { display: none; }

    .ftf-history-row{display:flex;gap:5px;align-items:center;justify-content:flex-end;flex-wrap:wrap;min-height:24px;flex:1;margin-left:10px;}
    .ftf-color-btn{width:16px;height:16px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-sizing:border-box;flex-shrink:0}
    .ftf-color-btn.active{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.5)}
    .ftf-btn-custom{background:rgba(255,255,255,.15)!important;border:1px dashed rgba(255,255,255,.5)!important;position:relative;display:flex;align-items:center;justify-content:center}
    .ftf-btn-custom::after{content:'+';color:#fff;font-size:12px;font-weight:600;position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);line-height:1}
    .ftf-custom-section{width:100%;padding:0 10px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}
    .ftf-custom-title{font-size:11px;opacity:.7;margin-bottom:6px;display:block}
    .ftf-picker-row{display:flex;gap:8px;align-items:center}
    input[type="color"]{-webkit-appearance:none;border:none;padding:0;width:32px;height:32px;border-radius:50%;overflow:hidden;cursor:pointer;background:transparent}
    input[type="color"]::-webkit-color-swatch-wrapper{padding:0}
    input[type="color"]::-webkit-color-swatch{border:2px solid #fff;border-radius:50%}
    .ftf-hex-input{flex:1;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.3);outline:none;background:rgba(255,255,255,.9);color:#333;font-size:13px;padding:0 10px;text-align:center;font-family:monospace;box-sizing:border-box}
    .ftf-lang-switch{display:flex;background:rgba(0,0,0,.2);border-radius:99px;padding:2px}
    .ftf-lang-btn{border:none!important;background:transparent!important;color:#fff;padding:4px 10px;border-radius:99px;cursor:pointer;font-size:10px;opacity:.6}
    .ftf-lang-btn.active{background:#fff!important;color:var(--ftf-bg,#970000)!important;opacity:1;font-weight:bold}
    .ftf-btn-reset{background:transparent!important;border:none!important;color:rgba(255,255,255,.7)!important;font-size:11px;cursor:pointer;margin-top:4px;padding:4px 12px;text-decoration:underline}

    #view-manage { padding: 15px; padding-bottom: 22px; position: relative; }
    .ftf-mg-header { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 8px; gap:8px; }
    .ftf-tabs { display: flex; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 2px; width: 168px; flex-shrink:0; }
    .ftf-tab { flex: 1; text-align: center; padding: 4px 0; font-size: 11px; cursor: pointer; border-radius: 6px; opacity: 0.7; }
    .ftf-tab.active { background: #fff; color: var(--ftf-bg, #970000); font-weight: bold; opacity: 1; }

    .ftf-manage-list{width:100%;flex:1;overflow-y:auto;padding:0;box-sizing:border-box;text-align:left;margin-top:6px;}
    .ftf-manage-list::-webkit-scrollbar{display:none;}
    .ftf-manage-item{display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.1);font-size:11px;gap:8px;}
    .ftf-manage-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;opacity:.9}
    .ftf-mg-icon { font-size: 14px; cursor: pointer; opacity: 0.7; padding: 0 4px; }
    .ftf-mg-icon:hover { opacity: 1; }
    .ftf-mg-icon.check { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #fff; display: inline-block; box-sizing: border-box; }
    .ftf-mg-icon.check.active { background: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.3) inset; }

    .ftf-mg-footer { width: 100%; display: flex; flex-wrap: nowrap; gap: 6px; justify-content: center; margin-top: 8px; }
    .ftf-mg-btn { flex: 1 1 30%; padding: 8px 0; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 11px; cursor: pointer; text-align: center; transition: 0.2s; }
    .ftf-mg-btn:hover { background: rgba(255,255,255,0.2); }
    .ftf-mg-btn.danger { background: rgba(255,0,0,0.3); border-color: rgba(255,0,0,0.5); }
    #ftf-footer-default { margin-top: 6px; }
    #ftf-footer-select { margin-top: 6px; }

    #ftf-imp-layer{display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:var(--ftf-bg,#970000);z-index:20;flex-direction:column;align-items:center;justify-content:center;padding:15px;box-sizing:border-box;border-radius:20px;}
    #ftf-imp-layer.active{display:flex;}
    #ftf-imp-code{width:100%;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);padding:0 10px;font-size:11px;box-sizing:border-box;margin-bottom:8px;background:rgba(255,255,255,0.9);color:#333;font-family:monospace;outline:none;flex-shrink:0;}
    #ftf-imp-preview{width:100%;flex:1;min-height:120px;max-height:180px;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;font-size:11px;box-sizing:border-box;margin-bottom:8px;color:#eee;text-align:left;word-break:break-all;line-height:1.5;}
    #ftf-imp-preview div{padding: 2px 0;}
    .ftf-imp-actions{display:flex;gap:10px;width:100%;flex-shrink:0;}
    .ftf-imp-actions button{flex:1;padding:8px;border-radius:6px;border:none;font-size:11px;cursor:pointer;}
    .ftf-imp-cancel{background:rgba(255,255,255,0.2);color:#fff;}
    .ftf-imp-confirm{background:#fff;color:var(--ftf-bg,#970000);font-weight:bold;}
    .ftf-empty-tip{text-align:center;font-size:11px;opacity:.5;margin-top:20px}

    .ftf-fold-corner{position:absolute;top:0;right:0;width:20px;height:20px;background-color:var(--ftf-bg,#970000);clip-path:polygon(0 0,100% 0,100% 100%);cursor:pointer;opacity:.25;transition:opacity .2s,transform .2s;z-index:10}
    .ftf-fold-corner:hover{opacity:1;transform:scale(1.1);transform-origin:top right}

    .ftf-tag-blocker { display: inline-flex; vertical-align: middle; width: 14px; height: 14px; border: 1.5px solid var(--ftf-bg,#970000); border-radius: 50%; position: relative; cursor: pointer; margin-left: 6px; opacity: 0.6; transition: 0.2s; box-sizing: border-box; }
    .ftf-tag-blocker::before { content: ''; position: absolute; top: 50%; left: 50%; width: 120%; height: 1.5px; background: var(--ftf-bg,#970000); transform: translate(-50%, -50%) rotate(-45deg); }
    .ftf-tag-blocker:hover { opacity: 1; transform: scale(1.1); }

    li[data-ftf-refilled="1"]{position:relative;background-color:rgba(128,128,128,0.04)!important;}
    li[data-ftf-refilled="1"]:hover{background-color:rgba(128,128,128,0.09)!important;}
    li[data-ftf-refilled="1"]::before{content:attr(data-ftf-badge);position:absolute;top:3px;left:4px;font-size:10px;line-height:1.3;color:rgba(0,0,0,0.55);pointer-events:none;z-index:2;white-space:nowrap;text-shadow:0 0 2px rgba(255,255,255,0.6);}

    #view-picker { padding: 15px; padding-bottom: 22px; justify-content: flex-start; }
    #view-picker h3 { margin-top: 4px; }
    #view-picker .ftf-content { max-height: none; flex: 1; min-height: 0; padding-right: 4px; }
    .ftf-picker-group { margin-bottom: 10px; }
    .ftf-picker-label { font-size: 10px; opacity: 0.7; margin-bottom: 4px; display: block; }
    .ftf-picker-item { display: inline-block; background: rgba(255,255,255,0.15); color: #fff; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin: 0 4px 6px 0; cursor: pointer; border: 1px solid transparent; transition: 0.2s; }
    .ftf-picker-item:hover { background: #fff; color: var(--ftf-bg,#970000); text-decoration: line-through; }

    .ftf-resize-handle{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:36px;height:6px;border-radius:3px;background:rgba(255,255,255,.35);cursor:ns-resize;display:none;z-index:30;touch-action:none;transition:background .2s;}
    .ftf-resize-handle:hover,.ftf-resize-handle:active{background:rgba(255,255,255,.75)}

    #ftf-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity 0.3s;}
    #ftf-toast.show{opacity:1;}

    #view-search { padding: 10px 15px 22px 15px; justify-content: flex-start; overflow: hidden; }

    /* 极简 Flex 头部 */
    #view-search .ftf-sl-header{display:flex;align-items:center;margin-top:5px;margin-bottom:8px;font-size:12px;font-weight:bold;flex-shrink:0;width:100%;box-sizing:border-box;padding: 0 8px; padding-right: 14px;}

    .ftf-sl-toggle{
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 4px;
      background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.3);
      color: rgba(255,255,255,0.4); cursor: pointer; padding: 0;
      transition: all 0.2s; box-sizing: border-box;
      margin-left: auto;
    }
    .ftf-sl-toggle:hover { background: rgba(0,0,0,0.3); }
    .ftf-sl-toggle.active { background: #fff; color: var(--ftf-bg, #970000); border-color: #fff; }
    .ftf-sl-toggle svg { width: 14px !important; height: 14px !important; display: block; }

    .ftf-sl-expand { display: none !important; }

    /* 列表：改成 Flex 换行，塞下更多胶囊，无灰底 */
    .ftf-sl-list {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 6px;
      width: 100%;
      overflow-y: scroll;
      padding: 8px;
      font-size: 11px;
      margin-bottom: 8px;
      flex: 1 1 0%;
      min-height: 0;
    }
    .ftf-sl-list::-webkit-scrollbar { width: 4px; }
    .ftf-sl-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.25); border-radius: 2px; }

    /* 胶囊标签样式 */
    .ftf-sl-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      border-radius: 14px;
      background: rgba(255,255,255,0.15);
      color: #fff;
      cursor: pointer;
      user-select: none;
      border: 1px solid transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 100%;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .ftf-sl-item span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .ftf-sl-item:hover { background: rgba(255,255,255,0.25); }

    /* 选中状态：白底红字 */
    .ftf-sl-item.active {
      background: #fff;
      color: var(--ftf-bg, #970000);
      font-weight: bold;
      border-color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* 完全隐藏原有的复选框 */
    .ftf-sl-item input {
      display: none !important;
    }

    .ftf-sl-empty { opacity: .55; font-style: italic; font-size: 11px; padding: 8px 4px; width: 100%; text-align: center; }

    /* 右下角胶囊完成按钮 */
    .ftf-sl-done {
      width: auto;
      padding: 6px 20px;
      background: #fff;
      color: var(--ftf-bg,#970000);
      font-weight: bold;
      border: none;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      flex-shrink: 0;
      transition: opacity .15s, transform .1s;
      margin-top: 6px;
      align-self: flex-end;
    }
    .ftf-sl-done:hover { opacity: .9; }
    .ftf-sl-done:active { transform: scale(0.95); }

    /* 通用搜索框样式 */
    #ftf-manage-search, #ftf-sl-search {
      width: 100%; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);
      background: rgba(0,0,0,0.2); color: #fff; font-size: 11px; padding: 0 8px;
      box-sizing: border-box; outline: none; margin-bottom: 6px; flex-shrink: 0;
    }
    #ftf-manage-search::placeholder, #ftf-sl-search::placeholder { color: rgba(255,255,255,0.4); }

    /* 猫猫头样式 */
    .ftf-cat-icon {
      display: inline-block;
      width: 0.9em;
      height: 0.9em;
      border-radius: 50%;
      border: 2px solid var(--ftf-bg, #970000);
      cursor: pointer;
      vertical-align: middle;
      margin-left: 6px;
      object-fit: cover;
      transition: transform 0.2s, filter 0.2s;
      transform: translateY(-2px);
    }
    .ftf-cat-icon:hover { transform: translateY(-2px) scale(1.15); filter: brightness(1.1); }
  `;

  pnl.innerHTML=`
    <svg id="ftf-bg-svg"><path id="ftf-path" fill="var(--ftf-bg,#970000)"/></svg>
    <div id="view-main" class="ftf-view active" style="position:relative;">
      <div class="ftf-refill-toggle" id="ftf-refill-toggle"><span class="ftf-refill-dot"></span><span class="ftf-refill-text" data-i18n="refillLabel">补位</span></div>
      <div class="ftf-refill-info" id="ftf-refill-info">
        <div class="ftf-refill-info-row ftf-refill-status-row hidden" id="ftf-refill-status-row"><span class="ftf-refill-info-dot"></span><span class="ftf-refill-info-text" id="ftf-refill-status-text"></span></div>
        <div class="ftf-refill-info-row" id="ftf-refill-count-row"><span class="ftf-refill-info-dot"></span><span class="ftf-refill-info-text" id="ftf-refill-count-text"></span></div>
      </div>
      <h2 class="ftf-title" data-i18n="title"></h2>
      <div class="ftf-search-row">
        <div class="ftf-input-wrap">
          <input id="ftf-query" type="text" spellcheck="false">
          <button id="btn-clear-query" title="Clear">×</button>
        </div>
        <button id="btn-add-block" data-i18n-title="addBlockTooltip">＋</button>
      </div>
      <div class="ftf-action-row">
        <button id="ftf-action" class="play" title="Filter"></button>
      </div>
      <div class="ftf-bottom-right"><button class="ftf-icon" id="btn-help">?</button><button class="ftf-icon" id="btn-settings">⚙</button></div>
    </div>
    <div id="view-help" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-help">←</button>
      <h3 style="text-align:center;margin:0 0 6px 0;font-size:14px;" data-i18n="helpTitle"></h3>
      <div class="ftf-content" data-i18n="helpText"></div>
    </div>
    <div id="view-settings" class="ftf-view" style="padding-top:25px;">
      <button class="ftf-icon ftf-back" id="btn-back-set">←</button>
      <h3 style="text-align:center;margin:0 0 8px 0;font-size:14px;" data-i18n="setTitle"></h3>
      <div style="width:100%;padding:0 10px;box-sizing:border-box;">
        <div class="ftf-setting-row"><span class="ftf-setting-label" data-i18n="setColor"></span><div class="ftf-history-row" id="settings-preset-row"></div></div>
        <div class="ftf-setting-row"><span class="ftf-setting-label" data-i18n="setLang"></span><div class="ftf-lang-switch"><button id="lang-en" class="ftf-lang-btn">EN</button><button id="lang-zh" class="ftf-lang-btn">中文</button></div></div>
        <div class="ftf-setting-row"><span class="ftf-setting-label" data-i18n="hideReading"></span><label class="ftf-switch"><input type="checkbox" id="chk-hide-reading"><span class="ftf-slider"></span></label></div>
        <div class="ftf-setting-row" id="btn-manage-blocklist"><span class="ftf-setting-label" data-i18n="manageBlocklist"></span><span style="font-size:12px;opacity:.7;">></span></div>
        <div style="text-align:center;"><button id="btn-reset" class="ftf-btn-reset" data-i18n="setReset"></button></div>
      </div>
    </div>
    <div id="view-custom" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-custom">←</button>
      <h3 style="text-align:center;margin:0 0 16px 0;font-size:14px;" data-i18n="customTitle"></h3>
      <div class="ftf-custom-section">
        <div><span class="ftf-custom-title" data-i18n="recentColors"></span><div class="ftf-history-row" id="custom-history-row"></div></div>
        <div><span class="ftf-custom-title" data-i18n="palette"></span><div class="ftf-picker-row"><input type="color" id="custom-picker" value="#970000"><input type="text" id="custom-hex" class="ftf-hex-input" placeholder="#HEX" maxlength="7"></div></div>
      </div>
    </div>
    <div id="view-manage" class="ftf-view">
      <div class="ftf-mg-header">
        <button class="ftf-icon ftf-back-inline" id="btn-back-manage">←</button>
        <div class="ftf-tabs">
          <div class="ftf-tab" id="tab-keywords" data-i18n="tabKeywords"></div>
          <div class="ftf-tab active" id="tab-tags" data-i18n="tabTags"></div>
          <div class="ftf-tab" id="tab-works" data-i18n="tabWorks"></div>
        </div>
      </div>
      <input type="text" id="ftf-manage-search" data-i18n-placeholder="searchPlaceholder">
      <div class="ftf-manage-list" id="blocklist-container"></div>
      <div class="ftf-mg-footer" id="ftf-footer-default">
        <button class="ftf-mg-btn" id="btn-export" data-i18n="exportBtn"></button>
        <button class="ftf-mg-btn" id="btn-import" data-i18n="importBtn"></button>
        <button class="ftf-mg-btn" id="btn-select-mode" data-i18n="select"></button>
      </div>
      <div class="ftf-mg-footer" id="ftf-footer-select" style="display:none;">
        <button class="ftf-mg-btn" id="btn-cancel-select" data-i18n="cancel"></button>
        <button class="ftf-mg-btn" id="btn-select-all" data-i18n="selectAll"></button>
        <button class="ftf-mg-btn danger" id="btn-del-selected" data-i18n="delSelected"></button>
      </div>
      <div id="ftf-imp-layer">
        <div style="font-size:12px;font-weight:bold;margin-bottom:8px;" data-i18n="impTitle"></div>
        <input type="text" id="ftf-imp-code" data-i18n-placeholder="impPlaceholder" spellcheck="false">
        <div id="ftf-imp-preview"></div>
        <div class="ftf-imp-actions"><button class="ftf-imp-cancel" id="btn-imp-cancel" data-i18n="cancel"></button><button class="ftf-imp-confirm" id="btn-imp-confirm" data-i18n="confirm"></button></div>
      </div>
    </div>
    <div id="view-picker" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-picker">←</button>
      <h3 style="text-align:center;margin:0 0 8px 0;font-size:14px;" data-i18n="pickerTitle"></h3>
      <div class="ftf-content" id="picker-list"></div>
    </div>
    <div id="view-search" class="ftf-view">
      <div class="ftf-sl-header">
        <button class="ftf-icon ftf-back-inline" id="btn-sl-close" style="font-size:18px;margin-left:-6px;">←</button>
        <span data-i18n="slTitle" style="flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>
        <button class="ftf-sl-toggle" id="ftf-sl-toggle-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>
      <input type="text" id="ftf-sl-search" data-i18n-placeholder="searchPlaceholder">
      <div class="ftf-sl-list" id="ftf-sl-list"></div>
      <button class="ftf-sl-done" id="ftf-sl-done" data-i18n="slDone">完成</button>
    </div>
    <div class="ftf-resize-handle" id="resize-handle"></div>
    <div id="ftf-toast"></div>`;

  document.head.appendChild(sty); document.body.append(btn,pnl);

  const $q=pnl.querySelector('#ftf-query'), $clearQuery=pnl.querySelector('#btn-clear-query'), $act=pnl.querySelector('#ftf-action'), $addBlock=pnl.querySelector('#btn-add-block'),
        $path=pnl.querySelector('#ftf-path'), $refillToggle=pnl.querySelector('#ftf-refill-toggle'),
        $refillStatusRow=pnl.querySelector('#ftf-refill-status-row'), $refillStatusText=pnl.querySelector('#ftf-refill-status-text'),
        $refillCountText=pnl.querySelector('#ftf-refill-count-text'), $lang={en:pnl.querySelector('#lang-en'),zh:pnl.querySelector('#lang-zh')},
        $presetRow=pnl.querySelector('#settings-preset-row'), $histRow=pnl.querySelector('#custom-history-row'),
        $picker=pnl.querySelector('#custom-picker'), $hex=pnl.querySelector('#custom-hex'), $blockList=pnl.querySelector('#blocklist-container'),
        $chkHide=pnl.querySelector('#chk-hide-reading'), $impLayer=pnl.querySelector('#ftf-imp-layer'), $impCode=pnl.querySelector('#ftf-imp-code'),
        $impPreview=pnl.querySelector('#ftf-imp-preview'), $toast=pnl.querySelector('#ftf-toast'), $tabKeywords=pnl.querySelector('#tab-keywords'),
        $tabTags=pnl.querySelector('#tab-tags'), $tabWorks=pnl.querySelector('#tab-works'), $btnSelectMode=pnl.querySelector('#btn-select-mode'),
        $btnCancelSelect=pnl.querySelector('#btn-cancel-select'),
        $footerDefault=pnl.querySelector('#ftf-footer-default'), $footerSelect=pnl.querySelector('#ftf-footer-select'),
        $pickerList=pnl.querySelector('#picker-list'), $resizeHandle=pnl.querySelector('#resize-handle'),
        $slList=pnl.querySelector('#ftf-sl-list'),
        $slToggleAll=pnl.querySelector('#ftf-sl-toggle-all'),
        $slDone=pnl.querySelector('#ftf-sl-done'), $slClose=pnl.querySelector('#btn-sl-close'),
        $manageSearch=pnl.querySelector('#ftf-manage-search'), $slSearch=pnl.querySelector('#ftf-sl-search');

  // 新增：终极模糊匹配函数
  function fuzzyMatch(str, query) {
    if (!query) return true;
    const cleanQuery = query.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
    if (!cleanQuery) return true;

    const rawStr = str.toLowerCase();
    let pyInitials = '';
    let pyFull = '';
    try {
      if (typeof pinyinPro !== 'undefined') {
        pyInitials = pinyinPro.pinyin(rawStr, { pattern: 'first', toneType: 'none', type: 'array' }).join('');
        pyFull = pinyinPro.pinyin(rawStr, { toneType: 'none', type: 'array' }).join('');
      }
    } catch (e) {}

    const cleanStr = rawStr.replace(/[^\w\u4e00-\u9fa5]/g, '');
    const cleanPy = pyInitials.replace(/[^\w]/g, '');
    const cleanPyFull = pyFull.replace(/[^\w]/g, '');

    const subMatch = (target, q) => {
      if (target.includes(q)) return true;
      let i = 0;
      for (let j = 0; j < target.length && i < q.length; j++) {
        if (target[j] === q[i]) i++;
      }
      return i === q.length;
    };

    return subMatch(cleanStr, cleanQuery) || subMatch(cleanPy, cleanQuery) || subMatch(cleanPyFull, cleanQuery);
  }

  function showToast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    setTimeout(()=>$toast.classList.remove('show'), 2000);
  }
  function updateClearBtnVisibility() { $clearQuery.style.display = $q.value.length > 0 ? 'flex' : 'none'; }
  function updateRefillCount() {
    const count = getCards().filter(c => c.style.display !== 'none').length;
    const tpl = I18N[lang].refillCount || '{n}';
    $refillCountText.textContent = tpl.replace('{n}', String(count));
  }
  function renderRefillStatus() {
    if (!refillActive) return;
    $refillStatusRow.classList.remove('ftf-success', 'ftf-failed');
    const d = I18N[lang];
    let text = d.refillIdle;
    if (refillState.kind === 'running') {
      text = d.refilling;
    } else if (refillState.kind === 'success') {
      text = d.refillFetched.replace('{n}', String(refillState.n || 0));
      $refillStatusRow.classList.add('ftf-success');
    } else if (refillState.kind === 'failed') {
      text = d.refillFailed;
      $refillStatusRow.classList.add('ftf-failed');
    }
    $refillStatusText.textContent = text;
  }
  function setRefillStatus(kind, n) {
    refillState.kind = kind || 'idle';
    refillState.n = typeof n === 'number' ? n : 0;
    renderRefillStatus();
    updateRefillCount();
  }
  function syncRefillInfoVisibility() {
    $refillToggle.classList.toggle('on', refillActive);
    if (refillActive) $refillStatusRow.classList.remove('hidden');
    else $refillStatusRow.classList.add('hidden');
    renderRefillStatus();
    updateRefillCount();
  }
  function checkPageVisibility() {
    if (!hideReading) { btn.style.display = 'block'; return; }
    if (!getList()) { btn.style.display = 'none'; if (isOpen) togglePnl(false); }
    else { btn.style.display = 'block'; }
  }

  let cList=null;
  function getList(){
    if(cList&&cList.isConnected)return cList;
    for(const s of['ol.work.index.group','ol.work.index','ol.bookmark.index.group','ol.bookmark.index']){
      for(const el of document.querySelectorAll(s)){
        if(el.querySelector('li.work.blurb,li.blurb.work,li.bookmark.blurb,li.blurb.bookmark')){cList=el;return el}
      }
    }
    return null;
  }
  function getCards(){
    const l=getList();
    return l?[...l.children].filter(el=>el.tagName==='LI'&&el.querySelector('a.tag')):[];
  }
  function getFirstTag(c){
    for(const a of c.querySelectorAll('a.tag')){
      if(a.closest('.required-tags,.rating,.warnings,.warning,.category,.fandoms,.fandom'))continue;
      const lb=(a.textContent||'').replace(/\s+/g,' ').trim(); if(!lb)continue;
      const n=norm(lb); if(IGNORE.has(n))continue;
      if(/^(creator chose not to use archive warnings|no archive warnings apply|graphic depictions of violence|major character death|rape\/non-con|underage)(\b|$)/i.test(lb))continue;
      return {label:lb,href:a.href||''};
    } return {label:'',href:''};
  }
  function cardWorkId(card){
    const a = card.querySelector('.heading a');
    if (!a) return null;
    const m = (a.getAttribute('href') || '').match(/\/works\/(\d+)/);
    return m ? m[1] : null;
  }

  function shouldHideCard(card, id, skipSession = false) {
    if (!skipSession && refillActive && id && pageLoadSessionIds.has(id)) return true;
    if (id && getBlockedWorkIds().has(id)) return true;

    const a = card.querySelector('.heading a');
    const summary = (card.querySelector('.summary')?.textContent) || '';
    const authors = [...card.querySelectorAll('a[rel="author"]')].map(x => x.textContent.trim()).join(' ');
    const tags = [...card.querySelectorAll('a.tag')].map(t => t.textContent.trim());
    const fullText = norm(`${a?.textContent || ''} ${summary} ${authors} ${tags.join(' ')}`);
    for (const bt of getBlockedTagsNorm()) {
      if (fullText.includes(bt)) return true;
    }

    if (active && query) {
      const ft = getFirstTag(card);
      if (!ft.label || !norm(ft.label).includes(norm(query))) return true;
    }
    return false;
  }

  function removeRefilledIds(ids) {
    if (!ids || !ids.length) return;
    try {
      const cur = getRefilledIds();
      const idSet = new Set(ids);
      const filtered = cur.ids.filter(id => !idSet.has(id));
      sessionStorage.setItem(S_KEY, JSON.stringify({ fp: getPageFingerprint(), ids: filtered }));
      for (const id of ids) pageLoadSessionIds.delete(id);
    } catch {}
  }

  function rebalanceRefill() {
    if (!refillActive) return;
    const list = getList();
    if (!list) return;

    const allCards = getCards();
    const refillCards = allCards.filter(c => c.dataset.ftfRefilled === '1');
    if (!refillCards.length) return;

    const nativeVisible = allCards.filter(c => c.dataset.ftfRefilled !== '1' && c.style.display !== 'none').length;
    const needed = Math.max(0, TARGET_VISIBLE - nativeVisible);

    const removedIds = [];
    let keptVisible = 0;

    for (const c of refillCards) {
      const isVisible = c.style.display !== 'none';
      if (isVisible && keptVisible < needed) {
        keptVisible++;
      } else {
        const id = cardWorkId(c);
        if (id) removedIds.push(id);
        c.remove();
      }
    }

    if (removedIds.length) removeRefilledIds(removedIds);

    if (removedIds.length && nativeVisible >= TARGET_VISIBLE && refillState.kind !== 'idle') {
      refillState = { kind: 'idle', n: 0 };
      renderRefillStatus();
    }
  }

  function applyAllStates() {
    const cards = getCards();
    for (const c of cards) {
      const id = cardWorkId(c);
      if (shouldHideCard(c, id)) {
        if (!origDisp.has(c)) origDisp.set(c, c.style.display || '');
        c.style.display = 'none';
      } else {
        if (origDisp.has(c)) {
          const p = origDisp.get(c);
          if (p !== 'none') c.style.display = p;
          origDisp.delete(c);
        } else {
          c.style.display = '';
        }
      }
    }
    rebalanceRefill();
    updateRefillCount();
  }

  function injectAndBlock(){
    const cards = getCards();
    cards.forEach(c => {
      const a = c.querySelector('.heading a'); if(!a) return;
      const m = (a.getAttribute('href')||'').match(/\/works\/(\d+)/); if(!m) return;
      const wId = m[1], wTitle = a.textContent.trim() || I18N[lang].unknownWork;

      if(!c.querySelector('.ftf-fold-corner')){
        if(window.getComputedStyle(c).position==='static') c.style.position='relative';
        const fold=document.createElement('div'); fold.className='ftf-fold-corner'; fold.title=I18N[lang].blockTooltip;
        fold.addEventListener('click',e=>{
          e.preventDefault(); e.stopPropagation();
          if(!blockedWorks.some(w=>w.id===wId)){blockedWorks.push({id:wId,title:wTitle}); saveBlocklist();}
          applyAllStates();
          if(pnl.querySelector('#view-manage').classList.contains('active')){
            if(currentTab === 'works') renderBlockList();
            else showToast(I18N[lang].addedWork);
          }
          triggerRefill();
        });
        c.appendChild(fold);
      }

      if(!c.querySelector('.ftf-tag-blocker')){
        const tagLinks = c.querySelectorAll('a.tag');
        if(tagLinks.length > 0) {
          const lastTag = tagLinks[tagLinks.length - 1];
          const blocker = document.createElement('span');
          blocker.className = 'ftf-tag-blocker';
          blocker.title = I18N[lang].blockTooltip;
          blocker.addEventListener('pointerdown', (e) => e.stopPropagation());
          blocker.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const groups = { 'Author': [], 'Fandom': [], 'Relationship': [], 'Character': [], 'Tag': [] };
            c.querySelectorAll('a[rel="author"]').forEach(a => { const t = a.textContent.trim(); if(t) groups['Author'].push(t); });
            c.querySelectorAll('a.tag').forEach(t => {
              const txt = t.textContent.trim();
              if(!txt || IGNORE.has(norm(txt))) return;
              const parentClass = t.parentElement.className;
              if(parentClass.includes('fandoms') || parentClass.includes('fandom')) groups['Fandom'].push(txt);
              else if(parentClass.includes('relationships')) groups['Relationship'].push(txt);
              else if(parentClass.includes('characters')) groups['Character'].push(txt);
              else groups['Tag'].push(txt);
            });
            let popHtml = '';
            let hasItems = false;
            const labelMap = {
              'Author': I18N[lang].pickerAuthor, 'Fandom': I18N[lang].pickerFandom,
              'Relationship': I18N[lang].pickerRelation, 'Character': I18N[lang].pickerChar, 'Tag': I18N[lang].pickerTag
            };
            for(let [k, arr] of Object.entries(groups)) {
              if(!arr.length) continue;
              hasItems = true;
              popHtml += `<div class="ftf-picker-group"><span class="ftf-picker-label">${labelMap[k]}</span>`;
              arr.forEach(item => { popHtml += `<span class="ftf-picker-item" data-val="${esc(item)}">${esc(item)}</span>`; });
              popHtml += `</div>`;
            }
            if(hasItems) {
              $pickerList.innerHTML = popHtml;
              if(!isOpen) togglePnl(true, 'view-picker');
              else switchView('view-picker');
            }
          });
          lastTag.insertAdjacentElement('afterend', blocker);
        }
      }
    });
  }

  function getRefilledIds() {
    try {
      const raw = sessionStorage.getItem(S_KEY);
      if (!raw) return { fp: '', ids: [] };
      const data = JSON.parse(raw);
      if (!data || data.fp !== getPageFingerprint()) return { fp: '', ids: [] };
      return { fp: data.fp, ids: Array.isArray(data.ids) ? data.ids : [] };
    } catch { return { fp: '', ids: [] }; }
  }
  function addRefilledIds(ids) {
    if (!ids.length) return;
    try {
      const cur = getRefilledIds();
      const merged = Array.from(new Set([...cur.ids, ...ids]));
      const trimmed = merged.length > MAX_SESSION_IDS ? merged.slice(-MAX_SESSION_IDS) : merged;
      sessionStorage.setItem(S_KEY, JSON.stringify({ fp: getPageFingerprint(), ids: trimmed }));
    } catch {}
  }
  function clearSessionStorage() {
    try { sessionStorage.removeItem(S_KEY); } catch {}
    pageLoadSessionIds = new Set();
  }

  function getNextPageUrlFromDoc(doc, baseUrl) {
    for (const sel of NEXT_SELECTORS) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const raw = el.getAttribute('href');
      if (!raw) continue;
      try { return new URL(raw, baseUrl).href; }
      catch { return raw; }
    }
    return null;
  }

  function getNextPageUrl() {
    return getNextPageUrlFromDoc(document, location.href);
  }

  function parsePageNum(url, fallback) {
    try {
      const p = parseInt(new URL(url).searchParams.get('page'), 10);
      return Number.isFinite(p) && p > 0 ? p : fallback;
    } catch { return fallback; }
  }

  function fetchNextPageCards(url, retries = 2) {
    return new Promise(resolve => {
      const attempt = (remain) => {
        try {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 20000,
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': navigator.language || 'en-US,en;q=0.9',
              'Referer': location.href
            },
            onload: (res) => {
              if (res.status === 429 || res.status === 503) {
                if (remain > 0) setTimeout(() => attempt(remain - 1), 2000 * (3 - remain));
                else resolve({ doc: null, type: 'rate_limited' });
                return;
              }
              if (res.status < 200 || res.status >= 400) {
                if (remain > 0) setTimeout(() => attempt(remain - 1), 1200);
                else resolve({ doc: null, type: 'network' });
                return;
              }
              const doc = new DOMParser().parseFromString(res.responseText || '', 'text/html');
              resolve({ doc, type: 'success' });
            },
            onerror: () => {
              if (remain > 0) setTimeout(() => attempt(remain - 1), 1200);
              else resolve({ doc: null, type: 'network' });
            },
            ontimeout: () => {
              if (remain > 0) setTimeout(() => attempt(remain - 1), 1200);
              else resolve({ doc: null, type: 'network' });
            }
          });
        } catch (e) { resolve({ doc: null, type: 'network' }); }
      };
      attempt(retries);
    });
  }

  let isRefilling = false, pendingRefill = false, refillTimer = null;

  async function refillPage() {
    if (!refillActive) return;
    if (isRefilling) { pendingRefill = true; return; }
    const list = getList();
    if (!list) return;

    const myToken = ++refillToken;
    isRefilling = true; pendingRefill = false;
    let aborted = false;

    try {
      let visibleCount = getCards().filter(c => c.style.display !== 'none').length;
      if (visibleCount >= TARGET_VISIBLE) return;

      setRefillStatus('running');

      const existingIds = new Set();
      getCards().forEach(c => { const id = cardWorkId(c); if (id) existingIds.add(id); });

      const newRefilledIds = [];
      let pagesFetched = 0;
      const currentPageNum = parsePageNum(location.href, 1);
      let fetchUrl = getNextPageUrl();
      const visited = new Set();

      while (visibleCount < TARGET_VISIBLE && pagesFetched < MAX_FETCH_PAGES && fetchUrl) {
        if (!refillActive) { aborted = true; break; }
        if (myToken !== refillToken) { aborted = true; break; }
        if (visited.has(fetchUrl)) break;
        visited.add(fetchUrl);

        const sourcePage = parsePageNum(fetchUrl, currentPageNum + pagesFetched + 1);

        const result = await fetchNextPageCards(fetchUrl);
        if (myToken !== refillToken) { aborted = true; break; }
        if (!result || result.type !== 'success' || !result.doc) break;

        const doc = result.doc;
        const cards = [...doc.querySelectorAll('li.work.blurb, li.blurb.work, li.bookmark.blurb, li.blurb.bookmark')];
        if (!cards.length) break;

        for (const rawCard of cards) {
          if (visibleCount >= TARGET_VISIBLE) break;
          if (myToken !== refillToken) { aborted = true; break; }
          const id = cardWorkId(rawCard);
          if (id && existingIds.has(id)) continue;
          if (shouldHideCard(rawCard, id, true)) continue;

          const imported = document.importNode(rawCard, true);
          imported.dataset.ftfRefilled = '1';
          imported.dataset.ftfFromPage = String(sourcePage);
          imported.dataset.ftfBadge = I18N[lang].refilledFromPage.replace('{n}', String(sourcePage));
          list.appendChild(imported);
          if (id) { existingIds.add(id); newRefilledIds.push(id); }
          visibleCount++;
        }
        if (aborted) break;

        pagesFetched++;
        fetchUrl = getNextPageUrlFromDoc(doc, fetchUrl);
        if (visibleCount < TARGET_VISIBLE && pagesFetched < MAX_FETCH_PAGES && fetchUrl) {
          await new Promise(r => setTimeout(r, FETCH_DELAY_MS));
          if (myToken !== refillToken) { aborted = true; break; }
        }
      }

      if (newRefilledIds.length) {
        addRefilledIds(newRefilledIds);
        injectAndBlock();
      }

      if (aborted || myToken !== refillToken) {
      } else if (newRefilledIds.length) {
        setRefillStatus('success', newRefilledIds.length);
      } else {
        setRefillStatus('failed');
        showToast(I18N[lang].refillFailed);
      }
    } catch (e) {
      if (myToken === refillToken) {
        setRefillStatus('failed');
        showToast(I18N[lang].refillFailed);
      }
    } finally {
      isRefilling = false;
      rebalanceRefill();
      updateRefillCount();
      if (aborted && refillState.kind === 'running') {
        setRefillStatus('idle');
      }
      if (pendingRefill && refillActive) {
        pendingRefill = false;
        setTimeout(refillPage, 300);
      }
    }
  }

  function triggerRefill() {
    if (!refillActive) return;
    if (!getList()) return;
    clearTimeout(refillTimer);
    refillTimer = setTimeout(refillPage, 100);
  }

  function switchTab(tab) {
    manageSearchQuery = '';
    if ($manageSearch) $manageSearch.value = '';
    currentTab = tab;
    $tabKeywords.classList.toggle('active', tab === 'keywords');
    $tabTags.classList.toggle('active', tab === 'tags');
    $tabWorks.classList.toggle('active', tab === 'works');
    exitSelectMode();
    closeSearchLayer();
  }
  function enterSelectMode() {
    isSelectMode = true; selectedItems.clear();
    $footerDefault.style.display = 'none'; $footerSelect.style.display = 'flex'; renderBlockList();
  }
  function exitSelectMode() {
    isSelectMode = false; selectedItems.clear();
    $footerDefault.style.display = 'flex'; $footerSelect.style.display = 'none'; renderBlockList();
  }

  function getCurrentTabList() {
    if (currentTab === 'works') return blockedWorks;
    if (currentTab === 'keywords') return blockedTags.filter(t => (blockedTagSources[t] || 'tag') === 'keyword');
    return blockedTags.filter(t => (blockedTagSources[t] || 'tag') === 'tag');
  }

  function renderBlockList() {
    $blockList.innerHTML = '';
    let list = getCurrentTabList();

    if (manageSearchQuery) {
      list = list.filter(item => {
        const text = currentTab === 'works' ? (item.title || item.id) : item;
        return fuzzyMatch(text, manageSearchQuery);
      });
    }

    if (!list.length) { $blockList.innerHTML = `<div class="ftf-empty-tip">${I18N[lang].emptyList}</div>`; return; }
    list.forEach(item => {
      const d = document.createElement('div'); d.className = 'ftf-manage-item';
      const text = currentTab === 'works' ? (item.title || item.id) : item;
      const titleSpan = document.createElement('span'); titleSpan.className = 'ftf-manage-title'; titleSpan.textContent = text; titleSpan.title = text;
      const actionSpan = document.createElement('span');
      if (isSelectMode) {
        actionSpan.className = `ftf-mg-icon check ${selectedItems.has(text) ? 'active' : ''}`;
        actionSpan.addEventListener('click', () => {
          if (selectedItems.has(text)) selectedItems.delete(text); else selectedItems.add(text);
          renderBlockList();
        });
      } else {
        actionSpan.className = 'ftf-mg-icon'; actionSpan.innerHTML = '×';
        actionSpan.addEventListener('click', () => {
          if (currentTab === 'works') {
            blockedWorks = blockedWorks.filter(w => w.id !== item.id);
          } else {
            blockedTags = blockedTags.filter(t => t !== text);
            delete blockedTagSources[text];
          }
          saveBlocklist(); renderBlockList(); applyAllStates(); triggerRefill();
        });
      }
      d.appendChild(titleSpan); d.appendChild(actionSpan); $blockList.appendChild(d);
    });
  }

  function saveBlocklist() {
    invalidateBlockCaches();
    sV(K_BT, JSON.stringify(blockedTags));
    sV(K_BW, JSON.stringify(blockedWorks));
    sV(K_BS, JSON.stringify(blockedTagSources));
  }

  function updateSlToggleLabel() {
    const all = getTagListForSearch();
    const d = I18N[lang];
    const isAll = (slChecked.size >= all.length && all.length > 0);
    $slToggleAll.title = isAll ? d.slSelectNone : d.slSelectAll;
    $slToggleAll.classList.toggle('active', isAll);
  }

  function getTagListForSearch() {
    return blockedTags.filter(t => (blockedTagSources[t] || 'tag') === 'tag');
  }

  function renderSlList() {
    let tags = getTagListForSearch();

    if (slSearchQuery) {
      tags = tags.filter(t => fuzzyMatch(t, slSearchQuery));
    }

    if (!tags.length) {
      $slList.innerHTML = `<div class="ftf-sl-empty" style="width:100%;">${I18N[lang].slEmptyTags}</div>`;
      updateSlToggleLabel();
      return;
    }
    $slList.innerHTML = '';
    tags.forEach(t => {
      const row = document.createElement('div');
      row.className = `ftf-sl-item ${slChecked.has(t) ? 'active' : ''}`;

      const sp = document.createElement('span');
      sp.textContent = t;
      row.appendChild(sp);

      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (slChecked.has(t)) {
          slChecked.delete(t);
          row.classList.remove('active');
        } else {
          slChecked.add(t);
          row.classList.add('active');
        }
        updateSlToggleLabel();
      });

      $slList.appendChild(row);
    });
    updateSlToggleLabel();
  }

  function openSearchLayer() {
    isFromNativePage = true;
    slExpanded = false;
    slSearchQuery = '';
    if ($slSearch) $slSearch.value = '';

    slChecked = new Set();
    try {
      const url = new URL(window.location.href);
      const existingExclude = url.searchParams.get('work_search[excluded_tag_names]');
      if (existingExclude) {
        existingExclude.split(',').forEach(t => slChecked.add(t.trim()));
      }
    } catch {}

    renderSlList();
    if(!isOpen) togglePnl(true, 'view-search');
    else switchView('view-search');
  }

  function closeSearchLayer() {
    slExpanded = false;
    slSearchQuery = '';
    if ($slSearch) $slSearch.value = '';
    slChecked = new Set();
    isFromNativePage = false;
  }

  $slClose.addEventListener('click', () => switchView('view-main'));
  $slToggleAll.addEventListener('click', () => {
    const all = getTagListForSearch();
    if (slChecked.size >= all.length) slChecked = new Set();
    else slChecked = new Set(all);
    renderSlList();
  });

  $slDone.addEventListener('click', () => {
    if (!isFromNativePage) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');

      let existing = url.searchParams.get('work_search[excluded_tag_names]') || '';
      let arr = existing ? existing.split(',').map(s=>s.trim()) : [];

      slChecked.forEach(t => {
        if (!arr.includes(t)) arr.push(t);
      });

      if (arr.length > 0) {
        url.searchParams.set('work_search[excluded_tag_names]', arr.join(','));
      } else {
        url.searchParams.delete('work_search[excluded_tag_names]');
      }

      const finalUrl = url.toString().replace(/%5B/g, '[').replace(/%5D/g, ']');

      window.open(finalUrl, '_blank');
      togglePnl(false);
    } catch (e) {
      console.error(e);
      showToast('Error generating URL');
    }
  });

  function injectCatIcon() {
    if (document.getElementById('ftf-cat-trigger')) return;

    let titleEl = null;
    const headings = document.querySelectorAll('h2.heading');
    for (const h of headings) {
      if (h.textContent.includes('Works in') || h.textContent.includes('Search Results')) {
        titleEl = h;
        break;
      }
    }

    if (!titleEl) {
      const filtersBtn = document.querySelector('a[href*="filters"], button.filters-toggle, .filters-toggle');
      if (filtersBtn) {
        let p = filtersBtn.closest('.header, .module');
        if (p) {
          titleEl = p.querySelector('h2');
        }
      }
    }

    if (!titleEl) {
      const ol = document.querySelector('ol.work.index.group');
      if (ol && ol.previousElementSibling && ol.previousElementSibling.tagName === 'H2') {
        titleEl = ol.previousElementSibling;
      }
    }

    if (titleEl) {
      const img = document.createElement('img');
      img.id = 'ftf-cat-trigger';
      img.className = 'ftf-cat-icon';
      img.src = CAT_IMG_SRC;
      img.title = lang === 'zh' ? '一键排除（继承当前页条件）' : 'Exclude Tags (Inherit Current Filters)';
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSearchLayer();
      });
      titleEl.appendChild(img);
    }
  }

  // 绑定搜索框事件
  $manageSearch.addEventListener('input', (e) => {
    manageSearchQuery = e.target.value.trim();
    renderBlockList();
  });
  $slSearch.addEventListener('input', (e) => {
    slSearchQuery = e.target.value.trim();
    renderSlList();
  });

  $tabKeywords.addEventListener('click', () => switchTab('keywords'));
  $tabTags.addEventListener('click', () => switchTab('tags'));
  $tabWorks.addEventListener('click', () => switchTab('works'));
  $btnSelectMode.addEventListener('click', enterSelectMode);
  $btnCancelSelect.addEventListener('click', exitSelectMode);

  pnl.querySelector('#btn-select-all').addEventListener('click', () => {
    const list = getCurrentTabList();
    list.forEach(item => selectedItems.add(currentTab === 'works' ? (item.title || item.id) : item));
    renderBlockList();
  });

  pnl.querySelector('#btn-del-selected').addEventListener('click', () => {
    if (currentTab === 'works') {
      blockedWorks = blockedWorks.filter(w => !selectedItems.has(w.title || w.id));
    } else {
      blockedTags = blockedTags.filter(t => {
        if (!selectedItems.has(t)) return true;
        delete blockedTagSources[t];
        return false;
      });
    }
    saveBlocklist(); exitSelectMode(); applyAllStates(); triggerRefill();
  });

  pnl.querySelector('#btn-export').addEventListener('click', () => {
    const kws = blockedTags.filter(t => (blockedTagSources[t] || 'tag') === 'keyword');
    const tgs = blockedTags.filter(t => (blockedTagSources[t] || 'tag') === 'tag');
    if (!kws.length && !tgs.length && !blockedWorks.length) { showToast(lang==='zh'?'名单为空':'List is empty'); return; }
    const data = { keywords: kws, tags: tgs, works: blockedWorks };
    const secretKey = 'FTFB-' + encodeB64(JSON.stringify(data));
    navigator.clipboard.writeText(secretKey).then(() => { showToast(I18N[lang].copied); }).catch(() => { prompt('Copy Secret Code:', secretKey); });
  });

  pnl.querySelector('#btn-import').addEventListener('click', () => {
    $impCode.value = ''; $impPreview.innerHTML = ''; tempImportList = {keywords:[],tags:[],works:[]};
    pnl.querySelector('#btn-imp-confirm').disabled = true; pnl.querySelector('#btn-imp-confirm').style.opacity = '0.5'; $impLayer.classList.add('active');
  });

  pnl.querySelector('#btn-imp-cancel').addEventListener('click', () => $impLayer.classList.remove('active'));

  $impCode.addEventListener('input', (e) => {
    tempImportList = {keywords:[],tags:[],works:[]}; $impPreview.innerHTML = '';
    let rawText = e.target.value.trim(); if(!rawText) return;
    try {
      let parsed = null;
      if (rawText.startsWith('FTFB-')) { parsed = JSON.parse(decodeB64(rawText.replace('FTFB-', ''))); }
      else { parsed = JSON.parse(rawText); }
      if (Array.isArray(parsed)) {
        tempImportList.tags = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.works)) tempImportList.works = parsed.works;
        if (Array.isArray(parsed.tags)) tempImportList.tags = parsed.tags;
        if (Array.isArray(parsed.keywords)) tempImportList.keywords = parsed.keywords;
      }

      let previewHtml = '';
      if (tempImportList.keywords.length) {
        previewHtml += `<div style="color:#ccffcc;word-break:break-all;margin-bottom:6px;"><b>[Keywords]</b> ${esc(tempImportList.keywords.join(', '))}</div>`;
      }
      if (tempImportList.tags.length) {
        previewHtml += `<div style="color:#ffcccc;word-break:break-all;margin-bottom:6px;"><b>[Tags]</b> ${esc(tempImportList.tags.join(', '))}</div>`;
      }
      if (tempImportList.works.length) {
        previewHtml += `<div style="color:#ccccff;word-break:break-all;"><b>[Works]</b> ${tempImportList.works.map(w=>esc(w.title||w.id)).join(', ')}</div>`;
      }

      if (previewHtml) {
        $impPreview.innerHTML = previewHtml; pnl.querySelector('#btn-imp-confirm').disabled = false; pnl.querySelector('#btn-imp-confirm').style.opacity = '1';
      } else throw new Error();
    } catch (err) {
      if (rawText) $impPreview.innerHTML = `<span style="color:#ff6b6b">${I18N[lang].invalidKey}</span>`;
      pnl.querySelector('#btn-imp-confirm').disabled = true; pnl.querySelector('#btn-imp-confirm').style.opacity = '0.5';
    }
  });

  pnl.querySelector('#btn-imp-confirm').addEventListener('click', () => {
    if (!tempImportList.keywords.length && !tempImportList.tags.length && !tempImportList.works.length) return;
    let added = 0;
    const currentTagSet = new Set(blockedTags);
    tempImportList.keywords.forEach(t => {
      if (!currentTagSet.has(t)) { blockedTags.push(t); blockedTagSources[t] = 'keyword'; added++; }
    });
    tempImportList.tags.forEach(t => {
      if (!currentTagSet.has(t)) { blockedTags.push(t); blockedTagSources[t] = 'tag'; added++; }
    });
    const currentWorkIds = new Set(blockedWorks.map(w => w.id));
    tempImportList.works.forEach(w => { if(!currentWorkIds.has(w.id)) { blockedWorks.push(w); added++; } });
    if (added > 0) {
      saveBlocklist(); renderBlockList(); applyAllStates(); triggerRefill(); showToast(I18N[lang].mergeSuccess);
    } else { showToast(I18N[lang].noNewData); }
    $impLayer.classList.remove('active');
  });

  function renderColorBtns(){
    $presetRow.innerHTML='';
    COLORS.forEach(c=>{
      const b=document.createElement('button'); b.className=`ftf-color-btn ${c===theme.bg?'active':''}`; b.style.background=c; b.dataset.color=c;
      b.addEventListener('click',()=>{theme.bg=c;sV(K_T,JSON.stringify(theme));applyTheme()}); $presetRow.appendChild(b);
    });
    const cb=document.createElement('button'); cb.className='ftf-color-btn ftf-btn-custom';
    cb.addEventListener('click',()=>{switchView('view-custom');$picker.value=theme.bg;$hex.value=theme.bg.toUpperCase()}); $presetRow.appendChild(cb);
    $histRow.innerHTML='';
    const recent=history.slice(0,5);
    if(!recent.length) $histRow.innerHTML=`<span style="font-size:11px;opacity:.5;">${I18N[lang].noneLabel}</span>`;
    else recent.forEach(c=>{
      const b=document.createElement('button'); b.className=`ftf-color-btn ${c===theme.bg?'active':''}`; b.style.background=c; b.dataset.color=c;
      b.addEventListener('click',()=>{theme.bg=c;sV(K_T,JSON.stringify(theme));applyTheme();switchView('view-settings')}); $histRow.appendChild(b);
    });
  }
  $picker.addEventListener('input',e=>{const v=e.target.value.toUpperCase();$hex.value=v;theme.bg=v;sV(K_T,JSON.stringify(theme));applyTheme()});
  $hex.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault(); let v=$hex.value.trim(); if(!v.startsWith('#'))v='#'+v;
      if(/^#[0-9A-Fa-f]{6}$/.test(v)){
        v=v.toUpperCase(); theme.bg=v; sV(K_T,JSON.stringify(theme));
        if(!COLORS.includes(v)){history=history.filter(c=>c!==v);history.unshift(v);if(history.length>5)history.pop();sV(K_H,JSON.stringify(history))}
        renderColorBtns();applyTheme();switchView('view-settings');
      }
    }
  });
  $picker.addEventListener('change',()=>{
    const v=$picker.value.toUpperCase();
    if(!COLORS.includes(v)){history=history.filter(c=>c!==v);history.unshift(v);if(history.length>5)history.pop();sV(K_H,JSON.stringify(history));renderColorBtns()}
  });
  function applyTheme(){
    document.documentElement.style.setProperty('--ftf-bg',theme.bg);
    pnl.querySelectorAll('.ftf-color-btn').forEach(b=>{
      const btnColor = (b.dataset.color || '').toUpperCase();
      b.classList.toggle('active', btnColor === theme.bg.toUpperCase());
    });
  }

  function renderText(){
    const d=I18N[lang];
    pnl.querySelectorAll('[data-i18n]').forEach(el=>{
      const k=el.getAttribute('data-i18n');
      if(d[k]) {
        if(el.tagName === 'INPUT') {
          el.placeholder = d[k];
        } else if (k === 'helpText') {
          el.innerHTML = d[k];
        } else {
          el.textContent = d[k];
        }
      }
    });
    pnl.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const k=el.getAttribute('data-i18n-placeholder'); if(d[k]) el.placeholder = d[k];
    });
    pnl.querySelectorAll('[data-i18n-title]').forEach(el=>{
      const k=el.getAttribute('data-i18n-title'); if(d[k]) el.title = d[k];
    });
    $q.placeholder=d.placeholder; $addBlock.title=d.addBlockTooltip;
    $lang.en.classList.toggle('active',lang==='en'); $lang.zh.classList.toggle('active',lang==='zh');
    document.querySelectorAll('.ftf-fold-corner').forEach(dot=>dot.title=d.blockTooltip);
    document.querySelectorAll('.ftf-tag-blocker').forEach(dot=>dot.title=d.blockTooltip);
    const cat = document.getElementById('ftf-cat-trigger');
    if(cat) cat.title = lang === 'zh' ? '一键排除（继承当前页条件）' : 'Exclude Tags (Inherit Current Filters)';
    document.querySelectorAll('li[data-ftf-refilled="1"]').forEach(el=>{
      const p = el.dataset.ftfFromPage;
      if (p) el.dataset.ftfBadge = d.refilledFromPage.replace('{n}', p);
    });
    updateSlToggleLabel();
    renderBlockList(); renderColorBtns(); renderRefillStatus(); updateRefillCount(); updateClearBtnVisibility();
  }

  function placeBtn(){
    let leftPos = pos.x;
    if (pos.x <= 0.5) { leftPos = -1.5; }
    else if (pos.x >= innerWidth - L_W - 0.5) { leftPos = innerWidth - L_W + 1.5; }
    btn.style.left = leftPos + 'px'; btn.style.top = pos.y + 'px';
    btn.style.clipPath = pos.x > innerWidth / 2 ? 'polygon(100% 0,100% 100%,0 50%)' : 'polygon(0 0,0 100%,100% 50%)';
  }
  function placePnl(){
    const onR = pos.x > innerWidth / 2, bite = 4;
    const H = P_S + currentExtraH;
    let left = onR ? (pos.x + bite) - P_S : (pos.x + L_W - bite);
    let top  = pos.y + (L_H / 2) - (H / 2);
    left = Math.max(8, Math.min(innerWidth  - P_S - 8, left));
    top  = Math.max(8, Math.min(innerHeight - H - 8, top));
    pnl.style.left = left + 'px'; pnl.style.top = top + 'px'; pnl.style.height = H + 'px';
    let tTop = (pos.y + L_H / 2) - top, r = 20, w = P_S, h = H, d = '';
    if(!onR) d=`M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${tTop+10} L ${T_D} ${tTop} L 0 ${tTop-10} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    else d=`M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${tTop-10} L ${w-T_D} ${tTop} L ${w} ${tTop+10} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    $path.setAttribute('d', d);
  }

  function switchView(id){
    pnl.querySelectorAll('.ftf-view').forEach(v=>v.classList.remove('active'));
    pnl.querySelector('#'+id).classList.add('active');
    currentViewId = id;

    currentExtraH = 0;
    if (id === 'view-picker' || id === 'view-manage' || id === 'view-search') {
      $resizeHandle.style.display = 'block';
    } else {
      $resizeHandle.style.display = 'none';
    }

    if (id !== 'view-search') {
      closeSearchLayer();
    }

    if(isOpen) requestAnimationFrame(placePnl);
  }

  function togglePnl(f, initialView = 'view-main'){
    const toOpen = typeof f==='boolean' ? f : !isOpen;
    if(toOpen === isOpen) return;
    isOpen = toOpen;
    if(isOpen){
      pnl.style.display = 'block'; void pnl.offsetWidth;
      pnl.style.opacity = '1'; pnl.style.transform = 'scale(1)';
      switchView(initialView);
      $act.classList.toggle('play',!active); $act.classList.toggle('stop',active);
      requestAnimationFrame(placePnl);
    } else {
      closeSearchLayer();
      pnl.style.opacity = '0'; pnl.style.transform = 'scale(0.95)';
      setTimeout(() => { if(!isOpen) pnl.style.display = 'none'; }, 200);
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (!isOpen) return;
    if (e.target === btn || btn.contains(e.target) || pnl.contains(e.target)) return;
    if (e.target.id === 'ftf-cat-trigger') return;
    togglePnl(false);
  });
  window.addEventListener('scroll', () => { btn.classList.add('ftf-translucent'); }, { passive: true });

  let isDrag=false,moved=false,start=null;
  btn.addEventListener('pointerdown',e=>{
    btn.classList.remove('ftf-translucent');
    if(e.button!==0&&e.pointerType==='mouse')return;
    isDrag=true;moved=false;start={x:e.clientX,y:e.clientY,sx:pos.x,sy:pos.y};btn.style.cursor='grabbing';try{btn.setPointerCapture(e.pointerId)}catch{}
  });
  btn.addEventListener('pointermove',e=>{
    if(!isDrag||!start)return; const dx=e.clientX-start.x, dy=e.clientY-start.y;
    if(!moved&&Math.abs(dx)<4&&Math.abs(dy)<4)return; moved=true;e.preventDefault();
    pos=safePos(start.sx+dx,start.sy+dy); placeBtn(); if(isOpen)placePnl();
  });
  function endDrag(e){
    if(!isDrag)return; isDrag=false;btn.style.cursor='grab';try{btn.releasePointerCapture(e.pointerId)}catch{}
    if(moved){
      isDockedLeft = (pos.x < innerWidth / 2);
      pos=safePos(isDockedLeft ? 0 : innerWidth-L_W, pos.y);
      placeBtn(); if(isOpen)placePnl(); sV(K_P,JSON.stringify(pos));
      const blk=ev=>{ev.stopPropagation();ev.preventDefault()}; btn.addEventListener('click',blk,{once:true}); setTimeout(()=>btn.removeEventListener('click',blk),300);
    } else togglePnl(); start=null;
  }
  btn.addEventListener('pointerup',endDrag); btn.addEventListener('pointercancel',endDrag);

  let isResizing=false, resizeStartY=0, resizeStartExtra=0;
  $resizeHandle.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    isResizing = true; resizeStartY = e.clientY; resizeStartExtra = currentExtraH;
    try { $resizeHandle.setPointerCapture(e.pointerId); } catch {}
  });
  $resizeHandle.addEventListener('pointermove', e => {
    if (!isResizing) return;
    e.preventDefault();
    const dy = e.clientY - resizeStartY;
    let newExtra = resizeStartExtra + dy * 2;
    const centerY = pos.y + L_H / 2;
    const maxH = Math.min(Math.max(0, 2 * (centerY - 8)), Math.max(0, 2 * (innerHeight - 8 - centerY)));
    const maxExtra = Math.max(0, maxH - P_S);
    newExtra = Math.max(0, Math.min(maxExtra, newExtra));
    currentExtraH = newExtra;
    placePnl();
  });
  function endResize(e){
    if (!isResizing) return;
    isResizing = false;
    try { $resizeHandle.releasePointerCapture(e.pointerId); } catch {}
  }
  $resizeHandle.addEventListener('pointerup', endResize);
  $resizeHandle.addEventListener('pointercancel', endResize);

  pnl.querySelector('#btn-manage-blocklist').addEventListener('click',()=>{switchTab('tags'); switchView('view-manage')});
  pnl.querySelector('#btn-back-manage').addEventListener('click',()=>switchView('view-settings'));
  pnl.querySelector('#btn-back-picker').addEventListener('click',()=>switchView('view-main'));
  $chkHide.addEventListener('change', (e) => { hideReading = e.target.checked; sV(K_HIDE, hideReading); checkPageVisibility(); });

  pnl.querySelector('#btn-help').addEventListener('click',()=>switchView('view-help'));
  pnl.querySelector('#btn-settings').addEventListener('click',()=>{switchView('view-settings'); $chkHide.checked=hideReading;});
  pnl.querySelector('#btn-back-help').addEventListener('click',()=>switchView('view-main'));
  pnl.querySelector('#btn-back-set').addEventListener('click',()=>switchView('view-main'));
  pnl.querySelector('#btn-back-custom').addEventListener('click',()=>switchView('view-settings'));

  $lang.en.addEventListener('click',()=>{lang='en';sV(K_L,'en');renderText()});
  $lang.zh.addEventListener('click',()=>{lang='zh';sV(K_L,'zh');renderText()});
  pnl.querySelector('#btn-reset').addEventListener('click',()=>{theme={...DEF_T};sV(K_T,JSON.stringify(theme));history=[];sV(K_H,'[]');renderColorBtns();applyTheme();lang=navigator.language.startsWith('zh')?'zh':'en';sV(K_L,lang);renderText()});

  window.addEventListener('resize',()=>{
    pos = safePos(isDockedLeft ? 0 : innerWidth - L_W, pos.y);
    placeBtn();
    if(isOpen) placePnl();
  });

  $refillToggle.addEventListener('click', () => {
    refillActive = !refillActive; sV(K_RF, refillActive);
    refillState = { kind: 'idle', n: 0 };
    if (!refillActive) {
      refillToken++;
      document.querySelectorAll('li[data-ftf-refilled="1"]').forEach(el => el.remove());
      clearSessionStorage();
      applyAllStates();
    } else {
      pageLoadSessionIds = new Set(getRefilledIds().ids); applyAllStates(); triggerRefill();
    }
    syncRefillInfoVisibility();
  });

  $act.addEventListener('click', () => {
    if (!active) {
      if (!query) { $q.focus(); return; }
      active = true; $act.classList.replace('play', 'stop'); saveSessionState();
      refillToken++;
      refillState = { kind: 'idle', n: 0 };
      renderRefillStatus();
      applyAllStates(); triggerRefill();
    } else {
      active = false; $act.classList.replace('stop', 'play'); saveSessionState();
      refillToken++;
      refillState = { kind: 'idle', n: 0 };
      renderRefillStatus();
      applyAllStates(); triggerRefill();
    }
  });

  function addQuickBlock() {
    const val = $q.value.trim();
    if (!val) { $q.focus(); return; }
    if (blockedTags.includes(val)) {
      showToast(I18N[lang].quickBlockExists);
      $q.value = ''; query = ''; saveSessionState(); updateClearBtnVisibility(); return;
    }
    blockedTags.push(val); blockedTagSources[val] = 'keyword'; saveBlocklist();
    $q.value = ''; query = ''; saveSessionState(); updateClearBtnVisibility();
    showToast(I18N[lang].quickBlockAdded); applyAllStates(); triggerRefill();
  }
  $addBlock.addEventListener('click', addQuickBlock);

  $q.addEventListener('input', () => { query = $q.value.trim(); saveSessionState(); updateClearBtnVisibility(); });
  $q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (active && query) { applyAllStates(); triggerRefill(); } }
  });

  $clearQuery.addEventListener('click', () => {
    $q.value = ''; query = ''; saveSessionState(); updateClearBtnVisibility(); $q.focus();
    if (active) { applyAllStates(); triggerRefill(); }
  });

  $pickerList.addEventListener('click', (e) => {
    if (e.target.classList.contains('ftf-picker-item')) {
      const val = e.target.getAttribute('data-val');
      if (val && !blockedTags.includes(val)) {
        blockedTags.push(val); blockedTagSources[val] = 'tag'; saveBlocklist();
        if(pnl.querySelector('#view-manage').classList.contains('active')) renderBlockList();
        switchView('view-main'); applyAllStates(); triggerRefill();
      }
    }
  });

  renderColorBtns(); applyTheme(); syncRefillInfoVisibility(); renderText(); placeBtn();
  $q.value = query; updateClearBtnVisibility();
  if (active) $act.classList.replace('play', 'stop'); else $act.classList.replace('stop', 'play');

  setTimeout(() => {
    injectCatIcon();
    pageLoadSessionIds = new Set(getRefilledIds().ids);
    checkPageVisibility(); injectAndBlock(); applyAllStates(); triggerRefill();
  }, 800);
})();