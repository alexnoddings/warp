// Wraps the canvas and rendering context
export class Surface {
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
