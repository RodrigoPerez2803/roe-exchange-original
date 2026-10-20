/* =========================================================
   RoeExchange — shared behaviour
   ========================================================= */

/* ---------- Scale the screen to fill the window ----------
   Each page is drawn at the size of its mockup (data-w x data-h).
   We zoom it so it fits the window, like viewing the design full screen. */
function fitScreen() {
  const screen = document.querySelector(".screen");
  const w = Number(document.body.dataset.w);
  const h = Number(document.body.dataset.h);
  const zoom = Math.min(document.documentElement.clientWidth / w, window.innerHeight / h);

  screen.style.width = w + "px";
  screen.style.height = h + "px";
  screen.style.zoom = zoom;
  screen.style.setProperty("--u", w / 100 + "px");

  // the white header bar continues to both edges of the window
  const barHeight = document.querySelector(".bar").offsetHeight * zoom;
  document.body.style.background =
    "linear-gradient(#fff 0, #fff " + barHeight + "px, var(--green) " + barHeight + "px)";
}

fitScreen();
window.addEventListener("resize", fitScreen);

/* ---------- Storage (wrapped: it can be blocked in some browsers) ---------- */
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* the site still works, it just won't remember */
  }
}

/* ---------- "next" page carried through the sign-up steps ---------- */
const params = new URLSearchParams(location.search);
const nextPage = params.get("next");

function withNext(url) {
  return nextPage ? url + "?next=" + encodeURIComponent(nextPage) : url;
}

document.querySelectorAll("[data-keep-next]").forEach((link) => {
  link.href = withNext(link.getAttribute("href"));
});

/* ---------- Home: new users create an account first ---------- */
document.querySelectorAll("[data-needs-account]").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (!load("roe-user")) {
      e.preventDefault();
      location.href = "start.html?next=" + encodeURIComponent(link.getAttribute("href"));
    }
  });
});

/* ---------- Messages over the screen ---------- */
function showOverlay(id) {
  document.getElementById(id).classList.add("show");
}

document.querySelectorAll(".overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.hasAttribute("data-close")) overlay.classList.remove("show");
  });
});

/* ---------- Simple validation ---------- */
function validate(form) {
  let ok = true;
  form.querySelectorAll("[required]").forEach((input) => {
    const valid = input.checkValidity() && input.value.trim() !== "";
    input.classList.toggle("invalid", !valid);
    if (!valid) ok = false;
  });
  const error = form.querySelector(".form-error");
  if (error) error.classList.toggle("show", !ok);
  return ok;
}

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("input", (e) => {
    if (e.target.classList.contains("invalid") && e.target.checkValidity()) {
      e.target.classList.remove("invalid");
    }
  });
});

/* ---------- Picture previews ---------- */
document.querySelectorAll("input[type=file][data-preview]").forEach((input) => {
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const box = document.getElementById(input.dataset.preview);
    const reader = new FileReader();
    reader.onload = () => {
      box.querySelectorAll("svg, img").forEach((el) => el.remove());
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = "Preview of your picture";
      box.prepend(img);
    };
    reader.readAsDataURL(file);
  });
});

/* ---------- Personal details ---------- */
const detailsForm = document.getElementById("details-form");
if (detailsForm) {
  const draft = load("roe-draft") || {};
  Object.entries(draft).forEach(([name, value]) => {
    if (detailsForm.elements[name]) detailsForm.elements[name].value = value;
  });

  detailsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(detailsForm)) return;
    save("roe-draft", Object.fromEntries(new FormData(detailsForm)));
    location.href = withNext("college.html");
  });
}

/* ---------- College ---------- */
const collegeForm = document.getElementById("college-form");
if (collegeForm) {
  let chosen = null;
  const buttons = collegeForm.querySelectorAll(".college");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      chosen = btn.dataset.college;
      buttons.forEach((b) => b.classList.toggle("selected", b === btn));
      collegeForm.querySelector(".form-error").classList.remove("show");
    });
  });

  collegeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!chosen) {
      collegeForm.querySelector(".form-error").classList.add("show");
      return;
    }
    save("roe-user", Object.assign({}, load("roe-draft"), { college: chosen }));
    location.href = nextPage || "index.html";
  });
}

/* ---------- Forms that end with a message or go to a next step ---------- */
document.querySelectorAll("form[data-done]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(form)) return;

    // trade step 1 keeps its answers and moves on to step 2
    if (form.dataset.done.endsWith(".html")) {
      save("roe-trade", Object.fromEntries(new FormData(form)));
      location.href = form.dataset.done;
      return;
    }
    showOverlay(form.dataset.done);
  });
});

/* ---------- Product detail page ---------- */
const detail = document.getElementById("product-detail");
if (detail && typeof PRODUCTS !== "undefined") {
  const product = PRODUCTS[params.get("id")];

  if (!product || product.soldOut) {
    location.replace("store.html");
  } else {
    document.title = product.title + " | RoeExchange";
    detail.querySelectorAll("[data-field]").forEach((el) => {
      el.textContent = product[el.dataset.field];
    });
    const img = detail.querySelector("[data-image]");
    img.src = product.image;
    img.alt = product.title;
    detail.querySelector("[data-back]").href = product.category + ".html";

    document.getElementById("deal-btn").addEventListener("click", () => {
      document.getElementById("deal-seller").textContent = product.seller;
      document.getElementById("deal-place").textContent = product.delivery;
      showOverlay("deal-msg");
    });
  }
}
