// Bruger klasse
class User {
  #username = "";

  constructor(loginFormId, headerUsernameId) {
    this.loginForm = document.getElementById(loginFormId);
    this.headerUsername = document.getElementById(headerUsernameId);
    this.checkLocalStorage();
    this.initLogin();
  }

  initLogin() {
    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("usernameLogin").value;
      const password = document.getElementById("password").value;

      // Fake brugernavn
      if (username === "Gruppe6" && password === "Eksamen") {
        this.#username = username;
        this.updateHeader();
        this.hideLogin();
        localStorage.setItem("username", username);
      } else {
        alert("Forkert brugernavn eller adgangskode");
      }
    });
  }

  checkLocalStorage() {
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      this.#username = storedUser;
      this.updateHeader();
      this.hideLogin();
    }
  }
  // Smider brugernavnet op i headeren
  updateHeader() {
    this.headerUsername.textContent = this.#username;
  }

  hideLogin() {
    this.loginForm.style.display = "none";

    // lægger et overlay på kortet
    const maps = document.getElementById("map");
    maps.classList.remove("blur");
  }

  getUsername() {
    return this.#username;
  }
}
// Kører klassen
document.addEventListener("DOMContentLoaded", () => {
  new User("login", "username");
});
