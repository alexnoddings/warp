class Surface {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    cx: number = null!;
    cy: number = null!;

    constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.context = context;

        window.addEventListener("resize", () => this.resizeCanvas());
        this.resizeCanvas();
    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cx = this.canvas.width / 2;
        this.cy = this.canvas.height / 2;
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
    private surface: Surface;

    private x: number;
    private y: number;
    private z: number;

    constructor(surface: Surface) {
        this.surface = surface;
        this.x = this.surface.cx * (Math.random() * 2 - 1);
        this.y = this.surface.cy * (Math.random() * 2 - 1);
        this.z = Math.random() * this.surface.canvas.width;
    }

    public reset(): void {
        this.x = (Math.random() - 0.5) * this.surface.cx * 4;
        this.y = (Math.random() - 0.5) * this.surface.cy * 4;
        this.z = this.surface.canvas.width;
    }

    public static create(surface: Surface) : Star {
        return new Star(surface);
    }

    private static speed: number = 500;
    public step(delta: number) {
        this.z -= Star.speed * delta;
        if (this.z <= 0) {
            this.reset();
        }
    }

    private static fov: number = 300;
    public draw() {
        const zs = 1 + (this.z / this.surface.canvas.width);
        const scale = Star.fov / (Star.fov * zs);
        const x = (this.x * scale) + this.surface.canvas.width / 2;
        const y = (this.y * scale) + this.surface.canvas.height / 2;
        const radius = Math.max(0.5, (1 - this.z / this.surface.canvas.width) * 2);

        this.surface.context.beginPath();
        this.surface.context.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2);
        this.surface.context.fillStyle = 'white';
        this.surface.context.fill();
    }
}

class Starfield {
    private surface: Surface;
    private stars: Star[];

    constructor(surface: Surface) {
        this.surface = surface;
        this.stars = Array.from({length: 500}, () => Star.create(surface));
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

    private doFrame(timestamp: number): void {
        this.requestNextAnimationFrame();
        const delta = (timestamp - this.lastFrameTimestamp) / 1000;
        this.lastFrameTimestamp = timestamp;
        this.step(delta);
        this.draw();
    }

    private step(delta: number): void {
        this.stars.forEach(star => {
            star.step(delta);
        });
    }

    private draw(): void {
        this.surface.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.surface.context.fillRect(0, 0, this.surface.canvas.width, this.surface.canvas.height);
        this.stars.forEach(star => {
            star.draw();
        });
    }
}

export function runStarfield() {
    const surface = Surface.create();
    if (!surface) {
        return;
    }

    const starfield = new Starfield(surface);
    starfield.start();
}
