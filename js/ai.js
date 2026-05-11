const AI = {
    // Piece values
    pieceValues: {
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
        'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    },

    // Piece-square tables (PST) from White's perspective
    pst: {
        p: [
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
             5,  5, 10, 25, 25, 10,  5,  5,
             0,  0,  0, 20, 20,  0,  0,  0,
             5, -5,-10,  0,  0,-10, -5,  5,
             5, 10, 10,-20,-20, 10, 10,  5,
             0,  0,  0,  0,  0,  0,  0,  0
        ],
        n: [
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50
        ],
        b: [
            -20,-10,-10,-10,-10,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5, 10, 10,  5,  0,-10,
            -10,  5,  5, 10, 10,  5,  5,-10,
            -10,  0, 10, 10, 10, 10,  0,-10,
            -10, 10, 10, 10, 10, 10, 10,-10,
            -10,  5,  0,  0,  0,  0,  5,-10,
            -20,-10,-10,-10,-10,-10,-10,-20
        ],
        r: [
              0,  0,  0,  0,  0,  0,  0,  0,
              5, 10, 10, 10, 10, 10, 10,  5,
             -5,  0,  0,  0,  0,  0,  0, -5,
             -5,  0,  0,  0,  0,  0,  0, -5,
             -5,  0,  0,  0,  0,  0,  0, -5,
             -5,  0,  0,  0,  0,  0,  0, -5,
             -5,  0,  0,  0,  0,  0,  0, -5,
              0,  0,  0,  5,  5,  0,  0,  0
        ],
        q: [
            -20,-10,-10, -5, -5,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5,  5,  5,  5,  0,-10,
             -5,  0,  5,  5,  5,  5,  0, -5,
              0,  0,  5,  5,  5,  5,  0, -5,
            -10,  5,  5,  5,  5,  5,  0,-10,
            -10,  0,  5,  0,  0,  0,  0,-10,
            -20,-10,-10, -5, -5,-10,-10,-20
        ],
        k: [
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -20,-30,-30,-40,-40,-30,-30,-20,
            -10,-20,-20,-20,-20,-20,-20,-10,
             20, 20,  0,  0,  0,  0, 20, 20,
             20, 30, 10,  0,  0, 10, 30, 20
        ]
    },

    difficultyDepth: {
        '1': 1,
        '3': 3,
        '4': 4
    },

    getBestMove(logicState, difficulty = '3', color = 'b') {
        const depth = this.difficultyDepth[difficulty] || 3;
        const moves = logicState.getLegalMoves();
        
        if (moves.length === 0) return null;

        // Simple Randomness for Easy
        if (difficulty === '1') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let bestMove = null;
        let bestValue = (color === 'w') ? -Infinity : Infinity;

        // Sort moves to improve pruning
        moves.sort((a, b) => {
            const valA = this.pieceValues[(logicState.board[a.to] || ' ').toLowerCase()] || 0;
            const valB = this.pieceValues[(logicState.board[b.to] || ' ').toLowerCase()] || 0;
            return valB - valA;
        });

        for (let move of moves) {
            logicState.makeMove(move);
            const boardValue = this.minimax(logicState, depth - 1, -Infinity, Infinity, color === 'b');
            logicState.undo();

            if (color === 'w') {
                if (boardValue > bestValue) {
                    bestValue = boardValue;
                    bestMove = move;
                }
            } else {
                if (boardValue < bestValue) {
                    bestValue = boardValue;
                    bestMove = move;
                }
            }
        }
        return bestMove || moves[0];
    },

    minimax(logicState, depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluateBoard(logicState.board);
        }

        const moves = logicState.getLegalMoves();
        if (moves.length === 0) {
            if (logicState.isKingInCheck(logicState.turn)) {
                return isMaximizing ? -50000 + depth : 50000 - depth;
            }
            return 0;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                logicState.makeMove(move);
                let eval = this.minimax(logicState, depth - 1, alpha, beta, false);
                logicState.undo();
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                logicState.makeMove(move);
                let eval = this.minimax(logicState, depth - 1, alpha, beta, true);
                logicState.undo();
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    },

    evaluateBoard(board) {
        let total = 0;
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece) {
                const type = piece.toLowerCase();
                const isWhite = piece === piece.toUpperCase();
                let val = this.pieceValues[type];
                
                // Add PST value
                const pstIndex = isWhite ? i : this.mirrorSquare(i);
                val += this.pst[type][pstIndex];
                
                total += isWhite ? val : -val;
            }
        }
        return total;
    },

    mirrorSquare(i) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        return (7 - row) * 8 + col;
    }
};
