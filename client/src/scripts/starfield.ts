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
            this.lerpedSpeed.setTarget(cfg.speeds.warp3, 300);
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
        this.surface.context.fillStyle = 'rgba(0, 0, 0, 1)';
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
