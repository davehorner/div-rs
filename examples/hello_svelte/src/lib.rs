use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn main() {
    set_panic_hook();

    // Defensive: check for double initialization
    match div::init_to("div-root") {
        Ok(_) => {},
        Err(e) => {
            panic!("[hello_svelte] div::init_to('div-root') failed: {e:?}.\nThis usually means main() was called without a prior reset, or reset did not complete before main().");
        }
    }

    const X: u32 = 0;
    const Y: u32 = 0;
    const W: u32 = 500;
    const H: u32 = 500;
    let class = div::JsClass::preregistered("MyComponent")
        .unwrap_or_else(|| panic!("[hello_svelte] Svelte component 'MyComponent' is not registered.\n\nMake sure register_svelte_component('MyComponent', ...) is called in JS before calling main()."));
    div::from_js_class(X as i32, Y as i32, W, H, class).expect("[hello_svelte] div::from_js_class failed");

    /* Alternative that loads classes from a separate JS file instead of registering in the JS code. */
    // let future = async {
    //     let class = div::load_js_class("MyComponent", "./some_file.js").unwrap().await;
    //     div::from_js_class(X, Y, W, H, class).unwrap();
    // };
    // wasm_bindgen_futures::spawn_local(future);
}

#[wasm_bindgen]
pub fn reset() {
    div::reset_global_div_state();
}

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")] 
    console_error_panic_hook::set_once();
}
