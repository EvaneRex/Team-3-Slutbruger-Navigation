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

   // Globals
   let map;
    let playerMarker;

    function initMap() {
      // Default startcenter (kan senere sættes dynamisk)
      const defaultCenter = { lat: 55.45, lng: 12.10 };

      // Initialiser kortet med Map ID
      map = new google.maps.Map(document.getElementById('map'), {
        center: defaultCenter,
        zoom: 15,
      });

      // Opret marker for spilleren (mus)
      playerMarker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        label: "🧍",
        title: "Spiller",
        visible: false
      });

      // Flyt spiller med musen
      map.addListener('mousemove', (e) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        playerMarker.setPosition(pos);
        playerMarker.setVisible(true);
      });
    }