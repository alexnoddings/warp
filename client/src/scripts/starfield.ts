import {kelvinToRgb} from "./colour.ts";
import {distanceTo, Lerped, random} from "./utils";

// -------------------
// Configurable values
// -------------------
const cfg = {
    starCount: 5_000,
    speeds: {
        start: 7,
        rest: 0.25,
        fastMax: 10,
        inputBump: 2,
        decayPerSecond: 2.5,
    }
}

// ----------------------------
// Stuff that's harder to tweak
// ----------------------------
// min/max value for x/y values (horizontal/vertical on the view plane)
const xyMin = -0.2;
const xyMax = 0.2;

// Stars spawning too close to (0,0) will linger in the viewport for too long
// The exclusion radius ensures no stars spawn too close
const xyCenterExclusion = 0.01;

// Min Z value (collinear with the view plane)
const zMin = 0;
// Max Z value (how far away stars can spawn)
const zMax = 256;
// Stars at z = zMax are fully transparent, and will be fully opaque by this point
const zOpacityPoint = zMax * 0.9;

// Field of view of the perspective - higher values spread stars out more
const fovScale = 1024;

// The denominators are the max time in seconds it will take a star to go from zMax to zMin
// Note that they may get there earlier if they leave the canvas before getting culled by the Z plane
const speedMin = zMax / 20;
const speedMax = zMax / 5;

// Min/max size of stars
// Radius is a product of z distance and magnitude
const magnitudeMin = 2;
const magnitudeMax = 3.25;
// Min radius of drawn stars
const radiusMin = 1;

// Min/max temperature of stars
// Temperature only affects the rendered colour
const temperatureMin = 2_500; // 1,500K is very red
const temperatureMax = 10_000; // 11,500K pretty much caps out the blue scale

// Wraps the canvas and rendering context
class Surface {
    public canvas: HTMLCanvasElement;
    public context: CanvasRenderingContext2D;

    // Width/height of the canvas
    public cw: number = null!;
    public ch: number = null!;

    // Center x/y on the canvas
    public cx: number = null!;
    public cy: number = null!;

    constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.context = context;

        window.addEventListener("resize", () => this.resizeCanvas());
        this.resizeCanvas();
    }

    private resizeCanvas(): void {
        this.cw = this.canvas.width = window.innerWidth;
        this.ch = this.canvas.height = window.innerHeight;

        this.cx = this.cw / 2;
        this.cy = this.ch / 2;
    }

    public static create(): Surface | null {
        const canvas = document.getElementById('starfield') as HTMLCanvasElement;
        if (!canvas) {
            return null;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }

        return new Surface(canvas, context);
    }
}

class Star {
    private starfield: Starfield;
    private surface: Surface;

    private x: number = xyMin;
    private y: number = xyMin;
    private z: number = zMin;

    private readonly speed: number = speedMin;
    private magnitude: number = magnitudeMin;
    private temperature: number = temperatureMin;
    // Temperature doesn't change over star lifetime, so caching prevents unnecessary recalculations
    private temperatureStyle: string = "rgb(255,255,255)";

    constructor(starfield: Starfield, surface: Surface) {
        this.starfield = starfield;
        this.surface = surface;

        this.reset();

        // Speed is only set on initial star creation
        // Otherwise, fast stars will recycle more often
        // and slowly skew the distribution towards slow stars
        this.speed = random(speedMin, speedMax);

        // Spread initial z values so the starfield starts populated
        this.z = random(zMin, zMax);
    }

    public reset(): void {
        const {x, y} = Star.getResetPoint();
        this.x = x;
        this.y = y;
        this.z = zMax;
        this.magnitude = random(magnitudeMin, magnitudeMax);
        this.temperature = random(temperatureMin, temperatureMax);
        this.temperatureStyle = kelvinToRgb(this.temperature);
    }

    // Gets a valid point for the star to reset to
    private static getResetPoint() : {x: number, y: number} {
        // For a 0.1 center exclusion, each iteration has a  ~0.8% chance (pi*0.0025)
        // of producing a value in the exclusion zone.
        // 5 iterations gives us a ~0.000000003% chance that a star generates an invalid pos on every iteration.
        // We still guard against it to prevent any edge cases from locking a while loop up.
        for (let i = 0; i <= 5; i++) {
            const x = random(xyMin, xyMax);
            const y = random(xyMin, xyMax);
            if (distanceTo(x, y) > xyCenterExclusion) {
                return {x, y};
            }
        }
        return {x: xyMin, y: xyMin};
    }

    public static create(starfield: Starfield, surface: Surface) : Star {
        return new Star(starfield, surface);
    }

    public step(delta: number) {
        // Move towards the camera
        this.z -= this.speed * delta * this.starfield.speed;

        // Recycle stars that cross the z plane
        if (this.z <= 0) {
            this.reset();
        }
    }

    private hasLeftCanvas(x: number, y: number): boolean {
        return x < 0
            || x > this.surface.cw
            || y < 0
            || y > this.surface.ch;
    }

