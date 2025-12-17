// #region Globals
let map;
let mouseMoveListener;
let allScenarios = [];
let activeScenario = null;
let activeTaskIndex = null;
let lockedTask = false;
let mapInitialized = false;
let scenarioInProgress = false;
// #endregion

// #region style for lokationsmarkørerne
function getTaskIcon(environment) {
  return {
    url: environment === "land" ? "img/haerpin.svg" : "img/soepin.svg",
    scaledSize: new google.maps.Size(48, 48), // Øger størrelsen
    anchor: new google.maps.Point(24, 48), // justere den til midten af opgaven
  };
}
// #endregion 

// #region Google maps
function initMap() {
  if (mapInitialized) return; // forhindrer dobbelt init
  mapInitialized = true;

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 55.8825, lng: 8.237 },
    zoom: 10,
    mapTypeId: "hybrid",
  });

  // playerMarker = new google.maps.Marker({
  //   position: map.getCenter(),
  //   map,
  //   visible: false,
  // });
}
// #endregion

// #region Login - Logud 
class User {
  constructor(loginFormId, headerUsernameId) {
    this.loginForm = document.getElementById(loginFormId);
    this.headerUsername = document.getElementById(headerUsernameId);
    this.logoutBtn = document.getElementById("logout");
    this.username = "";

    this.checkLocalStorage();
    this.initLogin();
    this.initLogout();
  }

  initLogin() {
    this.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("usernameLogin").value;
      const password = document.getElementById("password").value;

      if (username === "1" && password === "1") {
        this.username = username;
        this.updateHeader();
        this.hideLogin();
        introTxtScreen("loggedIn", this.username);
        localStorage.setItem("username", username);
        document.getElementById("map").classList.remove("blur");
        this.logoutBtn.style.display = "inline";

        await loadScenarios();
        setupMouseMove();
      } else {
        alert("Forkert brugernavn eller adgangskode");
      }
    });
  }

  checkLocalStorage() {
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      this.username = storedUser;
      this.updateHeader();
      this.hideLogin();
      this.logoutBtn.style.display = "inline";
      document.getElementById("map").classList.remove("blur");

      loadScenarios().then(setupMouseMove);
    }
  }

  updateHeader() {
    this.headerUsername.textContent = this.username;
  }

  hideLogin() {
    this.loginForm.style.display = "none";
    const overlay = document.querySelector(".loginOverlay");
    if (overlay) overlay.style.display = "none";
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
    sessionStorage.removeItem("completedScenarios");
    introTxtScreen("loggedOut");

    this.username = "";
    this.headerUsername.textContent = "";
    this.loginForm.style.display = "flex";
    this.logoutBtn.style.display = "none";
    const overlay = document.querySelector(".loginOverlay");
    if (overlay) overlay.style.display = "flex";
    const mapDiv = document.getElementById("map");
    mapDiv.classList.add("blur");
    document.getElementById("scenarioBox").style.display = "none";
    allScenarios.forEach((scenario) => {
      scenario.completed = false;
    });

    // ryd scenarie-listen visuelt
    const scenarioBox = document.getElementById("scenarioBox");
    if (scenarioBox) {
      scenarioBox.innerHTML = "";
      scenarioBox.style.display = "none";
    }
  }

  getUsername() {
    return this.username;
  }
}
// #endregion

// #region Vores tekst i sidebar
const headingOne = document.getElementById("headingOne");
const introTxt = document.getElementById("introTxt");

function introTxtScreen(state) {
  introTxt.style.display = "block";

  if (state === "loggedOut") {
    headingOne.textContent = "Velkommen";
    introTxt.innerHTML =
      "Dette er Hjemmeværnsskolens øvelsesplatform.<br>Når du er logget ind, vil opgaver automatisk blive aktiveret, når du nærmer dig den tildelte øvelseszone.";
  }

  if (state === "loggedIn") {
    headingOne.textContent = "Udforsk";
    introTxt.innerHTML =
      "Udforsk kortet for at lokalisere yderligere opgaver i dit område.<br>Hvis der ikke fremgår aktive opgaver, returnér da til base.";
  }

  //evt taskActive
  if (state === "task") {
    headingOne.textContent = "Scenarie";
    introTxt.style.display = "none";
  }
}
// #endregion

