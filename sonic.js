
const canvas = document.getElementById("sonic");
if (!canvas) throw new Error('Canvas mit id="sonic" wurde nicht gefunden.');

const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 430;
const WORLD_W = 10000;

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

for (let i = 1; i <= 4; i++) {
    load(`idle${i}`, `picture/idle_0${i}.png`);
}
for (let i = 1; i <= 6; i++) {
    load(`run${i}`, `picture/run_0${i}.png`);
}
for (let i = 1; i <= 4; i++) {
    load(`fast${i}`, `picture/run_fast_0${i}.png`);
}
for (let i = 1; i <= 5; i++) {
    load(`jump${i}`, `picture/jump_roll_0${i}.png`);
}

for (let i = 1; i <= 67; i++) {
    load(`tile${i}`, `picture/greenhill/${i}.png`);
}

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
    { x: 650, y: 330, w: 190 },
    { x: 1100, y: 290, w: 190 },
    { x: 1600, y: 345, w: 220 },
    { x: 2500, y: 315, w: 220 },
    { x: 3300, y: 275, w: 220 },
    { x: 4300, y: 330, w: 220 },
    { x: 5200, y: 290, w: 240 },
    { x: 6200, y: 325, w: 220 },
    { x: 7300, y: 275, w: 250 },
    { x: 8400, y: 320, w: 240 }
];

const loops = [
    { x: 1850, width: 256, radius: 78 },
    { x: 4550, width: 256, radius: 78 },
    { x: 7550, width: 256, radius: 78 }
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
let startTime = performance.now();
let loopState = null;

const bestElement = document.getElementById("best");
let best = Number(localStorage.getItem("sonicGreenHillBest") || 0);
if (bestElement) bestElement.textContent = best;

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) {
        e.preventDefault();
    }

    if (
        (key === " " || key === "arrowup" || key === "w") &&
        sonic.grounded && !gameOver && !loopState
    ) {
        sonic.vy = -13.5;
        sonic.grounded = false;
    }

    if (key === "r" && gameOver) {
        location.reload();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

function ready(img) {
    return img && img.complete && img.naturalWidth > 0;
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
    ctx.fillStyle = "#70d8ff";
    ctx.fillRect(0, 0, W, H);

    const bg = images.tile61;
    const offset = (camera * 0.2) % 256;

    if (ready(bg)) {
        for (let x = -offset - 256; x < W + 256; x += 256) {
            ctx.drawImage(bg, 0, 0, 256, 150, x, 0, 256, 150);
        }
    }

    ctx.fillStyle = "#79caff";
    ctx.fillRect(0, 150, W, GROUND_Y - 150);
}

function drawGround() {
    const tile = images.tile60;

    if (ready(tile)) {
        for (let x = -(camera % 256) - 256; x < W + 256; x += 256) {
            ctx.drawImage(tile, x, GROUND_Y - 190, 256, 256);
        }
    } else {
        ctx.fillStyle = "#9c5526";
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.fillStyle = "#35d344";
        ctx.fillRect(0, GROUND_Y - 8, W, 8);
    }
}

function drawPlatforms() {
    for (const p of platforms) {
        const x = p.x - camera;
        if (x + p.w < 0 || x > W) continue;

        ctx.fillStyle = "#35d344";
        ctx.fillRect(x, p.y, p.w, 8);

        ctx.fillStyle = "#9c5526";
        ctx.fillRect(x, p.y + 8, p.w, 16);
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

function update() {
    if (gameOver) return;

    frame++;

    const left = keys.arrowleft || keys.a;
    const right = keys.arrowright || keys.d;

    if (left && !right) {
        sonic.vx = Math.max(-6.5, sonic.vx - 0.65);
        sonic.dir = -1;
    } else if (right && !left) {
        sonic.vx = Math.min(6.5, sonic.vx + 0.65);
        sonic.dir = 1;
    } else {
        sonic.vx *= 0.82;
    }

    if (loopState) {
        const s = loopState;
        s.angle += Math.max(0.055, Math.abs(sonic.vx) / s.loop.radius * 0.65);

        const cx = s.loop.x + 128;
        const cy = GROUND_Y - 96;
        const r = s.loop.radius;

        sonic.x = cx + Math.cos(s.angle) * r - sonic.w / 2;
        sonic.y = cy + Math.sin(s.angle) * r - sonic.h / 2;

        if (s.angle >= Math.PI * 2 + 2.8) {
            sonic.x = s.loop.x + s.loop.width;
            sonic.y = GROUND_Y - sonic.h;
            sonic.vx = Math.max(5, sonic.vx);
            sonic.vy = 0;
            sonic.grounded = true;
            loopState = null;
        }
    } else {
        const oldBottom = sonic.y + sonic.h;

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
            if (
                sonic.grounded &&
                sonic.vx > 3.5 &&
                sonic.x + sonic.w >= l.x + 30 &&
                sonic.x < l.x + 70
            ) {
                loopState = { loop: l, angle: 2.8 };
                sonic.vy = 0;
                sonic.grounded = false;
                break;
            }
        }
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

function drawHUD() {
    ctx.fillStyle = "#001b35cc";
    ctx.fillRect(18, 16, 190, 42);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.fillText("RINGE: " + ringCount, 30, 42);

    if (gameOver) {
        ctx.fillStyle = "#00101bdd";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ffe23a";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2);

        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.fillText("Drücke R zum Neustarten", W / 2, H / 2 + 40);
        ctx.textAlign = "left";

        if (ringCount > best) {
            best = ringCount;
            localStorage.setItem("sonicGreenHillBest", best);
            if (bestElement) bestElement.textContent = best;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawLoops();
    drawGround();
    drawPlatforms();
    drawRings();
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
