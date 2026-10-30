
const canvas = document.getElementById("sonic");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const breite = canvas.width;
const hoehe = canvas.height;

const welt = {
    breite: 6000,
    kameraX: 0,
    bodenY: 455
};

const tasten = {};

const sonic = {
    x: 120,
    y: 0,
    breite: 38,
    hoehe: 56,
    vx: 0,
    vy: 0,
    beschleunigung: 0.45,
    maxSpeed: 7,
    sprungkraft: -12,
    amBoden: false,
    richtung: 1,
    animation: "idle",
    frame: 0,
    animationZeit: 0
};

sonic.y = welt.bodenY - sonic.hoehe;

function ladeFrames(prefix, anzahl) {
    const frames = [];

    for (let i = 1; i <= anzahl; i++) {
        const bild = new Image();
        bild.src = `assets/sonic/${prefix}_${String(i).padStart(2, "0")}.png`;
        frames.push(bild);
    }

    return frames;
}

const animationen = {
    idle: ladeFrames("idle", 4),
    run: ladeFrames("run", 6),
    run_fast: ladeFrames("run_fast", 4),
    jump: ladeFrames("jump_roll", 5)
};

document.addEventListener("keydown", function(event) {
    tasten[event.code] = true;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
        event.preventDefault();
    }
});

document.addEventListener("keyup", function(event) {
    tasten[event.code] = false;
});

const plattformen = [
    { x: 550, y: 375, breite: 180 },
    { x: 950, y: 330, breite: 180 },
    { x: 1450, y: 385, breite: 220 },
    { x: 1950, y: 340, breite: 200 },
    { x: 2500, y: 300, breite: 220 },
    { x: 3150, y: 370, breite: 240 },
    { x: 3850, y: 320, breite: 220 },
    { x: 4600, y: 375, breite: 300 },
    { x: 5300, y: 330, breite: 240 }
];

function waehleAnimation(name) {
    if (sonic.animation !== name) {
        sonic.animation = name;
        sonic.frame = 0;
        sonic.animationZeit = 0;
    }
}

function bewegung(delta) {
    const links = tasten["ArrowLeft"] || tasten["KeyA"];
    const rechts = tasten["ArrowRight"] || tasten["KeyD"];
    const springen = tasten["Space"] || tasten["ArrowUp"] || tasten["KeyW"];

    const vorherUnten = sonic.y + sonic.hoehe;
    const vorherVy = sonic.vy;

    if (links) {
        sonic.vx -= sonic.beschleunigung * delta;
        sonic.richtung = -1;
    }

    if (rechts) {
        sonic.vx += sonic.beschleunigung * delta;
        sonic.richtung = 1;
    }

    if (!links && !rechts) {
        sonic.vx *= Math.pow(0.82, delta);
    }

    sonic.vx = Math.max(-sonic.maxSpeed, Math.min(sonic.maxSpeed, sonic.vx));

    if (Math.abs(sonic.vx) < 0.08) {
        sonic.vx = 0;
    }

    if (springen && sonic.amBoden) {
        sonic.vy = sonic.sprungkraft;
        sonic.amBoden = false;
    }

    sonic.x += sonic.vx * delta;
    sonic.x = Math.max(0, Math.min(welt.breite - sonic.breite, sonic.x));

    sonic.vy += 0.55 * delta;
    sonic.y += sonic.vy * delta;
    sonic.amBoden = false;

    if (
        vorherUnten <= welt.bodenY &&
        sonic.y + sonic.hoehe >= welt.bodenY &&
        sonic.vy >= 0
    ) {
        sonic.y = welt.bodenY - sonic.hoehe;
        sonic.vy = 0;
        sonic.amBoden = true;
    }

    for (const p of plattformen) {
        const ueberlapptX =
            sonic.x + sonic.breite > p.x &&
            sonic.x < p.x + p.breite;

        if (
            ueberlapptX &&
            vorherUnten <= p.y &&
            sonic.y + sonic.hoehe >= p.y &&
            vorherVy >= 0
        ) {
            sonic.y = p.y - sonic.hoehe;
            sonic.vy = 0;
            sonic.amBoden = true;
        }
    }

    if (!sonic.amBoden) {
        waehleAnimation("jump");
    } else if (Math.abs(sonic.vx) > 4.5) {
        waehleAnimation("run_fast");
    } else if (Math.abs(sonic.vx) > 0.3) {
        waehleAnimation("run");
    } else {
        waehleAnimation("idle");
    }

    welt.kameraX = sonic.x - 220;
    welt.kameraX = Math.max(0, Math.min(welt.breite - breite, welt.kameraX));
}

