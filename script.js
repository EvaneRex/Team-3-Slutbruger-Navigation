/**************************************************
 * GLOBALS (URET – KUN BRUGT KORREKT)
 **************************************************/
let map;
let mouseMoveListener;

let allScenarios = [];
let activeScenario = null;
let activeTaskIndex = null;
let lockedTask = false;
let playerMarker;
let mapInitialized = false;



/**************************************************
 * GOOGLE MAP INIT
 **************************************************/
function initMap() {
  if (mapInitialized) return; // forhindrer dobbelt init
  mapInitialized = true;

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 55.8825, lng: 8.237 },
    zoom: 10,
  });

  playerMarker = new google.maps.Marker({
    position: map.getCenter(),
    map,
    visible: false,
  });
}



/**************************************************
 * LOGIN (URET)
 **************************************************/
class User {
  #username = "";

  constructor(loginFormId, headerUsernameId) {
    this.loginForm = document.getElementById(loginFormId);
    this.headerUsername = document.getElementById(headerUsernameId);
    this.logoutBtn = document.getElementById("logout");

    this.checkLocalStorage();
    this.initLogin();
  }

  initLogin() {
    this.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (usernameLogin.value === "1" && password.value === "1") {
        localStorage.setItem("username", "1");
        this.#username = "1";
        this.headerUsername.textContent = "1";
        this.loginForm.style.display = "none";
        document.querySelector(".loginOverlay").style.display = "none";
        document.getElementById("map").classList.remove("blur");
        this.logoutBtn.style.display = "inline";

        introTxtScreen("loggedIn");
        await loadScenarios();
        setupMouseMove();
      }
    });
  }

  checkLocalStorage() {
    if (localStorage.getItem("username")) {
      this.headerUsername.textContent = "1";
      document.querySelector(".loginOverlay").style.display = "none";
      document.getElementById("map").classList.remove("blur");
      this.logoutBtn.style.display = "inline";

      loadScenarios().then(setupMouseMove);
    }
  }
}

/**************************************************
 * SIDEBAR TEXT
 **************************************************/
const headingOne = document.getElementById("headingOne");
const introTxt = document.getElementById("introTxt");

function introTxtScreen(state) {
  introTxt.style.display = "block";

  if (state === "loggedOut") {
    headingOne.textContent = "Velkommen";
    introTxt.innerHTML =
      "Dette er Hjemmeværnsskolens øvelsesplatform.";
  }

  if (state === "loggedIn") {
    headingOne.textContent = "Udforsk";
    introTxt.innerHTML =
      "Udforsk kortet for at finde opgaver.";
  }

  if (state === "task") {
    headingOne.textContent = "Scenarie";
    introTxt.style.display = "none";
  }
}

/**************************************************
 * UI HELPERS
 **************************************************/
function showExploreUI() {
  document.getElementById("taskBox").style.display = "block";
  document.getElementById("activeTaskBox").style.display = "none";
}

function showTaskUI(task, locked) {
  document.getElementById("taskBox").style.display = "none";
  document.getElementById("activeTaskBox").style.display = "block";

  document.getElementById("taskTitle").textContent = task.title;
  document.getElementById("taskDescription").textContent =
    task.description;

  const opts = document.getElementById("taskOptions");
  opts.innerHTML = "";

  task.options.forEach((o) => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    label.append(cb, o);
    opts.appendChild(label);
  });

  document.getElementById("nextTaskBtn").style.display =
    locked ? "block" : "none";
}

/**************************************************
 * API
 **************************************************/
async function fetchScenariosFromAPI() {
  const res = await fetch(
    "https://api.jsonbin.io/v3/b/6939291ad0ea881f401efd5e",
    {
      headers: {
        "x-access-key":
          "$2a$10$rbxsXvTusL7oeoOTyUmf2.B7q7wRIbEty5zzAsWpoJMElkv1REKNS",
      },
    }
  );

  const data = await res.json();
  return data.record.scenarios;
}

/**************************************************
 * LOAD SCENARIOS
 **************************************************/
async function loadScenarios() {
  allScenarios = await fetchScenariosFromAPI();

  allScenarios.forEach((scenario) => {
    scenario.tasks.forEach((task, i) => {
      task.index = i;

      task.marker = new google.maps.Marker({
        position: task.geo,
        map: i === 0 ? map : null,
      });

      task.circle = new google.maps.Circle({
        map: i === 0 ? map : null,
        center: task.geo,
        radius: task.geo.radius,
        fillColor: "#FF0004",
        strokeColor: "#FF0004",
        fillOpacity: 0.3,
      });
    });
  });

  showExploreUI();
}

/**************************************************
 * MOUSEMOVE = PREVIEW (FIXET)
 **************************************************/
function setupMouseMove() {
  if (mouseMoveListener) return;

  mouseMoveListener = map.addListener("mousemove", (e) => {
    if (!localStorage.getItem("username")) return;

    // 🧍 mus = spillerens position
    playerMarker.setPosition(e.latLng);
    playerMarker.setVisible(true);

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

          const effectiveRadius = task.geo.radius * 10;

          if (distance <= effectiveRadius) {
          insideAny = true;

          activeScenario = scenario;
          activeTaskIndex = task.index;

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

    // 🔄 ikke i nogen radius → tilbage til udforsk
    if (!insideAny && !lockedTask) {
      activeScenario = null;
      activeTaskIndex = null;
    
      showExploreUI();
      introTxtScreen("loggedIn");
    }
  });

  // CLICK = lås (samme som før, bare mere stabilt)
  map.addListener("click", () => {
    if (!activeScenario || activeTaskIndex === null) return;
    if (lockedTask) return;

    lockedTask = true;

    showTaskUI(
      activeScenario.tasks[activeTaskIndex],
      true
    );
  });
}


/**************************************************
 * NEXT / FINISH (URET LOGIK, BARE STABIL)
 **************************************************/
document.getElementById("nextTaskBtn").addEventListener("click", () => {
  const scenario = activeScenario;
  const task = scenario.tasks[activeTaskIndex];

  task.marker.setMap(null);
  task.circle.setMap(null);

  activeTaskIndex++;

  if (scenario.tasks[activeTaskIndex]) {
    const next = scenario.tasks[activeTaskIndex];
    next.marker.setMap(map);
    next.circle.setMap(map);

    lockedTask = false;
    showExploreUI();
    introTxtScreen("loggedIn");
  } else {
    document.getElementById("taskTitle").textContent =
      "Scenarie afsluttet";
    document.getElementById("taskDescription").textContent =
      "Skriv en kommentar og gå tilbage til kortet.";
    document.getElementById("taskOptions").innerHTML =
      '<input type="text" placeholder="Kommentar">';
    document.getElementById("nextTaskBtn").textContent =
      "Tilbage til kort";

    lockedTask = false;
  }
});

/**************************************************
 * START
 **************************************************/
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  new User("login", "username");
  introTxtScreen("loggedOut");
});