// #region UI funktioner sættes ind
function showExploreUI() {
  document.getElementById("taskBox").style.display = "block";
  document.getElementById("activeTaskBox").style.display = "none";
  document.getElementById("scenarioBox").style.display = "block";

  renderScenarioList();
}
function renderScenarioList() {
  const box = document.getElementById("scenarioBox");
  box.innerHTML = "";

  const sHeading = document.createElement("h2");
  sHeading.textContent = "Opgaver";
  box.appendChild(sHeading);

  allScenarios.forEach((scenario, index) => {
    const item = document.createElement("div");
    item.classList.add("scenarioItem");

    // titel fra JSON (fallback hvis ikke findes)
    item.textContent = scenario.title || `Scenarie ${index + 1}`;

    if (scenario.completed) {
      //completed
      item.classList.add("scenarioCompleted");
    } else {
      // aktiv
      item.classList.add("scenarioActive");
    }
    item.addEventListener("click", () => {
      if (scenario.tasks && scenario.tasks.length > 0) {
        const firstTask = scenario.tasks[0];
        if (firstTask.marker) {
          map.setCenter(firstTask.marker.getPosition());
          map.setZoom(18);
        }
      }
    });
    box.appendChild(item);
  });
}
function showTaskUI(task, locked) {
  //skjuler scenarielisten
  document.getElementById("scenarioBox").style.display = "none";

  document.getElementById("taskBox").style.display = "none";
  document.getElementById("activeTaskBox").style.display = "block";

  document.getElementById("taskTitle").textContent = task.title;
  document.getElementById("taskDescription").textContent = task.description;

  const opts = document.getElementById("taskOptions");
  opts.innerHTML = "";

  task.options.forEach((o) => {
    const label = document.createElement("label");
    label.classList.add("checkbox");

    const cb = document.createElement("input");
    cb.type = "checkbox";

    // Sætter maks på og tjekker om der er valg og fjerner error msg

    cb.addEventListener("change", () => {
      if (cb.checked) {
        opts.querySelectorAll("input[type='checkbox']").forEach((other) => {
          if (other !== cb) other.checked = false;
        });
      }
      const errorMsg = document.getElementById("taskError");
      if (errorMsg) errorMsg.remove();
    });

    const checkmark = document.createElement("span");
    checkmark.classList.add("checkmark");

    label.append(cb, checkmark, o);
    opts.appendChild(label);
  });

  document.getElementById("nextTaskBtn").style.display = locked
    ? "block"
    : "none";
}
function clearTaskUI() {
  document.getElementById("activeTaskBox").style.display = "none";
  document.getElementById("taskTitle").textContent = "";
  document.getElementById("taskDescription").textContent = "";
  document.getElementById("taskOptions").innerHTML = "";
  document.getElementById("nextTaskBtn").style.display = "none";
}

// Henter gruppe 4 API
async function fetchScenariosFromAPI() {
  try {
    const res = await fetch(
      "https://api.jsonbin.io/v3/b/6939291ad0ea881f401efd5e",
      {
        headers: {
          "x-access-key":
            "$2a$10$rbxsXvTusL7oeoOTyUmf2.B7q7wRIbEty5zzAsWpoJMElkv1REKNS",
        },
      }
    );
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.record.scenarios;
  } catch (err) {
    console.error("Fejl ved hentning af scenarier:", err);
    return [];
  }
}
// #endregion

// #region Load scenarier
async function loadScenarios() {
  allScenarios = await fetchScenariosFromAPI();

  allScenarios.forEach((scenario) => {
    scenario.completed = false;
    scenario.tasks.forEach((task, i) => {
      task.index = i;

      task.marker = new google.maps.Marker({
        position: task.geo,
        map: i === 0 ? map : null,
        icon: getTaskIcon(task.environment),
      });

      task.circle = new google.maps.Circle({
        map: i === 0 ? map : null,
        center: task.geo,
        radius: task.geo.radius,
        fillColor: "#FF0004",
        strokeColor: "#FF0004",
        fillOpacity: 0.45,
        clickable: true,
      });
    });
  });

  const completedScenarios =
    JSON.parse(sessionStorage.getItem("completedScenarios")) || [];

  allScenarios.forEach((scenario) => {
    if (completedScenarios.includes(scenario.title)) {
      scenario.completed = true;
    }
  });

  showExploreUI();
}
// #endregion

