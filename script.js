// Globals
let map;
let playerMarker;
let mouseMoveListener;

function initMap() {
  const defaultCenter = { lat: 55.45, lng: 12.1 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 15,
  });

  playerMarker = new google.maps.Marker({
    position: defaultCenter,
    map: map,
    label: "🧍",
    title: "Spiller",
    visible: false,
  });
}

function activatePlayerMarker() {
  if (mouseMoveListener) return;

  mouseMoveListener = map.addListener("mousemove", (e) => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    playerMarker.setPosition(pos);
    playerMarker.setVisible(true);
  });

  const mapDiv = document.getElementById("map");
  mapDiv.classList.remove("blur");
}

function deactivatePlayerMarker() {
  if (mouseMoveListener) {
    google.maps.event.removeListener(mouseMoveListener);
    mouseMoveListener = null;
  }
  if (playerMarker) playerMarker.setVisible(false);

  const mapDiv = document.getElementById("map");
  mapDiv.classList.add("blur");
}

// Opdater User-klassen
class User {
  #username = "";

  constructor(loginFormId, headerUsernameId) {
    this.loginForm = document.getElementById(loginFormId);
    this.headerUsername = document.getElementById(headerUsernameId);
    this.logoutBtn = document.getElementById("logout");
    this.checkLocalStorage();
    this.initLogin();
    this.initLogout();
  }

  initLogin() {
    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("usernameLogin").value;
      const password = document.getElementById("password").value;

      if (username === "Gruppe6" && password === "Eksamen") {
        this.#username = username;
        this.updateHeader();
        this.hideLogin();
        localStorage.setItem("username", username);

        this.logoutBtn.style.display = "inline";
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
      this.logoutBtn.style.display = "inline";
    }
  }

  updateHeader() {
    this.headerUsername.textContent = this.#username;
  }

  hideLogin() {
    this.loginForm.style.display = "none";
    const overlay = document.querySelector(".loginOverlay");
    if (overlay) overlay.style.display = "none";
    activatePlayerMarker();
  }

  initLogout() {
    if (!this.logoutBtn) return;
    this.logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.logout();
    });
  }

  logout() {
    localStorage.removeItem("username");
    this.#username = "";
    this.headerUsername.textContent = "";
    this.loginForm.style.display = "flex";
    this.logoutBtn.style.display = "none";
    const overlay = document.querySelector(".loginOverlay");
    if (overlay) overlay.style.display = "flex";
    deactivatePlayerMarker();
  }

  getUsername() {
    return this.#username;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  new User("login", "username");
});

// Henter API
async function getTasks() {
  const response = await fetch("./data/tasks.json");

  if (!response.ok) {
    throw new Error("Kunne ikke hente tasks.json");
  }

  return response.json();
}
