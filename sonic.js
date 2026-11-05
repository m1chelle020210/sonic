
const canvas = document.getElementById("sonic");

if (!canvas) throw new Error('Canvas mit id="sonic" wurde nicht gefunden.');

const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 80;
const WORLD_W = 10000;
const GOAL_X = 9600;

const keys = {};
const images = {};

function load(name, path) {
    const img = new Image();
    img.onload = draw;
    img.onerror = () => console.error("Bild nicht gefunden:", path);
    img.src = path;
    images[name] = img;
    return img;
}

for (let i = 1; i <= 4; i++) load(`idle${i}`, `picture/idle_0${i}.png`);
for (let i = 1; i <= 6; i++) load(`run${i}`, `picture/run_0${i}.png`);
for (let i = 1; i <= 4; i++) load(`fast${i}`, `picture/run_fast_0${i}.png`);
for (let i = 1; i <= 5; i++) load(`jump${i}`, `picture/jump_roll_0${i}.png`);
for (let i = 1; i <= 67; i++) load(`tile${i}`, `picture/greenhill/${i}.png`);

const sonic = {
    x: 100,
    y: GROUND_Y - 54,
    w: 42,
    h: 54,
    vx: 0,
    vy: 0,
    grounded: true,
    dir: 1
};

const platforms = [
    { x: 650, y: GROUND_Y - 100, w: 190 },
    { x: 1100, y: GROUND_Y - 140, w: 190 },
    { x: 1600, y: GROUND_Y - 85, w: 220 },
    { x: 2500, y: GROUND_Y - 115, w: 220 },
    { x: 3300, y: GROUND_Y - 155, w: 220 },
    { x: 4300, y: GROUND_Y - 100, w: 220 },
    { x: 5200, y: GROUND_Y - 140, w: 240 },
    { x: 6200, y: GROUND_Y - 105, w: 220 },
    { x: 7300, y: GROUND_Y - 155, w: 250 },
    { x: 8400, y: GROUND_Y - 110, w: 240 }
];

const loops = [
    { x: 1850, width: 256, radius: 78 },
    { x: 4550, width: 256, radius: 78 },
    { x: 7550, width: 256, radius: 78 }
];

const enemies = [
    { x: 900, start: 850, end: 1030, y: GROUND_Y - 34, vx: 1.3, alive: true },
    { x: 1450, start: 1360, end: 1530, y: GROUND_Y - 34, vx: -1.5, alive: true },
    { x: 2200, start: 2100, end: 2310, y: GROUND_Y - 34, vx: 1.6, alive: true },
    { x: 2950, start: 2850, end: 3100, y: GROUND_Y - 34, vx: -1.4, alive: true },
    { x: 3850, start: 3750, end: 3990, y: GROUND_Y - 34, vx: 1.7, alive: true },
    { x: 4900, start: 4800, end: 5040, y: GROUND_Y - 34, vx: -1.5, alive: true },
    { x: 5800, start: 5680, end: 5920, y: GROUND_Y - 34, vx: 1.8, alive: true },
    { x: 6800, start: 6700, end: 6920, y: GROUND_Y - 34, vx: -1.6, alive: true },
    { x: 7900, start: 7800, end: 8030, y: GROUND_Y - 34, vx: 1.5, alive: true },
    { x: 9000, start: 8890, end: 9120, y: GROUND_Y - 34, vx: -1.7, alive: true }
];

const rings = [];

for (let x = 300; x < WORLD_W - 200; x += 95) {
    rings.push({
        x,
        y: GROUND_Y - 75 - Math.sin(x * 0.006) * 20,
        taken: false
    });
}

for (const p of platforms) {
    for (let i = 0; i < 5; i++) {
        rings.push({
            x: p.x + 30 + i * 32,
            y: p.y - 35,
            taken: false
        });
    }
}

let camera = 0;
let frame = 0;
let ringCount = 0;
let gameOver = false;
let won = false;
let startTime = performance.now();
let loopState = null;

const bestElement = document.getElementById("best");
let best = Number(localStorage.getItem("sonicGreenHillBest") || 0);

