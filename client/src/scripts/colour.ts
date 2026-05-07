// Colour conversion adapted from
// https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html

function clampByte(v: number): number {
    v = Math.round(v * 100) / 100;
    return Math.max(0, Math.min(255, v));
}

function kelvinToR(temp: number): number {
    if (temp <= 66) {
        return 255;
    }

    return clampByte(329.698727446 * Math.pow(temp - 60, -0.1332047592));
}

function kelvinToG(temp: number): number {
    let g;
    if (temp <= 66) {
        g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    } else {
        g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    }
    return clampByte(g);
}

function kelvinToB(temp: number): number {
    if (temp <= 19) {
        return 0;
    }

    if (temp >= 66) {
        return 255;
    }

    return clampByte(138.5177312231 * Math.log(temp - 10) - 305.0447927307);
}

export function kelvinToRgb(temp: number): string {
    const t = temp / 100;
    const r = kelvinToR(t);
    const g = kelvinToG(t);
    const b = kelvinToB(t);
    return `rgb(${r} ${g} ${b})`;
}
