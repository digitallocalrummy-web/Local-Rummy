/* Local Rummy · interactive UI prototype (sample data, no server, no real money) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('#stage');
  let SCALE = 1;

  /* ---------- Fit the 960x432 stage to any landscape screen ---------- */
  function fit() {
    SCALE = Math.min(innerWidth / 960, innerHeight / 432);
    stage.style.transform = `translate(-50%,-50%) scale(${SCALE})`;
  }
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 200));
  fit();
  const pt = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; };

  /* ---------- Settings & themes ---------- */
  const S = { vol: 80, mus: 0, hap: true, fast: false, table: 0, back: 0 };
  const TABLES = [['Emerald', '#168049', '#0f6038', '#0a4428'], ['Royal blue', '#2856B0', '#1C3F8C', '#122A60'], ['Maroon', '#9A2A3C', '#7A1C2C', '#55121E'], ['Midnight', '#2E3646', '#1E2430', '#12161E']];
  const BACKS = [['Ruby', '#9E1B2D', '#7A1222'], ['Emerald', '#11683F', '#0B4A2C'], ['Navy', '#1C2E5C', '#122042']];
  function applyTheme() {
    const r = document.documentElement.style, t = TABLES[S.table], b = BACKS[S.back];
    r.setProperty('--felt1', t[1]); r.setProperty('--felt2', t[2]); r.setProperty('--felt3', t[3]);
    r.setProperty('--back', b[1]); r.setProperty('--backdeep', b[2]);
  }
  const spd = () => (S.fast ? 0.6 : 1);

  /* ---------- Sound (synthesised, no files) & haptics ---------- */
  let AC = null, music = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(a, type, f1, f2, dur, gain, at = 0) {
    const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function snd(kind) {
    const a = AC; if (!a || S.vol === 0) return;
    const v = S.vol / 100;
    if (kind === 'card' || kind === 'deal') {
      const len = kind === 'deal' ? 0.045 : 0.09;
      const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = kind === 'deal' ? 3200 : 2000; f.Q.value = 0.8;
      g.gain.value = (kind === 'deal' ? 0.22 : 0.45) * v; src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    } else if (kind === 'click') tone(a, 'sine', 660, 330, 0.06, 0.12 * v);
    else if (kind === 'chip') { tone(a, 'triangle', 1900, 1500, 0.08, 0.12 * v); tone(a, 'triangle', 2500, 2000, 0.07, 0.08 * v, 0.05); }
    else if (kind === 'turn') { tone(a, 'sine', 880, 0, 0.35, 0.1 * v); tone(a, 'sine', 1320, 0, 0.3, 0.05 * v, 0.03); }
    else if (kind === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, 'triangle', f, 0, 0.5, 0.12 * v, i * 0.11));
    else if (kind === 'tick') tone(a, 'square', 1200, 0, 0.03, 0.03 * v);
  }
  function setMusic() {
    const a = AC; if (!a) return;
    if (S.mus > 0 && !music) {
      const g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.value = 0; lp.connect(g); g.connect(a.destination);
      const oscs = [110, 164.8, 220, 277.2].map((f, i) => { const o = a.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; o.connect(lp); o.start(); return o; });
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      music = { g, oscs, lfo };
    }
    if (music) music.g.gain.setTargetAtTime((S.mus / 100) * 0.05, a.currentTime, 0.4);
  }
  const buzz = (ms = 12) => { if (S.hap && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  /* ---------- Chips ---------- */
  let chips = 12450;
  const fmt = (n) => n.toLocaleString('en-IN');
  function setChips(v, animate = true) {
    const from = chips; chips = v;
    const els = $$('.chipval');
    if (!animate) { els.forEach((e) => (e.textContent = fmt(v))); return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); const n = Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3))); els.forEach((e) => (e.textContent = fmt(n))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- Modal ---------- */
  const modalEl = $('#modal');
  function modal(title, html, buttons = []) {
    $('#mT').textContent = title; $('#mB').innerHTML = html;
    const f = $('#mF'); f.innerHTML = '';
    buttons.forEach((b) => { const el = document.createElement('button'); el.className = b.cls || 'btn-gold'; el.textContent = b.label; el.onclick = () => { snd('click'); if (b.keep !== true) closeModal(); b.fn && b.fn(); }; f.appendChild(el); });
    f.style.display = buttons.length ? 'flex' : 'none';
    modalEl.classList.add('on');
  }
  function closeModal() { modalEl.classList.remove('on'); }
  $('#mClose').onclick = () => { snd('click'); closeModal(); };
  modalEl.addEventListener('pointerdown', (e) => { if (e.target === modalEl) closeModal(); });
  const HOWTO = '<ol><li>Each player gets 13 cards. Arrange them into sets and sequences.</li><li>On your turn, draw one card from the closed deck or the open pile.</li><li>Then discard one card: tap it and press Discard, or drag it onto the table.</li><li>You need at least two sequences, one of them pure (no joker).</li><li>The card under the deck is the wild joker. Every card of that rank is wild (marked WILD).</li><li>When your hand is complete, press Declare.</li></ol>';

  /* ---------- Navigation ---------- */
  let cur = 'splash', prev = 'lobby';
  function go(id) {
    if (id === cur) return;
    $('#' + cur).classList.remove('on');
    if (cur === 'game' && id !== 'game') stopGame();
    if (cur === 'result') stopConfetti();
    prev = cur; cur = id;
    $('#' + id).classList.add('on');
    if (id === 'result') showResult();
  }
  $$('[data-go]').forEach((b) => (b.onclick = () => { snd('click'); go(b.dataset.go); }));

  /* ---------- Splash ---------- */
  (function splash() {
    const t0 = performance.now(), dur = 2300;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), p = Math.round(100 * (1 - Math.pow(1 - k, 2)));
      $('#loadb').style.width = p + '%';
      $('#loadt').textContent = (p < 100 ? 'SHUFFLING THE DECK · ' : 'READY · ') + p + '%';
      if (k < 1) requestAnimationFrame(step); else $('#enter').classList.add('show');
    };
    requestAnimationFrame(step);
  })();
  $('#enter').onclick = () => {
    ac(); snd('chip'); buzz(); setMusic();
    const de = document.documentElement;
    if (matchMedia('(pointer:coarse)').matches && de.requestFullscreen) {
      de.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    }
    go('lobby');
  };

  /* ---------- Lobby ---------- */
  const PEOPLE = {
    AR: ['Arjun', '#8C3B2E'], ME: ['Meera', '#3B5E8C'], KB: ['Kabir', '#5C3B7A'], RV: ['Rohan', '#1F6B4A'],
    SN: ['Sana', '#2E6E8C'], DV: ['Dev', '#8C6A2E'], PR: ['Priya', '#7A3B5C'], TJ: ['Tejas', '#4A7A3B'], AN: ['Ananya', '#8C2E4A'], VK: ['Vikram', '#3B4A8C'],
  };
  const av = (code, size, extra = '') => `<span class="av" style="width:${size}px;height:${size}px;background:${PEOPLE[code][1]};font-size:${Math.round(size * 0.34)}px;${extra}">${code}</span>`;
  const MODES = [
    { name: 'POINTS', players: '1–10', entry: 200, seats: ['AR', 'ME', 'KB'] },
    { name: 'POOL 101', players: '1–10', entry: 500, seats: ['SN', 'DV', 'PR'] },
    { name: 'DEALS', players: '1–10', entry: 100, seats: ['TJ', 'AN', 'VK'] },
  ];
  const TABS = [
    ['Choose a table', 'Virtual chips only · No real money'],
    ['Quick play · instant seat', 'Pick your game, we seat you at the next open table'],
    ['Practice vs AI', 'Free tables to learn and warm up · no chips used'],
    ['Play with friends', 'Private tables with people you know'],
  ];
  function renderLobby() {
    $('#pane0').innerHTML = MODES.map((m, i) => `
      <div class="mcard">
        <div class="oval"><div class="t">${m.name}</div>
          <span style="position:absolute;left:8px;top:0">${av(m.seats[0], 30)}</span>
          <span style="position:absolute;right:8px;top:0">${av(m.seats[1], 30)}</span>
          <span style="position:absolute;left:50%;bottom:0;transform:translateX(-50%)">${av(m.seats[2], 30)}</span>
          <span class="seat">+</span></div>
        <div class="row"><span>Players</span><b>${m.players}</b></div>
        <div class="row"><span>Entry</span><span class="g">${m.entry}</span></div>
        <button class="btn-gold" data-mode="${i}">PLAY</button>
      </div>`).join('');
    const q = { type: 0, pl: 3, st: 1 };
    const types = ['POINTS', 'POOL 101', 'DEALS'], pls = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], sts = [50, 100, 200, 500];
    const seg = (arr, key, sfx = '', cls = '') => `<div class="seg ${cls}" data-key="${key}">${arr.map((a, i) => `<button class="${q[key] === i ? 'on' : ''}" data-i="${i}" aria-label="${key === 'pl' ? a + ' players' : a}">${sfx}${a}</button>`).join('')}</div>`;
    const qsum = () => `${types[q.type]} · ${q.pl + 1}P · ${q.pl === 0 ? 'FREE' : sts[q.st]}`;
    $('#pane1').innerHTML = `
      <div class="box">
        <span class="lbl">GAME TYPE</span>${seg(types, 'type')}
        <span class="lbl">PLAYERS AT TABLE (1–10)</span>${seg(pls, 'pl', '', 'num')}
        <span class="lbl">ENTRY (VIRTUAL CHIPS)</span>${seg(sts, 'st', '● ')}
      </div>
      <div class="feltbox">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F5DC94" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <b class="cin" id="qsum" style="font-size:15px;letter-spacing:1px;color:var(--gold2)">${qsum()}</b>
        <span style="font-size:11px;font-weight:600;color:#CFE3D6">1,248 players online · seat in ~5 sec</span>
        <button class="btn-gold" id="findSeat" style="width:100%;margin-top:4px">FIND A SEAT</button>
      </div>`;
    $$('#pane1 .seg').forEach((sg) => sg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; snd('click');
      q[sg.dataset.key] = +b.dataset.i; $$('button', sg).forEach((x) => x.classList.toggle('on', x === b)); $('#qsum').textContent = qsum();
    }));
    $('#findSeat').onclick = () => {
      snd('click');
      modal('FINDING A SEAT', '<div style="display:flex;align-items:center;gap:12px"><div class="spin" style="width:26px;height:26px;border-radius:50%;border:3px solid rgba(232,198,106,.25);border-top-color:#E8C66A;animation:sp 0.8s linear infinite"></div><span>Matching you with players at a ' + types[q.type] + ' table…</span></div><style>@keyframes sp{to{transform:rotate(360deg)}}</style>');
      const n = q.pl + 1; S.players = n;
      setTimeout(() => { closeModal(); startMode({ name: types[q.type], entry: n === 1 ? 0 : sts[q.st], players: n }); }, 1300);
    };
    const levels = [['BEGINNER', 1, '2 players', '#2F7A55', 2], ['SKILLED', 2, '4 players', '#2E5E8C', 4], ['EXPERT', 3, '6 players', '#7A2E3B', 6]];
    $('#pane2').innerHTML = levels.map((l) => `
      <div class="mcard">
        <div style="position:relative;height:88px;border-radius:12px;background:radial-gradient(ellipse at 50% 40%,#1b7a4a,#0c4b2d);border:2px solid var(--gold3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
          <span style="width:38px;height:38px;border-radius:50%;background:${l[3]};border:2px solid var(--gold);display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF4DA" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><line x1="9" y1="13" x2="9.01" y2="13"/><line x1="15" y1="13" x2="15.01" y2="13"/><path d="M9 17h6"/></svg></span>
          <b class="cin" style="font-size:13px;letter-spacing:1px;color:var(--gold2)">${l[0]}</b>
          <span style="position:absolute;right:8px;top:8px;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.4);font-size:9px;font-weight:800;color:#CFE3D6">AI</span>
        </div>
        <div class="row"><span>Difficulty</span><span style="letter-spacing:2px;color:var(--gold);font-size:12px">${'★'.repeat(l[1])}<span style="color:#4A5670">${'★'.repeat(3 - l[1])}</span></span></div>
        <div class="row"><span>Suggested</span><b>${l[2]}</b></div>
        <div class="row"><span>Entry</span><b style="color:#7FD3A6">FREE</b></div>
        <button class="btn-line" style="height:36px" data-practice="${l[0]}" data-def="${l[4]}">START PRACTICE</button>
      </div>`).join('');
    const friends = [['SN', 'Online · in lobby', 1], ['DV', 'Online · playing Pool 101', 1], ['PR', 'Online · in lobby', 1], ['TJ', 'Last seen 2h ago', 0]];
    $('#pane3').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="feltbox" style="align-items:stretch;text-align:left;gap:6px;padding:12px 14px">
          <span class="lbl" style="color:#CFE3D6">CREATE PRIVATE TABLE</span>
          <div style="display:flex;align-items:center;justify-content:space-between"><b class="cin" id="tcode" style="font-size:20px;letter-spacing:2px;color:var(--gold2)">RR-4821</b><button class="btn-line" style="height:30px;font-size:10px;padding:0 10px" id="newCode">NEW CODE</button></div>
          <span style="font-size:10px;font-weight:600;color:#CFE3D6">Share this code · Points rummy · 1 to 10 players</span>
          <button class="btn-gold" style="height:36px;font-size:12px" id="createT">CREATE TABLE</button>
        </div>
        <div class="box" style="gap:6px;padding:10px 14px">
          <label class="lbl" for="jcode">JOIN WITH CODE</label>
          <div style="display:flex;gap:8px"><input class="code" id="jcode" placeholder="RR-0000" autocomplete="off"><button class="btn-line" style="height:36px;width:70px;border-radius:10px;padding:0" id="joinT">JOIN</button></div>
        </div>
      </div>
      <div class="box" style="gap:4px;padding:10px 12px">
        <span class="lbl">FRIENDS · 3 ONLINE</span>
        ${friends.map((f) => `<div class="friend"><span style="position:relative">${av(f[0], 30)}<i class="st" style="background:${f[2] ? '#2FA36B' : '#5B667E'}"></i></span><span style="flex:1;display:flex;flex-direction:column"><b style="font-size:12px">${PEOPLE[f[0]][0]}</b><span style="font-size:10px;font-weight:600;color:var(--muteb)">${f[1]}</span></span><button class="inv">${f[2] ? 'INVITE' : 'NOTIFY'}</button></div>`).join('')}
      </div>`;
    $('#newCode').onclick = () => { snd('click'); $('#tcode').textContent = 'RR-' + (1000 + Math.floor(Math.random() * 9000)); };
    $('#createT').onclick = () => tableSetup({ name: 'PRIVATE ' + $('#tcode').textContent, entry: 0 }, 4);
    $('#joinT').onclick = () => {
      const v = $('#jcode').value.trim().toUpperCase();
      if (!/^RR-\d{4}$/.test(v)) { snd('click'); modal('CHECK THE CODE', 'Table codes look like <b>RR-1234</b>. Ask your friend for theirs.', [{ label: 'OK' }]); return; }
      tableSetup({ name: 'PRIVATE ' + v, entry: 0 }, 4);
    };
    $$('#pane3 .inv').forEach((b) => { const base = b.textContent; b.onclick = () => { snd('click'); buzz(); const on = b.classList.toggle('on'); b.textContent = on ? (base === 'NOTIFY' ? 'NOTIFIED' : 'INVITED') : base; }; });
    $$('[data-mode]').forEach((b) => (b.onclick = () => tableSetup(MODES[+b.dataset.mode], 4)));
    $$('[data-practice]').forEach((b) => (b.onclick = () => tableSetup({ name: 'PRACTICE · ' + b.dataset.practice, entry: 0 }, +b.dataset.def, true)));
  }

  /* Table setup: choose 1–10 players before every game */
  const SEAT_POOL = ['AR', 'ME', 'KB', 'SN', 'DV', 'PR', 'TJ', 'AN', 'VK'];
  function tableSetup(m, def = 4, useDef = false) {
    snd('click');
    let n = useDef ? def : (S.players || def);
    const body = `
      <span class="lbl" style="color:var(--mute)">NUMBER OF PLAYERS (INCLUDING YOU)</span>
      <div class="pchips" id="pchips" style="margin-top:8px">${Array.from({ length: 10 }, (_, i) => `<button data-n="${i + 1}" aria-label="${i + 1} players">${i + 1}</button>`).join('')}</div>
      <div class="prow" id="prow"></div>
      <div class="pnote" id="pnote"></div>`;
    modal('TABLE SETUP · ' + m.name, body, [{ label: 'Cancel', cls: 'btn-line' }, { label: 'START GAME', fn: () => { S.players = n; startMode({ ...m, players: n, entry: n === 1 ? 0 : m.entry }); } }]);
    const paint = () => {
      $$('#pchips button').forEach((b) => b.classList.toggle('on', +b.dataset.n === n));
      $('#prow').innerHTML = av('RV', 30, 'box-shadow:0 0 0 2px #F5C542') + SEAT_POOL.slice(0, n - 1).map((c, i) => `<span style="animation-delay:${i * 30}ms;display:inline-flex">${av(c, 30)}</span>`).join('');
      const decks = n > 6 ? 3 : 2;
      $('#pnote').innerHTML = n === 1
        ? '<b style="color:var(--gold2)">Solo practice</b> · just you and the deck · free'
        : `<b style="color:var(--gold2)">You + ${n - 1} opponent${n > 2 ? 's' : ''}</b> · ${decks} decks (${decks * 54} cards)${m.entry ? ' · entry ' + fmt(m.entry) : ' · free'}`;
    };
    $$('#pchips button').forEach((b) => (b.onclick = () => { n = +b.dataset.n; snd('tick'); buzz(6); paint(); }));
    paint();
  }
  renderLobby();
  $$('.tab').forEach((t) => (t.onclick = () => {
    snd('click'); const i = +t.dataset.tab;
    $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
    $$('.tabpane').forEach((p, j) => p.classList.toggle('on', i === j));
    $('#lh').textContent = TABS[i][0]; $('#lp').textContent = TABS[i][1];
  }));
  let bonusTaken = false;
  $('#bonusBtn').onclick = () => {
    snd('click');
    if (bonusTaken) { modal('DAILY BONUS', 'You have already collected today’s bonus. Come back tomorrow for more free chips.', [{ label: 'OK' }]); return; }
    modal('DAILY BONUS', '<div style="text-align:center">Collect your free virtual chips for today.<div class="cin" style="font-size:34px;color:var(--gold2);margin-top:8px">+1,000</div><span style="font-size:11px;color:var(--mute)">Virtual chips have no cash value.</span></div>',
      [{ label: 'COLLECT', fn: () => { bonusTaken = true; snd('chip'); setTimeout(() => snd('chip'), 120); buzz(30); setChips(chips + 1000); } }]);
  };
  const profile = () => { snd('click'); modal('PROFILE', `<div style="display:flex;gap:16px;align-items:center">${av('RV', 64)}<div><b style="font-size:18px">Rohan Verma</b><div style="color:var(--mute);font-size:12px">Level 18 · Gold league</div><div style="display:flex;gap:20px;margin-top:8px">${[['142', 'Games'], ['61%', 'Win rate'], ['3', 'Streak']].map((x) => `<div><b class="cin" style="font-size:18px;color:var(--gold2)">${x[0]}</b><div style="font-size:10px;color:var(--mute)">${x[1]}</div></div>`).join('')}</div></div></div>`); };
  $('#profileBtn').onclick = profile; $('#profileBtn2').onclick = profile;

  /* ---------- Cards ---------- */
  const SUITS = ['♠', '♥', '♣', '♦'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RV = { A: 1, J: 11, Q: 12, K: 13, JK: 14 };
  const rv = (r) => RV[r] || parseInt(r, 10);
  const isRed = (s) => s === '♥' || s === '♦';
  const CROWN = '<svg width="16" height="9" viewBox="0 0 16 9" aria-hidden="true"><path d="M1 8 L2 2 L5.5 5 L8 0.5 L10.5 5 L14 2 L15 8 Z" fill="#C9A24A"/></svg>';
  const STAR = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#E8C66A" stroke="#8a6a2a"/></svg>';
  let G = null;
  const isWild = (c) => G && G.wild && (c.r === 'JK' || c.r === G.wild.r);
  const label = (c) => (c.r === 'JK' ? 'Joker' : c.r + c.s);
  function cardHTML(c) {
    if (c.r === 'JK') return `<div class="c j"><b>J</b><i>★</i></div><div class="jk">${STAR}JOKER</div>`;
    const col = isRed(c.s) ? 'r' : 'k', face = c.r === 'J' || c.r === 'Q' || c.r === 'K';
    let h = `<div class="c ${col}"><b>${c.r}</b><i>${c.s}</i></div>`;
    h += face ? `<div class="court ${col}">${CROWN}<b>${c.r}</b></div>` : `<div class="pip ${col}">${c.s}</div>`;
    if (isWild(c)) h += '<span class="wild">WILD</span>';
    return h;
  }
  const BACK = '<span class="crest">R</span>';
  function newDeck(decks = 2) {
    let id = 0; const d = [];
    for (let k = 0; k < decks; k++) { for (const s of SUITS) for (const r of RANKS) d.push({ id: id++, r, s }); d.push({ id: id++, r: 'JK', s: '★' }); }
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  const sortCards = (h) => h.sort((a, b) => (a.r === 'JK') - (b.r === 'JK') || SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || rv(a.r) - rv(b.r));

  /* ---------- Game layout ---------- */
  const DECK_C = { x: 383, y: 206 }, OPEN_C = { x: 531, y: 206 };
  /* Seat positions around the felt for 0–9 opponents, in turn order (clockwise from your left). */
  const T = (x) => ({ x, y: 46 }), L = { x: 80, y: 124 }, TL = { x: 84, y: 46 }, TR = { x: 746, y: 46 }, R = { x: 770, y: 124 }, R2 = { x: 770, y: 200 };
  const LAYOUTS = [
    [], [T(415)], [T(250), T(580)], [L, T(415), R], [L, T(290), T(540), R],
    [L, T(220), T(415), T(610), R], [L, T(200), T(330), T(460), T(590), R],
    [L, TL, T(250), T(415), T(580), TR, R], [L, TL, T(215), T(345), T(475), T(605), TR, R],
    [L, TL, T(215), T(345), T(475), T(605), TR, R, R2],
  ];
  let OPP = {}, ORDER = [], SEAT_C = {};
  function setupSeats(n) {
    OPP = {}; ORDER = []; SEAT_C = {};
    const box = $('#seats'); box.innerHTML = '';
    LAYOUTS[n - 1].forEach((p, i) => {
      const id = 'o' + i, code = SEAT_POOL[i];
      OPP[id] = { code, name: PEOPLE[code][0] }; ORDER.push(id); SEAT_C[id] = { x: p.x - 14, y: p.y - 10 };
      const el = document.createElement('div'); el.className = 'oseat'; el.id = 'seat-' + id;
      el.style.left = p.x - 48 + 'px'; el.style.top = p.y - 35 + 'px'; el.style.animationDelay = i * 40 + 'ms';
      el.innerHTML = seatInner(id); box.appendChild(el);
    });
  }
  const handEl = $('#hand'), flyLayer = $('#flyLayer'), els = new Map();

  function slots() {
    const h = G.hands.you, n = h.length, gap = G.grouped ? 14 : 0;
    let breaks = 0; for (let i = 1; i < n; i++) if (h[i].s !== h[i - 1].s) breaks++;
    const area = 600, step = Math.min(44, (area - 66 - breaks * gap) / Math.max(1, n - 1));
    const total = step * (n - 1) + 66 + breaks * gap; let x = 150 + (area - total) / 2;
    return h.map((c, i) => { if (i > 0) { x += step; if (G.grouped && c.s !== h[i - 1].s) x += gap; } return { id: c.id, x: Math.round(x), y: 316 }; });
  }
  function renderHand() {
    const sl = slots(), alive = new Set();
    G.hands.you.forEach((c, i) => {
      let el = els.get(c.id);
      if (!el) { el = document.createElement('div'); el.className = 'card'; el.innerHTML = cardHTML(c); el.setAttribute('role', 'button'); el.setAttribute('aria-label', label(c)); attachDrag(el, c); handEl.appendChild(el); els.set(c.id, el); }
      alive.add(c.id);
      const sel = G.selected.has(c.id), s = sl[i];
      el.classList.toggle('sel', sel);
      el.dataset.x = s.x; el.dataset.y = s.y - (sel ? 18 : 0);
      if (!el.classList.contains('drag')) el.style.transform = `translate(${el.dataset.x}px,${el.dataset.y}px)`;
      el.style.zIndex = i + 1;
    });
    els.forEach((el, id) => { if (!alive.has(id)) { el.remove(); els.delete(id); } });
    updateButtons();
  }
  function refreshCardFaces() { G.hands.you.forEach((c) => { const el = els.get(c.id); if (el) el.innerHTML = cardHTML(c); }); }

  /* ---------- Flying cards ---------- */
  function fly(card, from, to, o = {}) {
    const el = document.createElement('div');
    el.className = 'card fly' + (card ? '' : ' back');
    el.innerHTML = card ? cardHTML(card) : BACK;
    el.style.left = from.x - 33 + 'px'; el.style.top = from.y - 48 + 'px';
    flyLayer.appendChild(el);
    const a = el.animate([
      { transform: `translate(0,0) rotate(${o.r0 || 0}deg) scale(${o.s0 ?? 1})` },
      { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) rotate(${o.r1 || 0}deg) scale(${o.s1 ?? 1})` },
    ], { duration: (o.dur || 320) * spd(), easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'forwards' });
    return a.finished.then(() => el.remove()).catch(() => el.remove());
  }

  /* ---------- Seats ---------- */
  function seatInner(id) {
    const p = OPP[id], c = PEOPLE[p.code][1], r = 18, len = (2 * Math.PI * r).toFixed(1);
    return `<div class="otop"><div class="avwrap" style="width:40px;height:40px"><svg class="ring" viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="${r}"/><circle class="fg" id="ring-${id}" cx="20" cy="20" r="${r}" stroke-dasharray="${len}" stroke-dashoffset="0"/></svg><span class="av" style="width:30px;height:30px;background:${c};font-size:11px">${p.code}</span><span class="badge" id="cnt-${id}">0</span></div><div id="last-${id}" class="lastc"><span class="mback"></span></div></div><b class="sname">${p.name}</b><div class="sstat" id="st-${id}">WAITING</div>`;
  }
  function bumpCount(id, n) {
    const el = $('#cnt-' + id); if (!el) return;
    el.textContent = n; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 110);
  }
  const setCount = (id) => bumpCount(id, G.hands[id].length);
  function setStatus(id, txt, hot) { const el = $('#st-' + id); if (!el) return; el.textContent = txt; el.classList.toggle('hot', !!hot); }
  function setLast(id, c) {
    const box = $('#last-' + id);
    box.innerHTML = c ? `<div class="mini"><span class="${isRed(c.s) ? 'r' : c.r === 'JK' ? 'j' : 'k'}">${c.r === 'JK' ? 'J' : c.r}</span><span class="${isRed(c.s) ? 'r' : 'k'}">${c.s}</span></div>` : '';
  }
  let ringAnim = null;
  function activate(id, secs) {
    ORDER.forEach((o) => $('#seat-' + o).classList.toggle('active', o === id));
    $('#myRing').classList.toggle('on', id === 'you');
    if (ringAnim) { ringAnim.cancel(); ringAnim = null; }
    if (!id) return;
    const fg = id === 'you' ? $('#myRingFg') : $('#ring-' + id);
    const len = parseFloat(fg.getAttribute('stroke-dasharray'));
    ringAnim = fg.animate([{ strokeDashoffset: 0, stroke: '#F5C542' }, { strokeDashoffset: len * 0.8, stroke: '#F5C542', offset: 0.8 }, { strokeDashoffset: len, stroke: '#E0453A' }], { duration: secs * 1000, fill: 'forwards' });
    return ringAnim;
  }
  function banner(txt, code = 'RV', hot = false) {
    $('#bannerTxt').textContent = txt;
    const a = $('#bannerAv'); a.textContent = code; a.style.background = PEOPLE[code][1];
    $('#banner').classList.toggle('hot', hot);
  }
  function renderOpen() {
    const box = $('#openCard'); box.innerHTML = '';
    if (G.open) { const el = document.createElement('div'); el.className = 'card'; el.style.transform = 'scale(.94)'; el.style.left = '-2px'; el.style.top = '-4px'; el.innerHTML = cardHTML(G.open); el.style.cursor = 'pointer'; el.onclick = drawOpen; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Pick up ' + label(G.open)); box.appendChild(el); }
  }
  function renderTray() {
    const recent = G.discards.slice(-4), rots = [-18, -6, 6, 16], box = $('#trayCards');
    $('#trayEmpty').style.display = recent.length ? 'none' : 'block';
    box.innerHTML = recent.map((d, i) => `<div style="position:absolute;left:${16 + i * 32}px;top:${28 + Math.abs(i - 1.5) * 4}px;width:46px;height:64px;transform:rotate(${rots[i]}deg)"><div class="card" style="transform:scale(.697);transform-origin:0 0;left:0;top:0">${cardHTML(d.card)}</div>${d.by ? `<span class="tag2" style="background:${PEOPLE[d.by][1]}">${d.by}</span>` : ''}</div>`).join('');
  }
  function updateButtons() {
    if (!G) return;
    const mine = G.turn === 'you';
    $('#discardBtn').disabled = !(mine && G.drawn && G.selected.size === 1);
    $('#declareBtn').disabled = !(mine && G.drawn);
    $('#deck').classList.toggle('can', mine && !G.drawn);
    $('#openp').classList.toggle('can', mine && !G.drawn && !!G.open);
  }

  /* ---------- Game flow ---------- */
  let tok = 0; const timers = [];
  const sleep = (ms, t) => new Promise((res, rej) => { timers.push(setTimeout(() => (t === tok ? res() : rej('stop')), ms * spd())); });
  function stopGame() {
    tok++; timers.forEach(clearTimeout); timers.length = 0;
    flyLayer.innerHTML = ''; activate(null);
    if (myTimer) { myTimer.cancel(); myTimer = null; }
  }
  let mode = MODES[0];
  function startMode(m) {
    if (m.entry > chips) { snd('click'); modal('NOT ENOUGH CHIPS', `This table needs <b>${fmt(m.entry)}</b> chips. Collect your daily bonus from the + button, or pick a table with a lower entry.`, [{ label: 'OK' }]); return; }
    snd('chip'); buzz();
    mode = m;
    if (m.entry) setChips(chips - m.entry);
    go('game'); startGame();
  }
  async function startGame() {
    stopGame(); const t = tok;
    const nP = mode.players || 4;
    setupSeats(nP);
    G = { deck: newDeck(nP > 6 ? 3 : 2), hands: { you: [] }, open: null, wild: null, discards: [], turn: null, drawn: false, selected: new Set(), grouped: false, turns: 0, start: Date.now(), last: {} };
    ORDER.forEach((id) => (G.hands[id] = []));
    els.forEach((el) => el.remove()); els.clear();
    $('#modepill').innerHTML = `<b>${mode.name}</b><span>${nP === 1 ? 'SOLO' : nP + ' PLAYERS'} · ${mode.entry ? fmt(mode.entry) : 'FREE'}</span>`;
    $('#jokerCard').classList.remove('show'); $('#jokerCard').innerHTML = '';
    $('#deckLabel').textContent = 'DECK';
    renderOpen(); renderTray(); updateButtons();
    banner('Shuffling the deck…', 'RV');
    $('#deckTop').style.visibility = 'hidden'; $('#deckStack').style.visibility = 'hidden';
    try {
      // 1. Riffle shuffle
      const sh = [];
      for (let i = 0; i < 10; i++) { const el = document.createElement('div'); el.className = 'card back fly'; el.innerHTML = BACK; el.style.left = DECK_C.x - 33 + 'px'; el.style.top = DECK_C.y - 48 - i * 0.6 + 'px'; el.style.zIndex = 60 + i; flyLayer.appendChild(el); sh.push(el); }
      for (let r = 0; r < 3; r++) {
        sh.forEach((el, i) => el.animate([{ transform: 'none' }, { transform: `translate(${i % 2 ? 44 : -44}px,-10px) rotate(${i % 2 ? 10 : -10}deg)` }, { transform: 'none' }], { duration: 300 * spd(), easing: 'ease-in-out', delay: (i % 5) * 8 }));
        for (let k = 0; k < 5; k++) setTimeout(() => snd('deal'), (150 + k * 22) * spd());
        await sleep(320, t);
      }
      sh.forEach((el) => el.remove());
      $('#deckTop').style.visibility = ''; $('#deckStack').style.visibility = '';
      // 2. Deal 13 rounds: Arjun, Meera, Kabir, You
      banner(nP === 1 ? 'Dealing your 13 cards…' : 'Dealing 13 cards to each of ' + nP + ' players…', 'RV');
      const seats = [...ORDER, 'you'], total = 13 * nP;
      const gap = Math.max(16, Math.min(80, Math.round(2200 / total)));
      for (let n = 0; n < total; n++) G.hands[seats[n % nP]].push(G.deck.pop());
      const mine = G.hands.you; G.hands.you = [];
      const finalSlots = (() => { const save = G.hands.you; G.hands.you = mine; const s = slots(); G.hands.you = save; return s; })();
      const flights = [];
      for (let n = 0; n < total; n++) {
        const who = seats[n % nP], round = Math.floor(n / nP);
        const to = who === 'you' ? { x: finalSlots[round].x + 33, y: finalSlots[round].y + 48 } : SEAT_C[who];
        if (n % (nP > 6 ? 2 : 1) === 0) snd('deal');
        flights.push(fly(null, DECK_C, to, who === 'you' ? { dur: 260 } : { dur: 260, s1: 0.4, r1: SEAT_C[who].x > 600 ? 22 : SEAT_C[who].x < 200 ? -22 : 12 }).then(() => {
          if (t !== tok) return;
          if (who === 'you') {
            G.hands.you.push(mine[round]); renderHand();
            const el = els.get(mine[round].id);
            el.animate([{ transform: `translate(${el.dataset.x}px,${el.dataset.y}px) rotateY(90deg)` }, { transform: `translate(${el.dataset.x}px,${el.dataset.y}px)` }], { duration: 220 * spd(), easing: 'ease-out' });
          } else bumpCount(who, round + 1);
        }));
        await sleep(gap, t);
      }
      await Promise.all(flights); await sleep(150, t);
      // 3. Auto-arrange, reveal wild joker and first open card
      sortCards(G.hands.you); renderHand(); snd('card');
      let w = G.deck.pop(); while (w.r === 'JK') { G.deck.unshift(w); w = G.deck.pop(); }
      G.wild = w; refreshCardFaces();
      $('#jokerCard').innerHTML = `<b class="${isRed(w.s) ? 'r' : 'k'}">${w.r}</b><span class="${isRed(w.s) ? 'r' : 'k'}" style="font-size:15px">${w.s}</span>`;
      $('#jokerCard').classList.add('show');
      $('#deckLabel').textContent = 'DECK · JOKER ' + w.r + w.s;
      banner('Wild joker is ' + w.r + w.s + ' · every ' + w.r + ' is wild', 'RV');
      await sleep(500, t);
      const first = G.deck.pop();
      await fly(first, DECK_C, OPEN_C, { dur: 300, r0: -10 });
      G.open = first; G.openBy = ''; renderOpen(); snd('card');
      await sleep(450, t);
      yourTurn();
    } catch (e) { /* game left */ }
  }

  let myTimer = null;
  function yourTurn() {
    G.turn = 'you'; G.drawn = false; G.turns++;
    banner('Your turn · draw from the deck or open pile', 'RV');
    snd('turn'); buzz(20);
    myTimer = activate('you', 30);
    if (myTimer) myTimer.onfinish = () => { if (G && G.turn === 'you') autoPlay(); };
    updateButtons();
  }
  async function autoPlay() {
    banner('Time’s up · auto-playing your turn', 'RV', true);
    if (!G.drawn) await drawDeck();
    const last = G.hands.you[G.hands.you.length - 1];
    if (last) discard(last.id);
  }
  function addToHand(card, fromC, faceUp) {
    G.hands.you.push(card); G.selected = new Set([card.id]);
    const sl = slots(), s = sl[sl.length - 1];
    renderHand();
    const el = els.get(card.id); el.classList.add('hidden');
    return fly(faceUp ? card : null, fromC, { x: s.x + 33, y: s.y - 18 + 48 }, { dur: 340 }).then(() => {
      el.classList.remove('hidden');
      el.animate([{ transform: `translate(${el.dataset.x}px,${el.dataset.y}px) rotateY(90deg)` }, { transform: `translate(${el.dataset.x}px,${el.dataset.y}px)` }], { duration: 200 * spd() });
      snd('card'); buzz(8);
    });
  }
  async function drawDeck() {
    if (!G || G.turn !== 'you' || G.drawn) return;
    if (!G.deck.length) { G.deck = G.discards.map((d) => d.card); G.discards = []; renderTray(); }
    G.drawn = true; updateButtons();
    banner('Select one card to discard · tap it, or drag it onto the table', 'RV');
    await addToHand(G.deck.pop(), DECK_C, false); updateButtons();
  }
  async function drawOpen() {
    if (!G || G.turn !== 'you' || G.drawn || !G.open) return;
    const c = G.open; G.drawn = true;
    const prevD = G.discards.pop(); G.open = prevD ? prevD.card : null;
    renderOpen(); renderTray(); updateButtons();
    banner('Picked up ' + label(c) + ' · now discard one card', 'RV');
    await addToHand(c, OPEN_C, true); updateButtons();
  }
  $('#deckTop').onclick = drawDeck;

  function toggleSelect(id) {
    if (G.selected.has(id)) G.selected.delete(id); else G.selected.add(id);
    snd('tick'); buzz(6); renderHand();
    if (G.turn === 'you' && G.drawn) banner(G.selected.size === 1 ? 'Tap Discard, or drag the card onto the table' : 'Select one card to discard', 'RV');
  }
  function discard(id, fromC) {
    if (!G || G.turn !== 'you' || !G.drawn) return;
    const i = G.hands.you.findIndex((c) => c.id === id); if (i < 0) return;
    const card = G.hands.you[i], el = els.get(id);
    const from = fromC || { x: +el.dataset.x + 33, y: +el.dataset.y + 48 };
    G.hands.you.splice(i, 1); G.selected.clear(); G.turn = 'none'; G.drawn = false;
    if (myTimer) { myTimer.cancel(); myTimer = null; } activate(null);
    renderHand();
    const t = tok;
    fly(card, from, OPEN_C, { dur: 300, s1: 0.94, r0: -6 }).then(() => {
      if (t !== tok) return;
      if (G.open) G.discards.push({ card: G.open, by: G.openBy || '' });
      G.open = card; G.openBy = 'RV'; renderOpen(); renderTray(); snd('card');
      opponents();
    });
  }
  $('#discardBtn').onclick = () => { if (G.selected.size === 1) discard([...G.selected][0]); };

  async function opponents() {
    const t = tok;
    // Big tables play faster so your turn comes round quickly.
    const pace = ORDER.length <= 3 ? 1 : ORDER.length <= 6 ? 0.55 : 0.3;
    const fp = ORDER.length <= 3 ? 1 : 0.62;
    try {
      for (const id of ORDER) {
        const p = OPP[id];
        G.turn = id; updateButtons();
        activate(id, 12); setStatus(id, 'THINKING…', true);
        banner(p.name + '’s turn · thinking…', p.code, true);
        await sleep((700 + Math.random() * 600) * pace, t);
        const takeOpen = G.open && Math.random() < 0.25;
        if (takeOpen) {
          const c = G.open; const prevD = G.discards.pop(); G.open = prevD ? prevD.card : null; G.openBy = prevD ? prevD.by : null;
          renderOpen(); renderTray(); banner(p.name + ' picked up ' + label(c), p.code, true);
          await fly(c, OPEN_C, SEAT_C[id], { dur: 340 * fp, s1: 0.4 }); G.hands[id].push(c);
        } else {
          if (!G.deck.length) { G.deck = G.discards.map((d) => d.card); G.discards = []; renderTray(); }
          await fly(null, DECK_C, SEAT_C[id], { dur: 340 * fp, s1: 0.4 }); G.hands[id].push(G.deck.pop());
        }
        snd('deal'); setCount(id); setStatus(id, 'THROWING', true);
        await sleep(450 * pace, t);
        const hand = G.hands[id];
        let k = Math.floor(Math.random() * hand.length), tries = 0;
        while (isWild(hand[k]) && tries++ < 10) k = Math.floor(Math.random() * hand.length);
        const c = hand.splice(k, 1)[0]; setCount(id);
        await fly(c, SEAT_C[id], OPEN_C, { dur: 420 * fp, s0: 0.4, s1: 0.94, r0: SEAT_C[id].x > 600 ? 20 : -20 });
        if (G.open) G.discards.push({ card: G.open, by: G.openBy || '' });
        G.open = c; G.openBy = p.code; renderOpen(); renderTray(); snd('card');
        setLast(id, c); setStatus(id, 'THREW ' + label(c), false);
        banner(p.name + ' threw ' + label(c), p.code, true);
        activate(null);
        await sleep(550 * pace, t);
      }
      if (!ORDER.length) await sleep(250, t);
      yourTurn();
    } catch (e) { /* left the table */ }
  }

  /* drag to rearrange or discard */
  function attachDrag(el, card) {
    el.addEventListener('pointerdown', (e) => {
      if (!G || !G.turn) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const p0 = pt(e), bx = +el.dataset.x, by = +el.dataset.y; let dragging = false;
      const dz = $('#dropzone'), canDrop = () => G.turn === 'you' && G.drawn;
      const move = (ev) => {
        const p = pt(ev), dx = p.x - p0.x, dy = p.y - p0.y;
        if (!dragging && Math.hypot(dx, dy) > 7) { dragging = true; el.classList.add('drag'); el.style.zIndex = 300; if (canDrop()) dz.classList.add('on'); }
        if (dragging) { el.style.transform = `translate(${bx + dx}px,${by + dy}px) rotate(${dx * 0.03}deg) scale(1.08)`; dz.style.background = p.y < 285 && canDrop() ? 'rgba(245,197,66,.2)' : ''; }
      };
      const up = (ev) => {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        dz.classList.remove('on'); dz.style.background = '';
        if (!dragging) { toggleSelect(card.id); return; }
        el.classList.remove('drag');
        const p = pt(ev), dx = p.x - p0.x, dy = p.y - p0.y;
        if (p.y < 285 && canDrop()) { discard(card.id, { x: bx + dx + 33, y: by + dy + 48 }); return; }
        const h = G.hands.you, from = h.findIndex((c) => c.id === card.id), sl = slots();
        let to = 0, best = 1e9; sl.forEach((s, i) => { const d = Math.abs(s.x - (bx + dx)); if (d < best) { best = d; to = i; } });
        if (from > -1 && to !== from) { h.splice(to, 0, h.splice(from, 1)[0]); G.grouped = false; snd('card'); buzz(6); }
        renderHand();
      };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }

  $('#sortBtn').onclick = () => { if (!G) return; snd('card'); buzz(); sortCards(G.hands.you); G.grouped = false; renderHand(); };
  $('#groupBtn').onclick = () => { if (!G) return; snd('card'); buzz(); sortCards(G.hands.you); G.grouped = true; renderHand(); };
  $('#declareBtn').onclick = () => {
    snd('click');
    modal('DECLARE HAND?', 'Your groups will be checked. A wrong declaration costs 80 points.<br><span style="color:var(--mute);font-size:12px">Prototype: this demo always shows a winning result.</span>',
      [{ label: 'Keep playing', cls: 'btn-line' }, { label: 'Declare', fn: () => { stopGame(); snd('win'); buzz(40); go('result'); } }]);
  };
  $('#leaveBtn').onclick = () => { snd('click'); modal('LEAVE TABLE?', 'Leaving now counts as a drop for this deal.', [{ label: 'Stay', cls: 'btn-line' }, { label: 'Leave', cls: 'btn-red', fn: () => go('lobby') }]); };
  $('#emoteBtn').onclick = () => {
    snd('click');
    const msgs = ['Good luck!', 'Well played', 'Nice move', 'Hurry up!'];
    modal('QUICK CHAT', `<div style="display:flex;flex-wrap:wrap;gap:10px">${msgs.map((m) => `<button class="btn-line" data-chat="${m}">${m}</button>`).join('')}</div>`);
    $$('[data-chat]').forEach((b) => (b.onclick = () => {
      closeModal(); snd('click'); bubble(b.dataset.chat, 30, 262);
      if (!ORDER.length) return;
      const who = ORDER[Math.floor(Math.random() * ORDER.length)], replies = ['Thanks!', 'You too!', 'Haha, nice', 'Let’s go!'];
      setTimeout(() => { if (cur === 'game') bubble(replies[Math.floor(Math.random() * replies.length)], SEAT_C[who].x - 24, SEAT_C[who].y + 46); }, 1300);
    }));
  };
  function bubble(txt, x, y) { const b = document.createElement('div'); b.className = 'bubble'; b.textContent = txt; b.style.left = x + 'px'; b.style.top = y + 'px'; $('#game').appendChild(b); setTimeout(() => b.remove(), 2300); }

  /* ---------- Result ---------- */
  const pts = (h) => Math.min(80, h.reduce((s, c) => s + (isWild(c) ? 0 : Math.min(10, rv(c.r) === 1 ? 10 : rv(c.r))), 0));
  let confettiRun = 0;
  function showResult() {
    const rows = [{ code: 'RV', name: 'Rohan (You)', p: 0, you: true }];
    let won = 0;
    ORDER.forEach((id) => { const p = G ? pts(G.hands[id]) : 40; const c = p * 2; won += c; rows.push({ code: OPP[id].code, name: OPP[id].name, p, c: -c }); });
    rows[0].c = won;
    const small = rows.length > 5, solo = rows.length === 1;
    $('.rhead h1').textContent = solo ? 'HAND COMPLETE' : 'YOU WIN';
    $('#rrows').innerHTML = rows.map((r, i) => `<div class="rrow${r.you ? ' you' : ''}${small ? ' sm' : ''}" style="animation-delay:${0.35 + Math.min(i, 6) * 0.08}s"><span style="display:flex;align-items:center;gap:8px">${av(r.code, small ? 22 : 28)}${r.name}</span><span style="color:#DCE9E0">${r.p}</span><span style="text-align:right;color:${r.c >= 0 ? 'var(--gold2)' : '#F2A9A9'}">${r.c >= 0 ? '+' : '−'}${fmt(Math.abs(r.c))}</span></div>`).join('');
    const secs = G ? Math.round((Date.now() - G.start) / 1000) : 0;
    $('#sDur').textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    $('#sTurns').textContent = G ? G.turns : 0;
    $('#rsub').textContent = (solo ? 'SOLO PRACTICE · ' : 'VALID DECLARATION · ' + rows.length + ' PLAYERS · ') + mode.name;
    setTimeout(() => setChips(chips + won + (mode.entry || 0)), 900);
    startConfetti();
  }
  function startConfetti() {
    const cv = $('#confetti'), cx = cv.getContext('2d'), run = ++confettiRun;
    const cols = ['#E8C66A', '#F5DC94', '#C8343B', '#2FA36B', '#FFFFFF'];
    const P = Array.from({ length: 140 }, () => ({ x: Math.random() * 960, y: -Math.random() * 432, w: 4 + Math.random() * 5, h: 7 + Math.random() * 8, vy: 1.2 + Math.random() * 2.2, vx: -0.6 + Math.random() * 1.2, r: Math.random() * 6, vr: -0.15 + Math.random() * 0.3, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    const step = (t) => {
      if (run !== confettiRun) return;
      cx.clearRect(0, 0, 960, 432);
      const fade = Math.max(0, 1 - (t - t0 - 5000) / 1500); cx.globalAlpha = fade;
      P.forEach((p) => { p.y += p.vy; p.x += p.vx + Math.sin((t / 400) + p.r) * 0.6; p.r += p.vr; if (p.y > 440 && fade > 0.9) { p.y = -10; p.x = Math.random() * 960; } cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); });
      if (fade > 0) requestAnimationFrame(step); else cx.clearRect(0, 0, 960, 432);
    };
    requestAnimationFrame(step);
  }
  function stopConfetti() { confettiRun++; const cv = $('#confetti'); cv.getContext('2d').clearRect(0, 0, 960, 432); }
  $('#againBtn').onclick = () => startMode(mode);

  /* ---------- Settings ---------- */
  function renderSettings() {
    $('#tableSw').innerHTML = TABLES.map((t, i) => `<button class="swatch${S.table === i ? ' on' : ''}" style="background:${t[2]}" data-t="${i}" aria-label="${t[0]} table" aria-pressed="${S.table === i}"></button>`).join('');
    $('#backSw').innerHTML = BACKS.map((b, i) => `<button class="bk${S.back === i ? ' on' : ''}" data-b="${i}" aria-label="${b[0]} card back" aria-pressed="${S.back === i}"><i style="background:${b[1]}"></i></button>`).join('');
    $$('[data-t]').forEach((x) => (x.onclick = () => { S.table = +x.dataset.t; applyTheme(); renderSettings(); snd('click'); buzz(); }));
    $$('[data-b]').forEach((x) => (x.onclick = () => { S.back = +x.dataset.b; applyTheme(); renderSettings(); snd('card'); buzz(); }));
  }
  renderSettings();
  $('#vol').oninput = (e) => { S.vol = +e.target.value; $('#volv').textContent = S.vol; };
  $('#vol').onchange = () => { ac(); snd('card'); };
  $('#mus').oninput = (e) => { S.mus = +e.target.value; $('#musv').textContent = S.mus; ac(); setMusic(); };
  const sw = (id, key) => { const b = $(id); b.onclick = () => { S[key] = !S[key]; b.classList.toggle('on', S[key]); b.setAttribute('aria-checked', S[key]); snd('click'); buzz(); }; };
  sw('#swHap', 'hap'); sw('#swFast', 'fast');
  $('#setBack').onclick = () => { snd('click'); go(prev === 'settings' || prev === 'splash' ? 'lobby' : prev === 'game' ? 'lobby' : prev); };
  $('#howBtn').onclick = () => { snd('click'); modal('HOW TO PLAY', HOWTO); };
  $('#aboutBtn').onclick = () => { snd('click'); modal('ABOUT', 'Local Rummy · version 1.0 (UI prototype)<br>Indian 13-card rummy with sample players and virtual chips only. No real money.'); };

  applyTheme();
  setChips(chips, false);
})();