if (bestElement) bestElement.textContent = best;

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) {
        e.preventDefault();
    }

    if ((gameOver || won) && key === "r") {
        location.reload();
        return;
    }

    if (gameOver || won) return;

    if (
        !keys[key] &&
        (key === " " || key === "arrowup" || key === "w") &&
        sonic.grounded &&
        !loopState
    ) {
        sonic.vy = -13.5;
        sonic.grounded = false;
    }

    keys[key] = true;
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    for (const key in keys) keys[key] = false;
});

function ready(img) {
    return !!img && img.complete && img.naturalWidth > 0;
}

function drawImage(img, x, y, w, h, flip = false) {
    if (!ready(img)) return;

    ctx.save();

    if (flip) {
        ctx.translate(x + w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, y, w, h);
    } else {
        ctx.drawImage(img, x, y, w, h);
    }

    ctx.restore();
}

function drawBackground() {
    ctx.fillStyle = "#0800a8";
    ctx.fillRect(0, 0, W, H);

    const bg = images.tile67;

    if (ready(bg)) {
        ctx.drawImage(bg, 0, 0, W, GROUND_Y + 20);
    }
}

function drawGround() {
    const ground = images.tile59;
    const tileW = 256;
    const tileH = 256;
    const offset = camera % tileW;

    if (ready(ground)) {
        for (let x = -offset - tileW; x < W + tileW; x += tileW) {
            ctx.drawImage(
                ground,
                x,
                GROUND_Y - 126,
                tileW,
                tileH
            );
        }
    } else {
        ctx.fillStyle = "#995126";
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

        ctx.fillStyle = "#35df45";
        ctx.fillRect(0, GROUND_Y - 2, W, 4);
    }
}

function drawPlatforms() {
    const tile = images.tile60;

    for (const p of platforms) {
        const x = p.x - camera;

        if (x + p.w < 0 || x > W) continue;

        if (ready(tile)) {
            const platformHeight = 100;

            ctx.drawImage(
                tile,
                0,
                0,
                tile.naturalWidth,
                tile.naturalHeight,
                x,
                p.y - platformHeight * 0.75,
                p.w,
                platformHeight
            );
        } else {
            ctx.fillStyle = "#35df45";
            ctx.fillRect(x, p.y, p.w, 6);

            ctx.fillStyle = "#995126";
            ctx.fillRect(x, p.y + 6, p.w, 34);
        }
    }
}

function drawLoops() {
    for (const l of loops) {
        const x = l.x - camera;

        if (x + l.width < 0 || x > W) continue;

        drawImage(
            images.tile53,
            x,
            GROUND_Y - 192,
            l.width,
            256
        );
    }
}

