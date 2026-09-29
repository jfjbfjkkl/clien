const form = document.querySelector("[data-admin-login-form]");
const errorNode = document.querySelector("[data-admin-login-error]");
const submitButton = document.querySelector("[data-admin-login-submit]");
const passwordInput = document.querySelector("#admin-password");
const togglePassword = document.querySelector("[data-toggle-admin-password]");

document.body.classList.add("is-loaded");

togglePassword?.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePassword.textContent = show ? "Masquer" : "Afficher";
  togglePassword.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorNode.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Vérification…";
  const values = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ email: values.email, password: values.password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Connexion impossible.");
    window.location.replace("/admin");
  } catch (error) {
    errorNode.textContent = error.message;
    submitButton.disabled = false;
    submitButton.textContent = "Se connecter";
    passwordInput.value = "";
    passwordInput.focus();
  }
});

fetch("/api/admin/session", { credentials: "same-origin", headers: { "Accept": "application/json" } })
  .then((response) => { if (response.ok) window.location.replace("/admin"); })
  .catch(() => {});
