// ui.js - Handles screen transitions and UI interactions

const UI = {
    screens: {
        splash: document.getElementById('splash-screen'),
        mainMenu: document.getElementById('main-menu'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen')
    },
    modals: {
        settings: document.getElementById('settings-modal'),
        promotion: document.getElementById('promotion-modal')
    },
    
    init() {
        this.bindEvents();
        this.initSplash();
    },

    initSplash() {
        const loadingBar = document.getElementById('splash-loading-bar');
        const loadingPercentage = document.getElementById('loading-percentage');
        const pressStartText = document.getElementById('press-start-text');
        
        let progress = 0;
        // Loading between 10 to 15 seconds
        const totalTime = 12000; 
        const intervalTime = 100;
        const increment = (100 / (totalTime / intervalTime));

        const interval = setInterval(() => {
            progress += increment;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Hide loading elements
                document.querySelector('.loading-bar-container').classList.add('hidden');
                document.querySelector('.loading-text').classList.add('hidden');
                if (loadingPercentage) loadingPercentage.classList.add('hidden');
                
                // Show press start
                pressStartText.classList.remove('hidden');
                
                const goToMenu = () => {
                    document.removeEventListener('keydown', goToMenu);
                    document.removeEventListener('click', goToMenu);
                    this.switchScreen('mainMenu');
                };
                document.addEventListener('keydown', goToMenu);
                document.addEventListener('click', goToMenu);
            }
            if (loadingBar) loadingBar.style.width = `${progress}%`;
            if (loadingPercentage) loadingPercentage.textContent = `${Math.floor(progress)}%`;
        }, intervalTime);
    },

    bindEvents() {
        // Settings and Modals
        document.querySelectorAll('[data-action="open-settings"]').forEach(btn => {
            btn.addEventListener('click', () => this.openModal('settings'));
        });
        document.querySelectorAll('[data-action="close-settings"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal('settings'));
        });
        document.querySelectorAll('[data-action="back-to-menu"]').forEach(btn => {
            btn.addEventListener('click', () => this.switchScreen('mainMenu'));
        });
        document.querySelectorAll('[data-action="exit-game"]').forEach(btn => {
            btn.addEventListener('click', () => {
                alert("Thanks for playing!");
            });
        });

        // Theme switching
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setTheme(e.target.dataset.theme);
            });
        });

        // Settings Tab switching
        document.querySelectorAll('.sidebar-tab[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all tabs
                document.querySelectorAll('.sidebar-tab[data-tab]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Hide all panes
                document.querySelectorAll('.settings-pane').forEach(p => p.classList.add('hidden'));
                
                // Show selected pane
                const tabId = e.currentTarget.dataset.tab;
                document.getElementById(`tab-${tabId}`).classList.remove('hidden');
            });
        });
    },

    switchScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if(screen) screen.classList.add('hidden');
        });
        if(this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    },

    openModal(modalName) {
        if(this.modals[modalName]) {
            this.modals[modalName].classList.remove('hidden');
        }
    },

    closeModal(modalName) {
        if(this.modals[modalName]) {
            this.modals[modalName].classList.add('hidden');
        }
    },

    showPromotionModal(color, callback) {
        const optionsContainer = document.getElementById('promotion-options');
        optionsContainer.innerHTML = '';
        
        const pieces = ['Q', 'R', 'B', 'N'];
        pieces.forEach(p => {
            const pieceType = color === 'w' ? p : p.toLowerCase();
            const option = document.createElement('div');
            option.className = 'promotion-option';
            
            const img = document.createElement('img');
            img.src = Board.pieceSVGs[pieceType];
            
            option.appendChild(img);
            option.addEventListener('click', () => {
                this.closeModal('promotion');
                callback(pieceType);
            });
            optionsContainer.appendChild(option);
        });
        
        this.openModal('promotion');
    },

    setTheme(themeName) {
        const board = document.getElementById('chessboard');
        board.classList.remove('neon-theme', 'classic-theme', 'dark-theme');
        board.classList.add(`${themeName}-theme`);
    },
    
    updateMoveHistory(moveNumber, whiteMove, blackMove = '') {
        const tbody = document.getElementById('move-history-body');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${moveNumber}.</td>
            <td>${whiteMove}</td>
            <td>${blackMove}</td>
        `;
        tbody.appendChild(tr);
        // auto scroll
        const container = document.querySelector('.move-history-container');
        if (container) container.scrollTop = container.scrollHeight;
    },
    
    clearMoveHistory() {
        const tbody = document.getElementById('move-history-body');
        if (tbody) tbody.innerHTML = '';
    },
    
    showResult(title, reason, resultType) {
        const screen = document.getElementById('result-screen');
        const icon = document.getElementById('result-icon');
        const iconWrap = document.getElementById('result-icon-wrap');
        
        // Remove old theme classes
        screen.classList.remove('victory-theme', 'defeat-theme', 'draw-theme');
        
        // Reset card classes
        const cardWhite = document.getElementById('result-card-white');
        const cardBlack = document.getElementById('result-card-black');
        const badgeWhite = document.getElementById('badge-white');
        const badgeBlack = document.getElementById('badge-black');
        
        cardWhite.classList.remove('winner-glow', 'loser-dim');
        cardBlack.classList.remove('winner-glow', 'loser-dim');
        badgeWhite.classList.remove('winner-badge', 'loser-badge');
        badgeBlack.classList.remove('winner-badge', 'loser-badge');
        badgeWhite.textContent = '';
        badgeBlack.textContent = '';
        
        // Set title and reason
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-reason').textContent = reason;
        
        // Apply theme & icon based on result type
        if (resultType === 'victory') {
            screen.classList.add('victory-theme');
            icon.className = 'fa-solid fa-crown result-icon';
            
            // Mark winner card (player is white by default)
            const winnerCard = GameController.playerColor === 'w' ? cardWhite : cardBlack;
            const loserCard = GameController.playerColor === 'w' ? cardBlack : cardWhite;
            const winnerBadge = GameController.playerColor === 'w' ? badgeWhite : badgeBlack;
            const loserBadge = GameController.playerColor === 'w' ? badgeBlack : badgeWhite;
            
            winnerCard.classList.add('winner-glow');
            loserCard.classList.add('loser-dim');
            winnerBadge.classList.add('winner-badge');
            winnerBadge.textContent = 'WIN';
            loserBadge.classList.add('loser-badge');
            loserBadge.textContent = 'LOSS';
            
            // Trigger confetti
            this.startConfetti();
            
        } else if (resultType === 'defeat') {
            screen.classList.add('defeat-theme');
            icon.className = 'fa-solid fa-skull-crossbones result-icon';
            
            const winnerCard = GameController.playerColor === 'w' ? cardBlack : cardWhite;
            const loserCard = GameController.playerColor === 'w' ? cardWhite : cardBlack;
            const winnerBadge = GameController.playerColor === 'w' ? badgeBlack : badgeWhite;
            const loserBadge = GameController.playerColor === 'w' ? badgeWhite : badgeBlack;
            
            winnerCard.classList.add('winner-glow');
            loserCard.classList.add('loser-dim');
            winnerBadge.classList.add('winner-badge');
            winnerBadge.textContent = 'WIN';
            loserBadge.classList.add('loser-badge');
            loserBadge.textContent = 'LOSS';
            
        } else {
            // Draw
            screen.classList.add('draw-theme');
            icon.className = 'fa-regular fa-handshake result-icon';
        }
        
        // Update player names from game header
        const whiteName = document.querySelector('#player-white-info .player-name');
        const blackName = document.querySelector('#player-black-info .player-name');
        if (whiteName) document.getElementById('result-name-white').textContent = whiteName.textContent;
        if (blackName) document.getElementById('result-name-black').textContent = blackName.textContent;
        
        this.switchScreen('result');
    },
    
    // --- Confetti System ---
    confettiParticles: [],
    confettiAnimId: null,
    
    startConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        this.confettiParticles = [];
        const colors = ['#fbbf24', '#8b5cf6', '#00d4ff', '#4ade80', '#f87171', '#f59e0b', '#ec4899'];
        
        for (let i = 0; i < 150; i++) {
            this.confettiParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 8 + 4,
                h: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedY: Math.random() * 3 + 2,
                speedX: (Math.random() - 0.5) * 2,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: Math.random() * 0.5 + 0.5
            });
        }
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            
            this.confettiParticles.forEach(p => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotSpeed;
                p.speedY += 0.05; // gravity
                
                if (p.y < canvas.height + 20) {
                    alive = true;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            });
            
            if (alive) {
                this.confettiAnimId = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        
        // Cancel previous if any
        if (this.confettiAnimId) cancelAnimationFrame(this.confettiAnimId);
        animate();
    },

    showFloatingStatus(text) {
        const div = document.createElement('div');
        div.className = 'floating-status';
        div.textContent = text;
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.classList.add('fade-out');
            setTimeout(() => div.remove(), 1000);
        }, 1500);
    }
};