function drawRings() {
    for (const r of rings) {
        if (r.taken) continue;

        const x = r.x - camera;

        if (x < -20 || x > W + 20) continue;

        ctx.beginPath();
        ctx.ellipse(x, r.y, 8, 12, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffbd00";
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(x - 1, r.y, 4, 8, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff18a";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawEnemy(enemy) {
    if (!enemy.alive) return;

    const x = enemy.x - camera;
    const y = enemy.y;

    if (x < -50 || x > W + 50) return;

    ctx.save();

    const facingLeft = enemy.vx < 0;
    ctx.translate(x + 17, 0);
    if (facingLeft) ctx.scale(-1, 1);
    ctx.translate(-(x + 17), 0);

    // Kleine Roboterfüße
    ctx.fillStyle = "#25283c";
    ctx.fillRect(x + 3, y + 25, 10, 7);
    ctx.fillRect(x + 21, y + 25, 10, 7);

    // Roter Roboterkörper
    ctx.fillStyle = "#d92d35";
    ctx.fillRect(x + 3, y + 9, 28, 19);

    // Metallpanzer
    ctx.fillStyle = "#a9b5c5";
    ctx.fillRect(x + 6, y + 4, 22, 14);

    ctx.fillStyle = "#697b92";
    ctx.fillRect(x + 8, y + 2, 18, 5);

    // Augen
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 10, y + 7, 6, 6);
    ctx.fillRect(x + 20, y + 7, 6, 6);

    ctx.fillStyle = "#171b29";
    ctx.fillRect(x + 13, y + 9, 3, 4);
    ctx.fillRect(x + 21, y + 9, 3, 4);

    // Seitliche Metallteile
    ctx.fillStyle = "#d8e0ea";
    ctx.fillRect(x, y + 14, 5, 8);
    ctx.fillRect(x + 29, y + 14, 5, 8);

    // Kleine Antenne
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(x + 16, y - 3, 3, 6);
    ctx.beginPath();
    ctx.arc(x + 17.5, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawEnemies() {
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }
}

function drawGoal() {
    const x = GOAL_X - camera;

    if (x < -100 || x > W + 100) return;

    // Zielpfosten
    ctx.fillStyle = "#e7e7e7";
    ctx.fillRect(x, GROUND_Y - 105, 7, 105);

    ctx.fillStyle = "#ffe044";
    ctx.beginPath();
    ctx.arc(x + 3.5, GROUND_Y - 108, 8, 0, Math.PI * 2);
    ctx.fill();

    // Zielflagge
    ctx.fillStyle = "#ed3030";
    ctx.beginPath();
    ctx.moveTo(x + 7, GROUND_Y - 100);
    ctx.lineTo(x + 54, GROUND_Y - 85);
    ctx.lineTo(x + 7, GROUND_Y - 70);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("GOAL", x + 10, GROUND_Y - 84);
}

function drawSonic() {
    let sprite;

    if (loopState || !sonic.grounded) {
        sprite = images[`jump${Math.floor(frame / 5) % 5 + 1}`];
    } else if (Math.abs(sonic.vx) > 5) {
        sprite = images[`fast${Math.floor(frame / 4) % 4 + 1}`];
    } else if (Math.abs(sonic.vx) > 0.3) {
        sprite = images[`run${Math.floor(frame / 5) % 6 + 1}`];
    } else {
        sprite = images[`idle${Math.floor(frame / 10) % 4 + 1}`];
    }

    if (ready(sprite)) {
        drawImage(
            sprite,
            sonic.x - camera,
            sonic.y,
            sonic.w,
            sonic.h,
            sonic.dir < 0
        );
    }
}

function startLoop(l, direction) {
    const r = l.radius;
    const cx = l.x + l.width / 2;
    const cy = GROUND_Y - r - sonic.h / 2;

    loopState = {
        loop: l,
        direction,
        rotation: direction > 0 ? -1 : 1,
        angle: direction > 0 ? Math.PI * 0.75 : Math.PI * 0.25,
        cx,
        cy,
        r,
        speed: Math.max(Math.abs(sonic.vx), 4.5),
        travelled: 0
    };

    sonic.vy = 0;
    sonic.grounded = false;
}

function updateLoop() {
    const s = loopState;
    if (!s) return;

    const step = Math.min(0.13, s.speed / s.r);

    s.angle += s.rotation * step;
    s.travelled += step;

    sonic.x = s.cx + Math.cos(s.angle) * s.r - sonic.w / 2;
    sonic.y = s.cy + Math.sin(s.angle) * s.r - sonic.h / 2;
    sonic.dir = s.direction;

    if (s.travelled >= Math.PI * 2) {
        sonic.x = s.direction > 0
            ? s.loop.x + s.loop.width
            : s.loop.x - sonic.w;

        sonic.y = GROUND_Y - sonic.h;
        sonic.vx = s.direction * Math.max(s.speed, 5);
        sonic.vy = 0;
        sonic.grounded = true;
        loopState = null;
    }
}

function updateEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        enemy.x += enemy.vx;

        if (enemy.x <= enemy.start) {
            enemy.x = enemy.start;
            enemy.vx = Math.abs(enemy.vx);
        }

        if (enemy.x >= enemy.end) {
            enemy.x = enemy.end;
            enemy.vx = -Math.abs(enemy.vx);
        }
    }
}

function checkEnemyCollisions(oldBottom) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const sonicRight = sonic.x + sonic.w;
        const sonicBottom = sonic.y + sonic.h;
        const enemyRight = enemy.x + 34;
        const enemyBottom = enemy.y + 32;

        const touching =
            sonicRight > enemy.x + 3 &&
            sonic.x < enemyRight &&
            sonicBottom > enemy.y + 3 &&
            sonic.y < enemyBottom;

        if (!touching) continue;

        // Von oben auf den Roboter springen
        if (sonic.vy > 0 && oldBottom <= enemy.y + 12) {
            enemy.alive = false;
            sonic.y = enemy.y - sonic.h;
            sonic.vy = -9;
            sonic.grounded = false;
        } else {
            gameOver = true;
        }
    }
}

