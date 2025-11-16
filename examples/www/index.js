

function addCycleCaptureButton() {
    if (document.getElementById("cycle-capture-btn")) return;
    const btn = document.createElement("button");
    btn.id = "cycle-capture-btn";
    btn.innerText = "Cycle & Capture All Examples";
    btn.style.position = "fixed";
    btn.style.top = "170px";
    btn.style.right = "10px";
    btn.style.zIndex = 10000;
    btn.onclick = async () => {
        const select = document.querySelector("select[name='example']");
        if (!select) return;
        const images = [];
        const cropRect = getCropRect();
        for (let i = 0; i < examples.length; i++) {
            select.value = i;
            select.dispatchEvent(new Event('change'));
            await new Promise(r => setTimeout(r, 800));
            if (examples[i].name === "Toggle") {
                // Capture two frames from toggle
                for (let j = 0; j < 2; j++) {
                    await new Promise(r => setTimeout(r, 1000));
                    const canvas = await html2canvas(document.body, {
                        x: cropRect.x,
                        y: cropRect.y,
                        width: cropRect.width,
                        height: cropRect.height,
                        windowWidth: document.documentElement.scrollWidth,
                        windowHeight: document.documentElement.scrollHeight
                    });
                    images.push(canvas.toDataURL());
                }
            } else {
                const canvas = await html2canvas(document.body, {
                    x: cropRect.x,
                    y: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight
                });
                images.push(canvas.toDataURL());
            }
        }
        // Show all captured images in a new window
        const win = window.open();
        if (!win) {
            alert("Popup blocked! Please allow popups for this site to view captured frames.");
            return;
        }
        // Add only the normal GIF download button and all frames at the top
        win.document.write(`
            <button id="download-gif-btn" style="margin:16px 8px 16px 0;font-size:1.1em;padding:8px 16px;">Download as Animated GIF</button>
            <h2>Captured Frames</h2>
        `);
        images.forEach((src, idx) => {
            win.document.write(`<div style="margin-bottom:10px"><b>Frame ${idx+1}</b><br><img src="${src}" class="frame-img" style="max-width:90vw;max-height:60vh;border:1px solid #ccc;"></div>`);
        });
        // Images are already cropped, no need to pass cropRect
        win.document.close();
        const script = win.document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.js';
        script.onload = function() {
            // Normal GIF
            win.document.getElementById('download-gif-btn').onclick = function() {
                const imgs = Array.from(win.document.querySelectorAll('.frame-img'));
                if (!imgs.length) return;
                const gif = new win.GIF({ workers: 2, quality: 10, workerScript: 'gif.worker.js' });
                let loaded = 0;
                imgs.forEach(img => {
                    const image = new win.Image();
                    image.crossOrigin = 'Anonymous';
                    image.onload = function() {
                        gif.addFrame(image, { delay: 800 });
                        loaded++;
                        if (loaded === imgs.length) {
                            gif.on('finished', function(blob) {
                                const url = win.URL.createObjectURL(blob);
                                const a = win.document.createElement('a');
                                a.href = url;
                                a.download = 'div-rs-captured-frames.gif';
                                win.document.body.appendChild(a);
                                a.click();
                                setTimeout(() => win.document.body.removeChild(a), 100);
                            });
                            gif.render();
                        }
                    };
                    image.src = img.src;
                });
            };
            // Removed cropped GIF button and logic
        };
        win.document.body.appendChild(script);
    };
    document.body.appendChild(btn);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        addCycleCaptureButton();
        addGifCaptureButtonWhenReady();
    });
} else {
    addCycleCaptureButton();
    addGifCaptureButtonWhenReady();
}
// Helper to get crop rectangle (top of h1 to bottom of footer, 20% width border)
function getCropRect() {
    const h1 = document.querySelector('h1');
    const footer = document.querySelector('footer');
    if (!h1 || !footer) {
        return { x: 0, y: 0, width: document.body.clientWidth - 320, height: document.body.clientHeight };
    }
    const rect1 = h1.getBoundingClientRect();
    const rect2 = footer.getBoundingClientRect();
    // Calculate crop area from just below h1 to bottom of footer
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    let x = rect1.left + scrollX;
    let y = rect1.bottom + scrollY + 4; // 4px below h1
    let width = rect1.width;
    let height = (rect2.top + rect2.height) - (rect1.bottom + 4);
    // Exclude the rightmost 320px (button area)
    width = Math.max(1, width - 320);
    return { x, y, width, height };
}
/**
 * The code in here is not really all that much about DIV-RS.
 * It just some JS code to load the different examples defined in their own Rust crate.
 * You should better look at the lib.rs files in those subfolders to learn more about div.
 * Also, look at this npm package's configurations to learn about the integration.
 */

import "./styles.css";


