// WC Games!: one random short game against mAIa at a random strength. No menus.
// Each game is one module in games/ (rules + texts + view); only the picked one is loaded.
// A game module exports: meta {name, goal, levels, origins}, start(first), turn(s), moves(s), play(s, move),
// result(s) (null, 0 = you won, 1 = mAIa won, 0.5 = draw; kept in s.w), view(root, s, ui) and trace(s, move).

const GAMES = ['ur', 'dobutsu'];
const STORE = 'wc-v1';
const AI_PAUSE_MS = 700;   // mAIa never answers faster than this, so you can see what happened
const PASS_PAUSE_MS = 1300;

// Index = mAIa's level. One line is picked per session.
const FOE = [
    ["You are mAIa's first opponent ever, be gentle.",
     'mAIa learned this game five minutes ago.',
     'mAIa is mostly here for the company.'],
    ['This is a challenge but you got this!',
     'mAIa has played this before. Not a lot.',
     'A fair fight. mAIa thinks so too.'],
    ['Your opponent is pretty good, be careful.',
     'mAIa has been practicing. Alone. In the dark.',
     "mAIa doesn't do gentle."]
];

const $ = id => document.getElementById(id);
const pick = list => list[Math.random() * list.length | 0];

let session, G, worker, request = 0, visibleSince = performance.now();

// ===== SESSION =====
function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE));
        if (saved && GAMES.includes(saved.game) && (!saved.s || saved.s.w === null)) return saved;
    } catch { /* storage off: just play */ }
    return null;
}

function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ ...session, elapsed: elapsed() })); } catch { }
}

function fresh() {
    const level = Math.random() * 3 | 0;
    return { game: pick(GAMES), level, guides: Math.random() < 0.5, foe: pick(FOE[level]) };
}

function startMatch() {
    session.s = G.start(Math.random() < 0.5 ? 0 : 1);
    session.last = null;
    session.elapsed = 0;
    visibleSince = performance.now();
}

// ===== TIMER =====
// Counts the time spent looking at the match; stops when it ends.
const over = () => G.result(session.s) !== null;
function elapsed() {
    return session.elapsed + (over() || document.hidden ? 0 : performance.now() - visibleSince);
}
function tick() {
    const t = Math.floor(elapsed() / 1000), h = Math.floor(t / 3600);
    const mm = String(Math.floor(t / 60) % 60).padStart(2, '0'), ss = String(t % 60).padStart(2, '0');
    $('timer').textContent = (h ? h + ':' : '') + mm + ':' + ss;
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { session.elapsed = elapsed(); save(); }
    else visibleSince = performance.now();
});

// ===== PLAY =====
function play(move) {
    session.last = G.trace(session.s, move);
    session.s = G.play(session.s, move);
    if (over()) session.elapsed = session.elapsed + performance.now() - visibleSince;
    save();
    render();
}

function next() {
    if (over()) return;
    const s = session.s, id = ++request;
    if (G.turn(s) === 1) {
        const asked = performance.now();
        worker.onmessage = ({ data }) => {
            if (data.id !== request) return;
            setTimeout(() => id === request && play(data.move), Math.max(0, AI_PAUSE_MS - (performance.now() - asked)));
        };
        worker.postMessage({ id, game: session.game, state: s, sims: G.meta.levels[session.level] });
    } else if (G.moves(s)[0] === '-') {
        setTimeout(() => id === request && play('-'), PASS_PAUSE_MS);
    }
}

function render() {
    const s = session.s, mine = G.turn(s) === 0, done = over();
    const stuck = !done && mine && G.moves(s)[0] === '-';
    G.view($('board'), s, { guides: session.guides, canPlay: !done && mine && !stuck, last: session.last, onMove: play });
    const r = G.result(s);
    $('status').textContent = done ? (r === 0 ? 'You win!' : r === 1 ? 'mAIa wins' : 'A draw')
        : stuck ? 'Nothing to play. Passing…' : mine ? 'Your move' : 'mAIa is thinking…';
    $('status').className = done ? 'end' : mine ? 'you' : 'foe';
    $('board').classList.toggle('done', done);
    $('end').hidden = !done;
    tick();
    next();
}

// ===== START =====
async function init() {
    session = load() ?? fresh();
    G = await import(`./games/${session.game}.mjs`);
    $('board').className = session.game;
    if (!session.s) startMatch();
    worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });

    $('goal').textContent = G.meta.goal;
    $('foe').textContent = session.foe;
    const h = document.createElement('h2');
    h.textContent = G.meta.name;
    $('origins').replaceChildren(h, ...G.meta.origins.map(text => Object.assign(document.createElement('p'), { textContent: text })));

    $('rematch').addEventListener('click', () => { request++; startMatch(); save(); render(); });
    setInterval(tick, 250);
    save();
    render();
}

init();
