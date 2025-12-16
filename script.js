// Globals
let map;
let playerMarker;
let mouseMoveListener;

// Indsætter kortet, og centrere det på dk, tilføjer playerMarker
function initMap() {
  const defaultCenter = { lat: 55.8825, lng: 8.237 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 10,
  });

  playerMarker = new google.maps.Marker({
    position: defaultCenter,
    map: map,
    label: "🧍",
    title: "Spiller",
    visible: false,
  });
}
function setupTaskMouseMove() {
  map.addListener("mousemove", (e) => {
    if (!localStorage.getItem("username")) return;

    const mousePos = e.latLng;
    let anyTaskActive = false;

    allTasks.forEach((task) => {
      if (task.isLocked) return;

      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        mousePos,
        new google.maps.LatLng(task.geo.lat, task.geo.lng)
      );

      if (distance <= task.geo.radius) {
        task.isActive = true;
        task.element.style.display = "block";
        task.area.setOptions({
          fillColor: "#597E50",
          strokeColor: "#597E50",
        });
        anyTaskActive = true;
      } else {
        task.isActive = false;
        task.element.style.display = "none";
        task.area.setOptions({
          fillColor: "#FF0004",
          strokeColor: "#FF0004",
        });
      }
    });

    // Skift tekst korrekt
    if (anyTaskActive) {
      introTxtScreen("taskActive");
    } else {
      introTxtScreen("loggedIn");
      introTxt.style.display = "block";
    }
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

// Brugeradgang + sammenhæng med tekst
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

      if (username === "1" && password === "1") {
        this.#username = username;
        this.updateHeader();
        this.hideLogin();
        introTxtScreen("loggedIn", this.username);
        localStorage.setItem("username", username);

        this.logoutBtn.style.display = "inline";
      } else {
        alert("Forkert brugernavn eller adgangskode");
      }

      activatePlayerMarker();

      loadScenarios().then(() => {
        setupTaskMouseMove();
      });

      introTxtScreen("loggedIn");
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

    loadScenarios();

    introTxtScreen("loggedIn");
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

// Vores tekst i sidebar
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
  if (state === "taskActive") {
    headingOne.textContent = "Scenarie";
    introTxt.style.display = "none";
  }
}

// Hent scenarier fra API (gruppe 3)
async function fetchScenariosFromAPI() {
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
  return data.record.scenarios;
}

// Opretter opgave-elementer, inkl. checkbox
function createTaskElements(task, fieldset) {
  task.isActive = false;
  task.isLocked = false;

  const div = document.createElement("div");
  div.style.display = "none";
  fieldset.appendChild(div);
  task.element = div;

  task.options.forEach((opt, i) => {
    const wrapper = document.createElement("div");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `${task.taskId}-option-${i}`;
    checkbox.name = `task-${task.taskId}`;
    checkbox.value = opt;

    const label = document.createElement("label");
    label.setAttribute("for", checkbox.id);
    label.textContent = opt;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    div.appendChild(wrapper);
  });
}

// Opretter marker og område på kortet
function createMapMarkers(task) {
  const marker = new google.maps.Marker({
    position: { lat: task.geo.lat, lng: task.geo.lng },
    map: map,
  });

  const area = new google.maps.Circle({
    map: map,
    strokeColor: "#FF0004",
    strokeWeight: 5,
    fillColor: "#FF0004",
    fillOpacity: 0.3,
    center: { lat: task.geo.lat, lng: task.geo.lng },
    radius: task.geo.radius,
  });

  return { marker, area };
}

// Håndtering af opgave aktivering
function handleTaskActivation(task, area) {
  area.addListener("click", () => {
    task.isActive = true;
    task.isLocked = true;
    task.element.style.display = "block";

    task.area.setOptions({
      fillColor: "#597E50",
      strokeColor: "#597E50",
    });

    introTxtScreen("taskActive");
  });
}

// Opretter scenarie boks
function createScenarioBox(scenario) {
  const scenarioBox = document.createElement("div");
  scenarioBox.classList.add("opgaveBox");

  const title = document.createElement("h2");
  title.textContent = scenario.title;
  scenarioBox.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = scenario.description;
  scenarioBox.appendChild(desc);

  const fieldset = document.createElement("fieldset");
  scenarioBox.appendChild(fieldset);

  // Opret scenario-knap her i JS
  const btn = document.createElement("button");
  btn.textContent = "Næste";
  btn.disabled = true;
  scenarioBox.appendChild(btn);

  let currentTaskIndex = 0;
  scenario.tasks.forEach((task) => {
    createTaskElements(task, fieldset);
    const { marker, area } = createMapMarkers(task);
    task.marker = marker;
    task.area = area;
    handleTaskActivation(task, area, btn, currentTaskIndex);
  });

  return scenarioBox;
}

// Loader scenarier
async function loadScenarios() {
  try {
    const scenarios = await fetchScenariosFromAPI();
    const sidebar = document.getElementById("scenarioBox");
    sidebar.innerHTML = "";

    scenarios.forEach((scenario) => {
      const box = createScenarioBox(scenario);
      sidebar.appendChild(box);
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
