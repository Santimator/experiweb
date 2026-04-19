// ===== GO BOARD GAME =====

(() => {
    'use strict';

    // ===== CONSTANTS =====
    const BOARD_SIZE = 19;
    const KOMI = 6.5;
    const AI_DELAY_MS = 500;

    // Star points for 19x19
    const STAR_POINTS = [
        [3,3],[3,9],[3,15],
        [9,3],[9,9],[9,15],
        [15,3],[15,9],[15,15],
    ];

    // ===== STATE =====
    let canvas, ctx;
    let board;           // 2D array: 0=empty, 1=black, 2=white
    let prevBoardState;  // for ko detection (serialized string of board before last move)
    let currentPlayer;   // 1=black, 2=white
    let captures;        // { 1: count, 2: count }
    let consecutivePasses;
    let gameOver;
    let aiEnabled;
    let aiThinking;

    // Canvas layout (computed in resize)
    let cellSize, boardOffsetX, boardOffsetY;

    // ===== INIT =====
    function init() {
        canvas = document.getElementById('goCanvas');
        ctx = canvas.getContext('2d');

        document.getElementById('btn-new-game').addEventListener('click', newGame);
        document.getElementById('btn-players').addEventListener('click', togglePlayers);
        document.getElementById('btn-pass').addEventListener('click', doPass);
        document.getElementById('btn-rules').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.remove('hidden');
        });
        document.getElementById('rules-close').addEventListener('click', () => {
            document.getElementById('rules-panel').classList.add('hidden');
        });
        document.getElementById('overlay-btn').addEventListener('click', () => {
            document.getElementById('overlay').classList.add('hidden');
        });

        canvas.addEventListener('pointerdown', onBoardClick);

        window.addEventListener('resize', onResize);
        onResize();
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

        const padding = size * 0.055;
        cellSize = (size - padding * 2) / (BOARD_SIZE - 1);
        boardOffsetX = padding;
        boardOffsetY = padding;

        if (board) draw();
    }

    // ===== GAME LOGIC =====
    function newGame() {
        board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0));
        prevBoardState = null;
        currentPlayer = 1;
        captures = { 1: 0, 2: 0 };
        consecutivePasses = 0;
        gameOver = false;
        aiThinking = false;

        document.getElementById('overlay').classList.add('hidden');
        updateUI();
        draw();
    }

    function togglePlayers() {
        aiEnabled = !aiEnabled;
        document.getElementById('btn-players').textContent = aiEnabled ? 'vs AI' : '2 Players';
        newGame();
    }

    function doPass() {
        if (gameOver || aiThinking) return;
        consecutivePasses++;
        if (consecutivePasses >= 2) {
            endGame();
            return;
        }
        nextTurn();
    }

    function onBoardClick(e) {
        if (gameOver || aiThinking) return;
        if (aiEnabled && currentPlayer === 2) return; // AI's turn

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;

        const col = Math.round((px - boardOffsetX) / cellSize);
        const row = Math.round((py - boardOffsetY) / cellSize);

        if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return;
        if (board[row][col] !== 0) return;

        placeStone(row, col, currentPlayer);
    }

    function placeStone(row, col, player) {
        // Try the move on a copy
        const testBoard = board.map(r => r.slice());
        testBoard[row][col] = player;

        // Remove captured enemy groups
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

        // Suicide check: placed stone's group must have liberties after captures
        const ownGroup = getGroup(testBoard, row, col);
        if (liberties(testBoard, ownGroup) === 0) return; // illegal move

        // Ko check: resulting board must not equal the board before opponent's last move
        const newState = serializeBoard(testBoard);
        if (newState === prevBoardState) return; // ko violation

        // Commit
        prevBoardState = serializeBoard(board);
        board = testBoard;
        captures[player] += captured;
        consecutivePasses = 0;

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

        // Collect all legal moves
        const legal = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === 0 && isLegalMove(r, c, 2)) {
                    legal.push([r, c]);
                }
            }
        }

        if (legal.length === 0) {
            doPass();
            return;
        }

        const [r, c] = legal[Math.floor(Math.random() * legal.length)];
        placeStone(r, c, 2);
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
        if (row < BOARD_SIZE - 1) result.push([row + 1, col]);
        if (col > 0) result.push([row, col - 1]);
        if (col < BOARD_SIZE - 1) result.push([row, col + 1]);
        return result;
    }

    function getGroup(b, row, col) {
        const color = b[row][col];
        const visited = new Set();
        const stack = [[row, col]];
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            const key = r * BOARD_SIZE + c;
            if (visited.has(key)) continue;
            visited.add(key);
            for (const [nr, nc] of neighbors(r, c)) {
                if (b[nr][nc] === color && !visited.has(nr * BOARD_SIZE + nc)) {
                    stack.push([nr, nc]);
                }
            }
        }
        return [...visited].map(k => [Math.floor(k / BOARD_SIZE), k % BOARD_SIZE]);
    }

    function liberties(b, group) {
        const seen = new Set();
        let count = 0;
        for (const [r, c] of group) {
            for (const [nr, nc] of neighbors(r, c)) {
                const key = nr * BOARD_SIZE + nc;
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
        // Simple area scoring: territory (empty regions owned) + prisoners
        const territory = { 1: 0, 2: 0, neutral: 0 };
        const visited = new Set();

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] !== 0 || visited.has(r * BOARD_SIZE + c)) continue;

                // Flood-fill empty region
                const region = [];
                const borders = new Set();
                const stack = [[r, c]];
                while (stack.length > 0) {
                    const [cr, cc] = stack.pop();
                    const key = cr * BOARD_SIZE + cc;
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
                    const owner = [...borders][0];
                    territory[owner] += region.length;
                } else {
                    territory.neutral += region.length;
                }
            }
        }

        // Count stones on board
        let blackStones = 0, whiteStones = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === 1) blackStones++;
                else if (board[r][c] === 2) whiteStones++;
            }
        }

        const blackScore = territory[1] + captures[1];
        const whiteScore = territory[2] + captures[2] + KOMI;

        return { blackScore, whiteScore, territory };
    }

    function endGame() {
        gameOver = true;
        const { blackScore, whiteScore } = scoreBoard();
        const winner = blackScore > whiteScore ? 'Black' : 'White';
        const diff = Math.abs(blackScore - whiteScore).toFixed(1);

        showOverlay(
            'Game Over',
            `${winner} wins by ${diff} points!\nBlack: ${blackScore.toFixed(1)}  ·  White: ${whiteScore.toFixed(1)}`
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
            <div class="player-score${currentPlayer === 1 && !gameOver ? ' active' : ''}">
                <div class="player-label">${blackLabel}</div>
                <div class="score-value">${captures[1]}</div>
            </div>
            <div class="score-divider"></div>
            <div class="player-score${currentPlayer === 2 && !gameOver ? ' active' : ''}">
                <div class="player-label">${whiteLabel}</div>
                <div class="score-value">${captures[2]}</div>
            </div>
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

        // Board background
        ctx.fillStyle = '#c8a45c';
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, 4);
        ctx.fill();

        // Subtle wood grain texture via gradient
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, 'rgba(255,200,100,0.12)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.05)');
        grad.addColorStop(1, 'rgba(180,120,40,0.12)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, 4);
        ctx.fill();

        // Grid lines
        ctx.strokeStyle = 'rgba(80, 50, 10, 0.7)';
        ctx.lineWidth = Math.max(0.5, cellSize * 0.04);
        for (let i = 0; i < BOARD_SIZE; i++) {
            const x = boardOffsetX + i * cellSize;
            const y = boardOffsetY + i * cellSize;
            // Vertical
            ctx.beginPath();
            ctx.moveTo(x, boardOffsetY);
            ctx.lineTo(x, boardOffsetY + (BOARD_SIZE - 1) * cellSize);
            ctx.stroke();
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(boardOffsetX, y);
            ctx.lineTo(boardOffsetX + (BOARD_SIZE - 1) * cellSize, y);
            ctx.stroke();
        }

        // Star points
        const starR = Math.max(2, cellSize * 0.12);
        ctx.fillStyle = 'rgba(80, 50, 10, 0.8)';
        for (const [sr, sc] of STAR_POINTS) {
            ctx.beginPath();
            ctx.arc(boardOffsetX + sc * cellSize, boardOffsetY + sr * cellSize, starR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawStones() {
        const stoneR = cellSize * 0.46;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === 0) continue;
                const x = boardOffsetX + c * cellSize;
                const y = boardOffsetY + r * cellSize;
                const isBlack = board[r][c] === 1;

                // Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = stoneR * 0.6;
                ctx.shadowOffsetX = stoneR * 0.15;
                ctx.shadowOffsetY = stoneR * 0.2;

                // Stone body
                const grad = ctx.createRadialGradient(
                    x - stoneR * 0.25, y - stoneR * 0.25, stoneR * 0.05,
                    x, y, stoneR
                );
                if (isBlack) {
                    grad.addColorStop(0, '#555');
                    grad.addColorStop(1, '#111');
                } else {
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, '#ccc');
                }

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, stoneR, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }
    }

    // ===== START =====
    init();
    newGame();
})();
