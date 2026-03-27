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
        aimLine: 'rgba(255, 200, 50, 0.5)',
        aimDot: 'rgba(255, 200, 50, 0.8)',
        powerLow: '#44cc44',
        powerMid: '#cccc44',
        powerHigh: '#cc4444',
    };

    // ===== GAME STATE =====
    let canvas, ctx;
    let boardSize, boardX, boardY, cellUnit;
    let coins = [];
    let striker = null;
    let pockets = [];
    let currentPlayer = 1; // 1 or 2
    let scores = [0, 0];
    let playerPocketed = [[], []]; // track what each player pocketed this turn
    let queenCovered = [false, false];
    let queenPocketedBy = -1;
    let gameOver = false;
    let twoPlayerMode = true;
    let aiThinking = false;

    // Interaction state
    let phase = 'place'; // 'place', 'aim', 'moving', 'gameover'
    let strikerBaseY = 0;
    let strikerPlaceZone = { minX: 0, maxX: 0, y: 0 };
    let aimStart = null;
    let aimCurrent = null;
    let isDragging = false;

    // Animation
    let animFrame = null;

    // ===== INITIALIZATION =====
    function init() {
        canvas = document.getElementById('carromCanvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

        // Touch/mouse events
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        // Prevent context menu
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Buttons
        document.getElementById('btn-new-game').addEventListener('click', newGame);
        document.getElementById('btn-mode').addEventListener('click', toggleMode);
        document.getElementById('overlay-btn').addEventListener('click', () => {
            document.getElementById('overlay').classList.add('hidden');
            newGame();
        });

        // Prevent iOS bouncing on the whole page
        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        // Also handle orientation change on iOS
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 100);
        });
    }

    function resize() {
        // Use window dimensions directly - more reliable on iOS Safari
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Reserve space for scoreboard (~60px) and controls (~50px) and gaps
        const reservedH = 130;
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
        recalcStrikerZone();

        if (coins.length > 0) {
            draw();
        }
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

    function recalcStrikerZone() {
        const lineOffset = boardSize * 0.22;
        if (currentPlayer === 1) {
            strikerBaseY = boardY + boardSize - lineOffset;
        } else {
            strikerBaseY = boardY + lineOffset;
        }
        const margin = boardSize * 0.22;
        strikerPlaceZone = {
            minX: boardX + margin,
            maxX: boardX + boardSize - margin,
            y: strikerBaseY,
        };
    }

    // ===== NEW GAME =====
    function newGame() {
        coins = [];
        scores = [0, 0];
        playerPocketed = [[], []];
        queenCovered = [false, false];
        queenPocketedBy = -1;
        currentPlayer = 1;
        gameOver = false;
        phase = 'place';

        recalcStrikerZone();
        createCoins();
        placeStriker();
        updateUI();
        draw();
    }

    function createCoins() {
        const cx = boardX + boardSize / 2;
        const cy = boardY + boardSize / 2;
        const coinR = cellUnit * 0.72;
        const gap = coinR * 2.3;

        // Queen at center
        coins.push(makeCoin(cx, cy, coinR, 'queen'));

        // Inner ring: 6 coins alternating
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = cx + Math.cos(angle) * gap;
            const y = cy + Math.sin(angle) * gap;
            coins.push(makeCoin(x, y, coinR, i % 2 === 0 ? 'white' : 'black'));
        }

        // Outer ring offset: 12 coins
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
            x: strikerPlaceZone.minX + (strikerPlaceZone.maxX - strikerPlaceZone.minX) / 2,
            y: strikerPlaceZone.y,
            r: sr,
            vx: 0,
            vy: 0,
            type: 'striker',
            pocketed: false,
            mass: STRIKER_MASS,
        };
    }

    // ===== INPUT HANDLING =====
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    function distTo(pos, obj) {
        return Math.sqrt((pos.x - obj.x) ** 2 + (pos.y - obj.y) ** 2);
    }

    function onPointerDown(e) {
        if (gameOver || aiThinking || phase === 'moving') return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const pos = getCanvasPos(e);

        if (phase === 'place') {
            // Tap anywhere on the board to start moving striker
            isDragging = true;
            // Snap striker to finger x position
            striker.x = Math.max(
                strikerPlaceZone.minX,
                Math.min(strikerPlaceZone.maxX, pos.x)
            );
            draw();
        } else if (phase === 'aim') {
            // Start slingshot: pull back from striker
            aimStart = { x: pos.x, y: pos.y };
            aimCurrent = { x: pos.x, y: pos.y };
            isDragging = true;
        }
    }

    function onPointerMove(e) {
        if (!isDragging || gameOver || aiThinking || phase === 'moving') return;
        e.preventDefault();
        const pos = getCanvasPos(e);

        if (phase === 'place') {
            striker.x = Math.max(
                strikerPlaceZone.minX,
                Math.min(strikerPlaceZone.maxX, pos.x)
            );
            striker.y = strikerPlaceZone.y;
            draw();
        } else if (phase === 'aim' && aimStart) {
            aimCurrent = { x: pos.x, y: pos.y };
            draw();
        }
    }

    function onPointerUp(e) {
        if (!isDragging || gameOver || aiThinking) return;
        e.preventDefault();

        if (phase === 'place') {
            // Transition to aim phase
            phase = 'aim';
            isDragging = false;
            draw();
            return;
        }

        if (phase === 'aim' && aimStart && aimCurrent) {
            // Pull-back is from striker: direction is opposite of drag
            const dx = striker.x - aimCurrent.x;
            const dy = striker.y - aimCurrent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                const power = Math.min(dist / 8, MAX_POWER);
                const angle = Math.atan2(dy, dx);
                striker.vx = Math.cos(angle) * power;
                striker.vy = Math.sin(angle) * power;
                phase = 'moving';
                playerPocketed = [[], []];
                startSimulation();
            } else {
                // Tap without drag: go back to place phase
                phase = 'place';
            }

            aimStart = null;
            aimCurrent = null;
        }

        isDragging = false;
        draw();
    }

    // ===== PHYSICS SIMULATION =====
    function startSimulation() {
        if (animFrame) cancelAnimationFrame(animFrame);
        simulate();
    }

    function simulate() {
        let moving = false;

        // Update all pieces
        const allPieces = [...coins.filter(c => !c.pocketed), striker && !striker.pocketed ? striker : null].filter(Boolean);

        for (const piece of allPieces) {
            piece.x += piece.vx;
            piece.y += piece.vy;
            piece.vx *= FRICTION;
            piece.vy *= FRICTION;

            if (Math.abs(piece.vx) < MIN_SPEED && Math.abs(piece.vy) < MIN_SPEED) {
                piece.vx = 0;
                piece.vy = 0;
            } else {
                moving = true;
            }

            // Wall collisions
            wallCollision(piece);
        }

        // Piece-to-piece collisions
        for (let i = 0; i < allPieces.length; i++) {
            for (let j = i + 1; j < allPieces.length; j++) {
                pieceCollision(allPieces[i], allPieces[j]);
            }
        }

        // Check pockets
        checkPockets();

        draw();

        if (moving) {
            animFrame = requestAnimationFrame(simulate);
        } else {
            endTurn();
        }
    }

    function wallCollision(piece) {
        const minX = boardX + cellUnit * 1.0 + piece.r;
        const maxX = boardX + boardSize - cellUnit * 1.0 - piece.r;
        const minY = boardY + cellUnit * 1.0 + piece.r;
        const maxY = boardY + boardSize - cellUnit * 1.0 - piece.r;

        if (piece.x < minX) {
            piece.x = minX;
            piece.vx = -piece.vx * WALL_BOUNCE;
        }
        if (piece.x > maxX) {
            piece.x = maxX;
            piece.vx = -piece.vx * WALL_BOUNCE;
        }
        if (piece.y < minY) {
            piece.y = minY;
            piece.vy = -piece.vy * WALL_BOUNCE;
        }
        if (piece.y > maxY) {
            piece.y = maxY;
            piece.vy = -piece.vy * WALL_BOUNCE;
        }
    }

    function pieceCollision(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.r + b.r;

        if (dist < minDist && dist > 0) {
            // Separate overlapping pieces
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            const totalMass = a.mass + b.mass;

            a.x -= nx * overlap * (b.mass / totalMass);
            a.y -= ny * overlap * (b.mass / totalMass);
            b.x += nx * overlap * (a.mass / totalMass);
            b.y += ny * overlap * (a.mass / totalMass);

            // Elastic collision
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
        const allPieces = [...coins, striker];
        for (const piece of allPieces) {
            if (piece.pocketed) continue;
            for (const pocket of pockets) {
                const dx = piece.x - pocket.x;
                const dy = piece.y - pocket.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < pocket.r) {
                    piece.pocketed = true;
                    piece.vx = 0;
                    piece.vy = 0;

                    if (piece.type !== 'striker') {
                        playerPocketed[currentPlayer - 1].push(piece.type);
                    }
                    break;
                }
            }
        }
    }

    // ===== TURN LOGIC =====
    function endTurn() {
        phase = 'place';

        const myPocketed = playerPocketed[currentPlayer - 1];
        const strikerPocketed = striker.pocketed;
        const myColor = currentPlayer === 1 ? 'white' : 'black';
        const oppColor = currentPlayer === 1 ? 'black' : 'white';

        let pocketedOwn = myPocketed.filter(t => t === myColor).length;
        let pocketedOpp = myPocketed.filter(t => t === oppColor).length;
        let pocketedQueen = myPocketed.includes('queen');

        // Score own pieces
        scores[currentPlayer - 1] += pocketedOwn;

        // Opponent pieces go to opponent's score
        scores[2 - currentPlayer] += pocketedOpp;

        // Queen handling
        if (pocketedQueen) {
            queenPocketedBy = currentPlayer - 1;
        }

        // Cover queen: if queen was pocketed previously and player pockets own piece
        if (queenPocketedBy === currentPlayer - 1 && pocketedOwn > 0 && !pocketedQueen) {
            scores[currentPlayer - 1] += 3; // Queen bonus
            queenCovered[currentPlayer - 1] = true;
            queenPocketedBy = -1;
        }

        // If queen pocketed but not covered next turn, it comes back
        // (simplified: we just track it)

        // Striker pocketed: penalty - lose a point and return one piece
        if (strikerPocketed) {
            scores[currentPlayer - 1] = Math.max(0, scores[currentPlayer - 1] - 1);
            returnRandomPiece(currentPlayer - 1);
        }

        // Check game over
        const whiteLeft = coins.filter(c => c.type === 'white' && !c.pocketed).length;
        const blackLeft = coins.filter(c => c.type === 'black' && !c.pocketed).length;

        if (whiteLeft === 0 || blackLeft === 0) {
            gameOver = true;
            phase = 'gameover';
            showGameOver();
            return;
        }

        // Queen not covered - return it after one turn
        if (queenPocketedBy >= 0 && pocketedOwn === 0 && !pocketedQueen) {
            // Return queen to center
            const queenCoin = coins.find(c => c.type === 'queen' && c.pocketed);
            if (queenCoin) {
                queenCoin.pocketed = false;
                queenCoin.x = boardX + boardSize / 2;
                queenCoin.y = boardY + boardSize / 2;
                queenCoin.vx = 0;
                queenCoin.vy = 0;
            }
            queenPocketedBy = -1;
        }

        // Switch player if nothing pocketed or striker was pocketed
        if (pocketedOwn === 0 || strikerPocketed) {
            currentPlayer = currentPlayer === 1 ? 2 : 1;
        }

        recalcStrikerZone();
        placeStriker();
        // Push striker away from any coins
        resolveStrikerOverlaps();
        updateUI();
        draw();

        // AI turn
        if (!twoPlayerMode && currentPlayer === 2) {
            aiTurn();
        }
    }

    function returnRandomPiece(playerIdx) {
        const myColor = playerIdx === 0 ? 'white' : 'black';
        const pocketed = coins.filter(c => c.type === myColor && c.pocketed);
        if (pocketed.length > 0) {
            const piece = pocketed[0];
            piece.pocketed = false;
            piece.x = boardX + boardSize / 2;
            piece.y = boardY + boardSize / 2;
            piece.vx = 0;
            piece.vy = 0;
        }
    }

    function resolveStrikerOverlaps() {
        for (let iter = 0; iter < 10; iter++) {
            let resolved = true;
            for (const coin of coins) {
                if (coin.pocketed) continue;
                const dx = striker.x - coin.x;
                const dy = striker.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = striker.r + coin.r + 1;
                if (dist < minDist && dist > 0) {
                    const push = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    striker.x += nx * push;
                    coin.x -= nx * push;
                    resolved = false;
                }
            }
            if (resolved) break;
        }
    }

    // ===== AI =====
    function aiTurn() {
        aiThinking = true;
        setTimeout(() => {
            // Find best target (closest black piece to a pocket)
            const targetColor = 'black';
            let bestAngle = Math.random() * Math.PI * 2;
            let bestPower = 8 + Math.random() * 8;

            const targets = coins.filter(c => c.type === targetColor && !c.pocketed);
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];

                // Find closest pocket to target
                let closestPocket = pockets[0];
                let closestDist = Infinity;
                for (const p of pockets) {
                    const d = Math.sqrt((target.x - p.x) ** 2 + (target.y - p.y) ** 2);
                    if (d < closestDist) {
                        closestDist = d;
                        closestPocket = p;
                    }
                }

                // Aim striker at target from opposite side of pocket
                const pToT_x = target.x - closestPocket.x;
                const pToT_y = target.y - closestPocket.y;
                const pToT_d = Math.sqrt(pToT_x * pToT_x + pToT_y * pToT_y);
                const aimX = target.x + (pToT_x / pToT_d) * target.r * 2;
                const aimY = target.y + (pToT_y / pToT_d) * target.r * 2;

                bestAngle = Math.atan2(aimY - striker.y, aimX - striker.x);
                bestPower = 10 + Math.random() * 6;

                // Add some inaccuracy
                bestAngle += (Math.random() - 0.5) * 0.15;
            }

            // Randomly position striker
            striker.x = strikerPlaceZone.minX + Math.random() * (strikerPlaceZone.maxX - strikerPlaceZone.minX);
            striker.y = strikerPlaceZone.y;
            resolveStrikerOverlaps();

            striker.vx = Math.cos(bestAngle) * bestPower;
            striker.vy = Math.sin(bestAngle) * bestPower;
            phase = 'moving';
            playerPocketed = [[], []];
            aiThinking = false;
            startSimulation();
        }, 600);
    }

    // ===== GAME OVER =====
    function showGameOver() {
        const overlay = document.getElementById('overlay');
        const title = document.getElementById('overlay-title');
        const msg = document.getElementById('overlay-message');
        const btn = document.getElementById('overlay-btn');

        let winner;
        if (scores[0] > scores[1]) winner = 'Player 1';
        else if (scores[1] > scores[0]) winner = 'Player 2';
        else winner = null;

        title.textContent = winner ? `${winner} Wins!` : 'Draw!';
        msg.textContent = `Score: ${scores[0]} - ${scores[1]}`;
        btn.textContent = 'Play Again';
        overlay.classList.remove('hidden');
    }

    // ===== UI =====
    function updateUI() {
        document.getElementById('p1-value').textContent = scores[0];
        document.getElementById('p2-value').textContent = scores[1];
        document.getElementById('turn-text').textContent = `Player ${currentPlayer}`;

        const p1el = document.getElementById('player1-score');
        const p2el = document.getElementById('player2-score');
        p1el.classList.toggle('active', currentPlayer === 1);
        p2el.classList.toggle('active', currentPlayer === 2);

        // Score pieces indicators
        updateScorePieces('p1-pieces', 'white');
        updateScorePieces('p2-pieces', 'black');

        // Mode button
        document.getElementById('btn-mode').textContent = twoPlayerMode ? '2 Players' : '1 Player';
    }

    function updateScorePieces(containerId, color) {
        const container = document.getElementById(containerId);
        const total = color === 'white' ? WHITE_COUNT : BLACK_COUNT;
        const pocketed = coins.filter(c => c.type === color && c.pocketed).length;
        container.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('span');
            dot.className = `score-piece ${color}${i < pocketed ? ' pocketed' : ''}`;
            container.appendChild(dot);
        }
    }

    function toggleMode() {
        twoPlayerMode = !twoPlayerMode;
        updateUI();
        newGame();
    }

    // ===== DRAWING =====
    function canvasSize() {
        return boardSize / 0.92; // inverse of boardSize = size * 0.92
    }

    function draw() {
        const size = canvasSize();
        ctx.clearRect(0, 0, size, size);

        drawBoard();
        drawPockets();
        drawCoins();
        drawStriker();
        drawAimGuide();
    }

    function drawBoard() {
        const size = canvasSize();
        // Outer background
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(0, 0, size, size);

        // Board border
        ctx.fillStyle = COLORS.boardBorder;
        roundRect(boardX - 4, boardY - 4, boardSize + 8, boardSize + 8, 8, true);

        // Board surface
        ctx.fillStyle = COLORS.board;
        roundRect(boardX, boardY, boardSize, boardSize, 4, true);

        // Inner border lines
        const inner = cellUnit * 2;
        ctx.strokeStyle = COLORS.innerBorder;
        ctx.lineWidth = 2;
        roundRect(boardX + inner, boardY + inner, boardSize - inner * 2, boardSize - inner * 2, 2, false, true);

        // Center circle
        const cx = boardX + boardSize / 2;
        const cy = boardY + boardSize / 2;

        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, cellUnit * 2.5, 0, Math.PI * 2);
        ctx.stroke();

        // Small center circle
        ctx.beginPath();
        ctx.arc(cx, cy, cellUnit * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.lines;
        ctx.fill();

        // Baseline circles at ends
        const baseR = cellUnit * 0.4;
        const lineOffset = boardSize * 0.22;

        // Striker lines (baselines)
        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1.5;

        // Bottom baseline (Player 1)
        const by1 = boardY + boardSize - lineOffset;
        ctx.beginPath();
        ctx.moveTo(boardX + inner + cellUnit, by1);
        ctx.lineTo(boardX + boardSize - inner - cellUnit, by1);
        ctx.stroke();

        // Baseline circles
        ctx.beginPath();
        ctx.arc(boardX + inner + cellUnit, by1, baseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(boardX + boardSize - inner - cellUnit, by1, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Top baseline (Player 2)
        const by2 = boardY + lineOffset;
        ctx.beginPath();
        ctx.moveTo(boardX + inner + cellUnit, by2);
        ctx.lineTo(boardX + boardSize - inner - cellUnit, by2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(boardX + inner + cellUnit, by2, baseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(boardX + boardSize - inner - cellUnit, by2, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Left baseline
        const lx1 = boardX + lineOffset;
        ctx.beginPath();
        ctx.moveTo(lx1, boardY + inner + cellUnit);
        ctx.lineTo(lx1, boardY + boardSize - inner - cellUnit);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lx1, boardY + inner + cellUnit, baseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lx1, boardY + boardSize - inner - cellUnit, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Right baseline
        const rx1 = boardX + boardSize - lineOffset;
        ctx.beginPath();
        ctx.moveTo(rx1, boardY + inner + cellUnit);
        ctx.lineTo(rx1, boardY + boardSize - inner - cellUnit);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rx1, boardY + inner + cellUnit, baseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx1, boardY + boardSize - inner - cellUnit, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // Diagonal lines to pockets (arrows)
        ctx.strokeStyle = COLORS.lines;
        ctx.lineWidth = 1;
        const arrowLen = cellUnit * 3;
        const corners = [
            [boardX + inner, boardY + inner, 1, 1],
            [boardX + boardSize - inner, boardY + inner, -1, 1],
            [boardX + inner, boardY + boardSize - inner, 1, -1],
            [boardX + boardSize - inner, boardY + boardSize - inner, -1, -1],
        ];
        for (const [cx2, cy2, dx, dy] of corners) {
            const norm = Math.sqrt(2);
            ctx.beginPath();
            ctx.moveTo(cx2 + dx * cellUnit * 1.5 / norm, cy2 + dy * cellUnit * 1.5 / norm);
            ctx.lineTo(cx2 + dx * arrowLen / norm, cy2 + dy * arrowLen / norm);
            ctx.stroke();
        }
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
            // Pocket shadow
            ctx.fillStyle = COLORS.pocketRim;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
            ctx.fill();

            // Pocket hole
            ctx.fillStyle = COLORS.pocket;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCoins() {
        for (const coin of coins) {
            if (coin.pocketed) continue;
            drawPiece(coin);
        }
    }

    function drawPiece(piece) {
        const { x, y, r, type } = piece;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        let color, borderColor;
        if (type === 'white') { color = COLORS.white; borderColor = COLORS.whiteBorder; }
        else if (type === 'black') { color = COLORS.black; borderColor = COLORS.blackBorder; }
        else if (type === 'queen') { color = COLORS.queen; borderColor = COLORS.queenBorder; }
        else { color = COLORS.striker; borderColor = COLORS.strikerBorder; }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner ring detail
        if (type !== 'striker') {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Striker cross mark
        if (type === 'striker') {
            ctx.strokeStyle = COLORS.strikerBorder;
            ctx.lineWidth = 1;
            const cr = r * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - cr, y);
            ctx.lineTo(x + cr, y);
            ctx.moveTo(x, y - cr);
            ctx.lineTo(x, y + cr);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawStriker() {
        if (!striker || striker.pocketed) return;
        drawPiece(striker);

        // During placement, show zone highlight
        if (phase === 'place' || (phase === 'aim' && !aimStart)) {
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(strikerPlaceZone.minX, strikerPlaceZone.y);
            ctx.lineTo(strikerPlaceZone.maxX, strikerPlaceZone.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Glow around striker
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(striker.x, striker.y, striker.r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawAimGuide() {
        if (phase !== 'aim' || !aimStart || !aimCurrent) return;

        // Pull-back vector: from aimCurrent to striker (shoot direction)
        const dx = striker.x - aimCurrent.x;
        const dy = striker.y - aimCurrent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) return;

        const power = Math.min(dist / 8, MAX_POWER);
        const angle = Math.atan2(dy, dx);
        const powerPct = power / MAX_POWER;

        // Power color
        let powerColor;
        if (powerPct < 0.4) powerColor = COLORS.powerLow;
        else if (powerPct < 0.7) powerColor = COLORS.powerMid;
        else powerColor = COLORS.powerHigh;

        // Aim line (direction striker will go - forward from striker)
        const lineLen = cellUnit * 3 + power * cellUnit * 0.8;
        const endX = striker.x + Math.cos(angle) * lineLen;
        const endY = striker.y + Math.sin(angle) * lineLen;

        // Dotted aim line
        ctx.strokeStyle = COLORS.aimLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Aim dot at end
        ctx.fillStyle = COLORS.aimDot;
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pull-back line (from striker to finger)
        ctx.strokeStyle = powerColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(aimCurrent.x, aimCurrent.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Power arc around striker
        ctx.strokeStyle = powerColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(striker.x, striker.y, striker.r + 6, angle - Math.PI * powerPct, angle + Math.PI * powerPct);
        ctx.stroke();

        // Pull-back circle at finger position
        ctx.strokeStyle = powerColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(aimCurrent.x, aimCurrent.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // ===== START =====
    init();
    newGame();
})();
