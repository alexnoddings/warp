import './styles/main.css'
import './targets.ts'
import type {WarpTarget} from "./targets.ts";

function getWarpTargets(): WarpTarget[] {
    // @ts-ignore - value set by server at runtime
    return window.warpTargets;
}

const warpTargetContainerElems = new Map<string, HTMLElement>();
const warpTargets = new Map<string, WarpTarget>();
getWarpTargets().forEach((target) => {
    warpTargets.set(target.id, target);
})

function initialiseTargets() {
    const searchResults = document.getElementById("search-results");
    if (!searchResults) {
        throw new Error("'search-results' element not found");
    }
    warpTargets.forEach((target: WarpTarget) => {
        const elem = document.createElement("li");
        elem.classList.add("search-result-wrapper")
        warpTargetContainerElems.set(target.id, elem);

        const anchor = document.createElement("a");
        anchor.href = formAnchorHref(target.host, target.id);
        anchor.classList.add("search-result");
        anchor.addEventListener("focus", _ => updateSelected(target));
        anchor.addEventListener("mouseenter", _ => updateSelected(target));
        anchor.innerHTML = `
            <div class="indicator">
                <span class="indicator-label">selected</span>
            </div>
            <div class="search-result-content">
                <div class="top">
                   <span class="id">
                       ${target.id}
                   </span>
                    <span class="host">
                       ${target.host}
                   </span>
                </div>
                <h2 class="title">
                    ${target.title}
                </h2>
                <hr/>
                <span class="target">
                    ${target.url}
                    <svg class="icon" role="presentation" aria-hidden="true" width="20px" height="20px" >
                        <use href="#emit"></use>
                    </svg>
               </span>
            </div>
        `;

        elem.appendChild(anchor);
        searchResults.appendChild(elem);
    });
    resetSelected();
}

function updateSelected(target: WarpTarget) {
    const elem = warpTargetContainerElems.get(target.id)!;
    const currentlySelected = document.getElementsByClassName("search-result-wrapper selected");
    Array.from(currentlySelected).forEach((el) => {
        if (el != elem) {
            el.setAttribute("aria-selected", "false");
            el.classList.remove("selected");
        }
    });
    elem.setAttribute("aria-selected", "true");
    elem.classList.add("selected");
}

function formAnchorHref(host: string, id: string): string {
    const here = window.location;
    const proto = here.protocol;
    const port = here.port;
    let href = `${proto}//${host}`;
    if (port != "") {
        href = href + ":" + port;
    }
    return href + "/go/" + id;
}

function searchMatches(tokens: string[], id: string): boolean {
    const lower = id.toLowerCase();
    return tokens.every(t => lower.includes(t));
}

function filterResults(): void {
    const searchInput = document.getElementById("search") as HTMLInputElement;
    const searchTokens = searchInput!.value.trim().toLowerCase().split(/\s+/);

    let wasAnySelected = false;
    warpTargetContainerElems.forEach((elem, id) => {
        const target = warpTargets.get(id)!;
        if (searchMatches(searchTokens, target.title)) {
            setEnabled(elem, true);
            wasAnySelected = wasAnySelected || elem.classList.contains("selected");
        } else {
            setEnabled(elem, false);
        }
    });

    const shouldResetSelected = getSelectedTarget() == undefined;
    if (shouldResetSelected || !wasAnySelected) {
        resetSelected();
    }
}

function getEnabled(el: HTMLElement): boolean {
    return !el.classList.contains("hidden");
}

function setEnabled(el: HTMLElement, enabled: boolean): void {
    if (enabled) {
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
        el.classList.remove("selected");
    }
}

function getSelected(el: HTMLElement): boolean {
    return el.getAttribute("aria-selected") == "true";
}

function setSelected(el: HTMLElement, selected: boolean): void {
    if (selected) {
        el.setAttribute("aria-selected", "true");
        el.classList.add("selected");
    } else {
        el.setAttribute("aria-selected", "false");
        el.classList.remove("selected");
    }
}

function resetSelected() {
    let select = true;
    warpTargetContainerElems.forEach((elem, _) => {
        if (select && !elem.classList.contains("hidden")) {
            setSelected(elem, true);
            select = false;
        } else {
            setSelected(elem, false);
        }
    });
}

function getSelectedTarget(): WarpTarget|undefined {
    for (const [id, target] of warpTargets) {
        const elem = warpTargetContainerElems.get(id)!;
        if (getSelected(elem)) {
            return target;
        }
    }
    return undefined;
}

function onInputKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
        event.preventDefault();
        const target = getSelectedTarget();
        if (target) {
            goTo(target);
        }
        return;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        let last = undefined;
        for (const [_, elem] of warpTargetContainerElems) {
            if (getSelected(elem)) {
                setSelected(elem, false);
                if (last != undefined) {
                    setSelected(last, true);
                }
                break;
            }
            if (getEnabled(elem)) {
                last = elem;
            }
        }
        if (last == undefined) {
            for (const [_, elem] of warpTargetContainerElems) {
                if (getEnabled(elem)) {
                    last = elem;
                }
            }
            if (last != undefined) {
                setSelected(last, true);
            }
        }
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        let next = false;
        for (const [_, elem] of warpTargetContainerElems) {
            if (getSelected(elem)) {
                setSelected(elem, false);
                next = true;
                continue;
            }
            if (next && getEnabled(elem)) {
                setSelected(elem, true);
                next = false;
                break;
            }
        }
        // looped back round to top
        if (next) {
            for (const [_, elem] of warpTargetContainerElems) {
                if (getEnabled(elem)) {
                    setSelected(elem, true);
                    break;
                }
            }
        }
        return;
    }
}

function goTo(target: WarpTarget): void {
    document.getElementById("container")?.classList.add("warp");
    // window.location.href = formAnchorHref(target.host, target.id);
}

function main() {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.focus();
        searchInput.addEventListener("input", _ => filterResults());
        searchInput.addEventListener("keydown", e => onInputKeyDown(e));
    }
    initialiseTargets();
}

document.addEventListener("DOMContentLoaded", main);
