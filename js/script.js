// script.js - Main Game Controller

const GameController = {
    mode: 'ai', // 'ai', 'local', 'online'
    aiDifficulty: '3',
    playerColor: 'w',
    isGameOver: false,
    moveCount: 1,

    init() {
        console.log("Chess Game Initialized");
        if(typeof Effects !== 'undefined') Effects.init();
        if(typeof UI !== 'undefined') UI.init();
        
        Logic.loadFEN(); // Load starting position
        Board.init();
        Board.render(Logic.board); // Ensure pieces are visible immediately
        
        // Bind UI starting events overriden for GameController
        document.querySelectorAll('[data-action="start-ai"]').forEach(btn => {
            btn.addEventListener('click', () => this.startGame('ai'));
        });
        document.querySelectorAll('[data-action="start-local"]').forEach(btn => {
            btn.addEventListener('click', () => this.startGame('local'));
        });
        document.querySelectorAll('[data-action="start-puzzle"]').forEach(btn => {
            btn.addEventListener('click', () => this.startGame('ai')); // Mocking puzzle as AI for now
        });
        
        // In-game controls
        document.getElementById('btn-undo').addEventListener('click', () => this.undoMove());
        document.getElementById('btn-resign').addEventListener('click', () => this.resign());
        document.getElementById('btn-draw').addEventListener('click', () => this.offerDraw());
        document.getElementById('btn-hint').addEventListener('click', () => this.showHint());
        
        document.querySelectorAll('[data-action="rematch"]').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(this.mode));
        });

        // Setup Board callbacks
        Board.onPieceSelect = (index) => {
            if (this.isGameOver) return;
            const piece = Logic.board[index];
            if (!piece) return;
            
            // Check turn
            if (Logic.turn !== Logic.getColor(piece)) return;
            
            // If AI's turn, block
            if (this.mode === 'ai' && Logic.turn !== this.playerColor) return;
            
            const moves = Logic.getLegalMoves().filter(m => m.from === index);
            Board.highlightValidMoves(moves);
        };

        Board.onMoveAttempt = (move) => {
            if (this.isGameOver) return;
            if (this.mode === 'ai' && Logic.turn !== this.playerColor) return;
            
            this.executeMove(move);
        };

        // Setup Timer callback
        Timer.onTimeout = (color) => {
            const winner = color === 'w' ? 'Black' : 'White';
            let result = 'defeat';
            if (this.mode === 'ai') {
                // If the color that timed out is NOT the player, it's a victory
                result = color !== this.playerColor ? 'victory' : 'defeat';
            }
            this.endGame(result, `${winner} Wins on Time`);
        };
        
        // Listen to settings changes if element exists
        const difficultySelect = document.getElementById('ai-difficulty');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.aiDifficulty = e.target.value;
            });
        }
    },

    startGame(mode) {
        if (typeof Timer !== 'undefined') Timer.stop();
        this.mode = mode;
        this.isGameOver = false;
        this.moveCount = 1;
        
        // Apply settings (with fallbacks if elements are missing)
        const timeControlElem = document.getElementById('time-control');
        const aiDifficultyElem = document.getElementById('ai-difficulty');
        
        const timeLimit = timeControlElem ? timeControlElem.value : '600';
        this.aiDifficulty = aiDifficultyElem ? aiDifficultyElem.value : '3';
        
        Logic.loadFEN(); // Reset to start
        Board.render(Logic.board);
        Board.clearHighlights();
        Board.clearCheckHighlight();
        UI.clearMoveHistory();
        Timer.init(timeLimit);

        // Clear captured pieces
        document.querySelector('#white-captured .captured-pieces-list').innerHTML = '';
        document.querySelector('#black-captured .captured-pieces-list').innerHTML = '';
        
        // Setup UI
        UI.switchScreen('game');
        this.updateTurnUI();
        
        if (mode === 'ai') {
            document.querySelector('#player-black-info .player-name').textContent = `AI (Lvl ${this.aiDifficulty})`;
        } else if (mode === 'local') {
            document.querySelector('#player-black-info .player-name').textContent = 'Player 2';
        }

        // Start timer if applicable
        if (timeLimit !== 'unlimited') Timer.start();
        
        Effects.playSound('move');
    },

    executeMove(move) {
        // Calculate move text for history
        const algebraicTo = Logic.indexToAlgebraic(move.to);
        const piece = Logic.board[move.from];
        const isCapture = Logic.board[move.to] !== null || move.enPassant;
        
        let moveText = `${piece.toUpperCase() !== 'P' ? piece.toUpperCase() : ''}${isCapture ? 'x' : ''}${algebraicTo}`;
        if (move.castling === 'K' || move.castling === 'k') moveText = 'O-O';
        if (move.castling === 'Q' || move.castling === 'q') moveText = 'O-O-O';
        if (move.promotion) moveText += `=${move.promotion.toUpperCase()}`;

        const capturedPiece = Logic.board[move.to] || (move.enPassant ? (Logic.turn === 'w' ? 'p' : 'P') : null);
        const captured = Logic.makeMove(move); // Actual execution
        
        // Play sound and update UI
        if (captured) {
            Effects.playSound('capture');
            if (capturedPiece) this.addCapturedPiece(capturedPiece);
        } else {
            Effects.playSound('move');
        }
        
        // Re-render
        Board.render(Logic.board);
        
        // Update history UI
        if (Logic.turn === 'b') { // White just moved
            UI.updateMoveHistory(this.moveCount, moveText, '');
        } else { // Black just moved
            // Find last row and update black move
            const tbody = document.getElementById('move-history-body');
            if (tbody.lastChild) {
                tbody.lastChild.cells[2].textContent = moveText;
            }
            this.moveCount++;
        }

        this.checkGameState();

        if (!this.isGameOver) {
            this.updateTurnUI();
            if (this.mode === 'ai' && Logic.turn !== this.playerColor) {
                setTimeout(() => this.makeAIMove(), 500); // Small delay for realism
            }
        }
    },

    makeAIMove() {
        if (this.isGameOver) return;
        const aiMove = AI.getBestMove(Logic, this.aiDifficulty, Logic.turn);
        if (aiMove) {
            this.executeMove(aiMove);
        }
    },

    checkGameState() {
        Board.clearCheckHighlight();
        const state = Logic.getGameState();
        
        if (state === 'check') {
            Effects.playSound('check');
            UI.showFloatingStatus('CHECK!');
            // Find king and highlight
            const targetKing = Logic.turn === 'w' ? 'K' : 'k';
            const kIdx = Logic.board.indexOf(targetKing);
            Board.setCheckHighlight(kIdx);
        } else if (state === 'checkmate') {
            const winnerColor = Logic.turn === 'w' ? 'b' : 'w';
            const winner = winnerColor === 'w' ? 'White' : 'Black';
            UI.showFloatingStatus('CHECKMATE!');
            
            // Determine if it's a victory or defeat for the player
            let result = 'victory';
            if (this.mode === 'ai') {
                result = winnerColor === this.playerColor ? 'victory' : 'defeat';
            }
            this.endGame(result, `${winner} wins by Checkmate`);
        } else if (state === 'stalemate') {
            this.endGame('draw', 'Stalemate — No legal moves');
        } else if (state === 'draw') {
            this.endGame('draw', 'Draw by Repetition or 50-Move Rule');
        }
    },

    updateTurnUI() {
        const turnText = document.querySelector('.turn-indicator');
        if (Logic.turn === 'w') {
            document.getElementById('player-white-info').classList.add('active-turn');
            document.getElementById('player-black-info').classList.remove('active-turn');
            if (turnText) turnText.innerHTML = '<span class="turn-dot white-dot"></span> White to move';
            Timer.switchTurn('w');
        } else {
            document.getElementById('player-black-info').classList.add('active-turn');
            document.getElementById('player-white-info').classList.remove('active-turn');
            if (turnText) turnText.innerHTML = '<span class="turn-dot black-dot"></span> Black to move';
            Timer.switchTurn('b');
        }
    },

    undoMove() {
        if (this.mode === 'online') return; // Cannot undo online
        
        if (this.mode === 'ai') {
            // Undo twice to get back to player's turn
            if (Logic.undo()) Logic.undo();
        } else {
            Logic.undo();
        }
        
        Board.render(Logic.board);
        Board.clearHighlights();
        Board.clearCheckHighlight();
        
        // Rebuild history (simplified clear for this demo)
        UI.clearMoveHistory();
        // In a full app, we'd iterate this.history to rebuild UI.
        
        this.updateTurnUI();
        this.isGameOver = false;
    },
    
    showHint() {
        if (this.isGameOver) return;
        const hintMove = AI.getBestMove(Logic, '4', Logic.turn); // High depth hint
        if (hintMove) {
            Board.squares[hintMove.from].classList.add('highlight');
            Board.squares[hintMove.to].classList.add('valid-move');
            setTimeout(() => {
                Board.squares[hintMove.from].classList.remove('highlight');
                Board.squares[hintMove.to].classList.remove('valid-move');
            }, 1000);
        }
    },

    resign() {
        if (this.isGameOver) return;
        const winner = Logic.turn === 'w' ? 'Black' : 'White';
        // If player resigns, it's always a defeat for the player
        let result = 'defeat';
        if (this.mode === 'ai') {
            result = Logic.turn === this.playerColor ? 'defeat' : 'victory';
        }
        this.endGame(result, `${winner} wins by Resignation`);
    },
    
    offerDraw() {
        if (this.isGameOver) return;
        if (this.mode === 'ai') {
            // AI always rejects draw unless evaluation is exactly 0
            const score = AI.evaluateBoard(Logic.board);
            if(Math.abs(score) < 50) {
                this.endGame('draw', 'Draw agreed');
            } else {
                alert('AI declined the draw offer.');
            }
        }
    },

    endGame(result, reason) {
        this.isGameOver = true;
        Timer.stop();
        
        let title = 'VICTORY';
        if (result === 'defeat') title = 'DEFEAT';
        if (result === 'draw') title = 'DRAW';
        
        // Collect stats
        const stats = {
            moves: this.moveCount,
            time: Timer.isEnabled ? Timer.formatTime(Logic.turn === 'w' ? Timer.whiteTime : Timer.blackTime) : 'N/A',
            accuracy: Math.floor(Math.random() * 20 + 80) + '%'
        };
        
        // Update stats on result screen
        document.getElementById('stat-moves').textContent = stats.moves;
        document.getElementById('stat-time').textContent = stats.time;
        document.getElementById('stat-accuracy').textContent = stats.accuracy;
        
        setTimeout(() => {
            UI.showResult(title, reason, result);
            if (result === 'victory') {
                Effects.playSound('victory');
            } else if (result === 'defeat') {
                Effects.playSound('defeat');
            }
        }, 1500); // Delay so they can see the board
    },

    addCapturedPiece(piece) {
        const isWhitePiece = piece === piece.toUpperCase();
        const containerId = isWhitePiece ? 'black-captured' : 'white-captured';
        const container = document.querySelector(`#${containerId} .captured-pieces-list`);
        
        if (container) {
            const img = document.createElement('img');
            img.src = Board.pieceSVGs[piece];
            img.className = 'captured-piece-icon';
            container.appendChild(img);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GameController.init();
});
