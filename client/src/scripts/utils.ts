// Returns a random decimal value between min and max
export function random(min: number, max: number) {
    const scale = Math.random();
    const diff = max - min;
    return min + (diff * scale);
}

// Calculates pythag distance between (0, 0) and (x, y)
export function distanceTo(x: number, y: number) {
    const x2 = Math.pow(Math.abs(x), 2);
    const y2 = Math.pow(Math.abs(y), 2);
    return Math.sqrt(x2 + y2);
}

// A linearly interpolated value
// Starting at Old and calling setTarget(New, After) will interpolate value() between Old and New
// At T+0, value will be Old
// At T+(After/2), value will be halfway between Old and New
// At T+After and after, value will be New
export class Lerped {
    // What we're interpolating from
    private baseVal!: number;

    // The current time after calling setTarget last
    private nowAt!: number;
    // The current value
    private nowVal!: number;
    public get value(): number {
        return this.nowVal;
    }

    // The target value to interpolate towards
    private targetVal!: number;
    // The target time by which value should reach its target
    private targetAt!: number;
    public get targetValue(): number {
        return this.targetVal;
    }

    constructor(value: number) {
        this.setValue(value);
    }

    // Forces updating the value, eliding interpolation
    public setValue(value: number): void {
        this.baseVal = value;

        this.nowVal = value;
        this.nowAt = 1;

        this.targetVal = value;
        this.targetAt = 1;
    }

    // Callers may want to call setTarget(const, ...) to set a specific value,
    // or call setTarget(targetValue() + const, ...) to increment or decrement the target value
    public setTarget(value: number, afterMs: number) {
        this.baseVal = this.value;

        this.nowAt = 0;

        this.targetVal = value;
        this.targetAt = afterMs;
    }

    // Steps interpolation forward by Δ seconds
    public step(deltaS: number) {
        // Increment nowAt, capped at targetAt (otherwise value would increase past target)
        const deltaMs = deltaS * 1000;
        this.nowAt = Math.min(this.nowAt + deltaMs, this.targetAt);

        // [0,1] based on how close to targetAt we are
        const progress = this.nowAt / this.targetAt;
        this.nowVal = Lerped.lerp(this.baseVal, this.targetVal, progress);
    }

    // Calculates the lerped value
    private static lerp(from: number, to: number, progress: number): number {
        const range = to - from;
        return from + (range * progress);
    }
}