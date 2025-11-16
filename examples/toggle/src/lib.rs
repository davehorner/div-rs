use div::DivHandle;
use gloo_timers::callback::Timeout;
use wasm_bindgen::prelude::*;
use std::sync::atomic::{AtomicUsize, Ordering};

static GENERATION: AtomicUsize = AtomicUsize::new(0);

#[wasm_bindgen(start)]
pub fn main() {
    div::init_to("div-root").expect("Init failed");

    // Bump generation to invalidate old toggle loops
    let gen = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    // Create two new div with some HTML in it
    let html0 = r#"
<div style="background-color:grey; color: white; height: 100%;">
    <div style="text-align: end; position: absolute; bottom: 0; right: 0;">
        Hi!
    </div>
</div>
"#;
    let html1 = r#"
<div style="background-color:grey; color:white; height: 100%;">
    <div>
        Bye!
    </div>
</div>
"#;
    let div0 = div::new(100, 100, 100, 100, html0).unwrap();
    let div1 = div::new(200, 200, 100, 100, html1).unwrap();

    toggle(div0, div1, gen);
}

// Function that takes two divs, shows the first and hides the second
// and then calls itself again delayed, with the two divs swapped
fn toggle(a: DivHandle, b: DivHandle, gen: usize) {
    // Only run if this is the current generation
    if gen != GENERATION.load(Ordering::SeqCst) {
        return;
    }
    a.show().ok();
    b.hide().ok();
    Timeout::new(1000, move || {
        toggle(b, a, gen);
    }).forget();
}

#[wasm_bindgen]
pub fn reset() {
    // Only bump the generation counter to invalidate old timers
    GENERATION.fetch_add(1, Ordering::SeqCst);
    div::reset_global_div_state();
}