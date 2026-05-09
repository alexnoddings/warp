import {kelvinToRgb} from "./colour.ts";
import {distanceTo, random} from "./utils";
import {Surface} from "./surface.ts";
import {Starfield} from "./starfield.ts";

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
const magnitudeMin = 3;
const magnitudeMax = 6;
// Min radius of drawn stars
const radiusMin = 1;

// Min/max temperature of stars
// Temperature only affects the rendered colour
const temperatureMin = 2_500; // 1,500K is very red
const temperatureMax = 10_000; // 11,500K pretty much caps out the blue scale

export class Star {
    private starfield: Starfield;
    private surface: Surface;

    private x: number = xyMin;
    private y: number = xyMin;
    private z: number = zMin;
    private pz: number = zMin;
    private shouldResetEarly: boolean = false;

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
        this.shouldResetEarly = false;
        const {x, y} = Star.getResetPoint();
        this.x = x;
        this.y = y;
        this.z = zMax;
        this.pz = zMax;
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
        this.pz = this.z;
        this.z -= this.speed * delta * this.starfield.speed;

        // Recycle stars that cross the z plane or have left the canvas
        if (this.z <= 0 || this.shouldResetEarly) {
            this.reset();
        }
    }

    private isPointOutsideOfCanvas(x: number, y: number): boolean {
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
        const px = this.surface.cx + (this.x / this.pz) * fov;
        const py = this.surface.cy + (this.y / this.pz) * fov;

        // Recycle stars that leave the canvas early rather than waiting to cull at Z plane
        if (this.isPointOutsideOfCanvas(x, y)) {
            // Resetting this frame would cause a noticeable dark region around the canvas edge at high speeds
            // Instead, mark this star to be reset next frame so we draw the star trail leaving the canvas
            this.shouldResetEarly = true;
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
        this.surface.context.strokeStyle = this.temperatureStyle;
        this.surface.context.lineWidth = radius;
        this.surface.context.globalAlpha = opacity;
        this.surface.context.moveTo(px, py);
        this.surface.context.lineTo(x, y);
        this.surface.context.stroke();
    }
}
