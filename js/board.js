// board.js - Handles DOM rendering and Drag & Drop

const Board = {
    container: null,
    squares: [],
    draggedPiece: null,
    dragStartIndex: -1,
    selectedSquare: -1,
    validMoves: [],
    onMoveAttempt: null, // Callback assigned by controller

    pieceSVGs: {
        'K': 'assets/pieces/white_king.svg',
        'Q': 'assets/pieces/white_queen.svg',
        'R': 'assets/pieces/white_rook.svg',
        'B': 'assets/pieces/white_bishop.svg',
        'N': 'assets/pieces/white_knight.svg',
        'P': 'assets/pieces/white_pawn.svg',
        'k': 'assets/pieces/black_king.svg',
        'q': 'assets/pieces/black_queen.svg',
        'r': 'assets/pieces/black_rook.svg',
        'b': 'assets/pieces/black_bishop.svg',
        'n': 'assets/pieces/black_knight.svg',
        'p': 'assets/pieces/black_pawn.svg'
    },
    
    lastMove: null,

    init() {
        this.container = document.getElementById('chessboard');
        this.createBoard();
        this.bindEvents();
    },

    createBoard() {
        this.container.innerHTML = '';
        this.squares = [];
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                const index = r * 8 + c;
                
                const square = document.createElement('div');
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.index = index;
                
                this.container.appendChild(square);
                this.squares.push(square);
            }
        }
    },

    render(boardState, flip = false) {
        for (let i = 0; i < 64; i++) {
            const square = this.squares[i];
            square.innerHTML = ''; // Clear square
            
                const piece = boardState[i];
            if (piece) {
                const img = document.createElement('img');
                img.src = this.pieceSVGs[piece];
                const isWhite = piece === piece.toUpperCase();
                img.className = `piece ${isWhite ? 'white-piece' : 'black-piece'}`;
                img.dataset.type = piece;
                img.dataset.index = i;
                img.draggable = false; // We use custom drag
                square.appendChild(img);
            }
        }
        
        if (flip) {
            this.container.style.transform = 'rotate(180deg)';
            document.querySelectorAll('.piece').forEach(p => {
                p.style.transform = 'rotate(180deg)';
            });
        } else {
            this.container.style.transform = 'rotate(0deg)';
            document.querySelectorAll('.piece').forEach(p => {
                p.style.transform = 'rotate(0deg)';
            });
        }
    },

    highlightValidMoves(moves) {
        this.clearHighlights();
        this.validMoves = moves;
        
        if (this.selectedSquare !== -1) {
            this.squares[this.selectedSquare].classList.add('highlight');
        }
        
        moves.forEach(m => {
            const sq = this.squares[m.to];
            if (m.capture) {
                sq.classList.add('capture-move');
            } else {
                sq.classList.add('valid-move');
            }
        });
    },

    clearHighlights() {
        this.squares.forEach(sq => {
            sq.classList.remove('highlight', 'valid-move', 'capture-move');
        });
        this.validMoves = [];
    },

    setCheckHighlight(index) {
        if(index >= 0 && index < 64) {
            this.squares[index].classList.add('in-check');
        }
    },
    
    clearCheckHighlight() {
        this.squares.forEach(sq => sq.classList.remove('check-highlight'));
    },

    setLastMoveHighlight(move) {
        this.clearLastMoveHighlight();
        this.lastMove = move;
        if (this.squares[move.from]) this.squares[move.from].classList.add('last-move');
        if (this.squares[move.to]) this.squares[move.to].classList.add('last-move');
    },

    clearLastMoveHighlight() {
        this.squares.forEach(sq => sq.classList.remove('last-move'));
    },

    bindEvents() {
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch support
        this.container.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) {
                const touch = e.touches[0];
                this.handleInputDown(touch.clientX, touch.clientY, e.target);
            }
        }, {passive: false});
        
        document.addEventListener('touchmove', (e) => {
            if(this.draggedPiece && e.touches.length > 0) {
                e.preventDefault(); // Prevent scrolling
                const touch = e.touches[0];
                this.handleInputMove(touch.clientX, touch.clientY);
            }
        }, {passive: false});
        
        document.addEventListener('touchend', (e) => {
            if(e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                this.handleInputUp(touch.clientX, touch.clientY);
            }
        });
    },

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click
        this.handleInputDown(e.clientX, e.clientY, e.target);
    },

    handleInputDown(clientX, clientY, target) {
        const piece = target.closest('.piece');
        const square = target.closest('.square');
        
        if (!square) return;
        
        const index = parseInt(square.dataset.index, 10);
        
        // If clicking on a valid move square while a piece is selected
        const validMove = this.validMoves.find(m => m.to === index);
        if (validMove && this.selectedSquare !== -1) {
            this.attemptMove(this.selectedSquare, index, validMove.promotion);
            return;
        }

        if (piece) {
            // Select piece and prepare to drag
            this.selectedSquare = index;
            this.dragStartIndex = index;
            this.draggedPiece = piece;
            
            // Ask controller for valid moves for this piece
            if (this.onPieceSelect) {
                this.onPieceSelect(index);
            }

            // Setup dragging visuals
            piece.classList.add('dragging');
            piece.style.position = 'fixed';
            piece.style.zIndex = '1000';
            piece.style.pointerEvents = 'none'; // So we can drop on squares below
            
            this.handleInputMove(clientX, clientY);
        } else {
            // Clicked empty square
            this.selectedSquare = -1;
            this.clearHighlights();
        }
    },

    handleMouseMove(e) {
        this.handleInputMove(e.clientX, e.clientY);
    },

    handleInputMove(clientX, clientY) {
        if (!this.draggedPiece) return;
        
        const pieceWidth = this.draggedPiece.offsetWidth;
        const pieceHeight = this.draggedPiece.offsetHeight;
        
        this.draggedPiece.style.left = `${clientX - pieceWidth / 2}px`;
        this.draggedPiece.style.top = `${clientY - pieceHeight / 2}px`;
    },

    handleMouseUp(e) {
        this.handleInputUp(e.clientX, e.clientY);
    },

    handleInputUp(clientX, clientY) {
        if (!this.draggedPiece) return;
        
        const piece = this.draggedPiece;
        this.draggedPiece = null;
        
        // Reset styles
        piece.classList.remove('dragging');
        piece.style.position = '';
        piece.style.zIndex = '';
        piece.style.left = '';
        piece.style.top = '';
        piece.style.pointerEvents = '';
        
        // Find square under cursor
        // Hide element temporarily to use elementFromPoint on the square underneath
        piece.style.display = 'none';
        const elemBelow = document.elementFromPoint(clientX, clientY);
        piece.style.display = '';
        
        const squareBelow = elemBelow ? elemBelow.closest('.square') : null;
        
        if (squareBelow) {
            const targetIndex = parseInt(squareBelow.dataset.index, 10);
            if (targetIndex !== this.dragStartIndex) {
                const validMove = this.validMoves.find(m => m.to === targetIndex);
                if (validMove) {
                    this.attemptMove(this.dragStartIndex, targetIndex, validMove.promotion);
                } else {
                    // Invalid move, snap back
                    this.render(Logic.board); 
                    if (this.lastMove) this.setLastMoveHighlight(this.lastMove);
                }
            } else {
                // Clicked in place, keep highlighted
            }
        } else {
            // Dropped outside board
            this.render(Logic.board); // Quick reset visually
        }
    },

    attemptMove(from, to, promotion = null) {
        const moveObj = this.validMoves.find(m => m.to === to);
        if (!moveObj) {
            this.selectedSquare = -1;
            this.clearHighlights();
            this.render(Logic.board);
            return;
        }

        if (moveObj.promotion && !promotion) {
            const piece = Logic.board[from];
            const color = Logic.getColor(piece);
            
            UI.showPromotionModal(color, (selectedPromotion) => {
                if (this.onMoveAttempt) {
                    this.onMoveAttempt({ from, to, promotion: selectedPromotion });
                }
            });
            this.selectedSquare = -1;
            this.clearHighlights();
            return;
        }

        if (this.onMoveAttempt) {
            if (moveObj.promotion && !promotion) {
                promotion = moveObj.promotion;
            }
            this.onMoveAttempt({ from, to, promotion });
        }
        this.selectedSquare = -1;
        this.clearHighlights();
    }
};
