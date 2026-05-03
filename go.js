// ===== GO BOARD GAME =====

(() => {
    'use strict';

    // ===== CONSTANTS =====
    const KOMI = 6.5;
    const AI_DELAY_MS = 500;

    const SCORE_BASE        = 10;
    const SCORE_CAPTURE     = 30;
    const SCORE_SAVE_ATARI  = 25;
    const SCORE_ATARI_ENEMY = 20;
    const SCORE_CONNECT     =  5;
    const SCORE_EYE_FILL    =  1;

    const STAR_POINTS_BY_SIZE = {
        9:  [[2,2],[2,6],[4,4],[6,2],[6,6]],
        13: [[3,3],[3,9],[6,6],[9,3],[9,9]],
        19: [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]],
    };

    // ===== STATE =====
    let canvas, ctx;
    let boardSize = 19;
    let board;           // 2D array: 0=empty, 1=black, 2=white
    let prevBoardState;  // for ko detection (serialized string of board before last move)
    let currentPlayer;   // 1=black, 2=white
    let captures;        // { 1: count, 2: count }
    let consecutivePasses;
    let gameOver;
    let aiEnabled;
    let aiThinking;
    let lastMove;   // { row, col } of last placed stone, null after pass/new game
    let passed;     // { 1: bool, 2: bool } — whether each player has passed since last placement

    // Canvas layout (computed in computeLayout)
    let cellSize, boardOffsetX, boardOffsetY;

    // ===== INIT =====
    function init() {
        canvas = document.getElementById('goCanvas');
        ctx = canvas.getContext('2d');

        document.getElementById('btn-new-game').addEventListener('click', newGame);
        document.getElementById('btn-players').addEventListener('click', togglePlayers);
        document.getElementById('btn-size').addEventListener('click', toggleSize);
        document.getElementById('btn-pass').addEventListener('click', doPass);
        document.getElementById('btn-rules').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.remove('hidden');
        });
        document.getElementById('rules-close').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.add('hidden');
        });
        document.getElementById('btn-history').addEventListener('click', () => {
            document.getElementById('history-panel').classList.remove('hidden');
        });
        document.getElementById('history-close').addEventListener('click', () => {
            document.getElementById('history-panel').classList.add('hidden');
        });
        document.getElementById('overlay-btn').addEventListener('click', () => {
            document.getElementById('overlay').classList.add('hidden');
        });

        canvas.addEventListener('pointerdown', onBoardClick);

        document.addEventListener('touchmove', function(e) {
            if (e.target.closest('#rules-content') || e.target.closest('#history-content')) return;
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('resize', onResize);
        onResize();
    }

    function computeLayout() {
        const size = canvas.width;
        const padding = size * 0.055;
        cellSize = (size - padding * 2) / (boardSize - 1);
        boardOffsetX = padding;
        boardOffsetY = padding;
    }

    function onResize() {
        const container = document.getElementById('game-container');
        const scoreboard = document.getElementById('scoreboard');
        const controls = document.getElementById('controls');
        const availH = container.clientHeight - scoreboard.offsetHeight - controls.offsetHeight - 24;
        const availW = container.clientWidth - 16;
        const size = Math.min(availW, availH, 600);
        canvas.width = size;
        canvas.height = size;
        computeLayout();
        if (board) draw();
    }

    // ===== GAME LOGIC =====
    function newGame() {
        board = Array.from({ length: boardSize }, () => new Array(boardSize).fill(0));
        prevBoardState = null;
        currentPlayer = 1;
        captures = { 1: 0, 2: 0 };
        consecutivePasses = 0;
        gameOver = false;
        aiThinking = false;
        lastMove = null;
        passed = { 1: false, 2: false };

        document.getElementById('overlay').classList.add('hidden');
        updateUI();
        draw();
    }

    function togglePlayers() {
        aiEnabled = !aiEnabled;
        document.getElementById('btn-players').textContent = aiEnabled ? 'vs AI' : '2 Players';
        newGame();
    }

    function toggleSize() {
        const sizes = [9, 13, 19];
        boardSize = sizes[(sizes.indexOf(boardSize) + 1) % sizes.length];
        document.getElementById('btn-size').textContent = `${boardSize}×${boardSize}`;
        computeLayout();
        newGame();
    }

    function doPass() {
        if (gameOver || aiThinking) return;
        passed[currentPlayer] = true;
        lastMove = null;
        consecutivePasses++;
        if (consecutivePasses >= 2) {
            endGame();
            return;
        }
        nextTurn();
    }

    function onBoardClick(e) {
        if (gameOver || aiThinking) return;
        if (aiEnabled && currentPlayer === 2) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;

        const col = Math.round((px - boardOffsetX) / cellSize);
        const row = Math.round((py - boardOffsetY) / cellSize);

        if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) return;
        if (board[row][col] !== 0) return;

        placeStone(row, col, currentPlayer);
    }

    function placeStone(row, col, player) {
        const testBoard = board.map(r => r.slice());
        testBoard[row][col] = player;

        const opponent = player === 1 ? 2 : 1;
        let captured = 0;
        for (const [nr, nc] of neighbors(row, col)) {
            if (testBoard[nr][nc] === opponent) {
                const group = getGroup(testBoard, nr, nc);
                if (liberties(testBoard, group) === 0) {
                    for (const [gr, gc] of group) testBoard[gr][gc] = 0;
                    captured += group.length;
                }
            }
        }

        const ownGroup = getGroup(testBoard, row, col);
        if (liberties(testBoard, ownGroup) === 0) return;

        const newState = serializeBoard(testBoard);
        if (newState === prevBoardState) return;

        prevBoardState = serializeBoard(board);
        board = testBoard;
        captures[player] += captured;
        consecutivePasses = 0;
        lastMove = { row, col };
        passed[player] = false;

        updateUI();
        draw();
        nextTurn();
    }

    function nextTurn() {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateUI();
        if (aiEnabled && currentPlayer === 2 && !gameOver) {
            aiThinking = true;
            setTimeout(aiMove, AI_DELAY_MS);
        }
    }

    function aiMove() {
        aiThinking = false;
        if (gameOver) return;

        const scored = [];
        let totalWeight = 0;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === 0 && isLegalMove(r, c, 2)) {
                    const w = scoreMove(r, c, 2);
                    scored.push([r, c, w]);
                    totalWeight += w;
                }
            }
        }

        if (scored.length === 0) {
            doPass();
            return;
        }

        let pick = Math.random() * totalWeight;
        for (const [r, c, w] of scored) {
            pick -= w;
            if (pick <= 0) {
                placeStone(r, c, 2);
                return;
            }
        }
        const [r, c] = scored[scored.length - 1];
        placeStone(r, c, 2);
    }

    function isOwnEye(row, col, player) {
        const ns = neighbors(row, col);
        if (!ns.every(([nr, nc]) => board[nr][nc] === player)) return false;
        const diags = [];
        if (row > 0 && col > 0)                         diags.push(board[row-1][col-1]);
        if (row > 0 && col < boardSize - 1)             diags.push(board[row-1][col+1]);
        if (row < boardSize - 1 && col > 0)             diags.push(board[row+1][col-1]);
        if (row < boardSize - 1 && col < boardSize - 1) diags.push(board[row+1][col+1]);
        const badDiags = diags.filter(v => v !== player).length;
        return ns.length === 4 ? badDiags <= 1 : badDiags === 0;
    }

    function scoreMove(row, col, player) {
        const testBoard = board.map(r => r.slice());
        testBoard[row][col] = player;
        const opponent = player === 1 ? 2 : 1;

        let capturedCount = 0;
        for (const [nr, nc] of neighbors(row, col)) {
            if (testBoard[nr][nc] === opponent) {
                const group = getGroup(testBoard, nr, nc);
                if (liberties(testBoard, group) === 0) {
                    for (const [gr, gc] of group) testBoard[gr][gc] = 0;
                    capturedCount += group.length;
                }
            }
        }

        let score = SCORE_BASE + capturedCount * SCORE_CAPTURE;

        // Save a friendly group that was in atari
        const newGroupLibs = liberties(testBoard, getGroup(testBoard, row, col));
        for (const [nr, nc] of neighbors(row, col)) {
            if (board[nr][nc] === player && liberties(board, getGroup(board, nr, nc)) === 1) {
                if (newGroupLibs > 1) { score += SCORE_SAVE_ATARI; break; }
            }
        }

        // Put enemy groups into atari (deduplicated by group representative)
        const seenEnemyGroups = new Set();
        for (const [nr, nc] of neighbors(row, col)) {
            if (testBoard[nr][nc] === opponent) {
                const group = getGroup(testBoard, nr, nc);
                const rep = Math.min(...group.map(([r, c]) => r * boardSize + c));
                if (!seenEnemyGroups.has(rep)) {
                    seenEnemyGroups.add(rep);
                    if (liberties(testBoard, group) === 1) score += SCORE_ATARI_ENEMY;
                }
            }
        }

        // Connectivity: adjacent to own stone
        for (const [nr, nc] of neighbors(row, col)) {
            if (board[nr][nc] === player) { score += SCORE_CONNECT; break; }
        }

        // Eye-fill penalty (only when no captures make it worthwhile)
        if (capturedCount === 0 && isOwnEye(row, col, player)) score = SCORE_EYE_FILL;

        return score;
    }

    function isLegalMove(row, col, player) {
        const testBoard = board.map(r => r.slice());
        testBoard[row][col] = player;
        const opponent = player === 1 ? 2 : 1;
        for (const [nr, nc] of neighbors(row, col)) {
            if (testBoard[nr][nc] === opponent) {
                const group = getGroup(testBoard, nr, nc);
                if (liberties(testBoard, group) === 0) {
                    for (const [gr, gc] of group) testBoard[gr][gc] = 0;
                }
            }
        }
        const ownGroup = getGroup(testBoard, row, col);
        if (liberties(testBoard, ownGroup) === 0) return false;
        if (serializeBoard(testBoard) === prevBoardState) return false;
        return true;
    }

    // ===== BOARD HELPERS =====
    function neighbors(row, col) {
        const result = [];
        if (row > 0) result.push([row - 1, col]);
        if (row < boardSize - 1) result.push([row + 1, col]);
        if (col > 0) result.push([row, col - 1]);
        if (col < boardSize - 1) result.push([row, col + 1]);
        return result;
    }

    function getGroup(b, row, col) {
        const color = b[row][col];
        const visited = new Set();
        const stack = [[row, col]];
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            const key = r * boardSize + c;
            if (visited.has(key)) continue;
            visited.add(key);
            for (const [nr, nc] of neighbors(r, c)) {
                if (b[nr][nc] === color && !visited.has(nr * boardSize + nc)) {
                    stack.push([nr, nc]);
                }
            }
        }
        return [...visited].map(k => [Math.floor(k / boardSize), k % boardSize]);
    }

    function liberties(b, group) {
        const seen = new Set();
        let count = 0;
        for (const [r, c] of group) {
            for (const [nr, nc] of neighbors(r, c)) {
                const key = nr * boardSize + nc;
                if (b[nr][nc] === 0 && !seen.has(key)) {
                    seen.add(key);
                    count++;
                }
            }
        }
        return count;
    }

    function serializeBoard(b) {
        return b.map(row => row.join('')).join('|');
    }

    // ===== SCORING =====
    function scoreBoard() {
        const territory = { 1: 0, 2: 0, neutral: 0 };
        const visited = new Set();

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] !== 0 || visited.has(r * boardSize + c)) continue;

                const region = [];
                const borders = new Set();
                const stack = [[r, c]];
                while (stack.length > 0) {
                    const [cr, cc] = stack.pop();
                    const key = cr * boardSize + cc;
                    if (visited.has(key)) continue;
                    visited.add(key);
                    region.push([cr, cc]);
                    for (const [nr, nc] of neighbors(cr, cc)) {
                        if (board[nr][nc] === 0) {
                            stack.push([nr, nc]);
                        } else {
                            borders.add(board[nr][nc]);
                        }
                    }
                }

                if (borders.size === 1) {
                    territory[[...borders][0]] += region.length;
                } else {
                    territory.neutral += region.length;
                }
            }
        }

        const blackScore = territory[1] + captures[1];
        const whiteScore = territory[2] + captures[2] + KOMI;
        return { blackScore, whiteScore };
    }

    function endGame() {
        gameOver = true;
        const { blackScore, whiteScore } = scoreBoard();
        const winner = blackScore > whiteScore ? 'Black' : 'White';
        showOverlay(
            `${winner} Wins!`,
            `Black: ${blackScore.toFixed(1)}  ·  White: ${whiteScore.toFixed(1)}`
        );
        updateUI();
    }

    // ===== UI =====
    function updateUI() {
        updateScoreboard();
        const passBtn = document.getElementById('btn-pass');
        if (passBtn) passBtn.disabled = gameOver;
    }

    function updateScoreboard() {
        const sb = document.getElementById('scoreboard');
        const blackLabel = (currentPlayer === 1 && !gameOver) ? '● Black ▸' : '● Black';
        const whiteLabel = (currentPlayer === 2 && !gameOver) ? '○ White ▸' : '○ White';

        sb.innerHTML = `
            ${passed[1] && !gameOver ? '<div class="pass-badge">Passed</div>' : ''}
            <div class="player-score${currentPlayer === 1 && !gameOver ? ' active' : ''}">
                <div class="player-label">${blackLabel}</div>
                <div class="score-value">${captures[1]}</div>
            </div>
            <div class="score-divider"></div>
            <div class="player-score${currentPlayer === 2 && !gameOver ? ' active' : ''}">
                <div class="player-label">${whiteLabel}</div>
                <div class="score-value">${captures[2]}</div>
            </div>
            ${passed[2] && !gameOver ? '<div class="pass-badge">Passed</div>' : ''}
        `;
    }

    function showOverlay(title, message) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;
        document.getElementById('overlay-btn').textContent = 'New Game';
        document.getElementById('overlay-btn').onclick = newGame;
        document.getElementById('overlay').classList.remove('hidden');
    }

    // ===== DRAWING =====
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawStones();
    }

    function drawBoard() {
        const size = canvas.width;

        ctx.fillStyle = '#c8a45c';
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.fill();

        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, 'rgba(255,200,100,0.12)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.05)');
        grad.addColorStop(1, 'rgba(180,120,40,0.12)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.fill();

        ctx.strokeStyle = 'rgba(80, 50, 10, 0.7)';
        ctx.lineWidth = Math.max(0.5, cellSize * 0.04);
        for (let i = 0; i < boardSize; i++) {
            const x = boardOffsetX + i * cellSize;
            const y = boardOffsetY + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, boardOffsetY);
            ctx.lineTo(x, boardOffsetY + (boardSize - 1) * cellSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(boardOffsetX, y);
            ctx.lineTo(boardOffsetX + (boardSize - 1) * cellSize, y);
            ctx.stroke();
        }

        const starR = Math.max(2, cellSize * 0.12);
        ctx.fillStyle = 'rgba(80, 50, 10, 0.8)';
        for (const [sr, sc] of STAR_POINTS_BY_SIZE[boardSize]) {
            ctx.beginPath();
            ctx.arc(boardOffsetX + sc * cellSize, boardOffsetY + sr * cellSize, starR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawStones() {
        const stoneR = cellSize * 0.46;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === 0) continue;
                const x = boardOffsetX + c * cellSize;
                const y = boardOffsetY + r * cellSize;
                const isBlack = board[r][c] === 1;

                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = stoneR * 0.6;
                ctx.shadowOffsetX = stoneR * 0.15;
                ctx.shadowOffsetY = stoneR * 0.2;

                const stoneGrad = ctx.createRadialGradient(
                    x - stoneR * 0.25, y - stoneR * 0.25, stoneR * 0.05,
                    x, y, stoneR
                );
                if (isBlack) {
                    stoneGrad.addColorStop(0, '#555');
                    stoneGrad.addColorStop(1, '#111');
                } else {
                    stoneGrad.addColorStop(0, '#fff');
                    stoneGrad.addColorStop(1, '#ccc');
                }

                ctx.fillStyle = stoneGrad;
                ctx.beginPath();
                ctx.arc(x, y, stoneR, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                if (lastMove && lastMove.row === r && lastMove.col === c) {
                    ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.5)';
                    ctx.beginPath();
                    ctx.arc(x, y, stoneR * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    // ===== START =====
    init();
    newGame();
})();
