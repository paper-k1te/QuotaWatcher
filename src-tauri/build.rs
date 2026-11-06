fn main() {
    let res_path = std::path::Path::new("app.res").canonicalize().unwrap();
    println!("cargo:rustc-link-arg={}", res_path.display());
}
