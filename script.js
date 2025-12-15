// Globals
let map;
let playerMarker;
let mouseMoveListener;

// Indsætter kortet, og centrere det på dk, tilføjer playerMarker
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

// Håndtering af playerMarker aktiveret/deaktiveret
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
// skal connectes med sidebaren, så den skifter når man er logget ind
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
        introTxtScreen("loggedIn", this.username);
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
    introTxtScreen("loggedOut");

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

//
const headingOne = document.getElementById("headingOne");
const introTxt = document.getElementById("introTxt");
function introTxtScreen(state) {
  if (state === "loggedOut") {
    headingOne.textContent = "Velkommen";
    introTxt.innerHTML = `Dette er Hjemmeværnsskolens øvelsesplatform.<br>Når du er logget ind, vil opgaver automatisk blive aktiveret, når du nærmer dig den tildelte øvelseszone.`;
  }
  if (state === "loggedIn") {
    headingOne.textContent = "Udforsk";
    introTxt.innerHTML = `Udforsk kortet for at lokalisere yderligere opgaver i dit område.<br>Hvis der ikke fremgår aktive opgaver, returnér da til base.`;
  }
  if (state === "task.isActive") {
    headingOne.textContent = "Scenarie";
    introTxt.style.display = "none";
  }
}

// Henter scenarier fra gruppe 3 og opsætter dem i deres boks
async function loadScenarios() {
  try {
    const response = await fetch(
      "https://api.jsonbin.io/v3/b/6939291ad0ea881f401efd5e",
      {
        headers: {
          "x-access-key":
            "$2a$10$rbxsXvTusL7oeoOTyUmf2.B7q7wRIbEty5zzAsWpoJMElkv1REKNS",
        },
      }
    );

    if (!response.ok) throw new Error("Kunne ikke hente API-data");

    const data = await response.json();
    const scenarios = data.record.scenarios;
    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML = "";

    // Bygger kassen i sidebaren
    scenarios.forEach((scenario) => {
      const scenarioBox = document.createElement("div");
      scenarioBox.classList.add("opgaveBox");

      const title = document.createElement("h2");
      title.textContent = scenario.title;
      scenarioBox.appendChild(title);

      const desc = document.createElement("p");
      desc.textContent = scenario.description;
      scenarioBox.appendChild(desc);

      // Checkbokse til svarmulighederne
      const fieldset = document.createElement("fieldset");
      scenarioBox.appendChild(fieldset);

      //------ Lokationsmarker, opgaveområde og aktivering af området
      let currentTaskIndex = 0;
      const taskMarkers = [];
      const taskAreas = [];

      scenario.tasks.forEach((task) => {
        task.isActive = false;
        task.isLocked = false;

        const div = document.createElement("div");
        div.style.display = "none";
        fieldset.appendChild(div);
        task.element = div;

        task.options.forEach((opt, i) => {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = `${task.taskId}-option-${i}`;
          checkbox.name = `task-${task.taskId}`;
          checkbox.value = opt;

          const label = document.createElement("label");
          label.setAttribute("for", checkbox.id);
          label.textContent = opt;

          div.appendChild(checkbox);
          div.appendChild(label);
        });
      });

      // Knappen der fører mellem opgaverne i scenariet
      const btn = document.getElementById("scenarioBtn");
      btn.textContent = "Næste";
      btn.disabled = true;
      scenarioBox.appendChild(btn);

      // Markøren for opgaverne
      scenario.tasks.forEach((task) => {
        const marker = new google.maps.Marker({
          position: { lat: task.geo.lat, lng: task.geo.lng },
          map: map,
        });
        taskMarkers.push(marker);

        // Markeringen af ikke aktive områder (af opgaverne)
        const areas = new google.maps.Circle({
          map: map,
          strokeColor: "#FF0004",
          strokeWeight: 5,
          fillColor: "#FF0004",
          fillOpacity: 0.3,
          center: { lat: task.geo.lat, lng: task.geo.lng },
          radius: task.geo.radius,
        });
        taskAreas.push(areas);

        task.isActive = false;

        if (currentTaskIndex >= scenario.tasks.length) return;

        // Mousemove så opgaven visuelt markeret aktiv når brugerne kører musen over
        map.addListener("mousemove", (e) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          introTxtScreen("taskActive");

          // hvis distancen på musen er mindre end radiussen på opgaven, så vises scenarieboksen
          if (distance < task.geo.radius) {
            task.isActive = true;
            task.element.style.display = "block";
            btn.disabled = false;

            areas.setOptions({
              fillColor: "#597E50",
              strokeColor: "#597E50",
            });
          } else {
            task.isActive = false;

            if (!task.isLocked) {
              task.element.style.display = "none";
              areas.setOptions({
                fillColor: "#FF0004",
                strokeColor: "#FF0004",
              });
            }
          }
        });

        // gør opgaven aktiv når brugeren klikker på den
        areas.addListener("click", () => {
          task.isActive = true;
          task.isLocked = true;
          introTxtScreen("taskActive");
          areas.setOptions({
            fillColor: "#597E50",
            strokeColor: "#597E50",
          });

          currentTaskIndex++;
        });
      });
      scenarioBox.appendChild(fieldset);
      sidebar.appendChild(scenarioBox);
    });
  } catch (error) {
    console.error(error);
  }
}

// Opstarter kortet og login
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  new User("login", "username");
  introTxtScreen("loggedOut");
});