// #region Mus funktion + radius
// Her der er radius problemer
function setupMouseMove() {
  if (mouseMoveListener) return;

  mouseMoveListener = map.addListener("mousemove", (e) => {
    if (!localStorage.getItem("username")) return;
    if (lockedTask) return;

    let insideAny = false;

    allScenarios.forEach((scenario) => {
      scenario.tasks.forEach((task) => {
        if (!task.circle || !task.circle.getMap()) return;

        const distance =
          google.maps.geometry.spherical.computeDistanceBetween(
            e.latLng,
            new google.maps.LatLng(task.geo.lat, task.geo.lng)
          );

        const effectiveRadius = task.geo.radius * 1.5;

        if (distance <= effectiveRadius) {
          insideAny = true;

          activeScenario = scenario;
          activeTaskIndex =task.index;

            task.circle.setOptions({
              fillColor: "#597E50",
              strokeColor: "#597E50",
            });

            showTaskUI(task, false);
            introTxtScreen("task");
        } else {
          task.circle.setOptions({
            fillColor: "#FF0004",
            strokeColor: "#FF0004",
          });
        }
      });
    });

    //fald tilbage til udforsk
    if (!insideAny && !scenarioInProgress) {
      activeScenario = null;
      activeTaskIndex = null;

      clearTaskUI();
      showExploreUI();
      introTxtScreen("loggedIn");
    }
  });

  // Click = lås scenarie
  map.addListener("click", () => {
    if (!activeScenario || activeTaskIndex === null) return;
    if (lockedTask) return;

    lockedTask = true;
    scenarioInProgress = true;

    showTaskUI(activeScenario.tasks[activeTaskIndex], true);
    introTxtScreen("task");
  });
}
// #endregion

// #region Sidste boks med afslutning + error message hvis ingen valg
document.getElementById("nextTaskBtn").addEventListener("click", () => {
  if (
    document.getElementById("nextTaskBtn").textContent === "Tilbage til kort"
  ) {

    scenarioInProgress = false;

    activeScenario = null;
    activeTaskIndex = null;
    lockedTask = false;

    showExploreUI();
    clearTaskUI(); // rydder indhold
    introTxtScreen("loggedIn");

    // resetter knaptekst
    document.getElementById("nextTaskBtn").textContent = "Næste";
    return;
  }

  const hasCheckboxes = document.querySelector(
    "#taskOptions input[type='checkbox']"
  );

  if (hasCheckboxes) {
    const checked = document.querySelector(
      "#taskOptions input[type='checkbox']:checked"
    );

    if (!checked) {
      let error = document.getElementById("taskError");

      if (!error) {
        error = document.createElement("p");
        error.id = "taskError";
        error.textContent = "Du skal vælge én mulighed for at fortsætte.";
        error.style.marginTop = "10px";

        document.getElementById("activeTaskBox").appendChild(error);
      }
      return;
    }
  }

  const scenario = activeScenario;
  const task = scenario.tasks[activeTaskIndex];

  task.marker.setMap(null);
  task.circle.setMap(null);

  activeTaskIndex++;

  if (scenario.tasks[activeTaskIndex]) {
    const next = scenario.tasks[activeTaskIndex];

    next.marker.setMap(map);
    next.circle.setMap(map);

    // næste opgave bliver centeret
    map.setCenter(next.marker.getPosition());
    map.setZoom(15);

    lockedTask = false;          
    activeScenario = null;    
    activeTaskIndex = null;

    clearTaskUI();
    introTxtScreen("task");
    
  } else {
    document.getElementById("taskTitle").textContent = "Scenarie afsluttet";
    document.getElementById("taskDescription").textContent =
      "Skriv en kommentar og gå tilbage til kortet.";
    document.getElementById("taskOptions").innerHTML =
      '<input type="text" placeholder="Kommentar">';
    document.getElementById("nextTaskBtn").textContent = "Tilbage til kort";

    let completedScenarios =
      JSON.parse(sessionStorage.getItem("completedScenarios")) || [];
    if (!completedScenarios.includes(scenario.title)) {
      completedScenarios.push(scenario.title);
    }
    sessionStorage.setItem(
      "completedScenarios",
      JSON.stringify(completedScenarios)
    );
    scenario.completed = true;
    scenarioInProgress = false;
    lockedTask = false;
  }
});
// #endregion

// #region Opstart
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  new User("login", "username");
  introTxtScreen("loggedOut");
});
// #endregion 