import * as hello_world from "../hello_world/pkg/hello_world.js";
import * as reposition from "../reposition/pkg/reposition.js";
import * as styled from "../styled/pkg/styled.js";
import * as toggle from "../toggle/pkg/toggle.js";

import * as hello_svelte from "../hello_svelte/pkg/hello_svelte.js";

import { register_svelte_component, init_div_rs } from "../../div-rs.js";
import MyComponent from "../hello_svelte/src/MyComponent.svelte";

// Always register Svelte component before any WASM main() call
init_div_rs();
register_svelte_component("MyComponent", MyComponent);

function example(name, help, fn) {
    return { name, help, fn };
}
const examples = [];
// --- GIF CAPTURE BUTTON ---
examples.push(
    example(
        "Hello World",
        "A minimal example that renders a single pane with a text node.\n\nNo controls. Just displays 'Hello world' in a pane.\n\n---\nRust:\n```rust\ndiv::init_to(\"div-root\")?;\ndiv::new(x, y, w, h, \"Hello world\")?;\n```",
        () => hello_world.main()
    )
);
examples.push(
    example(
        "Reposition",
        "Demonstrates repositioning panes dynamically.\n\n" +
        "Controls:\n" +
        "  Arrow keys: Move the whole black border area.\n" +
        "  + / - : Zoom the whole area.\n" +
        "  w/a/s/d: Move the red 'A' pane.\n" +
        "  1 / 2: Resize the red 'A' pane.\n\n" +
        "The black border shows the main pane. 'A' (red) and 'B' (blue) are sub-panes.\n" +
        "Use the controls to see repositioning and resizing in action.\n\n---\nRust:\n```rust\ndiv::reposition(x, y)?;\ndiv::resize(w, h)?;\npane.reposition_and_resize(ax, ay, aw, ah)?;\n```",
        () => reposition.main()
    )
);
examples.push(
    example(
        "Styled",
        "Shows how to use custom styles with div-rs.\n\nNo controls. Demonstrates CSS classes and inline styles applied to panes.\n\n---\nRust:\n```rust\ndiv::new_styled(x, y, w, h, html, &[\"my-class\"], &[(\"color\", \"red\")])?;\n```",
        () => styled.main()
    )
);
import html2canvas from "html2canvas";
import GIF from "gif.js";
import { highlightCodeBlocks } from "./highlight";

