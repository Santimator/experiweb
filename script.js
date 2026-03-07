// ===== GAME OF LIFE ENGINE =====

class GameOfLife {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.cellSize = 8;
        this.cols = 0;
        this.rows = 0;
        this.generation = 0;
        this.population = 0;
        this.running = false;
        this.showGrid = true;
        this.wrapEdges = false;
        this.speed = 10; // generations per second
        
        // Double buffering for performance
        this.grid = [];
        this.nextGrid = [];
        
        // Mouse interaction
        this.isDrawing = false;
        this.drawMode = true; // true = draw, false = erase
        
        // FPS tracking
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        
        this.initCanvas();
        this.setupEventListeners();
    }
    
    initCanvas() {
        // Set canvas to optimal size for screen
        const maxWidth = Math.min(window.innerWidth - 100, 1200);
        const maxHeight = 600;
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        
        this.cols = Math.floor(maxWidth / this.cellSize);
        this.rows = Math.floor(maxHeight / this.cellSize);
        
        // Adjust canvas to exact grid size
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
        
        // Initialize grids
        this.grid = this.createEmptyGrid();
        this.nextGrid = this.createEmptyGrid();
        
        this.render();
    }
    
    createEmptyGrid() {
        return Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
        
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const { row, col } = this.getCellFromMouse(e);
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.drawMode = !this.grid[row][col];
            this.toggleCell(row, col);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        const { row, col } = this.getCellFromMouse(e);
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = this.drawMode ? 1 : 0;
            this.render();
            this.updateStats();
        }
    }
    
    handleMouseUp() {
        this.isDrawing = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleResize() {
        // Debounce resize
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.initCanvas(), 300);
    }
    
    getCellFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return { row, col };
    }
    
    toggleCell(row, col) {
        this.grid[row][col] = this.grid[row][col] ? 0 : 1;
        this.render();
        this.updateStats();
    }
    
    // Core Game of Life logic
    countNeighbors(row, col) {
        let count = 0;
        
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                let newRow = row + i;
                let newCol = col + j;
                
                if (this.wrapEdges) {
                    newRow = (newRow + this.rows) % this.rows;
                    newCol = (newCol + this.cols) % this.cols;
                } else {
                    if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
                        continue;
                    }
                }
                
                count += this.grid[newRow][newCol];
            }
        }
        
        return count;
    }
    
    nextGeneration() {
        // Apply Game of Life rules
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const neighbors = this.countNeighbors(row, col);
                const cell = this.grid[row][col];
                
                if (cell === 1) {
                    // Cell is alive
                    this.nextGrid[row][col] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    // Cell is dead
                    this.nextGrid[row][col] = (neighbors === 3) ? 1 : 0;
                }
            }
        }
        
        // Swap grids
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
        this.generation++;
        this.render();
        this.updateStats();
    }
    
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#1a1f3a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw cells
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col]) {
                    ctx.fillStyle = '#00ff88';
                    ctx.fillRect(
                        col * this.cellSize,
                        row * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
        
        // Draw grid lines
        if (this.showGrid) {
            ctx.strokeStyle = '#2a3050';
            ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= this.cols; i++) {
                ctx.beginPath();
                ctx.moveTo(i * this.cellSize, 0);
                ctx.lineTo(i * this.cellSize, this.canvas.height);
                ctx.stroke();
            }
            
            for (let i = 0; i <= this.rows; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * this.cellSize);
                ctx.lineTo(this.canvas.width, i * this.cellSize);
                ctx.stroke();
            }
        }
    }
    
    updateStats() {
        // Count population
        this.population = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.population += this.grid[row][col];
            }
        }
        
        document.getElementById('generation').textContent = `Generation: ${this.generation}`;
        document.getElementById('population').textContent = `Population: ${this.population}`;
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        const elapsed = currentTime - this.fpsTime;
        
        if (elapsed >= 1000) {
            this.fps = Math.round(this.frameCount / (elapsed / 1000));
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.fpsTime = currentTime;
        }
    }
    
    clear() {
        this.grid = this.createEmptyGrid();
        this.generation = 0;
        this.render();
        this.updateStats();
    }
    
    randomize() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.grid[row][col] = Math.random() > 0.7 ? 1 : 0;
            }
        }
        this.generation = 0;
        this.render();
        this.updateStats();
    }
    
    setCellSize(size) {
        this.cellSize = parseInt(size);
        this.initCanvas();
    }
    
    placePattern(pattern, centerX = null, centerY = null) {
        const startCol = centerX !== null ? centerX : Math.floor(this.cols / 2) - Math.floor(pattern[0].length / 2);
        const startRow = centerY !== null ? centerY : Math.floor(this.rows / 2) - Math.floor(pattern.length / 2);
        
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                const gridRow = startRow + row;
                const gridCol = startCol + col;
                
                if (gridRow >= 0 && gridRow < this.rows && gridCol >= 0 && gridCol < this.cols) {
                    this.grid[gridRow][gridCol] = pattern[row][col];
                }
            }
        }
        
        this.render();
        this.updateStats();
    }
}

