(function () {
  'use strict';

  // ---------- Configuración ----------
  // Correos institucionales aceptados (mismo criterio que el backend del equipo).
  var EMAIL_RE = /^[a-z0-9._%+-]+@uvp\.(edu\.)?mx$/i;
  // También se puede entrar sin correo, solo con un nombre de usuario (3 a 20 caracteres).
  var USER_RE = /^[a-z0-9._-]{3,20}$/;
  var USER_PREFIX = 'usuario:';
  // Texto que se muestra para una cuenta: el correo, o @usuario si se creó sin correo
  function accountLabel(id) { return id.indexOf(USER_PREFIX) === 0 ? '@' + id.slice(USER_PREFIX.length) : id; }

  // ---------- Datos ----------
  var TIPS = [
    { e: '🌿', t: 'Respira: inhala 4 segundos, sostén 4 y exhala lento en 6.' },
    { e: '🌊', t: 'Suelta los hombros y la mandíbula. Suelen tensarse sin que lo notes.' },
    { e: '🌙', t: 'Dormir 7–9 horas ayuda más a tu memoria que desvelarte estudiando.' },
    { e: '☀️', t: 'Sal 5 minutos a la luz natural entre bloques de estudio.' },
    { e: '🌸', t: 'Nombra 3 cosas que puedes ver ahora mismo. Te ancla al presente.' },
    { e: '🍵', t: 'Toma un vaso de agua: la deshidratación baja tu concentración.' },
    { e: '🦋', t: 'Un mal examen no define tu valor ni tu futuro.' },
    { e: '🎧', t: 'Una canción tranquila puede bajar tu ritmo cardiaco en minutos.' },
    { e: '🐢', t: 'Ir paso a paso también es avanzar. No tienes que hacerlo todo hoy.' },
    { e: '📚', t: 'Pomodoro: 25 minutos de estudio y 5 de descanso real (sin celular).' },
    { e: '☁️', t: 'Tus pensamientos son como nubes: obsérvalos pasar sin pelear con ellos.' },
    { e: '🤸', t: 'Estírate 30 segundos: cuello, brazos y espalda.' },
    { e: '💬', t: 'Hablar con alguien de confianza aligera la carga. Pedir ayuda es valiente.' },
    { e: '📝', t: 'Escribe tus pendientes: sacarlos de la cabeza reduce la ansiedad.' }
  ];
  var LEVELS = {
    // peek = segundos que se muestran las cartas al inicio para memorizarlas
    // limit = segundos disponibles en modo Reto (cuenta regresiva)
    // turn  = segundos para encontrar la pareja después de voltear la primera carta
    //   Fácil ≈ 10 s por par · Medio ≈ 8 s por par · Difícil ≈ 7 s por par
    facil: { pairs: 6, cols: 4, mcols: 3, name: 'Fácil', peek: 5, limit: 60, turn: 5 },
    medio: { pairs: 10, cols: 5, mcols: 4, name: 'Medio', peek: 5, limit: 80, turn: 4 },
    dificil: { pairs: 12, cols: 6, mcols: 4, name: 'Difícil', peek: 5, limit: 85, turn: 3 }
  };
  var MODES = { zen: 'Zen', reto: 'Reto' };
  var GAMES = { memorama: 'Memorama', secuencia: 'Secuencia de patrones' };

  // ---------- Secuencia de patrones ----------
  var SEQ_OBJECTS = [
    { e: '⚽', n: 'Balón' }, { e: '🍃', n: 'Hoja' }, { e: '🌙', n: 'Luna' },
    { e: '☀️', n: 'Sol' }, { e: '🎈', n: 'Globo' }, { e: '🐢', n: 'Tortuga' },
    { e: '🌸', n: 'Flor' }, { e: '🎧', n: 'Audífonos' }, { e: '📚', n: 'Libro' },
    { e: '🍎', n: 'Manzana' }, { e: '⭐', n: 'Estrella' }, { e: '🦋', n: 'Mariposa' }
  ];
  // start = objetos en la primera ronda · on/gap = ms encendido y pausa entre objetos
  var SEQ_LEVELS = {
    facil: { start: 2, on: 750, gap: 350 },
    medio: { start: 4, on: 480, gap: 220 },
    dificil: { start: 5, on: 360, gap: 170 }
  };
  var SEQ_LIVES = 4;
  // Notas de una escala pentatónica: cada casilla suena distinto
  var SEQ_NOTES = [392, 440, 494, 587, 659, 784, 880, 988, 1175];

  // Nivel de estrés (0 = bajo … 4 = muy alto) y la recomendación de juego para cada uno.
  var STRESS = [
    { e: '😌', n: 'Bajo', c: '#2E8B57', game: 'secuencia', level: 'dificil', mode: 'reto',
      why: 'Tienes buena energía. La secuencia de patrones en difícil pone a prueba tu memoria y atención.' },
    { e: '🙂', n: 'Leve', c: '#7FB24A', game: 'secuencia', level: 'medio', mode: 'reto',
      why: 'Una secuencia de patrones a ritmo medio te ayuda a enfocarte sin cansarte.' },
    { e: '😐', n: 'Moderado', c: '#E9A23B', game: 'memorama', level: 'medio', mode: 'zen',
      why: 'Un memorama sin reloj: así te distraes de los pendientes sin sentir presión.' },
    { e: '😟', n: 'Alto', c: '#E07A3B', game: 'memorama', level: 'facil', mode: 'zen',
      why: 'Menos cartas y sin reloj. La idea es relajarte, no exigirte más.' },
    { e: '😣', n: 'Muy alto', c: '#B3261E', game: 'memorama', level: 'facil', mode: 'zen', breathe: true,
      why: 'Primero haz una respiración guiada de 1 minuto y luego un juego tranquilo, sin reloj. Si el estrés no baja en varios días, habla con alguien de confianza o con el área de apoyo psicológico de tu universidad.' }
  ];

  // Trazo neuronal inspirado en el logo de Synapsis (reverso de las cartas)
  var BACK_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<ellipse cx="32" cy="32" rx="24" ry="14" transform="rotate(-25 32 32)"/>' +
    '<ellipse cx="32" cy="32" rx="22" ry="12" transform="rotate(35 32 32)"/>' +
    '<ellipse cx="32" cy="32" rx="18" ry="20" transform="rotate(80 32 32)"/>' +
    '<circle cx="32" cy="32" r="25"/>' +
    '</svg>';

  // ---------- Utilidades ----------
  var $ = function (s) { return document.querySelector(s); };
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem('calma:' + k));
      if (v === null) { localStorage.removeItem('calma:' + k); return; }
      localStorage.setItem('calma:' + k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), x = a[i];
      a[i] = a[j]; a[j] = x;
    }
    return a;
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hash(text) {
    // SHA-256 cuando el navegador lo permite (localhost/https); si no, un hash simple.
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('d' + (h >>> 0).toString(16));
  }

  // ---------- Estado ----------
  var S = {
    user: null,
    game: 'memorama', level: 'facil', mode: 'zen',
    sound: store('sound') !== false,
    stressStart: null, stressEnd: null,
    deck: [], first: null, lock: false,
    moves: 0, matched: 0, seconds: 0, timer: null, started: false, found: []
  };
  function userKey(k) { return 'u:' + S.user.email + ':' + k; }

  // ---------- Sonido (Web Audio, tonos suaves) ----------
  var ctx = null;
  function tone(freq, dur, delay, vol) {
    if (!S.sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol || 0.08, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* sin audio */ }
  }
  var sfx = {
    flip: function () { tone(660, 0.12, 0, 0.04); },
    match: function () { tone(523, 0.5); tone(659, 0.5, 0.08); tone(784, 0.7, 0.16); },
    miss: function () { tone(220, 0.3, 0, 0.05); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.9, i * 0.12, 0.07); }); }
  };

  // ---------- Pantallas y navegación ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    $('#nav').hidden = !(id === 'inicio' || id === 'perfil');
    document.querySelectorAll('nav button').forEach(function (b) {
      if (b.dataset.v === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (id === 'perfil') renderProfile();
    if (id === 'inicio') startPreview(); else stopPreview();
    window.scrollTo(0, 0);
    if (id === 'juego') requestAnimationFrame(sizeGrid);
  }
  document.querySelectorAll('nav button').forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.v); });
  });

  // ---------- Inicio de sesión ----------
  var emailIn = $('#email'), pwIn = $('#password'), nameIn = $('#name');
  var nameField = $('#nameField'), authError = $('#authError'), loginBtn = $('#loginBtn');

  function authFail(msg, input) {
    authError.textContent = msg;
    if (input) {
      input.classList.remove('bad'); void input.offsetWidth; input.classList.add('bad');
      input.focus();
    }
  }
  [emailIn, pwIn, nameIn].forEach(function (i) {
    i.addEventListener('input', function () { i.classList.remove('bad'); authError.textContent = ''; });
  });
  emailIn.addEventListener('input', function () {
    // Si cambia el correo, vuelve al paso de "Ingresar".
    nameField.hidden = true; loginBtn.textContent = 'Ingresar';
  });
  $('#pwToggle').addEventListener('click', function () {
    var showPw = pwIn.type === 'password';
    pwIn.type = showPw ? 'text' : 'password';
    this.classList.toggle('on', showPw);
    this.setAttribute('aria-label', showPw ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = emailIn.value.trim().toLowerCase(), email;
    var pw = pwIn.value;
    if (raw.indexOf('@') > 0) {
      if (!EMAIL_RE.test(raw)) return authFail('Usa tu correo institucional (@uvp.mx o @uvp.edu.mx), o un nombre de usuario sin @.', emailIn);
      email = raw;
    } else {
      raw = raw.replace(/^@/, '');
      if (!USER_RE.test(raw)) return authFail('El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).', emailIn);
      email = USER_PREFIX + raw;
    }
    if (pw.length < 6) return authFail('La contraseña debe tener al menos 6 caracteres.', pwIn);

    var users = store('users') || {};
    var existing = users[email];

    if (!existing && nameField.hidden) {
      nameField.hidden = false;
      loginBtn.textContent = 'Crear cuenta';
      nameIn.value = email.indexOf(USER_PREFIX) === 0 ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
      nameIn.focus();
      return;
    }

    loginBtn.disabled = true;
    hash(email + '|' + pw).then(function (h) {
      loginBtn.disabled = false;
      if (existing) {
        if (!existing.pw) return authFail('Esta cuenta se creó con Google. Usa el botón "Continuar con Google".');
        if (existing.pw !== h) return authFail('Contraseña incorrecta. Inténtalo de nuevo.', pwIn);
        existing.visits = (existing.visits || 0) + 1;
        existing.last = Date.now();
        login(email, existing, false);
      } else {
        var name = nameIn.value.trim();
        if (!name) return authFail('Escribe cómo te gusta que te llamen.', nameIn);
        users[email] = { name: name, pw: h, created: Date.now(), last: Date.now(), visits: 1 };
        login(email, users[email], true);
      }
      store('users', users);
    });
  });

  // ---------- Inicio de sesión con Google (Google Identity Services) ----------
  var GOOGLE_ID = (window.CALMA_CONFIG && window.CALMA_CONFIG.googleClientId || '').trim();

  function decodeJwt(token) {
    var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (part.length % 4) part += '=';
    var bin = atob(part), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function onGoogleCredential(resp) {
    var p;
    try { p = decodeJwt(resp.credential); } catch (e) { return authFail('No se pudo leer la respuesta de Google. Inténtalo de nuevo.'); }
    var email = String(p.email || '').toLowerCase();
    if (!p.email_verified) return authFail('Tu correo de Google no está verificado.');
    if (!EMAIL_RE.test(email)) {
      if (window.google) google.accounts.id.disableAutoSelect();
      return authFail('Entra con tu cuenta institucional (@uvp.mx o @uvp.edu.mx), no con una personal.');
    }
    var users = store('users') || {};
    var u = users[email], isNew = !u;
    if (!u) u = users[email] = { name: p.given_name || p.name || email.split('@')[0], created: Date.now(), visits: 0 };
    u.google = true;
    u.picture = p.picture || u.picture;
    u.visits = (u.visits || 0) + 1;
    u.last = Date.now();
    store('users', users);
    authError.textContent = '';
    login(email, u, isNew);
  }

  function initGoogle() {
    if (!GOOGLE_ID || !window.google || !google.accounts || initGoogle.done) return;
    initGoogle.done = true;
    google.accounts.id.initialize({
      client_id: GOOGLE_ID,
      callback: onGoogleCredential,
      ux_mode: 'popup',
      cancel_on_tap_outside: true
    });
    var slot = $('#googleBtn');
    google.accounts.id.renderButton(slot, {
      type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
      text: 'continue_with', logo_alignment: 'center', locale: 'es',
      width: Math.min(336, Math.max(200, slot.clientWidth || $('#loginForm').clientWidth - 64))
    });
    $('#googleFallback').hidden = true;
  }
  // La librería de Google llama a esta función cuando termina de cargar.
  window.onGoogleLibraryLoad = initGoogle;
  initGoogle();

  $('#googleFallback').addEventListener('click', function () {
    if (!GOOGLE_ID) {
      authFail('El inicio con Google aún no está configurado: falta el Client ID en config.js.');
    } else if (!window.google) {
      authFail('No se pudo cargar Google. Revisa tu conexión a internet.');
    } else {
      initGoogle();
    }
  });

  function login(email, u, isNew, quick) {
    S.user = { email: email, name: u.name, isNew: isNew, picture: u.picture || null };
    store('session', email);
    // Recordar (o no) la cuenta para entrar después con un toque
    var list = (store('remembered') || []).filter(function (e) { return e !== email; });
    if (quick || $('#remember').checked) list.unshift(email);
    store('remembered', list.slice(0, 4));
    pwIn.value = ''; nameField.hidden = true; loginBtn.textContent = 'Ingresar';
    renderWelcome();
    show('inicio');
  }

  function logout() {
    stopTimer();
    $('#toast').classList.remove('show');
    store('session', null);
    if (S.user && S.user.picture && window.google && google.accounts) google.accounts.id.disableAutoSelect();
    S.user = null;
    emailIn.value = '';
    pwIn.value = '';
    authError.textContent = '';
    renderLogin();
    show('login');
  }

  // ---------- Cuentas recordadas ----------
  function rememberedUsers() {
    var users = store('users') || {};
    return (store('remembered') || []).filter(function (e) { return users[e]; })
      .map(function (e) { return { email: e, u: users[e] }; });
  }
  function renderLogin(forceForm) {
    var list = rememberedUsers();
    var quick = list.length && !forceForm;
    $('#quick').hidden = !quick;
    $('#loginForm').hidden = !!quick;
    $('#backQuick').hidden = !list.length;
    var box = $('#quickList');
    box.innerHTML = '';
    list.forEach(function (it, i) {
      var b = document.createElement('div');
      b.className = 'qacc';
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', 'Continuar como ' + it.u.name);
      var av = document.createElement('span');
      av.className = 'av';
      av.textContent = it.u.name.charAt(0).toUpperCase();
      if (it.u.picture) {
        var img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer';
        img.onload = function () { av.textContent = ''; av.appendChild(img); };
        img.src = it.u.picture;
      }
      var info = document.createElement('span');
      info.className = 'qinfo';
      info.innerHTML = '<b></b><small></small>';
      info.querySelector('b').textContent = it.u.name;
      info.querySelector('small').textContent = accountLabel(it.email) +(it.u.google ? ' · Google' : '');
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'qforget';
      x.title = 'Olvidar esta cuenta en este dispositivo';
      x.setAttribute('aria-label', 'Olvidar la cuenta de ' + it.u.name);
      x.textContent = '×';
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        store('remembered', (store('remembered') || []).filter(function (m) { return m !== it.email; }));
        b.classList.add('leaving');
        setTimeout(function () { renderLogin(); }, 300);
      });
      function enter() {
        var u = (store('users') || {})[it.email];
        if (!u) return renderLogin();
        u.visits = (u.visits || 0) + 1; u.last = Date.now();
        var users = store('users') || {}; users[it.email] = u; store('users', users);
        login(it.email, u, false, true);
      }
      b.addEventListener('click', enter);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } });
      b.appendChild(av); b.appendChild(info); b.appendChild(x);
      box.appendChild(b);
    });
  }
  $('#otherAccount').addEventListener('click', function () { renderLogin(true); emailIn.focus(); });
  $('#backQuick').addEventListener('click', function () { authError.textContent = ''; renderLogin(); });

  // ---------- Bienvenida y recomendación ----------
  function renderWelcome() {
    $('#date').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    var h = new Date().getHours();
    var saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    $('#welcomeTitle').textContent = saludo + ', ' + S.user.name;

    var last = (store(userKey('history')) || []).slice(-1)[0];
    var sub = S.user.isNew
      ? 'Te damos la bienvenida a tu espacio de calma. Cada par que encuentres te regala un consejo para bajar el estrés.'
      : 'Qué gusto verte de nuevo. Tómate unos minutos para ti antes de volver a tus tareas.';
    if (last && last.start !== null && last.end !== null && last.end < last.start) {
      sub += ' La última vez tu estrés bajó de ' + STRESS[last.start].n.toLowerCase() + ' a ' + STRESS[last.end].n.toLowerCase() + '.';
    }
    $('#welcomeSub').textContent = sub;

    S.stressStart = null;
    $('#reco').hidden = true;
    buildStress($('#stressStart'), 'stressStart', recommend);
    renderToday();
    renderGratitude(false);
    checkBadges(true);
    renderProgress();
    var w = document.querySelector('.wave');
    w.style.animation = 'none'; void w.offsetWidth; w.style.animation = '';
  }

  function buildStress(el, key, onPick) {
    el.innerHTML = '';
    STRESS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-label', 'Estrés ' + s.n);
      b.style.setProperty('--c', s.c);
      b.innerHTML = '<span class="se">' + s.e + '</span><span class="sn">' + s.n + '</span><span class="sbar"></span>';
      b.addEventListener('click', function () {
        el.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
        b.setAttribute('aria-checked', 'true');
        S[key] = i;
        if (onPick) onPick(i);
      });
      el.appendChild(b);
    });
  }

  function recommend(i) {
    var s = STRESS[i];
    S.game = s.game;
    S.level = s.level;
    S.mode = s.mode;
    $('#recoTitle').textContent = s.game === 'secuencia'
      ? GAMES.secuencia + ' · ' + LEVELS[s.level].name
      : GAMES.memorama + ' · ' + LEVELS[s.level].name + ' · ' + MODES[s.mode] + (s.mode === 'zen' ? ' (sin reloj)' : ' (contra reloj, ' + fmt(LEVELS[s.level].limit) + ')');
    $('#recoWhy').textContent = s.why;
    $('#recoBreathe').hidden = !s.breathe;
    var reco = $('#reco'), wasHidden = reco.hidden;
    reco.hidden = false;
    reco.style.animation = 'none'; void reco.offsetWidth; reco.style.animation = '';
    syncSeg($('#games'), 'game', s.game);
    syncSeg($('#levels'), 'level', s.level);
    syncSeg($('#modes'), 'mode', s.mode);
    updateBest();
    if (wasHidden) reco.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function syncSeg(el, attr, recoValue) {
    el.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset[attr] === S[attr]));
      b.classList.toggle('is-reco', b.dataset[attr] === recoValue);
    });
  }
  function bindSeg(el, attr) {
    el.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        el.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
        b.setAttribute('aria-checked', 'true');
        S[attr] = b.dataset[attr];
        updateBest();
      });
    });
  }
  function updateBest() {
    // El modo Zen/Reto solo aplica al memorama
    $('#modeField').hidden = S.game !== 'memorama';
    document.querySelectorAll('#levels button').forEach(function (b) {
      var k = b.dataset.level;
      b.querySelector('small').textContent = S.game === 'secuencia'
        ? 'inicia con ' + SEQ_LEVELS[k].start + ' objetos'
        : LEVELS[k].pairs + ' pares';
    });
    $('#modes [data-mode="reto"] small').textContent = 'contra reloj · ' + fmt(LEVELS[S.level].limit);
    if (S.game === 'secuencia') {
      var r = (store(userKey('bestSeq')) || {})[S.level];
      $('#bestLine').textContent = r ? 'Tu mejor marca en ' + LEVELS[S.level].name + ': ronda ' + r : '';
      return;
    }
    var b = (store(userKey('best')) || {})[S.level];
    $('#bestLine').textContent = b
      ? 'Tu mejor marca en ' + LEVELS[S.level].name + ': ' + b.moves + ' movimientos · ' + fmt(b.time)
      : '';
  }

  // ---------- Vista previa animada (hero) ----------
  var prevEl = $('#preview'), prevTimer = null;
  (function buildPreview() {
    var em = ['🌿', '🌙', '🌸', '🍵', '🌿', '🦋', '🌸', '🌙', '🍵'];
    em.forEach(function (e) { var i = document.createElement('i'); i.dataset.e = e; prevEl.appendChild(i); });
  })();
  function startPreview() {
    stopPreview();
    var tiles = prevEl.querySelectorAll('i'), step = 0;
    var pairs = [[0, 4], [2, 6], [1, 7], [3, 8]];
    function run() {
      tiles.forEach(function (t) { t.classList.remove('l'); });
      var p = pairs[step % pairs.length];
      setTimeout(function () { tiles[p[0]].classList.add('l'); }, 200);
      setTimeout(function () { tiles[p[1]].classList.add('l'); }, 700);
      step++;
    }
    run();
    prevTimer = setInterval(run, 2200);
  }
  function stopPreview() { clearInterval(prevTimer); prevTimer = null; }

  // ---------- Para hoy: frase, tip de estudio y diario ----------
  var QUOTES = [
    'No tienes que tenerlo todo resuelto hoy. Basta con dar el siguiente paso.',
    'Descansar también es parte del trabajo.',
    'Eres más que tus calificaciones.',
    'Lo que hoy parece enorme, mañana será algo que superaste.',
    'Avanzar despacio sigue siendo avanzar.',
    'Respira. Esto también va a pasar.',
    'Hacerlo con calma no significa hacerlo mal.',
    'Tu valor no depende de tu productividad.',
    'Un error es información, no una sentencia.',
    'Pedir ayuda es una forma de ser fuerte.',
    'Pequeños pasos todos los días construyen grandes logros.',
    'Hoy basta con hacer tu mejor esfuerzo, no un esfuerzo perfecto.',
    'Cuidar tu mente también es estudiar.',
    'Está bien tomarse una pausa antes de seguir.',
    'Confía en todo lo que ya has aprendido.',
    'No compares tu capítulo 3 con el capítulo 20 de alguien más.',
    'La constancia gana a la prisa.',
    'Tu esfuerzo de hoy es un regalo para tu yo de mañana.',
    'Cada día es una oportunidad nueva para empezar.',
    'Lo estás haciendo mejor de lo que crees.',
    'Enfócate en lo que sí puedes controlar.',
    'Primero respira, después resuelve.',
    'El descanso no se gana: se necesita.',
    'Aprender lleva tiempo, y está bien.',
    'Celebra los avances pequeños, también cuentan.',
    'Hoy elige ser amable contigo.',
    'Un paso a la vez, una tarea a la vez.',
    'Tu bienestar es parte de tu éxito.',
    'Has superado días difíciles antes; puedes con este también.',
    'La calma también es una habilidad que se entrena.'
  ];
  var STUDY_TIPS = [
    { e: '🍅', t: 'Técnica Pomodoro', d: '25 minutos de estudio enfocado y 5 de descanso. Cada 4 ciclos, toma un descanso largo.' },
    { e: '🗣️', t: 'Explícalo en voz alta', d: 'Enseñar un tema como si fuera a otra persona revela lo que todavía no entiendes.' },
    { e: '🔁', t: 'Repaso espaciado', d: 'Repasa hoy, en 2 días y en una semana. Recuerdas más que estudiando todo de golpe.' },
    { e: '📵', t: 'Celular lejos', d: 'Déjalo en otra habitación mientras estudias: verlo cerca ya te distrae.' },
    { e: '❓', t: 'Hazte preguntas', d: 'En lugar de releer, intenta responder sin ver tus notas. Recordar es lo que fija el aprendizaje.' },
    { e: '🗺️', t: 'Mapas mentales', d: 'Conecta ideas con dibujos y flechas; ver las relaciones ayuda a entender el tema completo.' },
    { e: '🎯', t: 'Una meta por sesión', d: 'Define qué quieres terminar antes de empezar: "resolver 5 ejercicios" es mejor que "estudiar".' },
    { e: '🌙', t: 'Duerme antes del examen', d: 'Durante el sueño tu cerebro guarda lo que aprendiste. Desvelarte te quita memoria.' },
    { e: '💧', t: 'Agua cerca', d: 'Un poco de deshidratación ya afecta tu concentración. Ten un vaso de agua en tu escritorio.' },
    { e: '🧩', t: 'Divide la tarea', d: 'Si algo te abruma, pártelo en pasos de 10 minutos y empieza por el más fácil.' },
    { e: '✍️', t: 'Escribe a mano', d: 'Tomar notas a mano te obliga a resumir, y resumir ayuda a recordar.' },
    { e: '🔀', t: 'Mezcla temas', d: 'Alternar tipos de ejercicios en una sesión mejora tu capacidad de resolver problemas nuevos.' },
    { e: '🚶', t: 'Muévete en los descansos', d: 'Caminar 5 minutos oxigena tu cerebro mejor que revisar redes sociales.' },
    { e: '📅', t: 'Planea tu semana', d: 'Dedica 10 minutos el domingo a acomodar tus entregas: menos sorpresas, menos estrés.' },
    { e: '🤝', t: 'Estudia en equipo', d: 'Resolver dudas con compañeros te da otras formas de entender el mismo tema.' },
    { e: '🧘', t: 'Antes del examen', d: 'Haz 3 respiraciones lentas antes de empezar. Bajar la ansiedad mejora tu memoria.' },
    { e: '💡', t: 'Buena luz', d: 'Estudia con luz natural o blanca; la poca luz cansa la vista y da sueño.' },
    { e: '🎧', t: 'Música sin letra', d: 'Si te gusta estudiar con música, elige instrumental: la letra compite con la lectura.' },
    { e: '📝', t: 'Resume en 3 líneas', d: 'Al terminar un tema, escríbelo en 3 líneas. Si no puedes, repásalo otra vez.' },
    { e: '🏁', t: 'Empieza con 2 minutos', d: 'Si te cuesta empezar, comprométete solo a 2 minutos. Casi siempre sigues después.' }
  ];

  function dayKey(d) {
    d = d ? new Date(d) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayIndex() {
    var now = new Date(), start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  function renderToday() {
    var n = dayIndex();
    $('#quote').textContent = QUOTES[n % QUOTES.length];
    var tip = STUDY_TIPS[n % STUDY_TIPS.length];
    $('#tipEmo').textContent = tip.e;
    $('#tipTitle').textContent = tip.t;
    $('#tipText').textContent = tip.d;
  }

  // Diario de gratitud: una entrada por día
  var gForm = $('#gForm'), gInputs = gForm.querySelectorAll('input');
  function renderGratitude(editing) {
    var all = store(userKey('gratitude')) || {}, today = all[dayKey()];
    $('#gDays').textContent = Object.keys(all).length;
    var showSaved = today && !editing;
    gForm.hidden = !!showSaved;
    $('#gSaved').hidden = !showSaved;
    if (showSaved) {
      $('#gSub').textContent = 'Ya escribiste hoy. ¡Bien hecho!';
      $('#gList').innerHTML = today.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    } else {
      $('#gSub').textContent = 'Escribir lo bueno del día entrena a tu mente a notar lo positivo.';
      gInputs.forEach(function (inp, k) { inp.value = today && today[k] ? today[k] : ''; });
    }
  }
  gForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var items = Array.from(gInputs).map(function (i) { return i.value.trim(); }).filter(Boolean);
    if (!items.length) {
      gInputs[0].classList.remove('bad'); void gInputs[0].offsetWidth; gInputs[0].classList.add('bad');
      gInputs[0].focus();
      return;
    }
    var all = store(userKey('gratitude')) || {};
    all[dayKey()] = items;
    store(userKey('gratitude'), all);
    sfx.match();
    checkBadges(false);
    renderGratitude(false);
    renderProgress();
  });
  gInputs.forEach(function (i) { i.addEventListener('input', function () { i.classList.remove('bad'); }); });
  $('#gEdit').addEventListener('click', function () { renderGratitude(true); gInputs[0].focus(); });

  // ---------- Progreso ----------
  function hasStress(h) { return h.start !== null && h.start !== undefined && h.end !== null && h.end !== undefined; }
  function stats() {
    var hist = store(userKey('history')) || [];
    var days = {};
    hist.forEach(function (h) { var k = dayKey(h.d); days[k] = (days[k] || 0) + 1; });
    // Racha: días seguidos con al menos una partida (sigue viva si jugaste ayer)
    var streak = 0, d = new Date();
    if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (days[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    var weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - 6);
    var week = hist.filter(function (h) { return h.d >= weekStart.getTime(); }).length;
    var rated = hist.filter(hasStress);
    var downs = rated.filter(function (h) { return h.end < h.start; }).length;
    var secs = hist.reduce(function (a, h) { return a + (h.time || 0); }, 0);
    return {
      hist: hist, days: days, streak: streak, week: week, rated: rated, downs: downs,
      downPct: rated.length ? Math.round(downs / rated.length * 100) : 0, minutes: Math.round(secs / 60)
    };
  }

  function countUp(node, to, suffix) {
    suffix = suffix || '';
    var t0 = performance.now(), dur = 700;
    (function step(t) {
      var p = Math.min(1, Math.max(0, (t - t0) / dur)), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      node.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function renderProgress() {
    var s = stats();
    countUp($('#kStreak'), s.streak);
    countUp($('#kWeek'), s.week);
    countUp($('#kDown'), s.downPct, '%');
    countUp($('#kMin'), s.minutes);
    $('#kStreak').parentNode.classList.toggle('fire', s.streak > 0);
    drawWeek(s);
    drawStress(s);
    renderBadges();
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  // Barra con esquinas superiores redondeadas (4px) y base recta
  function barPath(x, y, w, base) {
    var r = Math.min(4, w / 2, base - y);
    return 'M' + x + ',' + base + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + base + 'Z';
  }

  // Tooltip compartido para las gráficas
  var ctip = $('#ctip');
  function bindTip(node, text) {
    function showTip() {
      var r = node.getBoundingClientRect();
      ctip.textContent = text;
      ctip.style.left = (r.left + r.width / 2) + 'px';
      ctip.style.top = r.top + 'px';
      ctip.hidden = false;
    }
    function hideTip() { ctip.hidden = true; }
    node.addEventListener('mouseenter', showTip);
    node.addEventListener('focus', showTip);
    node.addEventListener('touchstart', showTip, { passive: true });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('blur', hideTip);
  }
  window.addEventListener('scroll', function () { ctip.hidden = true; }, { passive: true });

  function drawWeek(s) {
    var svg = $('#weekChart');
    svg.innerHTML = '';
    var W = 320, top = 18, base = 122, left = 6, right = 6;
    var data = [];
    for (var k = 6; k >= 0; k--) {
      var d = new Date(); d.setDate(d.getDate() - k);
      data.push({ d: d, n: s.days[dayKey(d)] || 0, today: k === 0 });
    }
    var max = Math.max(3, Math.max.apply(null, data.map(function (x) { return x.n; })));
    var slot = (W - left - right) / 7, bw = Math.min(26, slot * 0.5);
    svgEl('line', { x1: left, x2: W - right, y1: base, y2: base, class: 'base' }, svg);
    data.forEach(function (x, i) {
      var cx = left + slot * i + slot / 2;
      var h = x.n ? Math.max(6, (base - top) * x.n / max) : 3;
      var p = svgEl('path', { d: barPath(cx - bw / 2, base - h, bw, base), class: 'bar' + (x.n ? '' : ' empty') }, svg);
      p.style.animationDelay = (i * 60) + 'ms';
      if (x.n) svgEl('text', { x: cx, y: base - h - 5, 'text-anchor': 'middle', class: 'vl' }, svg).textContent = x.n;
      var wd = x.d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
      svgEl('text', { x: cx, y: base + 16, 'text-anchor': 'middle', class: 'ax' + (x.today ? ' today' : '') }, svg)
        .textContent = x.today ? 'Hoy' : wd.charAt(0).toUpperCase() + wd.slice(1, 3);
      var hit = svgEl('rect', { x: cx - slot / 2, y: top - 10, width: slot, height: base - top + 30, class: 'hit', tabindex: 0 }, svg);
      var full = x.d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
      bindTip(hit, full + ': ' + x.n + (x.n === 1 ? ' partida' : ' partidas'));
    });
    svg.setAttribute('aria-label', 'Partidas por día en los últimos 7 días: ' + data.map(function (x) { return x.n; }).join(', '));
  }

  function drawStress(s) {
    var svg = $('#stressChart'), table = $('#stressTable');
    svg.innerHTML = '';
    var W = 320, top = 12, base = 128, left = 62, right = 10;
    var rows = s.rated.slice(-8);
    var yOf = function (v) { return base - (base - top) * v / 4; };
    // Eje Y: niveles de estrés (bajo abajo, muy alto arriba)
    STRESS.forEach(function (st, v) {
      svgEl('line', { x1: left, x2: W - right, y1: yOf(v), y2: yOf(v), class: v === 0 ? 'base' : 'grid-l' }, svg);
      svgEl('text', { x: left - 8, y: yOf(v) + 3, 'text-anchor': 'end', class: 'ax' }, svg).textContent = st.n;
    });
    if (!rows.length) {
      svgEl('text', { x: (left + W - right) / 2, y: (top + base) / 2 - 8, 'text-anchor': 'middle', class: 'empty-msg' }, svg)
        .textContent = 'Juega y registra tu estrés al final';
      svgEl('text', { x: (left + W - right) / 2, y: (top + base) / 2 + 8, 'text-anchor': 'middle', class: 'empty-msg' }, svg)
        .textContent = 'para ver aquí tu avance';
      table.innerHTML = '';
      return;
    }
    var slot = (W - left - right) / Math.max(rows.length, 4);
    rows.forEach(function (h, i) {
      var cx = left + slot * i + slot / 2, y1 = yOf(h.start), y2 = yOf(h.end);
      var g = svgEl('g', { class: 'pt' }, svg);
      g.style.animationDelay = (i * 70) + 'ms';
      if (y1 !== y2) svgEl('line', { x1: cx, x2: cx, y1: y1, y2: y2, class: 'stem' }, g);
      svgEl('circle', { cx: cx, cy: y1, r: y1 === y2 ? 8 : 5, class: 'dot-b' }, g); // si no cambió, el anillo rodea al punto
      svgEl('circle', { cx: cx, cy: y2, r: 5, class: 'dot-a' }, g);
      var hit = svgEl('rect', { x: cx - slot / 2, y: top - 6, width: slot, height: base - top + 12, class: 'hit', tabindex: 0 }, svg);
      var when = new Date(h.d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      bindTip(hit, when + ' · ' + GAMES[h.game || 'memorama'] + ': ' + STRESS[h.start].n + ' → ' + STRESS[h.end].n);
    });
    table.innerHTML = '<caption>Estrés antes y después de cada partida</caption><tr><th>Fecha</th><th>Antes</th><th>Después</th></tr>' +
      rows.map(function (h) {
        return '<tr><td>' + new Date(h.d).toLocaleDateString('es-MX') + '</td><td>' + STRESS[h.start].n + '</td><td>' + STRESS[h.end].n + '</td></tr>';
      }).join('');
  }

  // ---------- Logros ----------
  function anyGame(s, fn) { return s.hist.some(fn); }
  function isMemo(h) { return h.game !== 'secuencia'; }
  var BADGES = [
    { id: 'primera', e: '🌱', n: 'Primera pausa', d: 'Completa tu primera partida', ok: function (s) { return s.hist.length >= 1; } },
    { id: 'racha3', e: '🔥', n: 'Constancia', d: 'Racha de 3 días', ok: function (s) { return s.streak >= 3; } },
    { id: 'racha7', e: '🏆', n: 'Hábito de calma', d: 'Racha de 7 días', ok: function (s) { return s.streak >= 7; } },
    { id: 'calma', e: '💚', n: 'Calma lograda', d: 'Baja tu estrés en 3 partidas', ok: function (s) { return s.downs >= 3; } },
    { id: 'perfecto', e: '🎯', n: 'Memoria perfecta', d: 'Memorama con 3 estrellas', ok: function (s) { return anyGame(s, function (h) { return isMemo(h) && h.stars === 3; }); } },
    { id: 'dificil', e: '🧠', n: 'Mente ágil', d: 'Completa un memorama en Difícil', ok: function (s) { return anyGame(s, function (h) { return isMemo(h) && h.level === 'dificil'; }); } },
    { id: 'reloj', e: '⏱️', n: 'Contra reloj', d: 'Gana un memorama en modo Reto', ok: function (s) { return anyGame(s, function (h) { return isMemo(h) && h.mode === 'reto'; }); } },
    { id: 'seq5', e: '⚽', n: 'Buena secuencia', d: 'Llega a la ronda 5 en Secuencia', ok: function (s) { return anyGame(s, function (h) { return (h.rounds || 0) >= 5; }); } },
    { id: 'seq10', e: '🌟', n: 'Memoria de elefante', d: 'Llega a la ronda 10 en Secuencia', ok: function (s) { return anyGame(s, function (h) { return (h.rounds || 0) >= 10; }); } },
    { id: 'explorador', e: '🧭', n: 'Explorador', d: 'Juega los dos juegos', ok: function (s) { return anyGame(s, function (h) { return h.game === 'secuencia'; }) && anyGame(s, isMemo); } },
    { id: 'respira', e: '🫁', n: 'Respira hondo', d: 'Completa 3 ejercicios de respiración', ok: function () { return (store(userKey('breaths')) || 0) >= 3; } },
    { id: 'gratitud', e: '📝', n: 'Gratitud', d: 'Escribe en tu diario 3 días', ok: function () { return Object.keys(store(userKey('gratitude')) || {}).length >= 3; } }
  ];
  var newBadges = [];

  // Revisa logros nuevos; si silent es false, los anuncia con un aviso
  function checkBadges(silent) {
    if (!S.user) return;
    var s = stats(), got = store(userKey('badges')) || {}, fresh = [];
    BADGES.forEach(function (b) {
      if (!got[b.id] && b.ok(s)) { got[b.id] = Date.now(); fresh.push(b); }
    });
    if (!fresh.length) return;
    store(userKey('badges'), got);
    if (silent) return;
    newBadges = fresh.map(function (b) { return b.id; });
    fresh.forEach(function (b, k) {
      setTimeout(function () { toast({ e: '🏅', t: 'Logro desbloqueado: ' + b.n + ' ' + b.e + ' — ' + b.d + '.' }); }, 900 + k * 4500);
    });
  }

  function renderBadges() {
    var got = store(userKey('badges')) || {}, n = 0;
    $('#badges').innerHTML = BADGES.map(function (b, i) {
      var on = !!got[b.id];
      if (on) n++;
      var cls = 'badge' + (on ? '' : ' locked') + (newBadges.indexOf(b.id) >= 0 ? ' new' : '');
      var when = on ? new Date(got[b.id]).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';
      return '<div class="' + cls + '" style="--i:' + i + '" title="' + esc(b.d) + '">' +
        '<span class="b-ico">' + (on ? b.e : '🔒') + '</span><b>' + b.n + '</b><small>' + (on ? 'Logrado el ' + when : b.d) + '</small></div>';
    }).join('');
    $('#badgeCount').textContent = n + '/' + BADGES.length;
    newBadges = [];
  }

  // ---------- Perfil ----------
  // Niveles por experiencia (XP): partidas, logros, diario y respiraciones suman puntos
  var RANKS = [
    { xp: 0, n: 'Semilla', e: '🌱' }, { xp: 50, n: 'Brote', e: '🌿' }, { xp: 120, n: 'Hoja', e: '🍃' },
    { xp: 220, n: 'Rama', e: '🌳' }, { xp: 350, n: 'Árbol', e: '🌲' }, { xp: 520, n: 'Bosque', e: '🏞️' },
    { xp: 750, n: 'Montaña', e: '⛰️' }, { xp: 1000, n: 'Cielo en calma', e: '☁️' }
  ];
  var USER_KEYS = ['history', 'best', 'bestSeq', 'badges', 'gratitude', 'breaths'];

  function xpInfo(s) {
    var badges = Object.keys(store(userKey('badges')) || {}).length;
    var grat = Object.keys(store(userKey('gratitude')) || {}).length;
    var breaths = store(userKey('breaths')) || 0;
    var xp = s.hist.length * 10 + badges * 30 + grat * 5 + breaths * 5;
    var lvl = 0;
    while (lvl + 1 < RANKS.length && xp >= RANKS[lvl + 1].xp) lvl++;
    var next = RANKS[lvl + 1];
    var pct = next ? Math.round((xp - RANKS[lvl].xp) / (next.xp - RANKS[lvl].xp) * 100) : 100;
    return { xp: xp, lvl: lvl, rank: RANKS[lvl], next: next, pct: pct, badges: badges };
  }

  function bestStreak(days) {
    var keys = Object.keys(days).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = new Date(k + 'T12:00:00');
      run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return best;
  }

  function relDay(t) {
    var d = new Date(t), today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
    var hm = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (dayKey(d) === today) return 'Hoy, ' + hm;
    if (dayKey(d) === dayKey(y)) return 'Ayer, ' + hm;
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function renderProfile() {
    if (!S.user) return;
    var s = stats(), x = xpInfo(s);
    var users = store('users') || {}, u = users[S.user.email] || {};

    // Encabezado
    var avt = $('#avt');
    avt.textContent = S.user.name.charAt(0).toUpperCase();
    if (S.user.picture) {
      var img = new Image();
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onload = function () { avt.textContent = ''; avt.appendChild(img); };
      img.src = S.user.picture;
    }
    $('#pname').textContent = S.user.name;
    $('#pmail').textContent = accountLabel(S.user.email);
    $('#pRank').textContent = 'Nivel ' + (x.lvl + 1) + ' · ' + x.rank.n + ' ' + x.rank.e;
    $('#pSince').textContent = u.created ? 'Miembro desde ' + new Date(u.created).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : '';
    $('#pGoogle').hidden = !u.google;
    $('#xpLabel').textContent = x.xp + ' XP';
    $('#xpNext').textContent = x.next ? 'faltan ' + (x.next.xp - x.xp) + ' XP para ' + x.next.n : '¡Nivel máximo!';
    $('#xpBar').style.width = '0';
    $('#avRing').style.setProperty('--p', 0);
    requestAnimationFrame(function () {
      $('#xpBar').style.width = x.pct + '%';
      $('#avRing').style.setProperty('--p', x.pct);
    });

    // Números
    countUp($('#psGames'), s.hist.length);
    countUp($('#psStreak'), s.streak);
    countUp($('#psBestStreak'), Math.max(bestStreak(s.days), s.streak));
    $('#psBadges').textContent = x.badges + '/' + BADGES.length;
    countUp($('#psMin'), s.minutes);

    drawCalendar(s);
    renderHistory(s);
    renderMemories();
    renderFav(s);
    renderRecords();
    renderMiniBadges();
    syncPrefs();
  }

  // Calendario tipo "mapa de calor": 16 semanas, una columna por semana (lunes arriba)
  function drawCalendar(s) {
    var svg = $('#calendar');
    svg.innerHTML = '';
    var weeks = 16, cell = 14, gap = 3, left = 18, top = 16, step = cell + gap;
    var W = left + weeks * step, H = top + 7 * step;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var today = new Date(); today.setHours(12, 0, 0, 0);
    var dow = (today.getDay() + 6) % 7; // 0 = lunes
    var start = new Date(today); start.setDate(start.getDate() - dow - (weeks - 1) * 7);
    ['L', '', 'M', '', 'V', '', 'D'].forEach(function (l, r) {
      if (l) svgEl('text', { x: 0, y: top + r * step + 11, class: 'ax' }, svg).textContent = l;
    });
    var lastMonth = -1, lastLabelW = -9, lastLabel = null, active = 0;
    for (var w = 0; w < weeks; w++) {
      for (var r = 0; r < 7; r++) {
        var d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
        if (d > today) continue;
        if (r === 0 && d.getMonth() !== lastMonth) {
          lastMonth = d.getMonth();
          // Si el mes anterior quedó muy pegado, se quita su etiqueta para que no se encimen
          if (lastLabel && w - lastLabelW < 3) svg.removeChild(lastLabel);
          lastLabelW = w;
          var m = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
          lastLabel = svgEl('text', { x: left + w * step, y: 10, class: 'ax' }, svg);
          lastLabel.textContent = m.charAt(0).toUpperCase() + m.slice(1);
        }
        var n = s.days[dayKey(d)] || 0;
        if (n) active++;
        var lv = Math.min(4, n);
        var rect = svgEl('rect', {
          x: left + w * step, y: top + r * step, width: cell, height: cell, rx: 3,
          class: 'cal-cell h' + lv + (dayKey(d) === dayKey() ? ' today' : ''), tabindex: 0
        }, svg);
        rect.style.animationDelay = (w * 25) + 'ms';
        bindTip(rect, d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }) + ': ' +
          (n ? n + (n === 1 ? ' partida' : ' partidas') : 'sin partidas'));
      }
    }
    $('#calSummary').textContent = active + (active === 1 ? ' día activo' : ' días activos') + ' en 16 semanas';
  }

  function renderHistory(s) {
    var rows = s.hist.slice(-6).reverse();
    if (!rows.length) {
      $('#hList').innerHTML = '<li class="empty" style="display:block;background:none;border:0;padding:0">Aún no has jugado. ¡Tu primera pausa te espera!</li>';
      return;
    }
    $('#hList').innerHTML = rows.map(function (h, i) {
      var seq = h.game === 'secuencia';
      var title = seq ? 'Secuencia · ' + LEVELS[h.level].name : 'Memorama · ' + LEVELS[h.level].name + ' · ' + MODES[h.mode || 'zen'];
      var res = seq ? 'Ronda ' + (h.rounds || 0) : h.moves + ' movimientos · ' + fmt(h.time || 0);
      var chip = '';
      if (hasStress(h)) {
        var cls = h.end < h.start ? 'down' : h.end > h.start ? 'up' : '';
        chip = '<span class="h-chip ' + cls + '" title="Estrés: ' + STRESS[h.start].n + ' → ' + STRESS[h.end].n + '">' +
          STRESS[h.start].e + ' → ' + STRESS[h.end].e + '</span>';
      }
      return '<li style="--i:' + i + '"><span class="h-ico">' + (seq ? '⚽' : '🃏') + '</span>' +
        '<div class="h-main"><b>' + title + '</b><small>' + relDay(h.d) + ' · ' + res + '</small></div>' + chip + '</li>';
    }).join('');
  }

  function renderMemories() {
    var all = store(userKey('gratitude')) || {};
    var keys = Object.keys(all).sort().reverse().slice(0, 3);
    $('#memories').innerHTML = keys.length
      ? keys.map(function (k) {
          var d = new Date(k + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
          return '<div class="memory"><small>' + d + '</small><p>' + all[k].map(esc).join(' · ') + '</p></div>';
        }).join('')
      : '<p class="empty">Escribe en tu diario de gratitud (en Inicio) y aquí verás tus mejores momentos.</p>';
  }

  function renderFav(s) {
    var m = s.hist.filter(function (h) { return h.game !== 'secuencia'; }).length;
    var q = s.hist.length - m;
    if (!s.hist.length) { $('#fav').innerHTML = '<p class="empty">Juega una partida para descubrir tu favorito.</p>'; return; }
    var favM = m >= q, pm = Math.round(m / s.hist.length * 100), pq = 100 - pm;
    var lvCount = {};
    s.hist.forEach(function (h) { lvCount[h.level] = (lvCount[h.level] || 0) + 1; });
    var topLv = Object.keys(lvCount).sort(function (a, b) { return lvCount[b] - lvCount[a]; })[0];
    $('#fav').innerHTML =
      '<div class="fav-hl"><span class="big-emo">' + (favM ? '🃏' : '⚽') + '</span><div><b>' +
      (favM ? 'Memorama' : 'Secuencia de patrones') + '</b><span class="muted small">Lo has jugado ' + (favM ? m : q) +
      ' veces · nivel más jugado: ' + (LEVELS[topLv] ? LEVELS[topLv].name : '—') + '</span></div></div>' +
      '<div class="fav-split" role="img" aria-label="Memorama ' + pm + '%, Secuencia ' + pq + '%">' +
      (m ? '<i class="m" style="flex:' + m + '"></i>' : '') + (q ? '<i class="s" style="flex:' + q + ';animation-delay:.15s"></i>' : '') + '</div>' +
      '<div class="fav-rows">' +
      '<div><span><i class="m"></i>Memorama</span><b>' + m + ' · ' + pm + '%</b></div>' +
      '<div><span><i class="s"></i>Secuencia</span><b>' + q + ' · ' + pq + '%</b></div></div>';
  }

  function renderRecords() {
    var best = store(userKey('best')) || {}, bestSeq = store(userKey('bestSeq')) || {};
    $('#pbestMemo').innerHTML = Object.keys(LEVELS).map(function (k) {
      var b = best[k];
      return '<li><span>' + LEVELS[k].name + '</span><b>' + (b ? b.moves + ' mov · ' + fmt(b.time) : '—') + '</b></li>';
    }).join('');
    $('#pbestSeq').innerHTML = Object.keys(LEVELS).map(function (k) {
      return '<li><span>' + LEVELS[k].name + '</span><b>' + (bestSeq[k] ? 'Ronda ' + bestSeq[k] : '—') + '</b></li>';
    }).join('');
  }

  function renderMiniBadges() {
    var got = store(userKey('badges')) || {};
    $('#miniBadges').innerHTML = BADGES.map(function (b, i) {
      var on = !!got[b.id];
      return '<span class="' + (on ? '' : 'off') + '" style="--i:' + i + '" title="' + esc(b.n + ' — ' + b.d) + '">' + b.e + '</span>';
    }).join('');
  }

  // ---------- Preferencias ----------
  function applyTheme(v) {
    if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(store('theme') || 'auto');

  function syncPrefs() {
    var t = store('theme') || 'auto';
    document.querySelectorAll('#themeSeg button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.themeOpt === t));
    });
    $('#soundSwitch').setAttribute('aria-checked', String(S.sound));
  }
  document.querySelectorAll('#themeSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      store('theme', b.dataset.themeOpt);
      applyTheme(b.dataset.themeOpt);
      syncPrefs();
    });
  });

  // Editar nombre
  $('#editName').addEventListener('click', function () {
    $('#nameForm').hidden = false;
    $('#nameInput').value = S.user.name;
    $('#nameInput').focus();
  });
  $('#nameCancel').addEventListener('click', function () { $('#nameForm').hidden = true; });
  $('#nameForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('#nameInput').value.trim();
    if (!n) return;
    var users = store('users') || {};
    if (users[S.user.email]) { users[S.user.email].name = n; store('users', users); }
    S.user.name = n;
    $('#nameForm').hidden = true;
    renderProfile();
    renderWelcome();
  });

  // Borrar progreso del usuario (con confirmación)
  $('#resetBtn').addEventListener('click', function () {
    if (!confirm('¿Seguro que quieres borrar tu progreso? Se eliminarán tus partidas, récords, logros y diario. Tu cuenta se conserva.')) return;
    USER_KEYS.forEach(function (k) { store(userKey(k), null); });
    renderProfile();
    renderWelcome();
  });

  $('#seeBadges').addEventListener('click', function () {
    show('inicio');
    setTimeout(function () { $('#badges').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  });

  // ---------- Juego ----------
  var grid = $('#grid');

  function startGame() {
    var L = LEVELS[S.level];
    var picks = shuffle(TIPS).slice(0, L.pairs);
    S.deck = shuffle(picks.concat(picks));
    S.first = null; S.lock = false; S.moves = 0; S.matched = 0;
    S.seconds = 0; S.started = false; S.found = []; S.over = false;
    clearTurn();
    clearInterval(S.timer);

    $('#levelName').textContent = L.name + ' · ' + MODES[S.mode];
    $('#moves').textContent = '0';
    $('#pairs').textContent = '0/' + L.pairs;
    $('#time').textContent = fmt(L.limit);
    $('#time').classList.remove('warn');
    $('#bar').style.width = '0';
    $('#timeStat').hidden = S.mode !== 'reto';
    $('#tOver').hidden = true;

    grid.innerHTML = '';
    S.deck.forEach(function (tip, i) {
      var b = document.createElement('button');
      b.className = 'mcard';
      b.type = 'button';
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', 'Carta ' + (i + 1) + ', oculta');
      b.innerHTML =
        '<span class="inner">' +
        '<span class="face back">' + BACK_SVG + '</span>' +
        '<span class="face front"><span class="emo">' + tip.e + '</span></span>' +
        '</span>';
      b.addEventListener('click', function () { flip(b, tip, i); });
      grid.appendChild(b);
    });
    show('juego');
    peek(L.peek);
  }

  // Muestra todas las cartas boca arriba unos segundos antes de empezar.
  var peekTimers = [];
  function clearPeek() {
    peekTimers.forEach(clearTimeout); peekTimers = [];
    grid.classList.remove('peek');
  }
  function peek(secs) {
    clearPeek();
    S.lock = true;
    var cards = grid.querySelectorAll('.mcard');
    var st = $('#st'), bar = $('#bar'), label = $('#retLabel');
    var dealMs = cards.length * 45 + 500;
    st.textContent = 'Prepárate…';
    label.textContent = 'Tiempo para memorizar';
    bar.style.transition = 'none'; bar.style.width = '100%';

    peekTimers.push(setTimeout(function () {
      grid.classList.add('peek');
      cards.forEach(function (c, k) {
        peekTimers.push(setTimeout(function () { c.classList.add('flipped'); }, k * 25));
      });
      tone(523, 0.4, 0, 0.05); tone(659, 0.5, 0.1, 0.05);
      // La barra se vacía mientras dura el tiempo de memorizar
      void bar.offsetWidth;
      bar.style.transition = 'width ' + secs + 's linear';
      bar.style.width = '0';
      for (var s = secs; s > 0; s--) {
        (function (left) {
          peekTimers.push(setTimeout(function () {
            st.innerHTML = 'Memoriza las cartas <span class="count">' + left + '</span>';
            tone(440, 0.12, 0, 0.03);
          }, (secs - left) * 1000));
        })(s);
      }
    }, dealMs));

    peekTimers.push(setTimeout(function () {
      cards.forEach(function (c) { c.classList.remove('flipped'); });
      grid.classList.remove('peek');
      st.textContent = S.mode === 'reto'
        ? '¡Corre el tiempo! Encuentra los pares antes de ' + fmt(LEVELS[S.level].limit)
        : '¡Tu turno! Encuentra los pares';
      label.textContent = 'Progreso';
      bar.style.transition = ''; bar.style.width = '0';
      sfx.flip();
    }, dealMs + secs * 1000));

    // Desbloquea cuando terminan de voltearse
    // En modo Reto la cuenta regresiva arranca justo aquí.
    peekTimers.push(setTimeout(function () {
      S.lock = false;
      if (S.mode === 'reto') { S.started = true; startTimer(); }
    }, dealMs + secs * 1000 + 550));
  }

  function tick() {
    S.seconds++;
    if (S.mode !== 'reto') { $('#time').textContent = fmt(S.seconds); return; }
    var left = Math.max(0, LEVELS[S.level].limit - S.seconds), t = $('#time');
    t.textContent = fmt(left);
    if (left <= 10) {
      t.classList.add('warn');
      bump(t);
      tone(left <= 3 ? 880 : 660, 0.08, 0, 0.04);
    }
    if (left === 0) timeUp();
  }

  // Se acabó el tiempo en modo Reto
  function timeUp() {
    stopTimer();
    clearTurn();
    var total = LEVELS[S.level].pairs;
    if (S.matched === total) return;
    S.over = true;
    S.lock = true;
    S.first = null;
    $('#toast').classList.remove('show');
    tone(330, 0.4, 0, 0.06); tone(262, 0.6, 0.2, 0.06);
    // Muestra dónde estaban las cartas que faltaron
    grid.querySelectorAll('.mcard:not(.matched)').forEach(function (c, k) {
      peekTimers.push(setTimeout(function () { c.classList.add('flipped'); }, 200 + k * 40));
    });
    peekTimers.push(setTimeout(function () {
      $('#tOverText').textContent = 'Encontraste ' + S.matched + ' de ' + total + ' pares en ' + S.moves + ' movimientos.';
      $('#tOver').hidden = false;
      $('#st').textContent = '';
    }, 1200));
  }
  function startTimer() { clearInterval(S.timer); S.timer = setInterval(tick, 1000); }
  function stopTimer() { clearInterval(S.timer); S.timer = null; }

  // ---------- Tiempo por turno ----------
  var turnTimer = null, turnTick = null;
  function clearTurn() {
    clearTimeout(turnTimer); clearInterval(turnTick);
    turnTimer = turnTick = null;
    grid.querySelectorAll(".mcard.turn").forEach(function (c) { c.classList.remove("turn"); });
  }
  function startTurn(first) {
    clearTurn();
    var secs = LEVELS[S.level].turn, left = secs, st = $("#st");
    first.card.style.setProperty("--turn", secs + "s");
    first.card.classList.add("turn");
    st.innerHTML = "Encuentra su pareja <span class=\"count\">" + left + "</span>";
    turnTick = setInterval(function () {
      left--;
      if (left > 0) st.innerHTML = "Encuentra su pareja <span class=\"count\">" + left + "</span>";
    }, 1000);
    turnTimer = setTimeout(function () { turnExpired(first); }, secs * 1000);
  }
  // No encontró la pareja a tiempo: la carta se esconde y cuenta como fallo
  function turnExpired(first) {
    clearTurn();
    if (S.first !== first || S.over) return;
    S.first = null;
    S.lock = true;
    S.moves++;
    $("#moves").textContent = S.moves;
    bump($("#moves"));
    first.card.classList.add("miss");
    sfx.miss();
    $("#st").textContent = "¡Se acabó el turno! Intenta con otra carta";
    setTimeout(function () {
      first.card.classList.remove("flipped", "miss");
      first.card.setAttribute("aria-label", "Carta " + (first.i + 1) + ", oculta");
      if (!S.over) S.lock = false;
    }, 650);
  }

  function flip(card, tip, i) {
    if (S.over || S.lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (!S.started) { S.started = true; startTimer(); } // modo Zen: cuenta desde el primer movimiento

    card.classList.add('flipped');
    card.setAttribute('aria-label', 'Carta ' + (i + 1) + ', ' + tip.e);
    sfx.flip();

    if (!S.first) { S.first = { card: card, tip: tip, i: i }; startTurn(S.first); return; }

    var a = S.first, b = { card: card, tip: tip, i: i };
    clearTurn();
    $('#st').textContent = '';
    S.first = null;
    S.moves++;
    $('#moves').textContent = S.moves;
    bump($('#moves'));

    if (a.tip === b.tip) {
      S.lock = true;
      setTimeout(function () {
        [a.card, b.card].forEach(function (c) {
          c.classList.remove('flipped');
          c.classList.add('matched');
          c.setAttribute('aria-disabled', 'true');
          sparkle(c);
        });
        S.matched++;
        S.found.push(a.tip);
        var total = LEVELS[S.level].pairs;
        $('#pairs').textContent = S.matched + '/' + total;
        bump($('#pairs'));
        $('#bar').style.width = (S.matched / total * 100) + '%';
        sfx.match();
        toast(a.tip);
        S.lock = false;
        if (S.matched === total) setTimeout(win, 900);
      }, 350);
    } else {
      S.lock = true;
      setTimeout(function () {
        a.card.classList.add('miss'); b.card.classList.add('miss');
        sfx.miss();
      }, 450);
      setTimeout(function () {
        [a, b].forEach(function (x) {
          x.card.classList.remove('flipped', 'miss');
          x.card.setAttribute('aria-label', 'Carta ' + (x.i + 1) + ', oculta');
        });
        if (!S.over) S.lock = false;
      }, 1100);
    }
  }

  function sizeGrid() {
    if (!$('#juego').classList.contains('active')) return;
    var L = LEVELS[S.level];
    var narrow = window.innerWidth < 560;
    var cols = narrow ? L.mcols : L.cols;
    var rows = Math.ceil(L.pairs * 2 / cols);
    var gap = narrow ? 8 : 12;
    grid.style.setProperty('--cols', cols);
    grid.style.width = '100%';
    var availW = grid.clientWidth;
    var top = grid.getBoundingClientRect().top + window.scrollY;
    var availH = window.innerHeight - top - 90; // deja espacio para la barra de progreso
    var byW = (availW - gap * (cols - 1)) / cols;
    var byH = ((availH - gap * (rows - 1)) / rows) * 0.75;
    var w = Math.max(58, Math.min(byW, byH, 140));
    grid.style.width = (w * cols + gap * (cols - 1)) + 'px';
  }
  window.addEventListener('resize', sizeGrid);

  // ---------- Efectos ----------
  var fx = $('#fx');
  var COLORS = ['#1E4DB7', '#5E8FD8', '#9DBBE8', '#7DA5FF', '#E9A23B'];

  function sparkle(el) {
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var k = 0; k < 10; k++) {
      var s = document.createElement('span');
      var ang = (Math.PI * 2 * k) / 10, dist = 50 + Math.random() * 40;
      s.className = 'spark';
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.background = COLORS[k % COLORS.length];
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      fx.appendChild(s);
      setTimeout(s.remove.bind(s), 900);
    }
  }

  function petals() {
    for (var k = 0; k < 46; k++) {
      var p = document.createElement('span');
      p.className = 'petal';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.setProperty('--c', COLORS[k % COLORS.length]);
      p.style.setProperty('--s', (8 + Math.random() * 10) + 'px');
      p.style.setProperty('--d', (3 + Math.random() * 3) + 's');
      p.style.setProperty('--delay', (Math.random() * 1.5) + 's');
      p.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      fx.appendChild(p);
      setTimeout(p.remove.bind(p), 7000);
    }
  }

  var toastTimer = null;
  function toast(tip) {
    var el = $('#toast');
    el.innerHTML = '<span class="t-emo">' + tip.e + '</span><p>' + esc(tip.t) + '</p>';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
  }

  // ---------- Fin ----------
  function win() {
    clearTurn();
    if (S.over) return;
    stopTimer();
    sfx.win();
    petals();
    $('#toast').classList.remove('show');

    var L = LEVELS[S.level];
    var stars = S.moves <= L.pairs * 1.5 ? 3 : S.moves <= L.pairs * 2.2 ? 2 : 1;

    var best = store(userKey('best')) || {};
    var prev = best[S.level];
    var isRecord = !prev || S.moves < prev.moves || (S.moves === prev.moves && S.seconds < prev.time);
    if (isRecord) { best[S.level] = { moves: S.moves, time: S.seconds }; store(userKey('best'), best); }

    showFin({
      title: '¡Lo lograste, ' + S.user.name + '!',
      stars: stars,
      stats: [[S.moves, 'movimientos'], [fmt(S.seconds), 'tiempo'], [L.pairs, 'pares']],
      record: isRecord && !!prev,
      tips: S.found,
      entry: { game: 'memorama', level: S.level, mode: S.mode, moves: S.moves, time: S.seconds, stars: stars }
    });
  }

  // Pantalla final compartida por los dos juegos
  function showFin(o) {
    $('#finTitle').textContent = o.title;
    $('#stars').innerHTML = [0, 1, 2].map(function (k) {
      return '<span class="' + (k < o.stars ? 'on' : '') + '">⭐</span>';
    }).join('');
    $('#stars').setAttribute('aria-label', o.stars + ' de 3 estrellas');
    [['#rMoves', '#rMovesL'], ['#rTime', '#rTimeL'], ['#rPairs', '#rPairsL']].forEach(function (ids, k) {
      $(ids[0]).textContent = o.stats[k][0];
      $(ids[1]).textContent = o.stats[k][1];
    });
    $('#record').hidden = !o.record;

    $('#tipsBox').hidden = !o.tips.length;
    $('#tipList').innerHTML = o.tips.map(function (t) {
      return '<li><span>' + t.e + '</span><span>' + esc(t.t) + '</span></li>';
    }).join('');

    var hist = store(userKey('history')) || [];
    o.entry.d = Date.now(); o.entry.start = S.stressStart; o.entry.end = null;
    hist.push(o.entry);
    store(userKey('history'), hist.slice(-50));
    checkBadges(false);

    S.stressEnd = null;
    $('#moodMsg').textContent = '';
    buildStress($('#stressEnd'), 'stressEnd', stressMessage);
    show('fin');
  }

  // ---------- Juego 2: Secuencia de patrones ----------
  var sgrid = $('#sgrid');
  var Q = { objs: [], cells: [], seq: [], pos: 0, lives: SEQ_LIVES, busy: true, timers: [],
            round: 1, bestRound: 0, hits: 0, restarts: 0, startedAt: 0, lastSig: '' };

  function qt(fn, ms) { Q.timers.push(setTimeout(fn, ms)); }
  function qClear() {
    Q.timers.forEach(clearTimeout); Q.timers = [];
    Q.cells.forEach(function (c) { c.classList.remove('on', 'tap', 'good', 'bad'); });
  }
  function randCell(prev) {
    var r;
    do { r = Math.floor(Math.random() * 9); } while (r === prev);
    return r;
  }

  function startSeq() {
    Q.hits = 0; Q.bestRound = 0; Q.restarts = 0; Q.startedAt = Date.now();
    $('#sLevel').textContent = LEVELS[S.level].name;
    show('secuencia');
    seqNewGame();
  }

  // Partida nueva: objetos reacomodados y una secuencia distinta a la anterior
  function seqNewGame() {
    qClear();
    $('#sOver').hidden = true;
    var cfg = SEQ_LEVELS[S.level];
    Q.objs = shuffle(SEQ_OBJECTS).slice(0, 9);
    Q.lives = SEQ_LIVES;
    Q.round = 1;
    do {
      Q.seq = [];
      while (Q.seq.length < cfg.start) Q.seq.push(randCell(Q.seq[Q.seq.length - 1]));
    } while (Q.seq.join() === Q.lastSig);
    Q.lastSig = Q.seq.join();

    sgrid.innerHTML = '';
    Q.cells = Q.objs.map(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scell deal';
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', o.n);
      b.innerHTML = '<span class="obj">' + o.e + '</span><span class="oname">' + o.n + '</span>';
      b.addEventListener('animationend', function () { b.classList.remove('deal'); }, { once: true });
      b.addEventListener('click', function () { seqTap(i); });
      sgrid.appendChild(b);
      return b;
    });
    renderLives();
    $('#sRound').textContent = Q.round;
    $('#sst').textContent = 'Prepárate…';
    qt(seqPlay, 900);
  }

  function renderLives(lostNow) {
    var el = $('#sLives');
    el.innerHTML = '';
    for (var k = 0; k < SEQ_LIVES; k++) {
      var h = document.createElement('i');
      h.textContent = '💙';
      if (k >= Q.lives) h.className = 'lost' + (k === Q.lives && lostNow ? ' now' : '');
      el.appendChild(h);
    }
    el.setAttribute('aria-label', Q.lives + ' de ' + SEQ_LIVES + ' intentos');
  }

  // Reproduce la secuencia actual encendiendo cada objeto
  function seqPlay() {
    qClear();
    var cfg = SEQ_LEVELS[S.level];
    Q.busy = true; Q.pos = 0;
    sgrid.classList.add('busy');
    $('#sst').textContent = 'Observa la secuencia (' + Q.seq.length + ' objetos)';
    $('#sRetLabel').textContent = 'Ventana de retención';
    var step = cfg.on + cfg.gap, total = 400 + Q.seq.length * step;
    var bar = $('#sbar');
    bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth;
    bar.style.transition = 'width ' + total + 'ms linear'; bar.style.width = '0';

    Q.seq.forEach(function (c, k) {
      qt(function () { Q.cells[c].classList.add('on'); tone(SEQ_NOTES[c], cfg.on / 1000, 0, 0.06); }, 400 + k * step);
      qt(function () { Q.cells[c].classList.remove('on'); }, 400 + k * step + cfg.on);
    });
    qt(function () {
      Q.busy = false;
      sgrid.classList.remove('busy');
      $('#sst').textContent = 'Tu turno: repite la secuencia';
    }, total);
  }

  function seqTap(i) {
    if (Q.busy) return;
    var c = Q.cells[i];
    c.classList.remove('tap'); void c.offsetWidth; c.classList.add('tap');
    tone(SEQ_NOTES[i], 0.25, 0, 0.06);
    qt(function () { c.classList.remove('tap'); }, 200);

    if (i === Q.seq[Q.pos]) {
      Q.pos++;
      if (Q.pos === Q.seq.length) seqRoundWon();
      return;
    }
    // Error: se pierde un intento
    Q.busy = true;
    sgrid.classList.add('busy');
    c.classList.add('bad');
    sfx.miss();
    Q.lives--;
    renderLives(true);
    if (Q.lives > 0) {
      $('#sst').textContent = 'Casi. Te ' + (Q.lives === 1 ? 'queda 1 intento' : 'quedan ' + Q.lives + ' intentos') + '. Mira la secuencia otra vez';
      qt(seqPlay, 1500);
    } else {
      seqGameOver();
    }
  }

  function seqRoundWon() {
    Q.busy = true;
    sgrid.classList.add('busy');
    Q.hits++;
    Q.bestRound = Math.max(Q.bestRound, Q.round);
    Q.seq.forEach(function (c) { Q.cells[c].classList.add('good'); });
    sfx.match();
    Q.round++;
    $('#sRound').textContent = Q.round;
    bump($('#sRound'));
    $('#sst').textContent = '¡Bien! Ahora un objeto más';
    Q.seq.push(randCell(Q.seq[Q.seq.length - 1]));
    qt(seqPlay, 1200);
  }

  // Sin intentos: aviso y reinicio automático con una secuencia nueva
  function seqGameOver() {
    Q.restarts++;
    $('#sst').textContent = '';
    $('#sOverText').textContent = 'Llegaste a la ronda ' + Q.round + '. Vamos de nuevo con otra secuencia.';
    $('#sOver').hidden = false;
    var n = 3;
    $('#sOverCount').textContent = n;
    for (var k = 1; k <= 3; k++) {
      (function (left) {
        qt(function () {
          var b = $('#sOverCount');
          b.textContent = left;
          b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
        }, k * 1000);
      })(n - k);
    }
    qt(seqNewGame, 3200);
  }

  function seqFinish() {
    qClear();
    Q.busy = true;
    $('#sOver').hidden = true;
    var secs = Math.round((Date.now() - Q.startedAt) / 1000);
    var bestSeq = store(userKey('bestSeq')) || {};
    var prev = bestSeq[S.level] || 0;
    var isRecord = Q.bestRound > prev;
    if (isRecord) { bestSeq[S.level] = Q.bestRound; store(userKey('bestSeq'), bestSeq); }
    var stars = Q.bestRound >= 8 ? 3 : Q.bestRound >= 4 ? 2 : Q.bestRound >= 1 ? 1 : 0;
    sfx.win();
    if (Q.bestRound > 0) petals();
    showFin({
      title: Q.bestRound ? '¡Buen entrenamiento, ' + S.user.name + '!' : 'Gracias por intentarlo, ' + S.user.name,
      stars: stars,
      stats: [[Q.bestRound, 'ronda máxima'], [fmt(secs), 'tiempo'], [Q.hits, 'secuencias correctas']],
      record: isRecord && prev > 0,
      tips: [],
      entry: { game: 'secuencia', level: S.level, rounds: Q.bestRound, hits: Q.hits, time: secs }
    });
  }

  function seqExit() { qClear(); Q.busy = true; $('#sOver').hidden = true; }

  function stressMessage(end) {
    var start = S.stressStart, msg;
    if (start === null) msg = end <= 2 ? 'Qué bien, sigue cuidándote.' : 'Está bien no estar al 100%. Prueba un ejercicio de respiración.';
    else if (end < start) msg = 'Tu estrés bajó de ' + STRESS[start].n.toLowerCase() + ' a ' + STRESS[end].n.toLowerCase() + '. ¡La pausa funcionó!';
    else if (end === start) msg = end <= 1 ? 'Te mantienes en calma. ¡Excelente!' : 'Quizá te sirva respirar un momento o hablar con alguien.';
    else msg = 'Gracias por ser honesto contigo. Tómate un respiro, aquí estamos.';
    if (end === 4) msg += ' Si te sientes así seguido, busca el área de apoyo psicológico de tu universidad.';
    $('#moodMsg').textContent = msg;

    var hist = store(userKey('history')) || [];
    if (hist.length) { hist[hist.length - 1].end = end; store(userKey('history'), hist); }
  }

  // ---------- Respiración ----------
  var dlg = $('#breathe'), circle = $('#circle'), bText = $('#bText'), bSub = $('#bSub');
  var bTimers = [], wasRunning = false;
  var PHASES = [
    { txt: 'Inhala', s: 4, big: true },
    { txt: 'Sostén', s: 4, big: true },
    { txt: 'Exhala', s: 6, big: false }
  ];
  function bClear() { bTimers.forEach(clearTimeout); bTimers = []; }
  function bReset() {
    bClear();
    circle.style.transitionDuration = '.6s';
    circle.classList.remove('big');
    bText.textContent = 'Listo';
    bSub.textContent = '3 ciclos · menos de 1 minuto';
    $('#bStart').textContent = 'Empezar';
  }
  function bRun() {
    bClear();
    $('#bStart').textContent = 'Reiniciar';
    var t = 0, cycles = 3;
    for (var c = 0; c < cycles; c++) {
      PHASES.forEach(function (p) {
        (function (cycle, at) {
          bTimers.push(setTimeout(function () {
            circle.style.transitionDuration = p.s + 's';
            circle.classList.toggle('big', p.big);
            bText.textContent = p.txt;
            bSub.textContent = 'Ciclo ' + (cycle + 1) + ' de ' + cycles;
            countdown(p.s);
            if (p.txt === 'Inhala') tone(392, 0.8, 0, 0.04);
          }, at * 1000));
        })(c, t);
        t += p.s;
      });
    }
    bTimers.push(setTimeout(function () {
      circle.style.transitionDuration = '1s';
      circle.classList.remove('big');
      bText.textContent = '✓';
      bSub.textContent = 'Bien hecho. Vuelve cuando lo necesites.';
      $('#bStart').textContent = 'Otra vez';
      if (S.user) { store(userKey('breaths'), (store(userKey('breaths')) || 0) + 1); checkBadges(false); }
      tone(523, 1, 0, 0.05); tone(784, 1.2, 0.15, 0.05);
    }, t * 1000));
  }
  function countdown(n) {
    var base = bText.textContent;
    for (var k = 1; k < n; k++) {
      (function (left) {
        bTimers.push(setTimeout(function () { bText.textContent = base + ' · ' + left; }, (n - left) * 1000));
      })(n - k);
    }
  }
  function openBreathe() {
    wasRunning = !!S.timer;
    stopTimer();
    bReset();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeBreathe() {
    bClear();
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', function () {
    bClear();
    if (wasRunning && $('#juego').classList.contains('active')) startTimer();
    wasRunning = false;
  });

  // ---------- Eventos ----------
  bindSeg($('#games'), 'game');
  bindSeg($('#levels'), 'level');
  bindSeg($('#modes'), 'mode');

  function setSoundIcon() {
    var b = $('#soundBtn');
    b.classList.toggle('off', !S.sound);
    b.setAttribute('aria-pressed', String(S.sound));
    b.title = S.sound ? 'Sonido activado' : 'Sonido desactivado';
  }
  setSoundIcon();
  function toggleSound() {
    S.sound = !S.sound; store('sound', S.sound); setSoundIcon();
    $('#soundSwitch').setAttribute('aria-checked', String(S.sound));
    if (S.sound) sfx.flip();
  }
  $('#soundBtn').addEventListener('click', toggleSound);
  $('#soundSwitch').addEventListener('click', toggleSound);

  function goHome() {
    clearTurn();
    stopTimer();
    clearPeek();
    seqExit();
    $('#toast').classList.remove('show');
    if (!S.user) return show('login');
    S.user.isNew = false;
    renderWelcome();
    show('inicio');
  }
  function play() { if (S.game === 'secuencia') startSeq(); else startGame(); }
  $('#startBtn').addEventListener('click', play);
  $('#restartBtn').addEventListener('click', startGame);
  $('#tRetry').addEventListener('click', startGame);
  $('#tZen').addEventListener('click', function () {
    S.mode = 'zen';
    syncSeg($('#modes'), 'mode', null);
    startGame();
  });
  $('#againBtn').addEventListener('click', play);
  $('#homeBtn').addEventListener('click', goHome);
  $('#exitBtn').addEventListener('click', goHome);
  $('#sExit').addEventListener('click', goHome);
  $('#sFinish').addEventListener('click', seqFinish);
  $('#logoutBtn').addEventListener('click', logout);
  $('#breatheBtn').addEventListener('click', openBreathe);
  $('#finBreathe').addEventListener('click', openBreathe);
  $('#recoBreathe').addEventListener('click', openBreathe);
  $('#bStart').addEventListener('click', bRun);
  $('#bClose').addEventListener('click', closeBreathe);

  // ---------- Arranque: restaurar sesión ----------
  (function boot() {
    var email = store('session');
    var u = email && (store('users') || {})[email];
    if (u) {
      S.user = { email: email, name: u.name, isNew: false, picture: u.picture || null };
      if (store('remembered') === null) store('remembered', [email]); // sesiones de antes de esta función
      renderWelcome();
      show('inicio');
    } else {
      renderLogin();
      show('login');
    }
  })();
})();
