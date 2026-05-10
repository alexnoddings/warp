import {Lerped} from "./utils";
import {Star} from "./star.ts";
import {Surface} from "./surface.ts";

const cfg = {
    starCount: 5_000,
    speeds: {
        start: 7,
        rest: 0.25,
        fastMax: 6,
        inputBump: 2,
        decayPerSecond: 2.5,
        warp1: 10,
        warp3: 30,
    }
}

export class Starfield {
    private surface: Surface;
    private stars: Star[];

    private lerpedSpeed: Lerped;
    public get speed(): number {
        return this.lerpedSpeed.value;
    }

    private shouldDrawDebugTimings: boolean = false;

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
        this.lerpedSpeed.setTarget(cfg.speeds.warp1, 250);
        window.setTimeout(() => {
            this.lerpedSpeed.setTarget(cfg.speeds.warp3, 250);
        }, 250);
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
        this.lerpedSpeed.setTarget(cfg.speeds.rest, 500);

        this.requestNextAnimationFrame();

        // @ts-ignore
        window.drawDebugTimings = (v: boolean) => this.shouldDrawDebugTimings = v;
    }

    public stop(): void {
        if (this.nextFrameId) {
            window.cancelAnimationFrame(this.nextFrameId);
            this.nextFrameId = undefined;
        }
    }

    public reset(): void {
        this.stop();
        this.start();
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

        this.surface.context.fillStyle = 'rgba(0, 0, 0, 1)';
        this.surface.context.fillRect(0, 0, this.surface.canvas.width, this.surface.canvas.height);
        this.drawStars();
        if (this.shouldDrawDebugTimings) {
            this.drawDebugTimings();
        }

        const end = performance.now();
        this.frameTimeMs = end - start;
    }

    private drawStars(): void {
        // every star uses the same lineCap
        this.surface.context.lineCap = "round";

        this.stars.forEach(star => {
            star.draw();
        });

        // reset alpha as each star sets its own
        this.surface.context.globalAlpha = 1;
    }

    private drawDebugTimings(): void {
        const c = this.surface.context;
        let i = 0;

        c.font = "16px Space Mono";
        c.fillStyle = '#FF4F00';

        drawDebug("stars", this.stars.length);
        drawDebug("step time", this.stepTimeMs, "ms");
        drawDebug("frame time", this.frameTimeMs, "ms");
        drawDebug("target speed", this.lerpedSpeed.targetValue, "zs");
        drawDebug("actual speed", this.lerpedSpeed.value, "zs");

        function drawDebug(label: string, value: number, unit?: string): void {
            const y = 35 + i * 20;
            i++;
            const text = label.padEnd(14, ' ');
            const valueStr = prettyPrint(value, unit);
            c.fillText(text + valueStr, 25, y);
        }
    }
}

function prettyPrint(value: number, units?: string): string {
    return value.toString().substring(0, 4).padStart(4, '0') + (units ?? "");
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
