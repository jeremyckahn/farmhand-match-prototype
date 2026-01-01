// @ts-check

// Constants
const GRID_ROWS = 10;
const GRID_COLS = 6;
const TILE_SIZE = 64; // Adjust based on screen, but we will scale
const MARKET_INTERVAL_MS = 30000;
const CASCADE_BONUS_BASE = 10;

const CROP_TYPES = [
    { type: 'corn', emoji: '🌽', value: 10 },
    { type: 'carrot', emoji: '🥕', value: 12 },
    { type: 'potato', emoji: '🥔', value: 8 },
    { type: 'grape', emoji: '🍇', value: 15 },
    { type: 'tomato', emoji: '🍅', value: 10 },
    { type: 'strawberry', emoji: '🍓', value: 20 },
];

class FarmhandGame extends Phaser.Scene {
    constructor() {
        super('FarmhandGame');
        /** @type {Phaser.GameObjects.Text[][]} */
        this.grid = [];
        this.score = 0;
        this.buffedCrop = null;
        this.nerfedCrop = null;
        this.marketTimer = 0;

        /** @type {Phaser.GameObjects.Text | null} */
        this.selectedTile = null;
        this.isProcessing = false;
    }

    create() {
        // Init Grid Array
        this.grid = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                this.grid[r][c] = this.createTile(r, c);
            }
        }

        // Center the grid in the camera
        const gridWidth = GRID_COLS * TILE_SIZE;
        const gridHeight = GRID_ROWS * TILE_SIZE;

        // Offset logic to center grid
        this.cameras.main.centerOn(gridWidth / 2 - TILE_SIZE / 2, gridHeight / 2 - TILE_SIZE / 2);

        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        // Initial Market State
        this.triggerMarketShift();

        // Market Timer
        this.time.addEvent({
            delay: MARKET_INTERVAL_MS,
            callback: this.triggerMarketShift,
            callbackScope: this,
            loop: true
        });

        this.updateHud();
    }

    triggerMarketShift() {
        // Pick two different crop types
        const types = [...CROP_TYPES];
        Phaser.Utils.Array.Shuffle(types);

        this.buffedCrop = types[0];
        this.nerfedCrop = types[1];

        this.updateHud();
    }

    /**
     * @param {Phaser.Input.Pointer} pointer
     */
    handlePointerDown(pointer) {
        if (this.isProcessing) return;

        // Convert world coordinates to grid coordinates
        // We need to account for the camera offset (centerOn)
        // Camera Center: (gridWidth/2 - TILE/2, gridHeight/2 - TILE/2)
        // So Top-Left of grid is at (0,0) in world space?
        // No, if we centerOn(center), then (0,0) is top-left.
        // Wait, TILE_SIZE is 64.
        // createTile puts tile at col*64, row*64.
        // The camera centers on the middle of the grid.
        // pointer.worldX/Y should be correct.

        // Find the closest tile
        const col = Math.round(pointer.worldX / TILE_SIZE);
        const row = Math.round(pointer.worldY / TILE_SIZE);

        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
            const tile = this.grid[row][col];
            if (tile) {
                this.selectTile(tile);
            }
        }
    }

    /**
     * @param {Phaser.Input.Pointer} pointer
     */
    handlePointerUp(pointer) {
        if (this.isProcessing) return;

        const swipeThreshold = TILE_SIZE / 2;
        const dx = pointer.x - pointer.downX;
        const dy = pointer.y - pointer.downY;

        // Check if swipe distance is enough
        if (Math.abs(dx) < swipeThreshold && Math.abs(dy) < swipeThreshold) {
            return;
        }

        // Determine direction
        const isHorizontal = Math.abs(dx) > Math.abs(dy);

        // Calculate source grid coords from the touch start position
        const worldDown = this.cameras.main.getWorldPoint(pointer.downX, pointer.downY);
        const startCol = Math.round(worldDown.x / TILE_SIZE);
        const startRow = Math.round(worldDown.y / TILE_SIZE);

        if (startRow < 0 || startRow >= GRID_ROWS || startCol < 0 || startCol >= GRID_COLS) {
            return;
        }

        const sourceTile = this.grid[startRow][startCol];
        if (!sourceTile) return;

        // Calculate target grid coords
        let targetRow = startRow;
        let targetCol = startCol;

        if (isHorizontal) {
            targetCol += dx > 0 ? 1 : -1;
        } else {
            targetRow += dy > 0 ? 1 : -1;
        }

        if (targetRow < 0 || targetRow >= GRID_ROWS || targetCol < 0 || targetCol >= GRID_COLS) {
            return;
        }

        const targetTile = this.grid[targetRow][targetCol];
        if (targetTile) {
            // Reset selection state if we are performing a swipe
            if (this.selectedTile) {
                this.selectedTile.setScale(1);
                this.selectedTile = null;
            }

            this.swapTiles(sourceTile, targetTile);
        }
    }

    /**
     * @param {Phaser.GameObjects.Text} tile
     */
    selectTile(tile) {
        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.setScale(1.2);
        } else {
            // Check adjacency
            const r1 = this.selectedTile.getData('row');
            const c1 = this.selectedTile.getData('col');
            const r2 = tile.getData('row');
            const c2 = tile.getData('col');

            const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);

            if (dist === 1) {
                this.swapTiles(this.selectedTile, tile);
                this.selectedTile.setScale(1);
                this.selectedTile = null;
            } else {
                // Deselect
                this.selectedTile.setScale(1);
                if (this.selectedTile === tile) {
                    this.selectedTile = null;
                } else {
                    this.selectedTile = tile;
                    tile.setScale(1.2);
                }
            }
        }
    }

    /**
     * @param {Phaser.GameObjects.Text} tile1
     * @param {Phaser.GameObjects.Text} tile2
     */
    swapTiles(tile1, tile2) {
        this.isProcessing = true;

        const r1 = tile1.getData('row');
        const c1 = tile1.getData('col');
        const r2 = tile2.getData('row');
        const c2 = tile2.getData('col');

        // Swap data in grid
        this.grid[r1][c1] = tile2;
        this.grid[r2][c2] = tile1;

        // Update data on objects
        tile1.setData('row', r2);
        tile1.setData('col', c2);
        tile2.setData('row', r1);
        tile2.setData('col', c1);

        // Tween positions
        this.tweens.add({
            targets: tile1,
            x: c2 * TILE_SIZE,
            y: r2 * TILE_SIZE,
            duration: 200
        });

        this.tweens.add({
            targets: tile2,
            x: c1 * TILE_SIZE,
            y: r1 * TILE_SIZE,
            duration: 200,
            onComplete: () => {
                this.checkMatchesAfterSwap(tile1, tile2);
            }
        });
    }

    /**
     * @param {Phaser.GameObjects.Text} tile1
     * @param {Phaser.GameObjects.Text} tile2
     */
    checkMatchesAfterSwap(tile1, tile2) {
        const matches = this.findMatches();

        if (matches.length > 0) {
            this.handleMatches(matches, 0);
        } else {
            // No match, but we keep the swap
            this.isProcessing = false;
        }
    }

    /**
     * @returns {Phaser.GameObjects.Text[]}
     */
    findMatches() {
        const matches = new Set();

        // Horizontal
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS - 2; c++) {
                const t1 = this.grid[r][c];
                const t2 = this.grid[r][c+1];
                const t3 = this.grid[r][c+2];

                if (t1.getData('type') === t2.getData('type') && t1.getData('type') === t3.getData('type')) {
                    matches.add(t1);
                    matches.add(t2);
                    matches.add(t3);
                    // Check further
                    let next = c + 3;
                    while (next < GRID_COLS && this.grid[r][next].getData('type') === t1.getData('type')) {
                        matches.add(this.grid[r][next]);
                        next++;
                    }
                }
            }
        }

        // Vertical
        for (let c = 0; c < GRID_COLS; c++) {
            for (let r = 0; r < GRID_ROWS - 2; r++) {
                const t1 = this.grid[r][c];
                const t2 = this.grid[r+1][c];
                const t3 = this.grid[r+2][c];

                if (t1.getData('type') === t2.getData('type') && t1.getData('type') === t3.getData('type')) {
                    matches.add(t1);
                    matches.add(t2);
                    matches.add(t3);
                    // Check further
                    let next = r + 3;
                    while (next < GRID_ROWS && this.grid[next][c].getData('type') === t1.getData('type')) {
                        matches.add(this.grid[next][c]);
                        next++;
                    }
                }
            }
        }

        return Array.from(matches);
    }

    /**
     * @param {Phaser.GameObjects.Text[]} matches
     * @param {number} cascadeIndex
     */
    handleMatches(matches, cascadeIndex) {
        // Calculate Score
        let matchScore = 0;
        const cascadeBonus = cascadeIndex * CASCADE_BONUS_BASE;

        matches.forEach(tile => {
            const baseValue = CROP_TYPES.find(c => c.type === tile.getData('type'))?.value || 0;
            let multiplier = 1;

            if (this.buffedCrop && this.buffedCrop.type === tile.getData('type')) {
                multiplier = 2;
            } else if (this.nerfedCrop && this.nerfedCrop.type === tile.getData('type')) {
                multiplier = 0.5;
            }

            matchScore += (baseValue * multiplier);
        });

        // Add bonus once per wave
        if (matches.length > 0) {
            matchScore += cascadeBonus;
        }

        this.score += Math.floor(matchScore);
        this.updateHud();

        // Destroy
        this.tweens.add({
            targets: matches,
            scaleX: 0,
            scaleY: 0,
            duration: 200,
            onComplete: () => {
                matches.forEach(tile => {
                    const r = tile.getData('row');
                    const c = tile.getData('col');
                    // @ts-ignore
                    this.grid[r][c] = null; // Mark as empty
                    tile.destroy();
                });
                this.applyGravity(cascadeIndex);
            }
        });
    }

    /**
     * @param {number} cascadeIndex
     */
    applyGravity(cascadeIndex) {
        let moves = [];

        // Move items down
        for (let c = 0; c < GRID_COLS; c++) {
            let emptySlots = 0;
            for (let r = GRID_ROWS - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    emptySlots++;
                } else if (emptySlots > 0) {
                    const tile = this.grid[r][c];
                    const targetRow = r + emptySlots;

                    this.grid[targetRow][c] = tile;
                    // @ts-ignore
                    this.grid[r][c] = null;

                    tile.setData('row', targetRow);

                    moves.push({
                        tile: tile,
                        targetY: targetRow * TILE_SIZE
                    });
                }
            }

            // Fill top with new items
            for (let r = 0; r < emptySlots; r++) {
                const tile = this.createTile(r - emptySlots, c); // Start above screen
                const targetRow = r;

                this.grid[targetRow][c] = tile;
                tile.setData('row', targetRow);

                moves.push({
                    tile: tile,
                    targetY: targetRow * TILE_SIZE
                });
            }
        }

        // Animate Fall
        if (moves.length > 0) {
            this.tweens.add({
                targets: moves.map(m => m.tile),
                // @ts-ignore
                y: (target, targetKey, value, targetIndex, totalTargets, tween) => {
                     // @ts-ignore
                    return moves.find(m => m.tile === target).targetY;
                },
                duration: 300,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    const newMatches = this.findMatches();
                    if (newMatches.length > 0) {
                        this.handleMatches(newMatches, cascadeIndex + 1);
                    } else {
                        this.isProcessing = false;
                    }
                }
            });
        } else {
             this.isProcessing = false;
        }
    }

    /**
     * @param {number} row
     * @param {number} col
     * @returns {Phaser.GameObjects.Text}
     */
    createTile(row, col) {
        const crop = Phaser.Utils.Array.GetRandom(CROP_TYPES);
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        const text = this.add.text(x, y, crop.emoji, {
            fontSize: '48px',
            fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif'
        }).setOrigin(0.5);

        text.setData('type', crop.type);
        text.setData('row', row);
        text.setData('col', col);

        return text;
    }

    updateHud() {
        const event = new CustomEvent('farmhand-update', {
            detail: {
                score: this.score,
                buffed: this.buffedCrop ? this.buffedCrop.emoji : null,
                nerfed: this.nerfedCrop ? this.nerfedCrop.emoji : null
            }
        });
        window.dispatchEvent(event);
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GRID_COLS * TILE_SIZE,
    height: GRID_ROWS * TILE_SIZE,
    backgroundColor: '#34495e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: FarmhandGame
};

// @ts-ignore
const game = new Phaser.Game(config);