function animationAktualisieren(delta) {
    const frames = animationen[sonic.animation];

    if (!frames || frames.length === 0) return;

    const frameDauer = sonic.animation === "run_fast" ? 65 : 110;

    sonic.animationZeit += delta * 16.67;

    while (sonic.animationZeit >= frameDauer) {
        sonic.animationZeit -= frameDauer;
        sonic.frame = (sonic.frame + 1) % frames.length;
    }
}

function hintergrundZeichnen() {
    const himmel = ctx.createLinearGradient(0, 0, 0, hoehe);
    himmel.addColorStop(0, "#35b9f4");
    himmel.addColorStop(1, "#c0f5ff");

    ctx.fillStyle = himmel;
    ctx.fillRect(0, 0, breite, hoehe);

    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < 9; i++) {
        const x = ((i * 190 - welt.kameraX * 0.25) % 1800 + 1800) % 1800 - 100;
        const y = 70 + (i % 3) * 55;

        ctx.beginPath();
        ctx.ellipse(x, y, 35, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 25, y - 10, 25, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 48, y, 32, 14, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#48bd49";

    for (let i = 0; i < 15; i++) {
        const x = ((i * 150 - welt.kameraX * 0.5) % 2100 + 2100) % 2100 - 100;

        ctx.beginPath();
        ctx.arc(x, welt.bodenY + 10, 75, Math.PI, 0);
        ctx.fill();
    }
}

function bodenZeichnen() {
    ctx.fillStyle = "#c17a35";
    ctx.fillRect(-welt.kameraX, welt.bodenY, welt.breite, hoehe - welt.bodenY);

    ctx.fillStyle = "#36c957";
    ctx.fillRect(-welt.kameraX, welt.bodenY, welt.breite, 14);

    ctx.fillStyle = "#e7b45a";

    for (let x = 0; x < welt.breite; x += 48) {
        ctx.fillRect(x - welt.kameraX, welt.bodenY + 25, 24, 18);
    }
}

function plattformenZeichnen() {
    for (const p of plattformen) {
        const x = p.x - welt.kameraX;

        if (x + p.breite < 0 || x > breite) continue;

        ctx.fillStyle = "#b97531";
        ctx.fillRect(x, p.y, p.breite, 20);

        ctx.fillStyle = "#42d45b";
        ctx.fillRect(x, p.y, p.breite, 7);
    }
}

function sonicZeichnen() {
    const frames = animationen[sonic.animation];
    if (!frames || frames.length === 0) return;

    const bild = frames[sonic.frame];
    if (!bild.complete || bild.naturalWidth === 0) return;

    const zielHoehe = 76;
    const zielBreite = bild.naturalWidth / bild.naturalHeight * zielHoehe;

    const x = sonic.x - welt.kameraX;
    const y = sonic.y + sonic.hoehe - zielHoehe;

    ctx.save();

    if (sonic.richtung === -1) {
        ctx.translate(x + zielBreite, 0);
        ctx.scale(-1, 1);
        ctx.translate(-x, 0);
    }

    ctx.drawImage(bild, x, y, zielBreite, zielHoehe);
    ctx.restore();
}

function zeichnen() {
    hintergrundZeichnen();
    bodenZeichnen();
    plattformenZeichnen();
    sonicZeichnen();
}

let letzteZeit = 0;

function gameLoop(zeit) {
    const delta = letzteZeit === 0 ? 1 : Math.min((zeit - letzteZeit) / 16.67, 2);
    letzteZeit = zeit;

    bewegung(delta);
    animationAktualisieren(delta);
    zeichnen();

    requestAnimationFrame(spielSchleife);
}

gameLoop(0);
