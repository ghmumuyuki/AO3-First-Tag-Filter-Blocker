// ==UserScript==
// @name         AO3 First Tag Filter & Blocker
// @name:zh-CN   AO3 首位 Tag 过滤器 & 屏蔽助手
// @namespace    local.first-tag-filter
// @version      1.5.5
// @description  Minimalist square draggable AO3 filter bubble with manual blocklist.
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

  const K_A='ftf_active_v1',K_Q='ftf_query_v1',K_P='ftf_pos_v1',K_T='ftf_theme_v1',K_L='ftf_lang_v1',K_H='ftf_history_v1',K_B='ftf_blocked_v1';
  const DEF_T={bg:'#970000'}, COLORS=['#970000','#2d7396','#5F7161','#6C5B68'], L_W=22, L_H=34, P_S=250, T_D=12, L_Y=75;
  const IGNORE=new Set(['general audiences','teen and up audiences','mature','explicit','not rated','creator chose not to use archive warnings','no archive warnings apply','graphic depictions of violence','major character death','rape/non-con','underage','no warnings apply','choose not to use archive warnings','f/m','m/m','f/f','multi','gen','other']);
  
  const I18N={
    en:{
      title:'First Tag Filter & Blocker', placeholder:'Enter Keywords', statusFiltered:'Filtered on this page: ', statusSuffix:'',
      helpTitle:'About',
      helpText:`<p>1. Core Function: Ensures your favorite ship or character is the first valid tag, blocking fics where they are just side characters; also supports permanent blocking via the folded corner.</p><p>2. How to Use: Enter keywords, click ▶ to block, ⏸ to restore; click the top-right folded corner to permanently block and manage in settings.</p><p>3. How it Works: Auto-blocking only works on list pages. Filtering checks the first valid tag (skipping ratings, warnings, and fandoms); manual block records the work's unique ID locally for permanent hiding.</p>`,
      setTitle:'Settings', setColor:'Theme Color', setLang:'Language', setReset:'Restore Defaults', customTitle:'Custom Color', recentColors:'Recent', palette:'Palette', manageBlocklist:'Manage Blocklist', blocklistTitle:'Blocked Works', clearAll:'Clear All', emptyBlocklist:'No blocked works', blockTooltip:'Block this work permanently'
    },
    zh:{
      title:'首位 Tag 过滤器 & 屏蔽助手', placeholder:'输入关键词', statusFiltered:'本页过滤了 ', statusSuffix:' 篇',
      helpTitle:'关于本插件',
      helpText:`<p>1. 核心功能：确保喜欢的 CP 或角色处于文章的首位有效 Tag 中，屏蔽其只是配角的作品；同时支持点击折角永久屏蔽特定作品。</p><p>2. 使用方法：输入关键词点 ▶ 屏蔽，点 ⏸ 恢复；点击卡片右上角折角即可永久屏蔽，并在设置页管理。</p><p>3. 工作原理：自动屏蔽仅在列表页生效，过滤时仅检查首个有效 Tag（自动跳过分级、警告和 Fandom）；手动屏蔽时，通过记录该作品的唯一 ID 存入本地，实现永久隐藏。</p>`,
      setTitle:'设置', setColor:'主题颜色', setLang:'语言', setReset:'恢复默认', customTitle:'自定义颜色', recentColors:'最近使用', palette:'调色盘', manageBlocklist:'屏蔽管理', blocklistTitle:'已屏蔽作品', clearAll:'清空全部', emptyBlocklist:'暂无屏蔽作品', blockTooltip:'永久屏蔽此作品'
    }
  };

  const gV=(k,d)=>{try{return GM_getValue(k,d)}catch{return d}}, sV=(k,v)=>{try{GM_setValue(k,v)}catch{}}, norm=s=>(s||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const lO=(k,f)=>{try{const r=gV(k,null);if(!r)return{...f};const p=typeof r==='string'?JSON.parse(r):r;return{...f,...(p||{})}}catch{return{...f}}};
  const safePos=(x,y)=>({x:Math.max(0,Math.min(innerWidth-L_W,x)),y:Math.max(L_Y,Math.min(Math.max(L_Y,innerHeight-L_H-L_Y),y))});

  let active=!!gV(K_A,false), query=String(gV(K_Q,'')||''), lang=String(gV(K_L,'en')), theme=lO(K_T,DEF_T), history=[], blocked=[];
  try{history=JSON.parse(gV(K_H,'[]'))||[]}catch{}
  try{blocked=JSON.parse(gV(K_B,'[]'))||[]}catch{}
  let pos=safePos(...Object.values(lO(K_P,{x:Math.max(0,innerWidth-L_W),y:Math.round(innerHeight*0.6)}))), isOpen=false, origDisp=new WeakMap();

  const btn=document.createElement('button'); btn.id='ftf-launcher'; btn.type='button';
  const pnl=document.createElement('section'); pnl.id='ftf-panel';
  const sty=document.createElement('style');
  sty.textContent=`
    #ftf-launcher{position:fixed;width:${L_W}px;height:${L_H}px;padding:0!important;margin:0!important;border:none!important;border-radius:0!important;z-index:2147483646;cursor:grab;touch-action:none;background:var(--ftf-bg,#970000)!important;background-image:none!important;box-shadow:none!important;transition:transform .1s}
    #ftf-launcher:hover,#ftf-launcher:active{background:var(--ftf-bg,#970000)!important;outline:none!important}
    #ftf-panel{display:none;position:fixed;z-index:2147483647;width:${P_S}px;height:${P_S}px;box-sizing:border-box;font-family:"Lucida Grande",Verdana,sans-serif;color:#fff;user-select:none;filter:drop-shadow(0 6px 16px rgba(0,0,0,.25));background:transparent}
    #ftf-bg-svg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none}
    .ftf-view{display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;width:100%;height:100%;box-sizing:border-box}
    .ftf-view.active{display:flex}
    .ftf-title{text-align:center;font-size:15px;font-weight:600;margin:0 0 16px 0;white-space:nowrap}
    .ftf-input-wrap{background:#fff;border-radius:99px;padding:0 12px;margin-bottom:20px;display:flex;align-items:center;width:90%;box-sizing:border-box}
    #ftf-query{width:100%;border:none;outline:none;background:transparent;font-size:13px;padding:8px 0;color:#333;text-align:center}
    #ftf-action{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;aspect-ratio:1/1!important;border-radius:50%!important;padding:0!important;margin:0 auto!important;box-sizing:border-box!important;background:#fff!important;border:none!important;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.15);flex-shrink:0}
    #ftf-action.play::after{content:'';display:block;width:0;height:0;border-left:16px solid var(--ftf-bg,#970000);border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:6px}
    #ftf-action.stop::after{content:'';display:block;width:12px;height:16px;border-left:4px solid var(--ftf-bg,#970000);border-right:4px solid var(--ftf-bg,#970000);box-sizing:border-box}
    #ftf-status{text-align:center;font-size:11px;margin:14px 0 0 0;opacity:.9;white-space:nowrap}
    .ftf-bottom-right{position:absolute;bottom:12px;right:12px;display:flex;gap:8px}
    .ftf-icon{background:none!important;border:none!important;color:#fff!important;font-size:15px;cursor:pointer;padding:4px;opacity:.7}
    .ftf-icon:hover{opacity:1}
    .ftf-back{position:absolute;top:12px;left:12px;font-size:18px}
    .ftf-content{font-size:11px;line-height:1.4;width:100%;max-height:155px;overflow-y:auto;margin-top:8px;text-align:left}
    .ftf-setting-row{display:flex;justify-content:space-between;align-items:center;width:100%;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.15);cursor:pointer}
    .ftf-setting-row:first-child{border-top:1px solid rgba(255,255,255,.15)}
    .ftf-setting-label{font-size:12px;opacity:.9}
    .ftf-color-btn{width:18px;height:18px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-sizing:border-box;flex-shrink:0}
    .ftf-color-btn.active{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.3)}
    .ftf-btn-custom{background:rgba(255,255,255,.15)!important;border:1px dashed rgba(255,255,255,.5)!important;position:relative;display:flex;align-items:center;justify-content:center}
    .ftf-btn-custom::after{content:'+';color:#fff;font-size:14px;font-weight:600;position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);line-height:1}
    .ftf-custom-section{width:100%;padding:0 10px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}
    .ftf-custom-title{font-size:11px;opacity:.7;margin-bottom:6px;display:block}
    .ftf-history-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-height:24px}
    .ftf-picker-row{display:flex;gap:8px;align-items:center}
    input[type="color"]{-webkit-appearance:none;border:none;padding:0;width:32px;height:32px;border-radius:50%;overflow:hidden;cursor:pointer;background:transparent}
    input[type="color"]::-webkit-color-swatch-wrapper{padding:0}
    input[type="color"]::-webkit-color-swatch{border:2px solid #fff;border-radius:50%}
    .ftf-hex-input{flex:1;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.3);outline:none;background:rgba(255,255,255,.9);color:#333;font-size:13px;padding:0 10px;text-align:center;font-family:monospace;box-sizing:border-box}
    .ftf-lang-switch{display:flex;background:rgba(0,0,0,.2);border-radius:99px;padding:2px}
    .ftf-lang-btn{border:none!important;background:transparent!important;color:#fff;padding:4px 10px;border-radius:99px;cursor:pointer;font-size:10.5px;opacity:.6}
    .ftf-lang-btn.active{background:#fff!important;color:var(--ftf-bg,#970000)!important;opacity:1;font-weight:bold}
    .ftf-btn-reset{background:transparent!important;border:none!important;color:rgba(255,255,255,.7)!important;font-size:11px;cursor:pointer;margin-top:6px;padding:6px 12px;text-decoration:underline}
    .ftf-manage-list{width:100%;max-height:130px;overflow-y:auto;padding:0 10px;box-sizing:border-box;text-align:left;margin-top:8px}
    .ftf-manage-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:11px;gap:8px}
    .ftf-manage-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;opacity:.9}
    .ftf-manage-del{background:none;border:none;color:#ff6b6b;font-size:14px;cursor:pointer;padding:0 4px;opacity:.8}
    .ftf-manage-clear{margin-top:12px;width:90%;padding:8px;background:rgba(255,0,0,.2)!important;border:1px solid rgba(255,0,0,.4)!important;border-radius:6px;color:#fff!important;font-size:11px;cursor:pointer}
    .ftf-empty-tip{text-align:center;font-size:11px;opacity:.5;margin-top:20px}
    .ftf-fold-corner{position:absolute;top:0;right:0;width:20px;height:20px;background-color:var(--ftf-bg,#970000);clip-path:polygon(0 0,100% 0,100% 100%);cursor:pointer;opacity:.25;transition:opacity .2s,transform .2s;z-index:10}
    .ftf-fold-corner:hover{opacity:1;transform:scale(1.1);transform-origin:top right}
  `;

  pnl.innerHTML=`
    <svg id="ftf-bg-svg"><path id="ftf-path" fill="var(--ftf-bg,#970000)"/></svg>
    <div id="view-main" class="ftf-view active">
      <h2 class="ftf-title" data-i18n="title"></h2>
      <div class="ftf-input-wrap"><input id="ftf-query" type="text" spellcheck="false"></div>
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
    <div id="view-settings" class="ftf-view">
      <button class="ftf-icon ftf-back" id="btn-back-set">←</button>
      <h3 style="text-align:center;margin:0 0 10px 0;font-size:14px;" data-i18n="setTitle"></h3>
      <div style="width:100%;padding:0 10px;box-sizing:border-box;">
        <div class="ftf-setting-row"><span class="ftf-setting-label" data-i18n="setColor"></span><div class="ftf-history-row" id="settings-preset-row"></div></div>
        <div class="ftf-setting-row"><span class="ftf-setting-label" data-i18n="setLang"></span><div class="ftf-lang-switch"><button id="lang-en" class="ftf-lang-btn">EN</button><button id="lang-zh" class="ftf-lang-btn">中文</button></div></div>
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
      <button class="ftf-icon ftf-back" id="btn-back-manage">←</button>
      <h3 style="text-align:center;margin:0 0 10px 0;font-size:14px;" data-i18n="blocklistTitle"></h3>
      <div class="ftf-manage-list" id="blocklist-container"></div>
      <button class="ftf-manage-clear" id="btn-clear-blocklist" data-i18n="clearAll"></button>
    </div>`;

  document.head.appendChild(sty); document.body.append(btn,pnl);

  const $q=pnl.querySelector('#ftf-query'), $act=pnl.querySelector('#ftf-action'), $stat=pnl.querySelector('#ftf-status'), $path=pnl.querySelector('#ftf-path'),
        $lang={en:pnl.querySelector('#lang-en'),zh:pnl.querySelector('#lang-zh')}, $presetRow=pnl.querySelector('#settings-preset-row'),
        $histRow=pnl.querySelector('#custom-history-row'), $picker=pnl.querySelector('#custom-picker'), $hex=pnl.querySelector('#custom-hex'), $blockList=pnl.querySelector('#blocklist-container');

  function renderBlockList(){
    $blockList.innerHTML='';
    if(!blocked.length){$blockList.innerHTML=`<div class="ftf-empty-tip" data-i18n="emptyBlocklist">${I18N[lang].emptyBlocklist}</div>`;return}
    blocked.forEach(w=>{
      const d=document.createElement('div'); d.className='ftf-manage-item';
      d.innerHTML=`<span class="ftf-manage-title" title="${w.title||w.id}">${w.title||w.id}</span><button class="ftf-manage-del">×</button>`;
      d.querySelector('.ftf-manage-del').addEventListener('click',()=>{blocked=blocked.filter(x=>x.id!==w.id);sV(K_B,JSON.stringify(blocked));renderBlockList();applyBlockListToPage()});
      $blockList.appendChild(d);
    });
  }

  pnl.querySelector('#btn-clear-blocklist').addEventListener('click',()=>{ if(confirm(lang==='zh'?'确定清空所有屏蔽记录吗？':'Clear all blocked works?')){blocked=[];sV(K_B,'[]');renderBlockList();applyBlockListToPage()} });
  pnl.querySelector('#btn-manage-blocklist').addEventListener('click',()=>{renderBlockList();switchView('view-manage')});

  function injectAndBlock(){
    const ids=new Set(blocked.map(w=>w.id));
    getCards().forEach(c=>{
      const a=c.querySelector('.heading a'); if(!a)return;
      const m=(a.getAttribute('href')||'').match(/\/works\/(\d+)/); if(!m)return;
      const wId=m[1], wTitle=a.textContent.trim()||'Unknown';
      if(ids.has(wId)){if(!origDisp.has(c))origDisp.set(c,c.style.display||'');c.style.display='none';return}
      if(c.querySelector('.ftf-fold-corner'))return;
      if(window.getComputedStyle(c).position==='static') c.style.position='relative';
      const fold=document.createElement('div'); fold.className='ftf-fold-corner'; fold.title=I18N[lang].blockTooltip;
      fold.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(!blocked.some(w=>w.id===wId)){blocked.push({id:wId,title:wTitle});sV(K_B,JSON.stringify(blocked))}
        if(!origDisp.has(c))origDisp.set(c,c.style.display||'');
        c.style.display='none';
        if(pnl.querySelector('#view-manage').classList.contains('active')) renderBlockList();
      });
      c.appendChild(fold);
    });
  }

  function applyBlockListToPage(){
    const ids=new Set(blocked.map(w=>w.id));
    getCards().forEach(c=>{
      const a=c.querySelector('.heading a'); if(!a)return;
      const m=(a.getAttribute('href')||'').match(/\/works\/(\d+)/);
      if(m&&ids.has(m[1])){if(!origDisp.has(c))origDisp.set(c,c.style.display||'');c.style.display='none'}
    });
  }

  function renderColorBtns(){
    $presetRow.innerHTML='';
    COLORS.forEach(c=>{
      const b=document.createElement('button'); b.className=`ftf-color-btn ${c===theme.bg?'active':''}`; b.style.background=c;
      b.addEventListener('click',()=>{theme.bg=c;sV(K_T,JSON.stringify(theme));applyTheme()}); $presetRow.appendChild(b);
    });
    const cb=document.createElement('button'); cb.className='ftf-color-btn ftf-btn-custom';
    cb.addEventListener('click',()=>{switchView('view-custom');$picker.value=theme.bg;$hex.value=theme.bg.toUpperCase()}); $presetRow.appendChild(cb);
    $histRow.innerHTML='';
    const recent=history.slice(0,5);
    if(!recent.length) $histRow.innerHTML='<span style="font-size:11px;opacity:.5;">None</span>';
    else recent.forEach(c=>{
      const b=document.createElement('button'); b.className=`ftf-color-btn ${c===theme.bg?'active':''}`; b.style.background=c;
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

  function applyTheme(){document.documentElement.style.setProperty('--ftf-bg',theme.bg);pnl.querySelectorAll('.ftf-color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===theme.bg||b.style.background===theme.bg))}
  function renderText(){
    const d=I18N[lang];
    pnl.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n'); if(d[k])el.innerHTML=d[k]});
    $q.placeholder=d.placeholder; $lang.en.classList.toggle('active',lang==='en'); $lang.zh.classList.toggle('active',lang==='zh');
    updateStatus(); document.querySelectorAll('.ftf-fold-corner').forEach(dot=>dot.title=d.blockTooltip); renderBlockList();
  }
  function updateStatus(){
    if(active){const vis=getCards().filter(c=>c.style.display!=='none').length;$stat.textContent=I18N[lang].statusFiltered+vis+(I18N[lang].statusSuffix||'')}
    else $stat.textContent='';
  }
  function placeBtn(){btn.style.left=pos.x+'px';btn.style.top=pos.y+'px';btn.style.clipPath=pos.x>innerWidth/2?'polygon(100% 0,100% 100%,0 50%)':'polygon(0 0,0 100%,100% 50%)'}
  function placePnl(){
    const onR=pos.x>innerWidth/2, bite=4;
    let left=onR?(pos.x+bite)-P_S:(pos.x+L_W-bite), top=pos.y+(L_H/2)-(P_S/2);
    pnl.style.left=left+'px';pnl.style.top=top+'px';
    let tTop=(pos.y+L_H/2)-top, r=20, w=P_S, h=P_S, d='';
    if(!onR) d=`M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${tTop+10} L ${T_D} ${tTop} L 0 ${tTop-10} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    else d=`M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${tTop-10} L ${w-T_D} ${tTop} L ${w} ${tTop+10} L ${w} ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h-r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    $path.setAttribute('d',d);
  }
  function switchView(id){pnl.querySelectorAll('.ftf-view').forEach(v=>v.classList.remove('active'));pnl.querySelector('#'+id).classList.add('active')}
  function togglePnl(f){
    isOpen=typeof f==='boolean'?f:!isOpen; pnl.style.display=isOpen?'block':'none';
    if(isOpen){switchView('view-main');$act.classList.toggle('play',!active);$act.classList.toggle('stop',active);updateStatus();requestAnimationFrame(placePnl)}
  }

  let isDrag=false,moved=false,start=null;
  btn.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;isDrag=true;moved=false;start={x:e.clientX,y:e.clientY,sx:pos.x,sy:pos.y};btn.style.cursor='grabbing';try{btn.setPointerCapture(e.pointerId)}catch{}});
  btn.addEventListener('pointermove',e=>{
    if(!isDrag||!start)return; const dx=e.clientX-start.x, dy=e.clientY-start.y;
    if(!moved&&Math.abs(dx)<4&&Math.abs(dy)<4)return; moved=true;e.preventDefault();
    pos=safePos(start.sx+dx,start.sy+dy); placeBtn(); if(isOpen)placePnl();
  });
  function endDrag(e){
    if(!isDrag)return; isDrag=false;btn.style.cursor='grab';try{btn.releasePointerCapture(e.pointerId)}catch{}
    if(moved){
      pos=safePos(pos.x<innerWidth/2?0:innerWidth-L_W,pos.y); placeBtn(); if(isOpen)placePnl(); sV(K_P,JSON.stringify(pos));
      const blk=ev=>{ev.stopPropagation();ev.preventDefault()}; btn.addEventListener('click',blk,{once:true}); setTimeout(()=>btn.removeEventListener('click',blk),300);
    } else togglePnl(); start=null;
  }
  btn.addEventListener('pointerup',endDrag); btn.addEventListener('pointercancel',endDrag);

  $q.addEventListener('input',()=>{query=$q.value.trim();sV(K_Q,query)});
  $act.addEventListener('click',()=>{
    if(!active){if(!query){$q.focus();return} active=true;sV(K_A,true);$act.classList.replace('play','stop');runFilter()}
    else{active=false;sV(K_A,false);$act.classList.replace('stop','play');restoreCards();updateStatus()}
  });
  pnl.querySelector('#btn-help').addEventListener('click',()=>switchView('view-help'));
  pnl.querySelector('#btn-settings').addEventListener('click',()=>switchView('view-settings'));
  pnl.querySelector('#btn-back-help').addEventListener('click',()=>switchView('view-main'));
  pnl.querySelector('#btn-back-set').addEventListener('click',()=>switchView('view-main'));
  pnl.querySelector('#btn-back-custom').addEventListener('click',()=>switchView('view-settings'));
  pnl.querySelector('#btn-back-manage').addEventListener('click',()=>switchView('view-settings'));
  $lang.en.addEventListener('click',()=>{lang='en';sV(K_L,'en');renderText()});
  $lang.zh.addEventListener('click',()=>{lang='zh';sV(K_L,'zh');renderText()});
  pnl.querySelector('#btn-reset').addEventListener('click',()=>{theme={...DEF_T};sV(K_T,JSON.stringify(theme));history=[];sV(K_H,'[]');renderColorBtns();applyTheme();lang=navigator.language.startsWith('zh')?'zh':'en';sV(K_L,lang);renderText()});
  window.addEventListener('resize',()=>{pos=safePos(pos.x,pos.y);placeBtn();if(isOpen)placePnl()});

  let cList=null;
  function getList(){if(cList&&cList.isConnected)return cList;for(const s of['ol.work.index.group','ol.work.index','ol.bookmark.index.group','ol.bookmark.index']){for(const el of document.querySelectorAll(s)){if(el.querySelector('li.work.blurb,li.blurb.work,li.bookmark.blurb,li.blurb.bookmark')){cList=el;return el}}}return null}
  function getCards(){const l=getList();return l?[...l.children].filter(el=>el.tagName==='LI'&&el.querySelector('a.tag')):[]}
  function getFirstTag(c){
    for(const a of c.querySelectorAll('a.tag')){
      if(a.closest('.required-tags,.rating,.warnings,.warning,.category,.fandoms,.fandom'))continue;
      const lb=(a.textContent||'').replace(/\s+/g,' ').trim(); if(!lb)continue;
      const n=norm(lb); if(IGNORE.has(n))continue;
      if(/^(creator chose not to use archive warnings|no archive warnings apply|graphic depictions of violence|major character death|rape\/non-con|underage)(\b|$)/i.test(lb))continue;
      return {label:lb,href:a.href||''};
    } return {label:'',href:''};
  }
  function restoreCards(){
    for(const c of getCards()){
      if(origDisp.has(c)){const p=origDisp.get(c);if(p!=='none')c.style.display=p;origDisp.delete(c)}
      else if(c.dataset.ftfHidden==='1')c.style.display='';
      delete c.dataset.ftfHidden;
    } applyBlockListToPage();
  }
  function runFilter(){
    const q=norm(query); if(!q)return;
    const cards=getCards(); let mt=0;
    for(const c of cards){
      const keep=!!getFirstTag(c).label&&norm(getFirstTag(c).label).includes(q);
      if(keep){if(origDisp.has(c)){const p=origDisp.get(c);if(p!=='none')c.style.display=p;origDisp.delete(c)}delete c.dataset.ftfHidden;mt++}
      else{if(!origDisp.has(c))origDisp.set(c,c.style.display||'');c.style.display='none';c.dataset.ftfHidden='1'}
    } updateStatus();
  }

  renderColorBtns(); applyTheme(); renderText(); placeBtn(); $q.value=query;
  setTimeout(()=>{injectAndBlock(); if(active&&query&&getList())runFilter()},500);
})();