function addGifCaptureButtonWhenReady() {
            // Cropped GIF Button
            if (!document.getElementById("crop-gif-capture-btn")) {
                const cropGifBtn = document.createElement("button");
                cropGifBtn.id = "crop-gif-capture-btn";
                cropGifBtn.innerText = "Capture Cropped GIF of body";
                cropGifBtn.style.position = "fixed";
                cropGifBtn.style.top = "210px";
                cropGifBtn.style.right = "10px";
                cropGifBtn.style.zIndex = 10000;
                cropGifBtn.onclick = async () => {
                    const cropRect = getCropRect();
                    const canvas1 = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
                    await new Promise(r => setTimeout(r, 500));
                    const canvas2 = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
                    const gif = new GIF({ workers: 2, quality: 10, workerScript: 'gif.worker.js' });
                    gif.addFrame(canvas1, { delay: 500 });
                    gif.addFrame(canvas2, { delay: 500 });
                    gif.on('finished', function(blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'div-rs_body-cropped.gif';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                            document.body.removeChild(a);
                            if (!navigator.userActivation || !navigator.userActivation.hasBeenActive) {
                                window.open(url, '_blank');
                            }
                        }, 100);
                    });
                    gif.render();
                };
                document.body.appendChild(cropGifBtn);
            }
        function tryAddButton() {
        const captureTarget = document.body;
        if (!captureTarget) {
            setTimeout(tryAddButton, 300); // Try again soon
            return;
        }
        if (document.getElementById("gif-capture-btn")) return; // Already added
        // GIF Button
        const gifBtn = document.createElement("button");
        gifBtn.id = "gif-capture-btn";
        gifBtn.innerText = "Capture 2-frame GIF of body";
        gifBtn.style.position = "fixed";
        gifBtn.style.top = "10px";
        gifBtn.style.right = "10px";
        gifBtn.style.zIndex = 10000;
        gifBtn.onclick = async () => {
            const cropRect = getCropRect();
            const canvas1 = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
            await new Promise(r => setTimeout(r, 500));
            const canvas2 = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
            const gif = new GIF({ workers: 2, quality: 10, workerScript: 'gif.worker.js' });
            gif.addFrame(canvas1, { delay: 500 });
            gif.addFrame(canvas2, { delay: 500 });
            gif.on('finished', function(blob) {
                const url = URL.createObjectURL(blob);
                // Try download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'div-rs_body.gif';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    // Fallback: open in new tab if not downloaded
                    if (!navigator.userActivation || !navigator.userActivation.hasBeenActive) {
                        window.open(url, '_blank');
                    }
                }, 100);
            });
            gif.render();
        };
        document.body.appendChild(gifBtn);
        // PNG Button
        if (!document.getElementById("png-capture-btn")) {
            const pngBtn = document.createElement("button");
            pngBtn.id = "png-capture-btn";
            pngBtn.innerText = "Capture PNG of body";
            pngBtn.style.position = "fixed";
            pngBtn.style.top = "50px";
            pngBtn.style.right = "10px";
            pngBtn.style.zIndex = 10000;
            pngBtn.onclick = async () => {
                const cropRect = getCropRect();
                const canvas = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'div-rs_body.png';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => document.body.removeChild(a), 100);
                });
            };
            document.body.appendChild(pngBtn);
        }
        // Custom Crop Button
        if (!document.getElementById("crop-capture-btn")) {
            const cropBtn = document.createElement("button");
            cropBtn.id = "crop-capture-btn";
            cropBtn.innerText = "Capture Cropped PNG of body";
            cropBtn.style.position = "fixed";
            cropBtn.style.top = "130px";
            cropBtn.style.right = "10px";
            cropBtn.style.zIndex = 10000;
            cropBtn.onclick = async () => {
                const cropRect = getCropRect();
                const canvas = await html2canvas(document.body, { x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, windowWidth: document.documentElement.scrollWidth, windowHeight: document.documentElement.scrollHeight });
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'div-rs_body-cropped.png';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => document.body.removeChild(a), 100);
                });
            };
            document.body.appendChild(cropBtn);
        }
        // Helper to get crop rectangle
        function getCropRect() {
            const h1 = document.querySelector('h1');
            const footer = document.querySelector('footer');
            if (!h1 || !footer) {
                return { x: 0, y: 0, width: document.body.clientWidth - 120, height: document.body.clientHeight };
            }
            const rect1 = h1.getBoundingClientRect();
            const rect2 = footer.getBoundingClientRect();
            // Calculate crop area from just below h1 to bottom of footer
            const scrollY = window.scrollY || window.pageYOffset;
            const scrollX = window.scrollX || window.pageXOffset;
            let x = rect1.left + scrollX;
            let y = rect1.bottom + scrollY + 4; // 4px below h1
            let width = rect1.width;
            let height = (rect2.top + rect2.height) - (rect1.bottom + 4);
            // Exclude the rightmost 120px (button area)
            width = Math.max(1, width - 120);
            return { x, y, width, height };
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryAddButton);
            // Cropped GIF
        // Always call once in case DOM is already ready
        tryAddButton();
            win.document.getElementById('download-cropped-gif-btn').onclick = function() {
                const imgs = Array.from(win.document.querySelectorAll('.frame-img'));
                if (!imgs.length) return;
                const gif = new win.GIF({ workers: 2, quality: 10, workerScript: 'gif.worker.js' });
                let loaded = 0;
                imgs.forEach(img => {
                    const canvas = win.document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    // Use the same crop as getCropRect
                    const h1 = win.document.querySelector('h1');
                    const footer = win.document.querySelector('footer');
                    let cropX = 0, cropY = 0, cropW = img.naturalWidth, cropH = img.naturalHeight;
                    if (h1 && footer) {
                        const rect1 = h1.getBoundingClientRect();
                        const rect2 = footer.getBoundingClientRect();
                        cropY = rect1.bottom + 4;
                        cropH = (rect2.top + rect2.height) - cropY;
                        cropW = img.naturalWidth - 120;
                    } else {
                        cropW = img.naturalWidth - 120;
                    }
                    canvas.width = cropW;
                    canvas.height = cropH;
                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                    gif.addFrame(canvas, { delay: 800 });
                    loaded++;
                    if (loaded === imgs.length) {
                        gif.on('finished', function(blob) {
                            const url = win.URL.createObjectURL(blob);
                            const a = win.document.createElement('a');
                            a.href = url;
                            a.download = 'div-rs-cropped-frames.gif';
                            win.document.body.appendChild(a);
                            a.click();
                            setTimeout(() => win.document.body.removeChild(a), 100);
                        });
                        gif.render();
                    }
                });
            };
        };
    }
