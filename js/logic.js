// logic.js - Core Chess Engine

const Logic = {
    board: new Array(64).fill(null),
    turn: 'w', // 'w' or 'b'
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null, // index of target square
    halfMoves: 0,
    fullMoves: 1,
    
    // History for undo and threefold repetition
    history: [],

    // FEN parsing
    loadFEN(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        this.board.fill(null);
        const parts = fen.split(' ');
        const ranks = parts[0].split('/');
        
        let index = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < ranks[r].length; c++) {
                const char = ranks[r][c];
                if (!isNaN(char)) {
                    index += parseInt(char, 10);
                } else {
                    this.board[index] = char;
                    index++;
                }
            }
        }
        
        this.turn = parts[1] || 'w';
        
        const castlingStr = parts[2] || '-';
        this.castling = {
            K: castlingStr.includes('K'),
            Q: castlingStr.includes('Q'),
            k: castlingStr.includes('k'),
            q: castlingStr.includes('q')
        };
        
        this.enPassant = parts[3] && parts[3] !== '-' ? this.algebraicToIndex(parts[3]) : null;
        this.halfMoves = parseInt(parts[4] || 0, 10);
        this.fullMoves = parseInt(parts[5] || 1, 10);
        
        this.history = [];
        this.saveState();
    },
    
    saveState() {
        this.history.push({
            board: [...this.board],
            turn: this.turn,
            castling: { ...this.castling },
            enPassant: this.enPassant,
            halfMoves: this.halfMoves,
            fullMoves: this.fullMoves
        });
    },
    
    undo() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current state
            const state = this.history[this.history.length - 1];
            this.board = [...state.board];
            this.turn = state.turn;
            this.castling = { ...state.castling };
            this.enPassant = state.enPassant;
            this.halfMoves = state.halfMoves;
            this.fullMoves = state.fullMoves;
            return true;
        }
        return false;
    },

    algebraicToIndex(sq) {
        const file = sq.charCodeAt(0) - 97; // 'a' is 97
        const rank = 8 - parseInt(sq[1], 10);
        return rank * 8 + file;
    },

    indexToAlgebraic(index) {
        const file = String.fromCharCode(97 + (index % 8));
        const rank = 8 - Math.floor(index / 8);
        return file + rank;
    },

    isWhite(piece) {
        return piece && piece === piece.toUpperCase();
    },

    isBlack(piece) {
        return piece && piece === piece.toLowerCase();
    },

    getColor(piece) {
        if (!piece) return null;
        return this.isWhite(piece) ? 'w' : 'b';
    },

    // Move generation
    getLegalMoves() {
        const moves = this.getPseudoLegalMoves(this.turn);
        return moves.filter(move => {
            return this.isLegal(move);
        });
    },

    isLegal(move) {
        // Apply move temporarily
        const originalState = {
            board: [...this.board],
            turn: this.turn,
            castling: { ...this.castling },
            enPassant: this.enPassant
        };
        
        this.makeMove(move, true);
        const inCheck = this.isKingInCheck(originalState.turn);
        
        // Revert
        this.board = originalState.board;
        this.turn = originalState.turn;
        this.castling = originalState.castling;
        this.enPassant = originalState.enPassant;
        
        return !inCheck;
    },

    isKingInCheck(color) {
        // Find king
        let kingIndex = -1;
        const targetKing = color === 'w' ? 'K' : 'k';
        for (let i = 0; i < 64; i++) {
            if (this.board[i] === targetKing) {
                kingIndex = i;
                break;
            }
        }
        
        if (kingIndex === -1) return false; // Should not happen in normal play
        
        const opponentColor = color === 'w' ? 'b' : 'w';
        const opponentMoves = this.getPseudoLegalMoves(opponentColor);
        
        for (let move of opponentMoves) {
            if (move.to === kingIndex) return true;
        }
        return false;
    },

    getPseudoLegalMoves(color) {
        let moves = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && this.getColor(piece) === color) {
                moves = moves.concat(this.getPieceMoves(i));
            }
        }
        return moves;
    },

    getPieceMoves(index) {
        const piece = this.board[index];
        const type = piece.toLowerCase();
        let moves = [];
        
        const row = Math.floor(index / 8);
        const col = index % 8;

        const addMove = (r, c, isCaptureOnly = false, isNormalOnly = false) => {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            const targetIndex = r * 8 + c;
            const targetPiece = this.board[targetIndex];
            
            if (targetPiece) {
                if (!isNormalOnly && this.getColor(targetPiece) !== this.getColor(piece)) {
                    moves.push({ from: index, to: targetIndex, capture: true });
                }
                return false; // Hit a piece, stop sliding
            } else {
                if (!isCaptureOnly) {
                    moves.push({ from: index, to: targetIndex, capture: false });
                    return true; // Empty square, can continue sliding
                }
                return false;
            }
        };

        const slide = (dr, dc) => {
            let r = row + dr;
            let c = col + dc;
            while (addMove(r, c)) {
                r += dr;
                c += dc;
            }
        };

        switch (type) {
            case 'p': {
                const dir = this.getColor(piece) === 'w' ? -1 : 1;
                const startRow = this.getColor(piece) === 'w' ? 6 : 1;
                
                // One square forward
                if (row + dir >= 0 && row + dir <= 7 && !this.board[(row + dir) * 8 + col]) {
                    moves.push({ from: index, to: (row + dir) * 8 + col, capture: false });
                    // Two squares forward
                    if (row === startRow && !this.board[(row + 2 * dir) * 8 + col]) {
                        moves.push({ from: index, to: (row + 2 * dir) * 8 + col, capture: false, doublePawn: true });
                    }
                }
                // Captures
                if (col > 0) {
                    const tIdx = (row + dir) * 8 + (col - 1);
                    if ((this.board[tIdx] && this.getColor(this.board[tIdx]) !== this.getColor(piece)) || tIdx === this.enPassant) {
                        moves.push({ from: index, to: tIdx, capture: true, enPassant: tIdx === this.enPassant });
                    }
                }
                if (col < 7) {
                    const tIdx = (row + dir) * 8 + (col + 1);
                    if ((this.board[tIdx] && this.getColor(this.board[tIdx]) !== this.getColor(piece)) || tIdx === this.enPassant) {
                        moves.push({ from: index, to: tIdx, capture: true, enPassant: tIdx === this.enPassant });
                    }
                }
                break;
            }
            case 'r':
                slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
                break;
            case 'n': {
                const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                jumps.forEach(j => addMove(row + j[0], col + j[1]));
                break;
            }
            case 'b':
                slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
                break;
            case 'q':
                slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
                slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
                break;
            case 'k': {
                const steps = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                steps.forEach(s => addMove(row + s[0], col + s[1]));
                
                // Castling
                if (this.getColor(piece) === 'w' && row === 7 && col === 4) {
                    if (this.castling.K && !this.board[61] && !this.board[62]) {
                        moves.push({ from: index, to: 62, castling: 'K' });
                    }
                    if (this.castling.Q && !this.board[59] && !this.board[58] && !this.board[57]) {
                        moves.push({ from: index, to: 58, castling: 'Q' });
                    }
                } else if (this.getColor(piece) === 'b' && row === 0 && col === 4) {
                    if (this.castling.k && !this.board[5] && !this.board[6]) {
                        moves.push({ from: index, to: 6, castling: 'k' });
                    }
                    if (this.castling.q && !this.board[3] && !this.board[2] && !this.board[1]) {
                        moves.push({ from: index, to: 2, castling: 'q' });
                    }
                }
                break;
            }
        }
        
        // Handle Promotions (add to moves if pawn reaches end)
        if (type === 'p') {
            moves = moves.flatMap(m => {
                const targetRow = Math.floor(m.to / 8);
                if (targetRow === 0 || targetRow === 7) {
                    return ['q','r','b','n'].map(p => ({...m, promotion: this.getColor(piece) === 'w' ? p.toUpperCase() : p}));
                }
                return m;
            });
        }
        
        return moves;
    },

    makeMove(move, isTemp = false) {
        const piece = this.board[move.from];
        let capture = this.board[move.to] !== null;
        
        // Move piece
        this.board[move.to] = piece;
        this.board[move.from] = null;
        
        // En Passant capture
        if (move.enPassant) {
            const dir = this.getColor(piece) === 'w' ? 1 : -1;
            this.board[move.to + dir * 8] = null;
            capture = true;
        }
        
        // Promotion
        if (move.promotion) {
            this.board[move.to] = move.promotion;
        }
        
        // Castling
        if (move.castling) {
            if (move.castling === 'K') { this.board[61] = this.board[63]; this.board[63] = null; }
            if (move.castling === 'Q') { this.board[59] = this.board[56]; this.board[56] = null; }
            if (move.castling === 'k') { this.board[5] = this.board[7]; this.board[7] = null; }
            if (move.castling === 'q') { this.board[3] = this.board[0]; this.board[0] = null; }
        }
        
        // Update state
        if (!isTemp) {
            // En passant target square
            if (move.doublePawn) {
                const dir = this.getColor(piece) === 'w' ? -1 : 1;
                this.enPassant = move.from + dir * 8;
            } else {
                this.enPassant = null;
            }
            
            // Castling rights loss
            if (piece === 'K') { this.castling.K = false; this.castling.Q = false; }
            if (piece === 'k') { this.castling.k = false; this.castling.q = false; }
            if (piece === 'R') {
                if (move.from === 63) this.castling.K = false;
                if (move.from === 56) this.castling.Q = false;
            }
            if (piece === 'r') {
                if (move.from === 7) this.castling.k = false;
                if (move.from === 0) this.castling.q = false;
            }
            
            // Fifty move rule
            if (piece.toLowerCase() === 'p' || capture) {
                this.halfMoves = 0;
            } else {
                this.halfMoves++;
            }
            
            if (this.turn === 'b') this.fullMoves++;
            this.turn = this.turn === 'w' ? 'b' : 'w';
            
            this.saveState();
        }
        
        return capture;
    },

    getGameState() {
        const legalMoves = this.getLegalMoves();
        const inCheck = this.isKingInCheck(this.turn);
        
        if (legalMoves.length === 0) {
            if (inCheck) return 'checkmate';
            return 'stalemate';
        }
        
        if (this.halfMoves >= 100) return 'draw'; // Fifty move rule
        
        // Check threefold repetition (simple implementation based on history board matching)
        let reps = 0;
        const currentBoardStr = JSON.stringify(this.board);
        for(let state of this.history) {
            if(JSON.stringify(state.board) === currentBoardStr) {
                reps++;
            }
        }
        if(reps >= 3) return 'draw';
        
        if (inCheck) return 'check';
        return 'playing';
    }
};
