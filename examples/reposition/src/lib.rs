use wasm_bindgen::JsCast;
use web_sys::window;
use wasm_bindgen::prelude::*;
use console_error_panic_hook;

/**
 * This example show how
 *  div::reposition
 *  div::resize
 *  Pane::reposition
 *  Pane::resize
 * work.
 *
 * To see it in action use the arrow keys, WASD, +/-, 1/2
 *
 * A typical use case for the global feature is resizing or moving the entire
 * area which displays content, for example, entering full screen mode.
 *
 * The HTML inside the div remains untouched (no resizing) but because its container is
 * repositioned and/or resized, it can also change the arrangement of the internal HTML elements.
 */

static mut KEYDOWN_CLOSURE: Option<Closure<dyn FnMut(web_sys::Event)>> = None;

#[wasm_bindgen]
pub fn reset() {
    // Remove the keydown event listener if present
    let win = match window() {
        Some(w) => w,
        None => return,
    };
    unsafe {
        if let Some(old_closure) = KEYDOWN_CLOSURE.take() {
            let _ = win.remove_event_listener_with_callback("keydown", old_closure.as_ref().unchecked_ref());
            // drop(old_closure); // dropped automatically
        }
    }
    // Also reset the Rust global state so example can be re-initialized
    div::reset_global_div_state();

    // Explicitly clear all children of div-root (DOM cleanup)
    if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
        if let Some(div_root) = doc.get_element_by_id("div-root") {
            while let Some(child) = div_root.first_child() {
                let _ = div_root.remove_child(&child);
            }
        }
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    // Enable better panic messages
    console_error_panic_hook::set_once();

    // Remove previous keydown listener if present
    let win = window().unwrap();
    unsafe {
        if let Some(old_closure) = KEYDOWN_CLOSURE.take() {
            let _ = win.remove_event_listener_with_callback("keydown", old_closure.as_ref().unchecked_ref());
            // drop(old_closure); // dropped automatically
        }
    }

    // Start at position (0,0) with size (350,200)
    let mut x = 0;
    let mut y = 0;
    let w = 350;
    let h = 200;
    div::init_ex(Some("div-root"), (x, y), Some((w, h))).expect("Init failed");

    // Create a pane which shows the total pane area
    let html0 = r#"
    <div style="border:solid; width: 100%; height: 100%; box-sizing: border-box; border: 5px solid black;"></div>
    "#;
    div::new(0, 0, w, h, html0).unwrap();

    // Create two div within to show internal scaling behavior
    let html1 = r#"
    <div style="background-color:red; color: white; font-size: 80px; text-align: center; width: 100%; height: 100%;">
        A
    </div>
    "#;
    let html2 = r#"
    <div style="background-color:blue; color:white; font-size: 80px; text-align: center; width: 100%; height: 100%;">
        B
    </div>
    "#;
    // pane A will have a dynamic position and size
    let (mut ax, mut ay, aw, ah) = (50, 50, 100, 100);
    let pane_a = div::new(ax, ay, aw, ah, html1).unwrap();
    let _pane_b = div::new(200, 50, 100, 100, html2).unwrap();

    // Define control variables for zoom of global area and pane A
    let mut f: f32 = 1.0;
    let mut af: f32 = 1.0;

    // Listen to keydown events to move and reposition all divs (with bounds checks)
    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
        let keyboard_event = event.dyn_ref::<web_sys::KeyboardEvent>();
        if let Some(e) = keyboard_event {
            let key = e.key();
            match key.as_str() {
                "ArrowUp" => { y = y.saturating_sub(10); },
                "ArrowDown" => { y += 10; },
                "ArrowLeft" => { x = x.saturating_sub(10); },
                "ArrowRight" => { x += 10; },
                "+" => { f *= 1.5; },
                "-" => { f /= 1.5; },

                "w" => { ay = ay.saturating_sub(10); },
                "a" => { ax = ax.saturating_sub(10); },
                "s" => { ay += 10; },
                "d" => { ax += 10; },
                "1" => { af *= 1.5; },
                "2" => { af /= 1.5; },

                _ => {
                    web_sys::console::log_1(&format!("pressed {}", key).into());
                    return;
                }
            }
            // Bounds checks to prevent panics
            let safe_x = x.max(0);
            let safe_y = y.max(0);
            let safe_f = f.max(0.1); // Prevent zero/negative scale
            let safe_af = af.max(0.1);
            let safe_ax = ax.max(0);
            let safe_ay = ay.max(0);
            let safe_aw = (safe_af * aw as f32).max(1.0);
            let safe_ah = (safe_af * ah as f32).max(1.0);
            let safe_w = (safe_f * w as f32).max(1.0);
            let safe_h = (safe_f * h as f32).max(1.0);

            div::reposition(safe_x, safe_y).unwrap();
            div::resize(safe_w as u32, safe_h as u32).unwrap();
            pane_a
                .reposition_and_resize(safe_ax, safe_ay, safe_aw as u32, safe_ah as u32)
                .unwrap();
            // Same as
            // pane_a.reposition(ax,ay).unwrap();
            // pane_a.resize(aw as u32, ah as u32).unwrap();
            // but avoids extra redraw of div
        }
    }) as Box<dyn FnMut(_)>);

    win.add_event_listener_with_callback("keydown", closure.as_ref().unchecked_ref()).unwrap();
    unsafe {
        KEYDOWN_CLOSURE = Some(closure);
    }
}