function update() {
    if (gameOver || won) return;

    frame++;

    const left = keys.arrowleft || keys.a;
    const right = keys.arrowright || keys.d;

    updateEnemies();

    if (loopState) {
        updateLoop();
    } else {
        if (left && !right) {
            sonic.vx = Math.max(-6.5, sonic.vx - 0.65);
            sonic.dir = -1;
        } else if (right && !left) {
            sonic.vx = Math.min(6.5, sonic.vx + 0.65);
            sonic.dir = 1;
        } else {
            sonic.vx *= 0.82;
        }

        const oldBottom = sonic.y + sonic.h;
        const oldX = sonic.x;

        sonic.x += sonic.vx;
        sonic.vy += 0.62;
        sonic.y += sonic.vy;
        sonic.grounded = false;

        if (sonic.y + sonic.h >= GROUND_Y) {
            sonic.y = GROUND_Y - sonic.h;
            sonic.vy = 0;
            sonic.grounded = true;
        }

        if (sonic.vy >= 0) {
            for (const p of platforms) {
                if (
                    sonic.x + sonic.w > p.x &&
                    sonic.x < p.x + p.w &&
                    oldBottom <= p.y + 2 &&
                    sonic.y + sonic.h >= p.y
                ) {
                    sonic.y = p.y - sonic.h;
                    sonic.vy = 0;
                    sonic.grounded = true;
                }
            }
        }

        for (const l of loops) {
            if (!sonic.grounded || Math.abs(sonic.vx) < 3.5) continue;

            const oldCenter = oldX + sonic.w / 2;
            const center = sonic.x + sonic.w / 2;
            const leftEntry = l.x + 30;
            const rightEntry = l.x + l.width - 30;

            if (
                sonic.vx > 0 &&
                oldCenter < leftEntry &&
                center >= leftEntry
            ) {
                startLoop(l, 1);
                break;
            }

            if (
                sonic.vx < 0 &&
                oldCenter > rightEntry &&
                center <= rightEntry
            ) {
                startLoop(l, -1);
                break;
            }
        }

        checkEnemyCollisions(oldBottom);
    }

    sonic.x = Math.max(0, Math.min(WORLD_W - sonic.w, sonic.x));

    for (const r of rings) {
        if (
            !r.taken &&
            Math.abs(sonic.x + sonic.w / 2 - r.x) < 25 &&
            Math.abs(sonic.y + sonic.h / 2 - r.y) < 35
        ) {
            r.taken = true;
            ringCount++;
        }
    }

    if (sonic.x + sonic.w >= GOAL_X) {
        won = true;
        saveBest();
    }

    camera = Math.max(0, Math.min(WORLD_W - W, sonic.x - W * 0.36));

    const ringElement = document.getElementById("rings");
    if (ringElement) ringElement.textContent = ringCount;

    const timerElement = document.getElementById("timer");

    if (timerElement) {
        const seconds = Math.floor((performance.now() - startTime) / 1000);

        timerElement.textContent =
            `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }
}

function saveBest() {
    if (ringCount > best) {
        best = ringCount;
        localStorage.setItem("sonicGreenHillBest", best);
        if (bestElement) bestElement.textContent = best;
    }
}

function drawHUD() {
    ctx.fillStyle = "#001b35cc";
    ctx.fillRect(18, 16, 190, 42);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.fillText("RINGE: " + ringCount, 30, 42);

    if (gameOver || won) {
        ctx.fillStyle = "#00101ddd";
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = "center";

        if (won) {
            ctx.fillStyle = "#ffe23a";
            ctx.font = "bold 42px Arial";
            ctx.fillText("LEVEL GESCHAFFT!", W / 2, H / 2 - 25);

            ctx.fillStyle = "#fff";
            ctx.font = "22px Arial";
            ctx.fillText("Ringe gesammelt: " + ringCount, W / 2, H / 2 + 15);
        } else {
            ctx.fillStyle = "#ff4545";
            ctx.font = "bold 48px Arial";
            ctx.fillText("GAME OVER", W / 2, H / 2 - 15);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.fillText("Drücke R zum Neustarten", W / 2, H / 2 + 55);

        ctx.textAlign = "left";
        saveBest();
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    drawBackground();
    drawGround();
    drawLoops();
    drawPlatforms();
    drawGoal();
    drawRings();
    drawEnemies();
    drawSonic();
    drawHUD();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

draw();
gameLoop();
