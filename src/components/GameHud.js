export class GameHud extends HTMLElement {
    constructor() {
        super();
        this.score = 0;
        this.buffed = null;
        this.nerfed = null;
        this.handleUpdateBound = this.handleUpdate.bind(this);
    }

    connectedCallback() {
        this.render();
        window.addEventListener('farmhand-update', this.handleUpdateBound);
    }

    disconnectedCallback() {
        window.removeEventListener('farmhand-update', this.handleUpdateBound);
    }

    /**
     * @param {Event} event
     */
    handleUpdate(event) {
        // @ts-ignore - CustomEvent detail typing
        const { score, buffed, nerfed } = event.detail;

        let shouldRender = false;
        if (score !== undefined && score !== this.score) {
            this.score = score;
            shouldRender = true;
        }
        if (buffed !== this.buffed || nerfed !== this.nerfed) {
            this.buffed = buffed;
            this.nerfed = nerfed;
            shouldRender = true;
        }

        if (shouldRender) {
            this.render();
        }
    }

    render() {
        this.innerHTML = `
            <style>
                .hud-container {
                    display: flex;
                    justify-content: space-between;
                    padding: 1rem;
                    background: var(--color-ui-bg);
                    color: white;
                    font-family: var(--font-primary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .market-status {
                    display: flex;
                    gap: 1rem;
                }
                .market-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .buffed { color: var(--color-buff); }
                .nerfed { color: var(--color-nerf); }
                .emoji {
                    font-size: 1.2rem;
                    font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;
                }
            </style>
            <div class="hud-container">
                <div class="score">Money: $${this.score}</div>
                <div class="market-status">
                    <div class="market-item buffed">
                        <span>▲</span>
                        <span class="emoji">${this.buffed || '-'}</span>
                    </div>
                    <div class="market-item nerfed">
                        <span>▼</span>
                        <span class="emoji">${this.nerfed || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('game-hud', GameHud);