    public draw() {
        // Accelerates stars as they approach, rather than having linear speed
        const fov = this.surface.cx * fovScale;
        const x = this.surface.cx + (this.x / this.z) * fov;
        const y = this.surface.cy + (this.y / this.z) * fov;

        // Recycle stars that leave the canvas early rather than waiting to cull at Z plane
        if (this.hasLeftCanvas(x, y)) {
            this.reset();
            return;
        }

        // Scale magnitude based on z distance
        const scale = (zMax - this.z) / zMax;
        const mag = scale * this.magnitude;
        const radius = Math.max(radiusMin, mag);

        // Fade in from z = max to z = opaque
        //       1 |-----------------------+
        //         |                       |\
        // Opacity |                       | \
        //         |                       |  \
        //         |                       |   \
        //         |                       |    \
        //       0 |                       |     \
        //         +-----------------------+------+
        //         0                  zOpacityPoint    zMax
        //                  Z value
        const opacity = Math.min(1, scale * (zMax / (zMax - zOpacityPoint)));

        this.surface.context.beginPath();
        this.surface.context.arc(x, y, radius, 0, 6.28318); // Math.PI * 2
        this.surface.context.fillStyle = this.temperatureStyle;
        this.surface.context.globalAlpha = opacity;
        this.surface.context.fill();
        this.surface.context.closePath();
    }
}

class Starfield {
    private surface: Surface;
    private stars: Star[];

    private lerpedSpeed: Lerped;
    public get speed(): number {
        return this.lerpedSpeed.value;
    }

    constructor(surface: Surface) {
        this.lerpedSpeed = new Lerped(cfg.speeds.start);

        this.surface = surface;
        this.stars = Array.from({length: cfg.starCount}, () => Star.create(this, surface));
    }

    public incrementSpeed(): void {
        const target = this.lerpedSpeed.targetValue + cfg.speeds.inputBump;
        this.lerpedSpeed.setTarget(Math.min(target, cfg.speeds.fastMax), 500);
    }

    public doWarp(): void {
        const target = cfg.speeds.fastMax * 5;
        this.lerpedSpeed.setTarget(target, 1_000);
    }

    public start(): void {
        const lastFrameTimestamp = document.timeline.currentTime;
        if (!lastFrameTimestamp) {
            return;
        }

        if (typeof lastFrameTimestamp == "number") {
            this.lastFrameTimestamp = lastFrameTimestamp;
        } else {
            console.error("lastFrameTimestamp is not numeric", lastFrameTimestamp);
        }

        // Start fast then slow down
        this.lerpedSpeed.setValue(cfg.speeds.start);
        this.lerpedSpeed.setTarget(cfg.speeds.rest, 800);

        this.requestNextAnimationFrame();
    }

    public stop(): void {
        if (this.nextFrameId) {
            window.cancelAnimationFrame(this.nextFrameId);
            this.nextFrameId = undefined;
        }
    }

    private lastFrameTimestamp: number = 0;
    private nextFrameId: number | undefined;

    private requestNextAnimationFrame(): void {
        this.nextFrameId = window.requestAnimationFrame((t) => this.doFrame(t));
    }

    // Steps the starfield/stars forward then draws them
    private doFrame(timestamp: number): void {
        this.requestNextAnimationFrame();
        const deltaS = (timestamp - this.lastFrameTimestamp) / 1000;
        this.lastFrameTimestamp = timestamp;
        // Capped to prevent enormous jumping if tabbing back in
        this.step(Math.min(deltaS, 150));
        this.draw();
    }

    private stepTimeMs: number = 0;
    private step(deltaS: number): void {
        const start = performance.now();

        const speedTarget = this.lerpedSpeed.targetValue - (deltaS * cfg.speeds.decayPerSecond);
        this.lerpedSpeed.setTarget(Math.max(speedTarget, cfg.speeds.rest), 500);
        this.lerpedSpeed.step(deltaS);
        this.stars.forEach(star => {
            star.step(deltaS);
        });

        const end = performance.now();
        this.stepTimeMs = end - start;
    }

    private frameTimeMs: number = 0;
    private draw(): void {
        const start = performance.now();

        // reducing the alpha introduces a smearing motion blur behind stars
        this.surface.context.fillStyle = 'rgba(0, 0, 0, 0.25)';
        this.surface.context.fillRect(0, 0, this.surface.canvas.width, this.surface.canvas.height);
        this.stars.forEach(star => {
            star.draw();
        });
        // need to reset alpha as each star sets its own
        this.surface.context.globalAlpha = 1;

        const end = performance.now();
        this.frameTimeMs = end - start;

        // debug timings
        this.surface.context.font = "16px Space Mono";
        this.surface.context.fillStyle = '#FF4F00';
        const stepTimeMsStr = prettyPrint(this.stepTimeMs, "ms");
        this.surface.context.fillText("step time    " + stepTimeMsStr, 20, 30);
        const frameTimeMsStr = prettyPrint(this.frameTimeMs, "ms");
        this.surface.context.fillText("frame time   " + frameTimeMsStr, 20, 50);
        const speedTargetStr = prettyPrint(this.lerpedSpeed.targetValue, "zs");
        this.surface.context.fillText("target speed " + speedTargetStr, 20, 70);
        const speedActualStr = prettyPrint(this.lerpedSpeed.value, "zs");
        this.surface.context.fillText("actual speed " + speedActualStr, 20, 90);
    }
}

function prettyPrint(value: number, units: string): string {
    return value.toString().substring(0, 4).padStart(4, '0') + units;
}

export function runStarfield(): Starfield | null {
    const surface = Surface.create();
    if (!surface) {
        return null;
    }

    const starfield = new Starfield(surface);
    starfield.start();
    return starfield;
}
