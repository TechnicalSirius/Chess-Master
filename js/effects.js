// effects.js - Handles particles, ambient animations, and audio

const Effects = {
    canvas: null,
    ctx: null,
    particles: [],
    
    init() {
        this.canvas = document.getElementById('particle-canvas');
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Create initial particles
        for(let i=0; i<50; i++) {
            this.particles.push(this.createParticle());
        }
        
        this.animate();
        this.simulateSplashLoad();
    },
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.1
        };
    },
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Wrap around
            if(p.x < 0) p.x = this.canvas.width;
            if(p.x > this.canvas.width) p.x = 0;
            if(p.y < 0) p.y = this.canvas.height;
            if(p.y > this.canvas.height) p.y = 0;
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
            this.ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    },
    
    simulateSplashLoad() {
        let progress = 0;
        const bar = document.getElementById('splash-loading-bar');
        if(!bar) return;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if(progress >= 100) {
                progress = 100;
                clearInterval(interval);
                // Ready
                window.addEventListener('keydown', this.handleStartKeyPress, { once: true });
                window.addEventListener('click', this.handleStartKeyPress, { once: true });
            }
            bar.style.width = `${progress}%`;
        }, 200);
    },
    
    handleStartKeyPress() {
        if(typeof UI !== 'undefined') {
            UI.switchScreen('mainMenu');
        }
    },
    
    playSound(type) {
        // Paths to high-quality sounds
        const soundMap = {
            'move': 'assets/sounds/move.mp3',
            'capture': 'assets/sounds/capture.mp3',
            'check': 'assets/sounds/check.mp3',
            'victory': 'assets/sounds/victory.mp3',
            'defeat': 'assets/sounds/defeat.mp3'
        };

        const src = soundMap[type];
        if (!src) return;

        const audio = new Audio(src);
        audio.volume = 0.6;
        audio.play().catch(e => console.warn("Audio play blocked:", e));

        if (type === 'check') this.shakeScreen();
        if (type === 'victory') this.triggerVictory();
    },

    shakeScreen() {
        const board = document.getElementById('chessboard');
        if (!board) return;
        board.classList.add('shake');
        setTimeout(() => board.classList.remove('shake'), 500);
    },

    triggerVictory() {
        // Create simple particle explosion for victory
        for (let i = 0; i < 100; i++) {
            const p = this.createParticle();
            p.speedX *= 10;
            p.speedY *= 10;
            p.opacity = 1;
            this.particles.push(p);
        }
    }
};
