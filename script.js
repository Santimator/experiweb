// ===== CARROM BOARD GAME =====

(() => {
    'use strict';

    // ===== CONSTANTS =====
    const FRICTION = 0.985;
    const WALL_BOUNCE = 0.6;
    const COIN_BOUNCE = 0.9;
    const POCKET_RADIUS_FACTOR = 1.8;
    const MIN_SPEED = 0.15;
    const MAX_POWER = 22;
    const STRIKER_MASS = 2;
    const COIN_MASS = 1;
    const WHITE_COUNT = 9;
    const BLACK_COUNT = 9;

    // Player sides: which board edge each player uses
    const SIDE_CONFIG = {
        2: ['bottom', 'top'],
        3: ['bottom', 'right', 'top'],
        4: ['bottom', 'right', 'top', 'left'],
    };

    // Colors for player labels in 3-4 player mode
    const PLAYER_COLORS = ['#6cf', '#f88', '#8f8', '#f8f'];

    const COLORS = {
        board: '#c8a45c',
        boardBorder: '#5a3a1a',
        innerBorder: '#8b6914',
        lines: '#a07830',
        pocket: '#2a1a0a',
        pocketRim: '#4a2a0a',
        white: '#f5f5f0',
        whiteBorder: '#c0c0b0',
        black: '#1a1a1a',
        blackBorder: '#444',
        queen: '#cc2020',
        queenBorder: '#881010',
        striker: '#e8d8b0',
        strikerBorder: '#907040',
    };

    // ===== GAME STATE =====
    let canvas, ctx;
    let boardSize, boardX, boardY, cellUnit;
    let coins = [];
    let striker = null;
    let pockets = [];
    let numPlayers = 2;
    let currentPlayer = 0; // 0-indexed
    let scores = [];
    let turnPocketed = []; // what current player pocketed this shot
    let queenPocketedBy = -1;
    let gameOver = false;
    let flowMode = false;

    // Interaction state
    let phase = 'place'; // 'place', 'aim', 'moving', 'gameover'
    let strikerPlaceZone = null; // { axis, min, max, fixed }
    let aimStart = null;
    let aimCurrent = null;
    let isDragging = false;
    let animFrame = null;

    // ===== INITIALIZATION =====
    function init() {
        canvas = document.getElementById('carromCanvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        document.getElementById('btn-new-game').addEventListener('click', newGame);
        document.getElementById('btn-players').addEventListener('click', cyclePlayers);
        document.getElementById('btn-variant').addEventListener('click', toggleVariant);
        document.getElementById('btn-rules').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.remove('hidden');
        });
        document.getElementById('rules-close').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.add('hidden');
        });
        document.getElementById('overlay-btn').addEventListener('click', () => {
            document.getElementById('overlay').classList.add('hidden');
            newGame();
        });

        document.addEventListener('touchmove', e => {
            if (e.target.closest('#rules-content')) return;
            e.preventDefault();
        }, { passive: false });
        window.addEventListener('orientationchange', () => setTimeout(resize, 100));
    }

    function resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const reservedH = 120;
        const availW = winW - 16;
        const availH = winH - reservedH;
        const size = Math.max(200, Math.min(availW, availH, 600));

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        boardSize = size * 0.92;
        boardX = (size - boardSize) / 2;
        boardY = (size - boardSize) / 2;
        cellUnit = boardSize / 30;

        recalcPockets();
        if (striker && phase !== 'moving') {
            recalcStrikerZone();
            if (phase === 'place') {
                positionStrikerOnZone();
            }
        }
        if (coins.length > 0) draw();
    }

    function recalcPockets() {
        const pr = cellUnit * POCKET_RADIUS_FACTOR;
        const inset = cellUnit * 1.2;
        pockets = [
            { x: boardX + inset, y: boardY + inset, r: pr },
            { x: boardX + boardSize - inset, y: boardY + inset, r: pr },
            { x: boardX + inset, y: boardY + boardSize - inset, r: pr },
            { x: boardX + boardSize - inset, y: boardY + boardSize - inset, r: pr },
        ];
    }

    function getSide() {
        return SIDE_CONFIG[numPlayers][currentPlayer];
    }

    function recalcStrikerZone() {
        const offset = boardSize * 0.22;
        const margin = boardSize * 0.22;
        const side = getSide();

        if (side === 'bottom') {
            strikerPlaceZone = {
                axis: 'h',
                min: boardX + margin,
                max: boardX + boardSize - margin,
                fixed: boardY + boardSize - offset,
            };
        } else if (side === 'top') {
            strikerPlaceZone = {
                axis: 'h',
                min: boardX + margin,
                max: boardX + boardSize - margin,
                fixed: boardY + offset,
            };
        } else if (side === 'right') {
            strikerPlaceZone = {
                axis: 'v',
                min: boardY + margin,
                max: boardY + boardSize - margin,
                fixed: boardX + boardSize - offset,
            };
        } else { // left
            strikerPlaceZone = {
                axis: 'v',
                min: boardY + margin,
                max: boardY + boardSize - margin,
                fixed: boardX + offset,
            };
        }
    }

    function positionStrikerOnZone() {
        if (!strikerPlaceZone) return;
        const mid = (strikerPlaceZone.min + strikerPlaceZone.max) / 2;
        if (strikerPlaceZone.axis === 'h') {
            striker.x = mid;
            striker.y = strikerPlaceZone.fixed;
        } else {
            striker.x = strikerPlaceZone.fixed;
            striker.y = mid;
        }
    }

    // ===== NEW GAME =====
    function newGame() {
        coins = [];
        scores = new Array(numPlayers).fill(0);
        turnPocketed = [];
        queenPocketedBy = -1;
        currentPlayer = 0;
        gameOver = false;
        phase = 'place';

        createCoins();
        recalcStrikerZone();
        placeStriker();
        buildScoreboard();
        updateUI();
        draw();
    }

    function createCoins() {
        const cx = boardX + boardSize / 2;
        const cy = boardY + boardSize / 2;
        const coinR = cellUnit * 0.72;
        const gap = coinR * 2.3;

        coins.push(makeCoin(cx, cy, coinR, 'queen'));

        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = cx + Math.cos(angle) * gap;
            const y = cy + Math.sin(angle) * gap;
            coins.push(makeCoin(x, y, coinR, i % 2 === 0 ? 'white' : 'black'));
        }

        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 + Math.PI / 12;
            const x = cx + Math.cos(angle) * gap * 1.85;
            const y = cy + Math.sin(angle) * gap * 1.85;
            coins.push(makeCoin(x, y, coinR, i % 2 === 0 ? 'white' : 'black'));
        }
    }

    function makeCoin(x, y, r, type) {
        return { x, y, r, vx: 0, vy: 0, type, pocketed: false, mass: COIN_MASS };
    }

    function placeStriker() {
        const sr = cellUnit * 0.95;
        striker = {
            x: 0, y: 0, r: sr,
            vx: 0, vy: 0,
            type: 'striker', pocketed: false, mass: STRIKER_MASS,
        };
        positionStrikerOnZone();
    }

    // ===== INPUT HANDLING =====
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function clampStrikerToZone(pos) {
        const z = strikerPlaceZone;
        if (z.axis === 'h') {
            striker.x = Math.max(z.min, Math.min(z.max, pos.x));
            striker.y = z.fixed;
        } else {
            striker.x = z.fixed;
            striker.y = Math.max(z.min, Math.min(z.max, pos.y));
        }
    }

    function onPointerDown(e) {
        if (gameOver || phase === 'moving') return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const pos = getCanvasPos(e);

        if (phase === 'place') {
            isDragging = true;
            clampStrikerToZone(pos);
            draw();
        } else if (phase === 'aim') {
            aimStart = { x: pos.x, y: pos.y };
            aimCurrent = { x: pos.x, y: pos.y };
            isDragging = true;
        }
    }

    function onPointerMove(e) {
        if (!isDragging || gameOver || phase === 'moving') return;
        e.preventDefault();
        const pos = getCanvasPos(e);

        if (phase === 'place') {
            clampStrikerToZone(pos);
            draw();
        } else if (phase === 'aim' && aimStart) {
            aimCurrent = { x: pos.x, y: pos.y };
            draw();
        }
    }

    function onPointerUp(e) {
        if (!isDragging || gameOver) return;
        e.preventDefault();

        if (phase === 'place') {
            phase = 'aim';
            isDragging = false;
            draw();
            return;
        }

        if (phase === 'aim' && aimStart && aimCurrent) {
            const dx = striker.x - aimCurrent.x;
            const dy = striker.y - aimCurrent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                const power = Math.min(dist / 8, MAX_POWER);
                const angle = Math.atan2(dy, dx);
                striker.vx = Math.cos(angle) * power;
                striker.vy = Math.sin(angle) * power;
                phase = 'moving';
                turnPocketed = [];
                startSimulation();
            } else {
                phase = 'place';
            }
            aimStart = null;
            aimCurrent = null;
        }
        isDragging = false;
        draw();
    }

    // ===== PHYSICS =====
    function startSimulation() {
        if (animFrame) cancelAnimationFrame(animFrame);
        simulate();
    }

    function simulate() {
        let moving = false;
        const allPieces = [...coins.filter(c => !c.pocketed)];
        if (striker && !striker.pocketed) allPieces.push(striker);

        for (const p of allPieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= FRICTION;
            p.vy *= FRICTION;
            if (Math.abs(p.vx) < MIN_SPEED && Math.abs(p.vy) < MIN_SPEED) {
                p.vx = 0;
                p.vy = 0;
            } else {
                moving = true;
            }
            wallCollision(p);
        }

        for (let i = 0; i < allPieces.length; i++) {
            for (let j = i + 1; j < allPieces.length; j++) {
                pieceCollision(allPieces[i], allPieces[j]);
            }
        }

        checkPockets();
        draw();

        if (moving) {
            animFrame = requestAnimationFrame(simulate);
        } else {
            endTurn();
        }
    }

    function wallCollision(p) {
        const pad = cellUnit * 1.0;
        const minX = boardX + pad + p.r;
        const maxX = boardX + boardSize - pad - p.r;
        const minY = boardY + pad + p.r;
        const maxY = boardY + boardSize - pad - p.r;

        if (p.x < minX) { p.x = minX; p.vx = -p.vx * WALL_BOUNCE; }
        if (p.x > maxX) { p.x = maxX; p.vx = -p.vx * WALL_BOUNCE; }
        if (p.y < minY) { p.y = minY; p.vy = -p.vy * WALL_BOUNCE; }
        if (p.y > maxY) { p.y = maxY; p.vy = -p.vy * WALL_BOUNCE; }
    }

    function pieceCollision(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.r + b.r;

        if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            const totalMass = a.mass + b.mass;

            a.x -= nx * overlap * (b.mass / totalMass);
            a.y -= ny * overlap * (b.mass / totalMass);
            b.x += nx * overlap * (a.mass / totalMass);
            b.y += ny * overlap * (a.mass / totalMass);

            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvDotN = dvx * nx + dvy * ny;

            if (dvDotN > 0) {
                const impulse = (2 * dvDotN) / totalMass * COIN_BOUNCE;
                a.vx -= impulse * b.mass * nx;
                a.vy -= impulse * b.mass * ny;
                b.vx += impulse * a.mass * nx;
                b.vy += impulse * a.mass * ny;
            }
        }
    }

    function checkPockets() {
        const all = [...coins, striker];
        for (const piece of all) {
            if (piece.pocketed) continue;
            for (const pocket of pockets) {
                const dx = piece.x - pocket.x;
                const dy = piece.y - pocket.y;
                if (Math.sqrt(dx * dx + dy * dy) < pocket.r) {
                    piece.pocketed = true;
                    piece.vx = 0;
                    piece.vy = 0;
                    if (piece.type !== 'striker') {
                        turnPocketed.push(piece.type);
                    }
                    break;
                }
            }
        }
    }

    // ===== TURN LOGIC =====
    function getPlayerColor(pIdx) {
        if (numPlayers === 2) return pIdx === 0 ? 'white' : 'black';
        return null; // 3-4 players: all pieces score for anyone
    }

    function endTurn() {
        const strikerFouled = striker.pocketed;
        const myColor = getPlayerColor(currentPlayer);

        let scoredOwn = 0;
        let scoredAny = turnPocketed.length;
        let pocketedQueen = turnPocketed.includes('queen');

        if (numPlayers === 2) {
            const oppColor = currentPlayer === 0 ? 'black' : 'white';
            scoredOwn = turnPocketed.filter(t => t === myColor).length;
            const scoredOpp = turnPocketed.filter(t => t === oppColor).length;
            scores[currentPlayer] += scoredOwn;
            scores[1 - currentPlayer] += scoredOpp;
        } else {
            // 3-4 player: all non-queen pieces score for the current player
            scoredOwn = turnPocketed.filter(t => t !== 'queen').length;
            scores[currentPlayer] += scoredOwn;
        }

        // Queen handling
        if (pocketedQueen) {
            queenPocketedBy = currentPlayer;
        }
        if (queenPocketedBy === currentPlayer && scoredOwn > 0 && !pocketedQueen) {
            scores[currentPlayer] += 3;
            queenPocketedBy = -1;
        }

        // Striker foul
        if (strikerFouled) {
            scores[currentPlayer] = Math.max(0, scores[currentPlayer] - 1);
            returnRandomPiece(currentPlayer);
        }

        // Check game over
        const whiteLeft = coins.filter(c => c.type === 'white' && !c.pocketed).length;
        const blackLeft = coins.filter(c => c.type === 'black' && !c.pocketed).length;
        const allPiecesGone = whiteLeft === 0 && blackLeft === 0;
        const oneColorGone = whiteLeft === 0 || blackLeft === 0;

        if ((numPlayers === 2 && oneColorGone) || (numPlayers > 2 && allPiecesGone)) {
            gameOver = true;
            phase = 'gameover';
            updateUI();
            draw();
            showGameOver();
            return;
        }

        // Queen not covered after a turn
        if (queenPocketedBy >= 0 && scoredOwn === 0 && !pocketedQueen) {
            const q = coins.find(c => c.type === 'queen' && c.pocketed);
            if (q) {
                q.pocketed = false;
                q.x = boardX + boardSize / 2;
                q.y = boardY + boardSize / 2;
                q.vx = 0;
                q.vy = 0;
            }
            queenPocketedBy = -1;
        }

        // Determine if player continues or turn passes
        const scored = scoredOwn > 0;
        const continueTurn = scored && !strikerFouled;

        if (continueTurn && flowMode && !striker.pocketed) {
            // Flow mode: keep striker where it stopped, go straight to aim
            phase = 'aim';
            striker.vx = 0;
            striker.vy = 0;
            // Ensure striker is within board bounds
            ensureStrikerInBounds();
            resolveStrikerOverlaps();
        } else {
            if (!continueTurn) {
                currentPlayer = (currentPlayer + 1) % numPlayers;
            }
            phase = 'place';
            recalcStrikerZone();
            placeStriker();
            resolveStrikerOverlaps();
        }

        updateUI();
        draw();
    }

    function ensureStrikerInBounds() {
        const pad = cellUnit * 1.5 + striker.r;
        striker.x = Math.max(boardX + pad, Math.min(boardX + boardSize - pad, striker.x));
        striker.y = Math.max(boardY + pad, Math.min(boardY + boardSize - pad, striker.y));
    }

    function returnRandomPiece(pIdx) {
        let candidates;
        if (numPlayers === 2) {
            const color = pIdx === 0 ? 'white' : 'black';
            candidates = coins.filter(c => c.type === color && c.pocketed);
        } else {
            candidates = coins.filter(c => c.type !== 'queen' && c.pocketed);
        }
        if (candidates.length > 0) {
            const piece = candidates[0];
            piece.pocketed = false;
            piece.x = boardX + boardSize / 2;
            piece.y = boardY + boardSize / 2;
            piece.vx = 0;
            piece.vy = 0;
        }
    }

    function resolveStrikerOverlaps() {
        for (let iter = 0; iter < 10; iter++) {
            let ok = true;
            for (const coin of coins) {
                if (coin.pocketed) continue;
                const dx = striker.x - coin.x;
                const dy = striker.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const need = striker.r + coin.r + 1;
                if (dist < need && dist > 0) {
                    const push = (need - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    striker.x += nx * push;
                    coin.x -= nx * push;
                    ok = false;
                }
            }
            if (ok) break;
        }
    }

    // ===== GAME OVER =====
    function showGameOver() {
        const overlay = document.getElementById('overlay');
        const title = document.getElementById('overlay-title');
        const msg = document.getElementById('overlay-message');
        const btn = document.getElementById('overlay-btn');

        let maxScore = Math.max(...scores);
        let winners = scores.reduce((acc, s, i) => s === maxScore ? [...acc, i] : acc, []);

        if (winners.length === 1) {
            title.textContent = `Player ${winners[0] + 1} Wins!`;
        } else {
            title.textContent = 'Draw!';
        }
        msg.textContent = scores.map((s, i) => `P${i + 1}: ${s}`).join('  ');
        btn.textContent = 'Play Again';
        overlay.classList.remove('hidden');
    }

    // ===== UI =====
    function buildScoreboard() {
        const sb = document.getElementById('scoreboard');
        sb.innerHTML = '';
        for (let i = 0; i < numPlayers; i++) {
            if (i > 0) {
                const div = document.createElement('div');
                div.className = 'score-divider';
                sb.appendChild(div);
            }
            const wrap = document.createElement('div');
            wrap.className = 'player-score' + (i === currentPlayer ? ' active' : '');
            wrap.id = `ps-${i}`;

            const label = document.createElement('span');
            label.className = 'player-label';
            label.textContent = `P${i + 1}`;
            if (numPlayers === 2) {
                label.textContent += i === 0 ? ' (W)' : ' (B)';
            }

            const pieces = document.createElement('div');
            pieces.className = 'score-pieces';
            pieces.id = `pp-${i}`;

            const val = document.createElement('span');
            val.className = 'score-value';
            val.id = `pv-${i}`;
            val.textContent = '0';

            wrap.appendChild(label);
            wrap.appendChild(pieces);
            wrap.appendChild(val);
            sb.appendChild(wrap);
        }
    }

    function updateUI() {
        for (let i = 0; i < numPlayers; i++) {
            const el = document.getElementById(`ps-${i}`);
            const val = document.getElementById(`pv-${i}`);
            if (el) el.classList.toggle('active', i === currentPlayer);
            if (val) val.textContent = scores[i];
        }

        // Piece indicators
        if (numPlayers === 2) {
            updatePieceIndicator(0, 'white');
            updatePieceIndicator(1, 'black');
        } else {
            // Show all pieces combined for each player
            for (let i = 0; i < numPlayers; i++) {
                const container = document.getElementById(`pp-${i}`);
                if (container) container.innerHTML = '';
            }
        }

        document.getElementById('btn-players').textContent = `${numPlayers} Players`;
        const varBtn = document.getElementById('btn-variant');
        varBtn.textContent = flowMode ? 'Flow' : 'Normal';
        varBtn.classList.toggle('flow', flowMode);
    }

    function updatePieceIndicator(pIdx, color) {
        const container = document.getElementById(`pp-${pIdx}`);
        if (!container) return;
        const total = color === 'white' ? WHITE_COUNT : BLACK_COUNT;
        const pocketed = coins.filter(c => c.type === color && c.pocketed).length;
        container.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('span');
            dot.className = `score-piece ${color}${i < pocketed ? ' pocketed' : ''}`;
            container.appendChild(dot);
        }
    }

    function cyclePlayers() {
        numPlayers = numPlayers >= 4 ? 2 : numPlayers + 1;
        newGame();
    }

    function toggleVariant() {
        flowMode = !flowMode;
        updateUI();
    }

    // ===== DRAWING =====
    function cSize() {
        return boardSize / 0.92;
    }

    function draw() {
        const s = cSize();
        ctx.clearRect(0, 0, s, s);
        drawBoard();
        drawPockets();
        drawPullLine();
        drawCoins();
        drawStriker();
    }

    function drawPullLine() {
        if (phase !== 'aim' || !aimStart || !aimCurrent) return;
        const dx = striker.x - aimCurrent.x;
        const dy = striker.y - aimCurrent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) return;

        // Subtle line from striker to finger
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(aimCurrent.x, aimCurrent.y);
        ctx.stroke();

        // Small dot at finger
        ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(aimCurrent.x, aimCurrent.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBoard() {
        const s = cSize();
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(0, 0, s, s);

        ctx.fillStyle = COLORS.boardBorder;
        roundRect(boardX - 4, boardY - 4, boardSize + 8, boardSize + 8, 8, true);

        ctx.fillStyle = COLORS.board;
        roundRect(boardX, boardY, boardSize, boardSize, 4, true);

        const inner = cellUnit * 2;
        ctx.strokeStyle = COLORS.innerBorder;
        ctx.lineWidth = 2;
        roundRect(boardX + inner, boardY + inner, boardSize - inner * 2, boardSize - inner * 2, 2, false, true);

        // Center circles
        const cx = boardX + boardSize / 2;
        const cy = boardY + boardSize / 2;
        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, cellUnit * 2.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, cellUnit * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.lines;
        ctx.fill();

        // Baselines on all four sides
        const baseR = cellUnit * 0.4;
        const lineOffset = boardSize * 0.22;
        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1.5;

        // Bottom
        const by1 = boardY + boardSize - lineOffset;
        ctx.beginPath();
        ctx.moveTo(boardX + inner + cellUnit, by1);
        ctx.lineTo(boardX + boardSize - inner - cellUnit, by1);
        ctx.stroke();
        drawBaseCircles(boardX + inner + cellUnit, by1, boardX + boardSize - inner - cellUnit, by1, baseR);

        // Top
        const by2 = boardY + lineOffset;
        ctx.beginPath();
        ctx.moveTo(boardX + inner + cellUnit, by2);
        ctx.lineTo(boardX + boardSize - inner - cellUnit, by2);
        ctx.stroke();
        drawBaseCircles(boardX + inner + cellUnit, by2, boardX + boardSize - inner - cellUnit, by2, baseR);

        // Left
        const lx = boardX + lineOffset;
        ctx.beginPath();
        ctx.moveTo(lx, boardY + inner + cellUnit);
        ctx.lineTo(lx, boardY + boardSize - inner - cellUnit);
        ctx.stroke();
        drawBaseCircles(lx, boardY + inner + cellUnit, lx, boardY + boardSize - inner - cellUnit, baseR);

        // Right
        const rx = boardX + boardSize - lineOffset;
        ctx.beginPath();
        ctx.moveTo(rx, boardY + inner + cellUnit);
        ctx.lineTo(rx, boardY + boardSize - inner - cellUnit);
        ctx.stroke();
        drawBaseCircles(rx, boardY + inner + cellUnit, rx, boardY + boardSize - inner - cellUnit, baseR);

        // Corner arrows
        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1;
        const arrowLen = cellUnit * 3;
        const corners = [
            [boardX + inner, boardY + inner, 1, 1],
            [boardX + boardSize - inner, boardY + inner, -1, 1],
            [boardX + inner, boardY + boardSize - inner, 1, -1],
            [boardX + boardSize - inner, boardY + boardSize - inner, -1, -1],
        ];
        const norm = Math.SQRT2;
        for (const [cx2, cy2, dx, dy] of corners) {
            ctx.beginPath();
            ctx.moveTo(cx2 + dx * cellUnit * 1.5 / norm, cy2 + dy * cellUnit * 1.5 / norm);
            ctx.lineTo(cx2 + dx * arrowLen / norm, cy2 + dy * arrowLen / norm);
            ctx.stroke();
        }
    }

    function drawBaseCircles(x1, y1, x2, y2, r) {
        ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2, y2, r, 0, Math.PI * 2); ctx.stroke();
    }

    function roundRect(x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function drawPockets() {
        for (const p of pockets) {
            ctx.fillStyle = COLORS.pocketRim;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COLORS.pocket;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCoins() {
        for (const coin of coins) {
            if (!coin.pocketed) drawPiece(coin);
        }
    }

    function drawPiece(piece) {
        const { x, y, r, type } = piece;

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2);
        ctx.fill();

        let color, border;
        if (type === 'white') { color = COLORS.white; border = COLORS.whiteBorder; }
        else if (type === 'black') { color = COLORS.black; border = COLORS.blackBorder; }
        else if (type === 'queen') { color = COLORS.queen; border = COLORS.queenBorder; }
        else { color = COLORS.striker; border = COLORS.strikerBorder; }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (type !== 'striker') {
            ctx.strokeStyle = border;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeStyle = COLORS.strikerBorder;
            ctx.lineWidth = 1;
            const cr = r * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - cr, y); ctx.lineTo(x + cr, y);
            ctx.moveTo(x, y - cr); ctx.lineTo(x, y + cr);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawStriker() {
        if (!striker || striker.pocketed) return;
        drawPiece(striker);

        // Show placement zone during place/aim (not during flow aim)
        if (phase === 'place' && strikerPlaceZone) {
            const z = strikerPlaceZone;
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            if (z.axis === 'h') {
                ctx.moveTo(z.min, z.fixed);
                ctx.lineTo(z.max, z.fixed);
            } else {
                ctx.moveTo(z.fixed, z.min);
                ctx.lineTo(z.fixed, z.max);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(striker.x, striker.y, striker.r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // In aim phase (including flow), just show glow
        if (phase === 'aim' && !aimStart) {
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(striker.x, striker.y, striker.r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ===== START =====
    init();
    newGame();
})();