// ===== PATTERN LIBRARY =====

const patterns = {
    // Still Lifes
    block: [
        [1, 1],
        [1, 1]
    ],
    
    beehive: [
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [0, 1, 1, 0]
    ],
    
    loaf: [
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [0, 1, 0, 1],
        [0, 0, 1, 0]
    ],
    
    boat: [
        [1, 1, 0],
        [1, 0, 1],
        [0, 1, 0]
    ],
    
    // Oscillators
    blinker: [
        [1, 1, 1]
    ],
    
    toad: [
        [0, 1, 1, 1],
        [1, 1, 1, 0]
    ],
    
    beacon: [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [0, 0, 1, 1]
    ],
    
    pulsar: [
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0]
    ],
    
    pentadecathlon: [
        [0,0,1,0,0,0,0,1,0,0],
        [1,1,0,1,1,1,1,0,1,1],
        [0,0,1,0,0,0,0,1,0,0]
    ],
    
    // Spaceships
    glider: [
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 1]
    ],
    
    lwss: [
        [0,1,0,0,1],
        [1,0,0,0,0],
        [1,0,0,0,1],
        [1,1,1,1,0]
    ],
    
    mwss: [
        [0,0,1,0,0,0],
        [0,0,0,0,1,0],
        [1,0,0,0,0,1],
        [0,1,1,1,1,1]
    ],
    
    hwss: [
        [0,0,1,1,0,0,0],
        [0,0,0,0,0,1,0],
        [1,0,0,0,0,0,1],
        [0,1,1,1,1,1,1]
    ],
    
    // Guns
    gosperGliderGun: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    
    simkinGliderGun: [
        [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0]
    ],
    
    // Methuselahs
    rpentomino: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 1, 0]
    ],
    
    acorn: [
        [0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [1, 1, 0, 0, 1, 1, 1]
    ],
    
    diehard: [
        [0, 0, 0, 0, 0, 0, 1, 0],
        [1, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 1, 1, 1]
    ],
    
    // Interesting patterns
    infiniteGrowth: [
        [1,1,1,0,1],
        [1,0,0,0,0],
        [0,0,0,1,1],
        [0,1,1,0,1],
        [1,0,1,0,1]
    ],
    
    pufferTrain: [
        [0,0,0,1,0,0,0],
        [0,0,0,0,1,0,0],
        [0,0,1,0,1,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [1,0,0,1,0,0,1],
        [1,1,1,1,1,1,1],
        [1,0,1,1,1,0,1],
        [0,0,0,0,0,0,0],
        [0,0,0,1,0,0,0],
        [0,0,1,0,1,0,0]
    ],
    
    gliderCollision: [
        [1,0,1,0,0,0,0,0,0,0,0,0,1],
        [0,1,1,0,0,0,0,0,0,0,0,0,1,1],
        [0,1,0,0,0,0,0,0,0,0,0,1,0,1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ]
};

// ===== INITIALIZATION =====

let game;
let animationFrameId;
let lastUpdateTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    game = new GameOfLife(canvas);
    
    // Control buttons
    document.getElementById('playBtn').addEventListener('click', () => {
        game.running = true;
        if (!animationFrameId) {
            gameLoop(performance.now());
        }
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        game.running = false;
    });
    
    document.getElementById('stepBtn').addEventListener('click', () => {
        game.nextGeneration();
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        game.clear();
    });
    
    document.getElementById('randomBtn').addEventListener('click', () => {
        game.randomize();
    });
    
    // Speed slider
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        game.speed = parseInt(e.target.value);
        document.getElementById('speedValue').textContent = game.speed;
    });
    
    // Zoom slider
    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        game.setCellSize(e.target.value);
        document.getElementById('zoomValue').textContent = e.target.value;
    });
    
    // Grid toggle
    document.getElementById('gridToggle').addEventListener('change', (e) => {
        game.showGrid = e.target.checked;
        game.render();
    });
    
    // Wrap toggle
    document.getElementById('wrapToggle').addEventListener('change', (e) => {
        game.wrapEdges = e.target.checked;
    });
    
    // Pattern buttons
    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const patternName = btn.getAttribute('data-pattern');
            if (patterns[patternName]) {
                game.clear();
                game.placePattern(patterns[patternName]);
            }
        });
    });
    
    // Start with a glider
    game.placePattern(patterns.glider, 20, 20);
});

// ===== GAME LOOP =====

function gameLoop(currentTime) {
    animationFrameId = requestAnimationFrame(gameLoop);
    
    game.updateFPS(currentTime);
    
    if (!game.running) return;
    
    const interval = 1000 / game.speed;
    const elapsed = currentTime - lastUpdateTime;
    
    if (elapsed >= interval) {
        game.nextGeneration();
        lastUpdateTime = currentTime - (elapsed % interval);
    }
}

// Start the loop
gameLoop(performance.now());
