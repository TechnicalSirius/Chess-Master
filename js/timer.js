// timer.js - Chess clock

const Timer = {
    whiteTime: 600, // seconds
    blackTime: 600,
    activeColor: 'w',
    intervalId: null,
    onTimeout: null, // Callback when someone runs out of time
    isEnabled: true,

    init(seconds) {
        this.stop();
        if(seconds === 'unlimited') {
            this.isEnabled = false;
            document.getElementById('timer-white').textContent = '∞';
            document.getElementById('timer-black').textContent = '∞';
            document.getElementById('timer-white').classList.remove('timer-warning');
            document.getElementById('timer-black').classList.remove('timer-warning');
            return;
        }
        
        this.isEnabled = true;
        this.whiteTime = parseInt(seconds, 10);
        this.blackTime = this.whiteTime;
        this.activeColor = 'w';
        
        this.updateUI();
    },

    start() {
        if (!this.isEnabled) return;
        this.stop();
        this.intervalId = setInterval(() => {
            if (this.activeColor === 'w') {
                this.whiteTime--;
                if (this.whiteTime <= 0) this.handleTimeout('w');
            } else {
                this.blackTime--;
                if (this.blackTime <= 0) this.handleTimeout('b');
            }
            this.updateUI();
        }, 1000);
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    switchTurn(color) {
        this.activeColor = color;
        if (this.isEnabled) this.start();
    },

    handleTimeout(color) {
        this.stop();
        if (this.onTimeout) {
            this.onTimeout(color); // The color that ran out of time
        }
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    updateUI() {
        if (!this.isEnabled) return;
        
        const wElem = document.getElementById('timer-white');
        const bElem = document.getElementById('timer-black');
        
        wElem.textContent = this.formatTime(this.whiteTime);
        bElem.textContent = this.formatTime(this.blackTime);

        if (this.whiteTime <= 30) wElem.classList.add('timer-warning');
        else wElem.classList.remove('timer-warning');
        
        if (this.blackTime <= 30) bElem.classList.add('timer-warning');
        else bElem.classList.remove('timer-warning');
    }
};
