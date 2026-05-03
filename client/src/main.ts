import './styles/main.css'
import './targets.ts'
import type {WarpTarget} from "./targets.ts";

function initialiseTargets() {
    const searchResults = document.getElementById("search-results");
    if (!searchResults) {
        throw new Error("'search-results' element not found");
    }

    let first = true;
    // @ts-ignore - value set by server at runtime
    window.warpTargets.forEach((target: WarpTarget) => {
        const elem = document.createElement("li");
        elem.classList.add("search-result-wrapper")
        if (first) {
            elem.classList.add("selected");
            first = false;
        }

        const anchor = document.createElement("a");
        anchor.href = formAnchorHref(target.host, target.id);
        anchor.classList.add("search-result");
        anchor.addEventListener("focus", updateSelected);
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
               </span>
            </div>
        `;

        elem.appendChild(anchor);
        searchResults.appendChild(elem);
    });
}

function updateSelected(event: FocusEvent) {
    const currentlySelected = document.getElementsByClassName("search-result-wrapper selected");
    Array.from(currentlySelected).forEach((el) => {
        if (el != event.target) {
            el.classList.remove("selected");
        }
    });
    if (event.target instanceof Element) {
        event.target.parentElement!.classList.add("selected");
    }
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

function main() {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.focus();
    }
    initialiseTargets();
}

document.addEventListener("DOMContentLoaded", main);
