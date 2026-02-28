// ========================================
// MATHEMATICAL PLAYGROUND
// Interactive visualizations of mathematical beauty
// ========================================

// ========================================
// 1. BACKGROUND ANIMATION
// ========================================
class BackgroundAnimation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    draw() {
        this.ctx.fillStyle = 'rgba(10, 14, 39, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw parametric curves
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            const hue = (this.time + i * 120) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
            this.ctx.lineWidth = 2;

            for (let t = 0; t < Math.PI * 2; t += 0.01) {
                const scale = 100 + i * 50;
                const x = centerX + scale * Math.cos(t * (3 + i)) * Math.cos(this.time * 0.001 + t);
                const y = centerY + scale * Math.sin(t * (2 + i)) * Math.sin(this.time * 0.001 + t);

                if (t === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }

            this.ctx.closePath();
            this.ctx.stroke();
        }

        this.time++;
        requestAnimationFrame(() => this.draw());
    }
}

// ========================================
// 2. MANDELBROT / JULIA SET
// ========================================
class FractalExplorer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mode = 'mandelbrot'; // or 'julia'
        this.zoom = 1;
        this.offsetX = -0.5;
        this.offsetY = 0;
        this.juliaC = { x: -0.4, y: 0.6 };
        this.maxIterations = 100;

        this.resize();
        this.setupEventListeners();
        this.render();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e, 'zoomIn'));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleClick(e, 'zoomOut');
        });
    }

    handleClick(e, action) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const fractalX = this.offsetX + (x / this.canvas.width - 0.5) * (4 / this.zoom);
        const fractalY = this.offsetY + (y / this.canvas.height - 0.5) * (4 / this.zoom);

        if (action === 'zoomIn') {
            this.zoom *= 2;
            this.offsetX = fractalX;
            this.offsetY = fractalY;
        } else {
            this.zoom /= 2;
        }

        document.getElementById('zoomLevel').textContent = `Zoom: ${this.zoom.toFixed(1)}x`;
        this.render();
    }

    mandelbrot(cx, cy) {
        let x = 0, y = 0;
        let iteration = 0;

        while (x * x + y * y <= 4 && iteration < this.maxIterations) {
            const xTemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xTemp;
            iteration++;
        }

        return iteration;
    }

    julia(zx, zy) {
        let x = zx, y = zy;
        let iteration = 0;

        while (x * x + y * y <= 4 && iteration < this.maxIterations) {
            const xTemp = x * x - y * y + this.juliaC.x;
            y = 2 * x * y + this.juliaC.y;
            x = xTemp;
            iteration++;
        }

        return iteration;
    }

    render() {
        const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

        for (let px = 0; px < this.canvas.width; px++) {
            for (let py = 0; py < this.canvas.height; py++) {
                const x = this.offsetX + (px / this.canvas.width - 0.5) * (4 / this.zoom);
                const y = this.offsetY + (py / this.canvas.height - 0.5) * (4 / this.zoom);

                const iteration = this.mode === 'mandelbrot'
                    ? this.mandelbrot(x, y)
                    : this.julia(x, y);

                const pixelIndex = (py * this.canvas.width + px) * 4;

                if (iteration === this.maxIterations) {
                    imageData.data[pixelIndex] = 0;
                    imageData.data[pixelIndex + 1] = 0;
                    imageData.data[pixelIndex + 2] = 0;
                } else {
                    const hue = (iteration / this.maxIterations) * 360;
                    const saturation = 100;
                    const lightness = iteration < this.maxIterations ? 50 : 0;

                    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
                    imageData.data[pixelIndex] = rgb[0];
                    imageData.data[pixelIndex + 1] = rgb[1];
                    imageData.data[pixelIndex + 2] = rgb[2];
                }
                imageData.data[pixelIndex + 3] = 255;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    toggleMode() {
        this.mode = this.mode === 'mandelbrot' ? 'julia' : 'mandelbrot';
        this.render();
    }

    reset() {
        this.zoom = 1;
        this.offsetX = -0.5;
        this.offsetY = 0;
        document.getElementById('zoomLevel').textContent = 'Zoom: 1x';
        this.render();
    }
}

// ========================================
// 3. FOURIER SERIES EPICYCLES
// ========================================
class FourierDrawing {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.epicycles = [];
        this.path = [];
        this.time = 0;
        this.speed = 1;
        this.shapes = {
            circle: this.generateCirclePoints(),
            square: this.generateSquarePoints(),
            star: this.generateStarPoints(),
            heart: this.generateHeartPoints()
        };
        this.currentShape = 'circle';

        this.resize();
        this.calculateEpicycles(10);
        this.animate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    generateCirclePoints() {
        const points = [];
        for (let i = 0; i < 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            points.push({ x: 100 * Math.cos(t), y: 100 * Math.sin(t) });
        }
        return points;
    }

    generateSquarePoints() {
        const points = [];
        const size = 100;
        for (let i = 0; i < 200; i++) {
            const t = (i / 200) * 4;
            let x, y;
            if (t < 1) {
                x = -size + 2 * size * t;
                y = -size;
            } else if (t < 2) {
                x = size;
                y = -size + 2 * size * (t - 1);
            } else if (t < 3) {
                x = size - 2 * size * (t - 2);
                y = size;
            } else {
                x = -size;
                y = size - 2 * size * (t - 3);
            }
            points.push({ x, y });
        }
        return points;
    }

    generateStarPoints() {
        const points = [];
        for (let i = 0; i < 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            const r = i % 40 < 20 ? 100 : 50;
            points.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
        }
        return points;
    }

    generateHeartPoints() {
        const points = [];
        for (let i = 0; i < 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            points.push({ x: x * 5, y: y * 5 });
        }
        return points;
    }

    dft(points) {
        const X = [];
        const N = points.length;

        for (let k = 0; k < N; k++) {
            let re = 0;
            let im = 0;

            for (let n = 0; n < N; n++) {
                const phi = (Math.PI * 2 * k * n) / N;
                re += points[n].x * Math.cos(phi) + points[n].y * Math.sin(phi);
                im += -points[n].x * Math.sin(phi) + points[n].y * Math.cos(phi);
            }

            re = re / N;
            im = im / N;

            const freq = k;
            const amp = Math.sqrt(re * re + im * im);
            const phase = Math.atan2(im, re);

            X.push({ re, im, freq, amp, phase });
        }

        return X;
    }

    calculateEpicycles(numCircles) {
        const points = this.shapes[this.currentShape];
        let coefficients = this.dft(points);

        // Sort by amplitude to get most significant frequencies
        coefficients.sort((a, b) => b.amp - a.amp);

        this.epicycles = coefficients.slice(0, numCircles);
        this.path = [];
        this.time = 0;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        let x = centerX;
        let y = centerY;

        // Draw epicycles
        for (let i = 0; i < this.epicycles.length; i++) {
            const prevX = x;
            const prevY = y;

            const { freq, amp, phase } = this.epicycles[i];
            const angle = freq * this.time + phase;

            x += amp * Math.cos(angle);
            y += amp * Math.sin(angle);

            // Draw circle
            this.ctx.strokeStyle = `hsla(${(i / this.epicycles.length) * 360}, 70%, 50%, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(prevX, prevY, amp, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw radius
            this.ctx.beginPath();
            this.ctx.moveTo(prevX, prevY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }

        // Add current point to path
        this.path.unshift({ x, y });

        // Draw the path
        this.ctx.strokeStyle = '#00d9ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.path.length; i++) {
            if (i === 0) {
                this.ctx.moveTo(this.path[i].x, this.path[i].y);
            } else {
                this.ctx.lineTo(this.path[i].x, this.path[i].y);
            }
        }
        this.ctx.stroke();

        // Limit path length
        const dt = (Math.PI * 2) / this.shapes[this.currentShape].length;
        if (this.path.length > this.shapes[this.currentShape].length) {
            this.path.pop();
        }

        this.time += dt * this.speed;

        requestAnimationFrame(() => this.animate());
    }

    changeShape() {
        const shapes = Object.keys(this.shapes);
        const currentIndex = shapes.indexOf(this.currentShape);
        this.currentShape = shapes[(currentIndex + 1) % shapes.length];
        this.calculateEpicycles(this.epicycles.length);
    }

    setEpicycleCount(count) {
        this.calculateEpicycles(count);
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    reset() {
        this.path = [];
        this.time = 0;
    }
}

// ========================================
// 4. PARAMETRIC CURVES
// ========================================
class ParametricCurves {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.a = 3;
        this.b = 5;
        this.curve = 'lissajous';
        this.animating = false;
        this.animationTime = 0;

        this.resize();
        this.draw();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = Math.min(this.canvas.width, this.canvas.height) / 3;

        this.ctx.strokeStyle = '#00d9ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const points = 1000;
        for (let i = 0; i <= points; i++) {
            const t = (i / points) * Math.PI * 2;
            const point = this.getPoint(t);

            const x = centerX + point.x * scale;
            const y = centerY + point.y * scale;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.stroke();

        // Update equation display
        this.updateEquation();
    }

    getPoint(t) {
        const a = this.animating ? this.a + Math.sin(this.animationTime * 0.01) * 2 : this.a;
        const b = this.animating ? this.b + Math.cos(this.animationTime * 0.01) * 2 : this.b;

        switch(this.curve) {
            case 'lissajous':
                return {
                    x: Math.sin(a * t),
                    y: Math.sin(b * t)
                };
            case 'rose':
                const k = a / b;
                const r = Math.cos(k * t);
                return {
                    x: r * Math.cos(t),
                    y: r * Math.sin(t)
                };
            case 'spiral':
                const angle = t * a;
                const radius = Math.exp(angle / (b * 5)) / 20;
                return {
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                };
            case 'butterfly':
                const scale = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
                return {
                    x: Math.sin(t) * scale / 3,
                    y: Math.cos(t) * scale / 3
                };
            case 'heart':
                return {
                    x: 16 * Math.pow(Math.sin(t), 3) / 16,
                    y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16
                };
            case 'trefoil':
                return {
                    x: Math.sin(t) + 2 * Math.sin(2 * t),
                    y: Math.cos(t) - 2 * Math.cos(2 * t)
                };
            default:
                return { x: 0, y: 0 };
        }
    }

    updateEquation() {
        const display = document.getElementById('equationDisplay');
        const equations = {
            lissajous: `x = sin(${this.a}t), y = sin(${this.b}t)`,
            rose: `r = cos(${(this.a/this.b).toFixed(2)}θ)`,
            spiral: `r = e^(θ/${this.b.toFixed(1)})`,
            butterfly: `r = e^(cos(θ)) - 2cos(4θ) - sin^5(θ/12)`,
            heart: `x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)`,
            trefoil: `x = sin(t) + 2sin(2t), y = cos(t) - 2cos(2t)`
        };
        display.textContent = equations[this.curve] || '';
    }

    setCurve(curve) {
        this.curve = curve;
        this.draw();
    }

    setParameters(a, b) {
        this.a = parseFloat(a);
        this.b = parseFloat(b);
        this.draw();
    }

    animate() {
        this.animating = !this.animating;
        if (this.animating) {
            this.animationLoop();
        }
    }

    animationLoop() {
        if (!this.animating) return;
        this.animationTime++;
        this.draw();
        requestAnimationFrame(() => this.animationLoop());
    }
}

// ========================================
// 5. PRIME NUMBER SPIRAL
// ========================================
class PrimeSpiral {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.range = 1000;
        this.primes = [];
        this.animating = false;
        this.currentIndex = 0;

        this.resize();
        this.calculatePrimes();
        this.draw();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    isPrime(n) {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        for (let i = 3; i * i <= n; i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    }

    calculatePrimes() {
        this.primes = [];
        for (let i = 2; i <= this.range; i++) {
            if (this.isPrime(i)) {
                this.primes.push(i);
            }
        }
        document.getElementById('primeCount').textContent = `Primes found: ${this.primes.length}`;
    }

    draw(upTo = this.primes.length) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) / 2 - 20;

        // Draw all numbers in spiral
        for (let i = 1; i <= Math.min(this.range, upTo); i++) {
            const angle = i * 0.2;
            const radius = (i / this.range) * maxRadius;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            if (this.isPrime(i)) {
                const hue = (i / this.range) * 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 1, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    setRange(range) {
        this.range = range;
        this.calculatePrimes();
        this.draw();
    }

    animate() {
        if (this.animating) {
            this.animating = false;
            return;
        }

        this.animating = true;
        this.currentIndex = 0;

        const animateFrame = () => {
            if (!this.animating || this.currentIndex >= this.range) {
                this.animating = false;
                return;
            }

            this.draw(this.currentIndex);
            this.currentIndex += 20;
            requestAnimationFrame(animateFrame);
        };

        animateFrame();
    }
}

// ========================================
// 6. LORENZ ATTRACTOR (Chaos Theory)
// ========================================
class LorenzAttractor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.sigma = 10;
        this.rho = 28;
        this.beta = 2.667;
        this.points = [];
        this.rotation = 0;
        this.rotating = true;
        this.dt = 0.01;

        this.resize();
        this.reset();
        this.animate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    reset() {
        this.points = [];
        this.x = 0.1;
        this.y = 0;
        this.z = 0;

        // Generate initial points
        for (let i = 0; i < 5000; i++) {
            this.step();
        }
    }

    step() {
        const dx = this.sigma * (this.y - this.x) * this.dt;
        const dy = (this.x * (this.rho - this.z) - this.y) * this.dt;
        const dz = (this.x * this.y - this.beta * this.z) * this.dt;

        this.x += dx;
        this.y += dy;
        this.z += dz;

        this.points.push({ x: this.x, y: this.y, z: this.z });

        if (this.points.length > 5000) {
            this.points.shift();
        }
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.step();

        if (this.rotating) {
            this.rotation += 0.002;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = 8;

        this.ctx.beginPath();
        this.points.forEach((p, i) => {
            // Rotate around Y axis
            const rotX = p.x * Math.cos(this.rotation) - p.z * Math.sin(this.rotation);
            const rotZ = p.x * Math.sin(this.rotation) + p.z * Math.cos(this.rotation);

            const x = centerX + rotX * scale;
            const y = centerY + p.y * scale;

            const hue = (i / this.points.length) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            this.ctx.lineWidth = 1;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();

        requestAnimationFrame(() => this.animate());
    }

    setParameters(sigma, rho, beta) {
        this.sigma = sigma;
        this.rho = rho;
        this.beta = beta;
    }

    toggleRotation() {
        this.rotating = !this.rotating;
    }
}

// ========================================
// 7. GENERATIVE MATHEMATICAL ART
// ========================================
class GenerativeArt {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.complexity = 5;
        this.animating = false;
        this.animationFrame = 0;

        this.resize();
        this.generate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    generate() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) / 2 - 20;

        const pattern = Math.floor(Math.random() * 4);
        const layers = this.complexity * 20;

        for (let i = 0; i < layers; i++) {
            const t = i / layers;
            const angle = t * Math.PI * 2 * this.complexity;
            const radius = maxRadius * Math.pow(t, 0.5);

            let x, y;

            switch(pattern) {
                case 0: // Spiral pattern
                    x = centerX + radius * Math.cos(angle + this.animationFrame);
                    y = centerY + radius * Math.sin(angle + this.animationFrame);
                    break;
                case 1: // Rose pattern
                    const k = this.complexity / 2;
                    const r = maxRadius * Math.cos(k * angle);
                    x = centerX + r * Math.cos(angle);
                    y = centerY + r * Math.sin(angle);
                    break;
                case 2: // Lissajous
                    x = centerX + maxRadius * Math.sin(angle * 3 + this.animationFrame);
                    y = centerY + maxRadius * Math.sin(angle * 2);
                    break;
                case 3: // Complex wave
                    x = centerX + radius * Math.cos(angle) * Math.sin(angle * this.complexity);
                    y = centerY + radius * Math.sin(angle) * Math.cos(angle * this.complexity);
                    break;
            }

            const hue = (t * 360 + this.animationFrame * 50) % 360;
            const alpha = 0.3 + Math.sin(t * Math.PI) * 0.3;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    setComplexity(complexity) {
        this.complexity = complexity;
        this.generate();
    }

    toggleAnimation() {
        this.animating = !this.animating;
        if (this.animating) {
            this.animate();
        }
    }

    animate() {
        if (!this.animating) return;
        this.animationFrame += 0.02;
        this.generate();
        requestAnimationFrame(() => this.animate());
    }

    save() {
        const link = document.createElement('a');
        link.download = 'mathematical-art.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// ========================================
// 8. CONWAY'S GAME OF LIFE
// ========================================
class GameOfLife {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 8;
        this.cols = 0;
        this.rows = 0;
        this.grid = [];
        this.running = false;
        this.generation = 0;
        this.speed = 10; // fps

        this.resize();
        this.clear();
        this.setupEventListeners();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
        this.clear();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
            this.grid[y][x] = !this.grid[y][x];
            this.draw();
        }
    }

    clear() {
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.generation = 0;
        this.draw();
    }

    randomize() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = Math.random() < 0.3;
            }
        }
        this.generation = 0;
        this.draw();
    }

    countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.cols) % this.cols;
                const ny = (y + dy + this.rows) % this.rows;
                if (this.grid[ny][nx]) count++;
            }
        }
        return count;
    }

    step() {
        const newGrid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const neighbors = this.countNeighbors(x, y);
                const alive = this.grid[y][x];

                if (alive && (neighbors === 2 || neighbors === 3)) {
                    newGrid[y][x] = true;
                } else if (!alive && neighbors === 3) {
                    newGrid[y][x] = true;
                }
            }
        }

        this.grid = newGrid;
        this.generation++;
        this.draw();
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x]) {
                    const hue = (x + y) % 360;
                    this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                    this.ctx.fillRect(
                        x * this.cellSize + 1,
                        y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    );
                }
            }
        }

        // Grid lines
        this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }

    play() {
        if (this.running) return;
        this.running = true;
        this.animate();
    }

    pause() {
        this.running = false;
    }

    animate() {
        if (!this.running) return;
        this.step();
        document.getElementById('golGeneration').textContent = `Generation: ${this.generation}`;
        setTimeout(() => this.animate(), 1000 / this.speed);
    }

    setSpeed(speed) {
        this.speed = speed;
    }
}

// ========================================
// 9. BARNSLEY FERN
// ========================================
class BarnsleyFern {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = 0;
        this.y = 0;
        this.points = [];
        this.maxPoints = 50000;
        this.animating = true;
        this.batchSize = 100;

        this.resize();
        this.reset();
        this.animate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.points = [];
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    iterate() {
        const r = Math.random();
        let newX, newY;

        if (r < 0.01) {
            // Stem
            newX = 0;
            newY = 0.16 * this.y;
        } else if (r < 0.86) {
            // Successively smaller leaflets
            newX = 0.85 * this.x + 0.04 * this.y;
            newY = -0.04 * this.x + 0.85 * this.y + 1.6;
        } else if (r < 0.93) {
            // Largest left-hand leaflet
            newX = 0.2 * this.x - 0.26 * this.y;
            newY = 0.23 * this.x + 0.22 * this.y + 1.6;
        } else {
            // Largest right-hand leaflet
            newX = -0.15 * this.x + 0.28 * this.y;
            newY = 0.26 * this.x + 0.24 * this.y + 0.44;
        }

        this.x = newX;
        this.y = newY;
        this.points.push({ x: newX, y: newY });

        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    draw() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 12;
        const offsetX = this.canvas.width / 2;
        const offsetY = this.canvas.height - 50;

        for (let i = Math.max(0, this.points.length - this.batchSize); i < this.points.length; i++) {
            const point = this.points[i];
            const px = offsetX + point.x * scale;
            const py = offsetY - point.y * scale;

            const hue = 120 + (point.y / 11) * 60; // Green to yellow
            this.ctx.fillStyle = `hsla(${hue}, 80%, 40%, 0.8)`;
            this.ctx.fillRect(px, py, 2, 2);
        }
    }

    animate() {
        if (!this.animating) return;

        for (let i = 0; i < this.batchSize; i++) {
            this.iterate();
        }

        this.draw();
        document.getElementById('barnsleyPoints').textContent = `Points: ${this.points.length}`;

        requestAnimationFrame(() => this.animate());
    }

    faster() {
        this.batchSize = Math.min(this.batchSize * 2, 1000);
    }

    toggleAnimation() {
        this.animating = !this.animating;
        if (this.animating) this.animate();
    }
}

// ========================================
// 10. CELLULAR AUTOMATA
// ========================================
class CellularAutomata {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 4;
        this.cols = 0;
        this.currentRow = 0;
        this.cells = [];
        this.rule = 30;
        this.running = false;

        this.resize();
        this.reset();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.reset();
    }

    reset() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.cells = Array(this.cols).fill(0);
        this.cells[Math.floor(this.cols / 2)] = 1;
        this.currentRow = 0;
        this.drawRow();
    }

    applyRule(left, center, right) {
        const index = (left << 2) | (center << 1) | right;
        return (this.rule >> index) & 1;
    }

    step() {
        const newCells = Array(this.cols).fill(0);

        for (let i = 0; i < this.cols; i++) {
            const left = this.cells[(i - 1 + this.cols) % this.cols];
            const center = this.cells[i];
            const right = this.cells[(i + 1) % this.cols];
            newCells[i] = this.applyRule(left, center, right);
        }

        this.cells = newCells;
        this.currentRow++;

        if (this.currentRow * this.cellSize < this.canvas.height) {
            this.drawRow();
        } else {
            this.running = false;
        }
    }

    drawRow() {
        for (let i = 0; i < this.cols; i++) {
            if (this.cells[i] === 1) {
                const hue = (this.currentRow / (this.canvas.height / this.cellSize)) * 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                this.ctx.fillRect(
                    i * this.cellSize,
                    this.currentRow * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }
    }

    setRule(rule) {
        this.rule = rule;
        this.reset();
    }

    run() {
        if (this.running) {
            this.running = false;
            return;
        }

        this.running = true;
        const runLoop = () => {
            if (!this.running) return;
            this.step();
            document.getElementById('automataGen').textContent = `Row: ${this.currentRow}`;
            if (this.currentRow * this.cellSize < this.canvas.height) {
                setTimeout(runLoop, 10);
            } else {
                this.running = false;
            }
        };
        runLoop();
    }
}

// ========================================
// 11. HARMONOGRAPH
// ========================================
class Harmonograph {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.freq1 = 2;
        this.freq2 = 3;
        this.freq3 = 1.5;
        this.freq4 = 2.5;
        this.damping = 0.998;
        this.phase1 = 0;
        this.phase2 = Math.PI / 2;
        this.phase3 = 0;
        this.phase4 = Math.PI / 3;

        this.resize();
        this.draw();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    randomize() {
        this.freq1 = 1 + Math.random() * 4;
        this.freq2 = 1 + Math.random() * 4;
        this.freq3 = 1 + Math.random() * 4;
        this.freq4 = 1 + Math.random() * 4;
        this.phase1 = Math.random() * Math.PI * 2;
        this.phase2 = Math.random() * Math.PI * 2;
        this.phase3 = Math.random() * Math.PI * 2;
        this.phase4 = Math.random() * Math.PI * 2;
        this.draw();
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = Math.min(this.canvas.width, this.canvas.height) / 3;

        this.ctx.beginPath();
        let firstPoint = true;

        for (let t = 0; t < 100; t += 0.01) {
            const decay = Math.pow(this.damping, t);

            const x1 = Math.sin(t * this.freq1 + this.phase1) * decay;
            const x2 = Math.sin(t * this.freq2 + this.phase2) * decay;
            const y1 = Math.sin(t * this.freq3 + this.phase3) * decay;
            const y2 = Math.sin(t * this.freq4 + this.phase4) * decay;

            const x = centerX + (x1 + x2) * scale / 2;
            const y = centerY + (y1 + y2) * scale / 2;

            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }

            // Color gradient based on time
            const hue = (t / 100) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.3)`;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }

        this.ctx.stroke();
    }

    setFrequencies(f1, f2) {
        this.freq1 = f1;
        this.freq2 = f2;
        this.draw();
    }

    setDamping(d) {
        this.damping = d;
        this.draw();
    }

    save() {
        const link = document.createElement('a');
        link.download = 'harmonograph.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation menu
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // Hide nav on scroll down, show on scroll up
    let lastScroll = 0;
    const navMenu = document.getElementById('navMenu');
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll <= 0) {
            navMenu.classList.remove('hidden');
            return;
        }
        if (currentScroll > lastScroll && currentScroll > 100) {
            navMenu.classList.add('hidden');
        } else {
            navMenu.classList.remove('hidden');
        }
        lastScroll = currentScroll;
    });

    // Background animation
    const bgCanvas = document.getElementById('backgroundCanvas');
    const bgAnim = new BackgroundAnimation(bgCanvas);
    bgAnim.draw();

    // Mandelbrot/Julia explorer
    const mandelbrotCanvas = document.getElementById('mandelbrotCanvas');
    const fractal = new FractalExplorer(mandelbrotCanvas);

    document.getElementById('resetMandelbrot').addEventListener('click', () => fractal.reset());
    document.getElementById('toggleJulia').addEventListener('click', () => {
        fractal.toggleMode();
        document.getElementById('toggleJulia').textContent =
            fractal.mode === 'mandelbrot' ? 'Switch to Julia Set' : 'Switch to Mandelbrot';
    });

    // Fourier series
    const fourierCanvas = document.getElementById('fourierCanvas');
    const fourier = new FourierDrawing(fourierCanvas);

    document.getElementById('epicycleSlider').addEventListener('input', (e) => {
        document.getElementById('epicycleCount').textContent = e.target.value;
        fourier.setEpicycleCount(parseInt(e.target.value));
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        document.getElementById('speedValue').textContent = e.target.value + 'x';
        fourier.setSpeed(parseFloat(e.target.value));
    });

    document.getElementById('changeShape').addEventListener('click', () => fourier.changeShape());
    document.getElementById('resetFourier').addEventListener('click', () => fourier.reset());

    // Parametric curves
    const parametricCanvas = document.getElementById('parametricCanvas');
    const parametric = new ParametricCurves(parametricCanvas);

    document.getElementById('curveSelector').addEventListener('change', (e) => {
        parametric.setCurve(e.target.value);
    });

    document.getElementById('sliderA').addEventListener('input', (e) => {
        document.getElementById('paramA').textContent = e.target.value;
        parametric.setParameters(e.target.value, parametric.b);
    });

    document.getElementById('sliderB').addEventListener('input', (e) => {
        document.getElementById('paramB').textContent = e.target.value;
        parametric.setParameters(parametric.a, e.target.value);
    });

    document.getElementById('animateParams').addEventListener('click', () => {
        parametric.animate();
        document.getElementById('animateParams').textContent =
            parametric.animating ? 'Stop Animation' : 'Animate';
    });

    // Prime spiral
    const primeCanvas = document.getElementById('primeCanvas');
    const primes = new PrimeSpiral(primeCanvas);

    document.getElementById('primeSlider').addEventListener('input', (e) => {
        document.getElementById('primeRange').textContent = e.target.value;
        primes.setRange(parseInt(e.target.value));
    });

    document.getElementById('animatePrimes').addEventListener('click', () => {
        primes.animate();
        document.getElementById('animatePrimes').textContent =
            primes.animating ? 'Stop' : 'Animate';
    });

    // Lorenz attractor
    const chaosCanvas = document.getElementById('chaosCanvas');
    const chaos = new LorenzAttractor(chaosCanvas);

    document.getElementById('sigmaSlider').addEventListener('input', (e) => {
        document.getElementById('sigmaValue').textContent = e.target.value;
        chaos.setParameters(parseFloat(e.target.value), chaos.rho, chaos.beta);
    });

    document.getElementById('rhoSlider').addEventListener('input', (e) => {
        document.getElementById('rhoValue').textContent = e.target.value;
        chaos.setParameters(chaos.sigma, parseFloat(e.target.value), chaos.beta);
    });

    document.getElementById('betaSlider').addEventListener('input', (e) => {
        document.getElementById('betaValue').textContent = e.target.value;
        chaos.setParameters(chaos.sigma, chaos.rho, parseFloat(e.target.value));
    });

    document.getElementById('resetChaos').addEventListener('click', () => chaos.reset());
    document.getElementById('toggleRotation').addEventListener('click', () => {
        chaos.toggleRotation();
        document.getElementById('toggleRotation').textContent =
            chaos.rotating ? 'Stop Rotation' : 'Start Rotation';
    });

    // Generative art
    const artCanvas = document.getElementById('artCanvas');
    const art = new GenerativeArt(artCanvas);

    document.getElementById('generateArt').addEventListener('click', () => art.generate());

    document.getElementById('complexitySlider').addEventListener('input', (e) => {
        document.getElementById('complexityValue').textContent = e.target.value;
        art.setComplexity(parseInt(e.target.value));
    });

    document.getElementById('animateArt').addEventListener('change', (e) => {
        art.animating = e.target.checked;
        if (art.animating) art.animate();
    });

    document.getElementById('saveArt').addEventListener('click', () => art.save());

    // Game of Life
    const golCanvas = document.getElementById('gameoflifeCanvas');
    const gol = new GameOfLife(golCanvas);

    document.getElementById('golPlay').addEventListener('click', () => gol.play());
    document.getElementById('golPause').addEventListener('click', () => gol.pause());
    document.getElementById('golStep').addEventListener('click', () => {
        gol.step();
        document.getElementById('golGeneration').textContent = `Generation: ${gol.generation}`;
    });
    document.getElementById('golClear').addEventListener('click', () => {
        gol.clear();
        document.getElementById('golGeneration').textContent = 'Generation: 0';
    });
    document.getElementById('golRandom').addEventListener('click', () => gol.randomize());
    document.getElementById('golSpeedSlider').addEventListener('input', (e) => {
        document.getElementById('golSpeedValue').textContent = e.target.value;
        gol.setSpeed(parseInt(e.target.value));
    });

    // Barnsley Fern
    const barnsleyCanvas = document.getElementById('barnsleyCanvas');
    const barnsley = new BarnsleyFern(barnsleyCanvas);

    document.getElementById('barnsleyReset').addEventListener('click', () => barnsley.reset());
    document.getElementById('barnsleyFaster').addEventListener('click', () => barnsley.faster());
    document.getElementById('barnsleyAnimate').addEventListener('change', (e) => {
        barnsley.animating = e.target.checked;
        if (barnsley.animating) barnsley.animate();
    });

    // Cellular Automata
    const automataCanvas = document.getElementById('automataCanvas');
    const automata = new CellularAutomata(automataCanvas);

    document.getElementById('ruleSelector').addEventListener('change', (e) => {
        automata.setRule(parseInt(e.target.value));
        document.getElementById('automataGen').textContent = 'Row: 0';
    });
    document.getElementById('automataReset').addEventListener('click', () => {
        automata.reset();
        document.getElementById('automataGen').textContent = 'Row: 0';
    });
    document.getElementById('automataStep').addEventListener('click', () => {
        automata.step();
        document.getElementById('automataGen').textContent = `Row: ${automata.currentRow}`;
    });
    document.getElementById('automataRun').addEventListener('click', () => {
        automata.run();
        document.getElementById('automataRun').textContent = automata.running ? 'Stop' : 'Run';
    });

    // Harmonograph
    const harmonographCanvas = document.getElementById('harmonographCanvas');
    const harmonograph = new Harmonograph(harmonographCanvas);

    document.getElementById('freq1Slider').addEventListener('input', (e) => {
        document.getElementById('freq1Value').textContent = e.target.value;
        harmonograph.freq1 = parseFloat(e.target.value);
        harmonograph.draw();
    });
    document.getElementById('freq2Slider').addEventListener('input', (e) => {
        document.getElementById('freq2Value').textContent = e.target.value;
        harmonograph.freq2 = parseFloat(e.target.value);
        harmonograph.draw();
    });
    document.getElementById('dampSlider').addEventListener('input', (e) => {
        document.getElementById('dampValue').textContent = e.target.value;
        harmonograph.setDamping(parseFloat(e.target.value));
    });
    document.getElementById('harmonographReset').addEventListener('click', () => harmonograph.randomize());
    document.getElementById('harmonographSave').addEventListener('click', () => harmonograph.save());

    // Handle window resize for all canvases
    window.addEventListener('resize', () => {
        fractal.resize();
        fourier.resize();
        parametric.resize();
        primes.resize();
        chaos.resize();
        gol.resize();
        barnsley.resize();
        automata.resize();
        harmonograph.resize();
        art.resize();

        // Redraw static visualizations
        fractal.render();
        parametric.draw();
        primes.draw();
        automata.reset();
        harmonograph.draw();
        art.generate();
    });
});