examples.push(
    example(
        "Toggle",
        "An example with a toggleable pane.\n\nTwo grey panes labeled 'Hi!' and 'Bye!' automatically alternate visibility every second.\nNo user controls; keyboard input has no effect.\n\n---\nRust:\n```rust\ndiv0.show()?;\ndiv1.hide()?;\n```",
        () => toggle.main()
    )
);
examples.push(
    example(
        "Hello Svelte",
        "Demonstrates loading a Svelte component as a pane using Rust and JS interop.\n\nNo controls. This example shows a Svelte UI rendered inside a div-rs pane.\n\n---\nRust:\n```rust\nlet class = div::JsClass::preregistered(\"MyComponent\")?;\ndiv::from_js_class(x, y, w, h, class)?;\n```",
        () => {
            const divRoot = document.getElementById('div-root');
            if (!divRoot) {
                console.error("'div-root' element is missing before running hello_svelte.main().");
            } else {
                console.log("'div-root' element found, running hello_svelte.main().");
            }
            hello_svelte.main();
        }
    )
);

loadExampleSelection(examples);


let params = new URLSearchParams(location.search);
let displayedExample = params.get('example');

function resetDivRoot() {
    let main = document.querySelector('main');
    let old = document.getElementById('div-root');
    if (old) old.remove();
    let div = document.createElement('div');
    div.id = 'div-root';
    div.style.position = 'relative';
    main.insertBefore(div, main.firstChild);
}

if (displayedExample) {
    resetDivRoot();
    // Call div.reset() on all modules before running example
    for (const mod of [hello_world, reposition, styled, toggle, hello_svelte]) {
        if (typeof mod.reset === 'function') {
            try { mod.reset(); } catch (e) { /* ignore */ }
        }
    }
    const example = examples[displayedExample];
    example.fn();
    displayHint(example.help);
} else {
    displayHint("Use the drop down to switch between examples.");
}

function loadExampleSelection(examples) {
    const form = document.createElement("form");
    form.setAttribute("method", "GET");
    const button = document.createElement("input");
    button.setAttribute("type", "submit");
    button.setAttribute("value", "Show");
    form.appendChild(button);
    // Prevent default form submission (which reloads the page)
    form.addEventListener('submit', function(event) {
        event.preventDefault();
    });

    const select = document.createElement("select");
    select.setAttribute("name", "example")
    form.appendChild(select);
    for (let i = 0; i < examples.length; i++) {
        let option = document.createElement("option");
        option.value = i;
        option.text = examples[i].name;
        select.appendChild(option);
    }
    // Set combobox to match displayed example if present in URL
    let params = new URLSearchParams(location.search);
    let displayedExample = params.get('example');
    if (displayedExample !== null && select.options[displayedExample]) {
        select.value = displayedExample;
    }
    // Add a Random button to cycle through all modes
    const randomBtn = document.createElement('button');
    randomBtn.innerText = 'Random';
    randomBtn.style.marginLeft = '10px';
    form.appendChild(randomBtn);

    let randomInterval = null;
    randomBtn.addEventListener('click', function() {
        if (randomInterval) {
            clearInterval(randomInterval);
            randomInterval = null;
            randomBtn.innerText = 'Random';
            return;
        }
        randomBtn.innerText = 'Stop Random';
        randomInterval = setInterval(() => {
            // Pick a random example index
            const idx = Math.floor(Math.random() * examples.length);
            select.value = idx;
            // Trigger change event
            select.dispatchEvent(new Event('change'));
        }, 2000);
    });
    // Insert form after the <h1> header
    const h1 = document.querySelector('h1');
    if (h1 && h1.parentNode) {
        h1.parentNode.insertBefore(form, h1.nextSibling);
    } else {
        document.body.prepend(form);
    }

    // Reset div-root and run example on selection change
    select.addEventListener('change', async function() {
        const idx = select.value;
        // No longer force reload for 'Reposition'; robust reset is now used for all examples
        resetDivRoot();
        // Call div.reset() if available (WASM)
        for (const mod of [hello_world, reposition, styled, toggle, hello_svelte]) {
            if (typeof mod.reset === 'function') {
                try { mod.reset(); } catch (e) { /* ignore */ }
            }
        }
        examples[idx].fn();
        displayHint(examples[idx].help);
    });
}
function displayHint(text) {
    // Remove all previous .hint elements
    document.querySelectorAll('p.hint').forEach(e => e.remove());
    if (text) {
        // Convert markdown-style code blocks to <pre><code class="language-rust">...</code></pre>
        let html = text.replace(/```rust([\s\S]*?)```/g, (match, code) => {
            return `<pre><code class="language-rust">${escapeHtml(code.trim())}</code></pre>`;
        });
        // Replace newlines with <br> outside code blocks only
        html = html.replace(/(?!<pre>|<code>)(\n)/g, '<br>');
        const floatingText = document.createElement("p");
        floatingText.className = "hint";
        floatingText.innerHTML = html;
        const body = document.getElementsByTagName("body")[0];
        body.appendChild(floatingText);
        highlightCodeBlocks();
    }
}

// Escape HTML for code blocks
function escapeHtml(str) {
    return str.replace(/[&<>]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[tag]));
}
