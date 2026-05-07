import {initialiseControls} from "./scripts/controls.ts";
import {runStarfield} from "./scripts/starfield.ts";

function main() {
    const ctrls = initialiseControls();
    const sf = runStarfield();
    if (sf) {
        ctrls.onInput = () => {
            sf.incrementSpeed();
        }
    }
}

document.addEventListener("DOMContentLoaded", main);
