import {initialiseControls} from "./scripts/controls.ts";
import {runStarfield} from "./scripts/starfield.ts";

function main() {
    const ctrls = initialiseControls();
    const sf = runStarfield();
    if (sf) {
        ctrls.onInput = () => {
            sf.incrementSpeed();
        }
        ctrls.onWarp = () => {
            sf.doWarp();
        }
    }

    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) {
            return;
        }

        ctrls.reset();
        sf?.reset();
    });
}

document.addEventListener("DOMContentLoaded", main);
