// WC Games!: one random short game against mAIa at a random strength. No menus.
// Each game is one module in games/ (rules + texts + view); only the picked one is loaded.
// A game module exports: meta {name, goal, levels, origins}, start(first, level), turn(s), moves(s), play(s, move),
// result(s) (null, 0 = you won, 1 = mAIa won, 0.5 = draw; kept in s.w), view(root, s, ui) and trace(s, move).
// Optional: meta.goal can be a function of the state (when your side changes per match), meta.foe replaces the
// level lines, and meta.solo marks a puzzle with no mAIa turns (then levels are the puzzle's difficulty).
// Testing a specific game: ?game=brandubh&level=2&guides=1 (and ?limit=5 for a 5-second time's-up card)

const GAMES = ['ur', 'dobutsu', 'brandubh', 'fanorona', 'poosweeper'];
const AI_PAUSE_MS = 700;   // mAIa never answers faster than this, so you can see what happened
const PASS_PAUSE_MS = 1300;

// What mAIa's level feels like, in mAIa's voice. Index = level; any line of a level says the same thing.
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

// After ten minutes on the page (rematches included), this card sends you back to your life. It stays on
// reload; only its button lifts it.
const LIMIT_MS = (+new URLSearchParams(location.search).get('limit') || 600) * 1000, OUT = 'wc-out';
const NUDGES = [
    'You are expected somewhere else.',
    'Remember the meeting.',
    'Go do something nice for your wife.',
    'Your legs are falling asleep.',
    'Someone may be waiting for this room.',
    'mAIa will still be here tomorrow.',
    'The world outside misses you.'
];

const $ = id => document.getElementById(id);
const pick = list => list[Math.random() * list.length | 0];

let session, G, worker, request = 0, visibleSince = performance.now(), stayMs = 0, staySince = performance.now();

// ===== SESSION =====
// Nothing is saved: close the tab and the match is gone.
function fresh() {
    const q = new URLSearchParams(location.search);
    const game = GAMES.includes(q.get('game')) ? q.get('game') : pick(GAMES);
    const level = ['0', '1', '2'].includes(q.get('level')) ? +q.get('level') : Math.random() * 3 | 0;
    const guides = ['0', '1'].includes(q.get('guides')) ? q.get('guides') === '1' : Math.random() < 0.5;
    return { game, level, guides };
}

function startMatch() {
    session.s = G.start(Math.random() < 0.5 ? 0 : 1, session.level);
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
    if (!session) return;
    if (document.hidden) { session.elapsed = elapsed(); stayMs = stay(); }
    else visibleSince = staySince = performance.now();
});

// ===== TIME'S UP =====
const stay = () => stayMs + (document.hidden ? 0 : performance.now() - staySince);
function timeUp() {
    request++; // mAIa stops mid-thought
    try { localStorage.setItem(OUT, '1'); } catch { }
    $('nudge').textContent = pick(NUDGES);
    $('out').hidden = false;
}
$('leave').addEventListener('click', () => {
    try { localStorage.removeItem(OUT); } catch { }
    // Browsers only let a page close a tab that a script opened, so this usually falls through to the lobby.
    window.close();
    setTimeout(() => location.replace('../'), 200);
});

// ===== PLAY =====
function play(move) {
    session.last = G.trace(session.s, move);
    session.s = G.play(session.s, move);
    if (over()) session.elapsed = session.elapsed + performance.now() - visibleSince;
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
    } else if (!G.meta.solo && G.moves(s)[0] === '-') {
        setTimeout(() => id === request && play('-'), PASS_PAUSE_MS);
    }
}

function render() {
    const s = session.s, mine = G.turn(s) === 0, done = over();
    const stuck = !done && mine && !G.meta.solo && G.moves(s)[0] === '-';
    G.view($('board'), s, { guides: session.guides, canPlay: !done && mine && !stuck, last: session.last, onMove: play });
    const r = G.result(s);
    $('status').textContent = done ? (r === 0 ? 'You win!' : r === 1 ? G.meta.lost ?? 'mAIa wins' : 'A draw')
        : stuck ? 'Nothing to play. Passing…' : G.meta.solo ? '' : mine ? 'Your move' : 'mAIa is thinking…';
    $('status').className = done ? 'end' : mine ? 'you' : 'foe';
    $('board').classList.toggle('done', done);
    $('end').hidden = !done;
    $('origins').hidden = !done; // the story is the reward, not a manual
    $('goal').textContent = typeof G.meta.goal === 'function' ? G.meta.goal(s) : G.meta.goal;
    tick();
    next();
}

// ===== START =====
async function init() {
    let out = false;
    try { out = localStorage.getItem(OUT) === '1'; } catch { }
    if (out) return timeUp();
    session = fresh();
    G = await import(`./games/${session.game}.mjs`);
    $('board').className = session.game;
    startMatch();
    worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });

    $('foe').textContent = pick((G.meta.foe ?? FOE)[session.level]);
    const h = document.createElement('h2');
    h.textContent = G.meta.name;
    $('origins').replaceChildren(h, ...G.meta.origins.map(text => Object.assign(document.createElement('p'), { textContent: text })));

    $('rematch').addEventListener('click', () => { request++; startMatch(); render(); });
    const clock = setInterval(() => {
        if (stay() < LIMIT_MS) return tick();
        clearInterval(clock);
        timeUp();
    }, 250);
    render();
}

init();
