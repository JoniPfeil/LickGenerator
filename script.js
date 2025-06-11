// script.js
document.getElementById("versionInfoJS").textContent = "0611_1205";

// html elements
const keySelect = document.getElementById("key");
const scaleSelect = document.getElementById("scale");
const difficultySelect = document.getElementById("difficulty");
const tempoSelect = document.getElementById("tempo");
const lengthSelect = document.getElementById("length");
const fretChange = document.getElementById("fretChange");
const stringChange = document.getElementById("stringChange");
const pNormal = document.getElementById("pNormal");
const pRest = document.getElementById("pRest");
const pDead = document.getElementById("pDead");
const pSlides = document.getElementById("pSlides");
const pBends = document.getElementById("pBends");
const pHammerPull = document.getElementById("pHammerPull");
const pDoubles = document.getElementById("pDoubles");
const soundSelect = document.getElementById("sound");
const generateButton = document.getElementById("generate-button");
const clickVolSelect = document.getElementById("clickVol");
const playButton = document.getElementById("play-button");
const rateButton = document.getElementById("rateLickBtn");
const tabDisplay = document.getElementById("tab-display");
const ratingStars = document.querySelectorAll('input[name="rating"]');
const afterRatingMsg = document.getElementById("afterRatingMsg");

let lick = []; // globale Variable for our lick
let synth = null;
let clickSynth = null;  // // Cache für Click
const loadedInstruments = {}; // Cache für geladene Instrumente
let audioStarted = false;
let scale;
let lickPart=null;
let clickLoop=null;

const lickInfo = {
  key: null,
  scale: null,
  length: null,
  difficulty: null
};


//Reverb erstellen
/*let reverb = new Tone.Reverb({
  decay: 2.5,
  preDelay: 0.05,
  wet: 0.5
}).toDestination();*/

//--------------------------------------------------------------------------------------------- Supabase ----------------------------------------
const supabaseClient = supabase.createClient(
  'https://hrsoaxdhyqkrsodvnbys.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc29heGRoeXFrcnNvZHZuYnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODE4NDMsImV4cCI6MjA2NDI1Nzg0M30.voG9dz3KgQ_W56mcw2okTqRDjNqeB8x63MWpwoaanyc',
  {auth: { autoRefreshToken: false, persistSession: false }}
);

async function saveLickToSupabase() {
  const lickObj = {
    lick: transposeLick(lick, -lickInfo.transpose),  // globales Lick-Array in C-Dur
    rating: getSelectedRating(),
    ...lickInfo                   // fügt alle Key-Value-Paare aus lickInfo hinzu
  };
  const { data, error } = await supabaseClient
    .from('ratedLicks')
    .insert([lickObj]);
  if (error) {
    console.error('Fehler beim Speichern:', error.message);
  } else {
    console.log('Lick gespeichert:', data);
  }
}

function transposeLick(lick, transpose) {
  return lick.map(note => {
    let fret = note.fret + transpose;
    let stringIndex = stringNames.indexOf(note.string);
    // Nach oben verschieben, falls Bund < 0
    while (fret < 0) {
      if (stringIndex > 0) {
        stringIndex -= 1;        // Eine Saite tiefer (kleinerer Index = musikalisch tiefer)
        fret += semitoneStepsBetweenStrings[stringIndex];
      } else {
        stringIndex += 2;        // Tiefste Saite erreicht: zwei Saiten höher (größerer Index = musikalisch höher)
        if (stringIndex > 5) stringIndex = 5; // Begrenzung auf höchste Saite
        fret += semitoneStepsBetweenStrings[0] + semitoneStepsBetweenStrings[1]; // 5 + 5 Halbtöne = 10
      }
    }
    // Nach unten verschieben, falls Bund > 17
    while (fret > 17) {
      if (stringIndex < 5) {
        stringIndex += 1;         // Eine Saite höher (größerer Index = musikalisch höher)
        fret -= semitoneStepsBetweenStrings[stringIndex];
      } else {
        stringIndex -= 2;        // Höchste Saite erreicht: zwei Saiten tiefer (kleinerer Index = musikalisch tiefer)
        if (stringIndex < 0) stringIndex = 0; // Begrenzung auf tiefste Saite
        fret -= semitoneStepsBetweenStrings[0] + semitoneStepsBetweenStrings[1]; // 10 Halbtöne runter
      }
    }
    return {
      ...note,
      fret,
      string: stringNames[stringIndex]
    };
  });
}

function getSelectedRating() {
  const selected = document.querySelector('input[name="rating"]:checked');
  return selected ? parseInt(selected.value) : null;
}

//Erlaubte Notenlängen in 16teln: 1=16tel; 2=8tel usw. ------------------------------------------------------------------------------------------------
function getNoteDurationOptions(difficulty) {
  switch (difficulty) {
    case "easy":
      return [4, 6, 8];
    case "medium":
      return [2, 4, 6, 8];
    case "hard":
      return [1, 2, 3, 4, 6];
  }
}

//Wahrscheinlichkeiten für die Notenlängen
function getNoteDurationProbabilities(difficulty) {
  //Notenlänge in 16teln: 1=16tel; 2=8tel usw.
  switch (difficulty) {
    case "easy":
      return [5, 5, 2];
    case "medium":
      return [5, 5, 3, 2];
    case "hard":
      return [5, 5, 3, 2, 2];
  }
}

// Function for setting the Sound (with Reverb) ------------------------------------------------------------------------------------------------------------------
async function setSound(selected) {

  /*if (!reverb.buffer) {
    await reverb.generate(); // Reverb laden
    reverb.toDestination();             // oder bereits verbunden
  }*/
  
  //if (selected === "synth") {
    synth = new Tone.Synth().toDestination();//.connect(reverb);
  //} 
  /*else {
    if (!loadedInstruments[selected]) {
      // Erzeuge einmalig GainNode für Soundfont
      //const sfGain = Tone.context.createGain();

      const sfGain = new Tone.Gain();     // Tone.Gain
      sfGain.connect(reverb);             // Reverb = Tone.Reverb
      

      //console.log("sfGain instanceof AudioNode:", sfGain instanceof AudioNode);
      //console.log("reverb.ready?", reverb && reverb.input);

      const instrument = await Soundfont.instrument(
        Tone.context.rawContext,
        selected,
        { destination: sfGain.input }
      );

      loadedInstruments[selected] = instrument;
      loadedInstruments[selected].sfGain = sfGain; // falls du später Zugriff brauchst
    }
    const player = loadedInstruments[selected];
    synth = {
      triggerAttackRelease: (note, duration, time) => {
        player.play(note, time, {
          duration: Tone.Time(duration).toSeconds()
        });
      }
    };
  }*/
}

// Event-Listener definieren ------------------------------------------------------------------------------------------------------------------------------------
/*document.getElementById("updateIntervall").addEventListener("change", (e) => {
  Tone.getContext().updateInterval = parseFloat(e.target.value);
});

document.getElementById("lookahead").addEventListener("change", (e) => {
  Tone.Transport.lookAhead = parseFloat(e.target.value);
});*/

document.getElementById("help").addEventListener("click", () => {
  document.getElementById("popUp-Help").classList.remove("hidden");
});

document.getElementById("close-help").addEventListener("click", () => {
  document.getElementById("popUp-Help").classList.add("hidden");
});

document.getElementById('popUp-Help').addEventListener('click', function(event) {
  // Schließe nur, wenn außerhalb von .popUp-content geklickt wurde
  if (!event.target.closest('.popUp-content')) {
    this.classList.add('hidden'); // oder z.B. this.style.display = 'none';
  }
});

rateButton.addEventListener("click", async () => {
  saveLickToSupabase();
  rateButton.disabled = true;
  rateCurrentLick();
  fadeOutDiv(afterRatingMsg);
});

document.getElementById("reverbWet").addEventListener("input", e => {
  //reverb.wet.value = parseFloat(e.target.value);
  //console.log(clickVolMap[e.target.value]);
});

soundSelect.addEventListener("change", (e) => setSound(e.target.value));
generateButton.addEventListener("click", async () => {
  // Audioausgabe aktivieren, damit Lick später abgespielt werden kann
  if (!audioStarted) {
    await Tone.start();    //ohne await?
    audioStarted = true;
  }
  generateLick();
});

playButton.addEventListener("click", async () => {
  try {
    await playLick(lick);
  } catch (error) {
    console.error("Fehler beim Abspielen des Licks:", error);
  }
});
clickVol.addEventListener("change", (e) => {
  try {
    clickSynth.volume.value = clickVolMap[e.target.value];
    //console.log(clickVolMap[e.target.value]);
  } catch (error) {
    console.error("Fehler clickVol", error);
  }
});
ratingStars.forEach(input => {
  input.addEventListener('change', () => {
    rateButton.disabled = false;
  });
});

// Generiere neuen Lick -------------------------------------------------------------------------------------------------------------------------------------------
function generateLick() {
  const key = keySelect.value;
  const difficulty = difficultySelect.value;
  const length = parseInt(lengthSelect.value);
  scale = getScale(key);
  const durations = getNoteDurationOptions(difficulty);
  const durationProbabilities = getNoteDurationProbabilities(difficulty);
  const stepsPerBar = 16;
  const totalSteps = length * stepsPerBar;

  techniqueProbabilities = [
    parseFloat(pNormal.value),       //normale Note
    parseFloat(pRest.value),         //rest: 1, 
    parseFloat(pDead.value),         //mute: 2,        
    parseFloat(pSlides.value)/2,     //slideUp: 3,     
    parseFloat(pSlides.value)/2,     //slideDown: 4,  
    parseFloat(pBends.value),        //bend: 5,      
    0,                               //release: 6,   
    parseFloat(pBends.value)/2,      //pbRelease: 7,
    parseFloat(pHammerPull.value)/2, //hammerOn: 8,
    parseFloat(pHammerPull.value)/2, //pullOff: 9,
    parseFloat(pDoubles.value),      //doublestop: 10,
    0,                               //vibrato: 11,
    0,                               //harmonic: 12,
    0,                               //tap: 13
  ];

  //console.log(techniqueProbabilities);

  lickInfo.transpose = keySelect.value;
  lickInfo.key = chromaticScale[keySelect.value];
  lickInfo.scale = scaleSelect.value;
  lickInfo.length = parseInt(lengthSelect.value);
  lickInfo.difficulty = difficultySelect.value;
  
  lick = []; // delete last lick
  let lastStringIndex = Math.floor(Math.random() * stringNames.length);   //random start string
  let lastFret = Math.floor(Math.random() * 18);                      //random start fret
  let lastTechnique = "note";

  playButton.disabled = true;
  rateButton.disabled = true;
  ratingStars.forEach(ratingStars => ratingStars.checked = false);

  //Generate one note at a time until tab is full
  for (let i = 0; i < totalSteps;) 
  {
    let stringIndex;
    let fret;
    let strintIndex2;  //second string for double stops
    let fret2;         //second fret for double stops

    let duration = weightedRandomChoice(durations, durationProbabilities);
    if (i + duration > totalSteps) {
      duration = totalSteps - i;  // Verhindere Überschreiten des Lick-Endes
    }

    let technique = weightedRandomChoice(techniques, techniqueProbabilities); 
    if (lastTechnique === "bend") {
      if (Math.random() < 0.3) {technique = "release"};    //release can (only) occur after bend (30% chance)
      if (technique === "bend") {technique = "note"};      //dont allow to bend an existing bend even more
    }
    //console.log("technique: ", technique);

    switch (technique)
    {
      case "note":
        stringIndex = chooseString (lastStringIndex);
        fret = getValidFret(stringIndex, chooseFret(lastFret));
      break;
      case "rest":
        stringIndex = null;
        fret = null;
      break;
      case "mute":
        stringIndex = chooseString (lastStringIndex);
        fret = getValidFret(stringIndex, chooseFret(lastFret));
      break;
      case "slideUp":
      case "slideDown":
        stringIndex = lastStringIndex;
        fret = getValidFret(stringIndex, chooseFret(lastFret));  //random note on same string
      break;
      case "bend":
        stringIndex = lastStringIndex;
        fret = getValidFret(stringIndex, (lastFret + 2));  //Bend half tone or full tone
      break;
      case "release":
        stringIndex = lastStringIndex;
        fret = getValidFret(stringIndex, (lastFret - 1));  //Release half tone or full tone
      break;
      case "pbRelease":
        stringIndex = lastStringIndex;
        fret = getValidFret(stringIndex, (lastFret - 1));  //Release half tone or full tone
      break;
      case "doublestop":
        stringIndex = chooseString (lastStringIndex);
        do {
          stringIndex2 = chooseString (stringIndex);
        } while (stringIndex === stringIndex2);        
        fret = getValidFret(stringIndex, chooseFret(lastFret));
        fret2 = getValidFret(stringIndex2, chooseFret(fret));
      break;
      default:
        continue;
    }

    // Falls Bund und Saite gleich wären, wie bei der Note zuvor, springe zum Schleifenbeginn und suche andere Note. Wiederholung wird also unterbunden.
    if (fret === lastFret && stringIndex === lastStringIndex) {continue;}

    if (technique === "slideUp" || technique === "slideDown") {
      if (fret > lastFret) {technique = "slideUp";}
      else  {technique = "slideDown";}
    }

    // Note speichern
    lick.push({ step: i, stringIndex, fret, duration, technique});
    //console.log({ step: i, stringIndex, fret, duration, technique});
    if (technique === "doublestop") {
      lick.push({ step: i, stringIndex: stringIndex2, fret: fret2, duration, technique});
      //console.log({ step: i, stringIndex: stringIndex2, fret: fret2, duration, technique});
    }
    
    // Letzte Werte aktualisieren
    if (stringIndex != null) {lastStringIndex = stringIndex;}
    if (fret != null) {lastFret = fret;}
    lastTechnique = technique;

    i += duration;
  }

  createTab(length);
  displayTab(lick);  
  addTabListeners();
  planLickPlayback(lick);
}

sliderToStdD = [0.8, 1, 1.5, 2.5, 4];

// Saite nach Normalverteilung wählen -----------------------------------------------------------------------------------------------------------------------------
function chooseString (lastStringIndex) {  
  let stringIndex;
  do {
    stringIndex = Math.round(randomNormal(lastStringIndex, sliderToStdD[parseInt(stringChange.value)]));
    //console.log("sliderToStdD", sliderToStdD[parseInt(stringChange.value)]);
  } while (stringIndex < 0 || stringIndex >= stringNames.length);
  return Math.abs(stringIndex);
}

// Saite nach Normalverteilung wählen -----------------------------------------------------------------------------------------------------------------------------
function chooseFret (lastFret) {
  let someFret;
  do {
    someFret = Math.round(randomNormal(lastFret, sliderToStdD[parseInt(fretChange.value)]));
  } while (someFret < 0 || someFret >= fretboardArray[0].length);
  return Math.abs(someFret);
} 

// Get closest valid fret --------------------------------------------------------------------------------------------------------------------------------------------
function getValidFret (stringIndex, someFret) {
  // Gültige Bünde für diese Saite auswählen
  const validFrets = fretboardArray[stringIndex].map((note, fret) => {
      const noteWithoutOctave = note.slice(0, -1); // z.B. "F#3" → "F#"
      return scale.includes(noteWithoutOctave) ? fret : null;
    })
    .filter(f => f !== null);
  fret = validFrets[0];
  let minDistance = Infinity;
  // Finde den Wert in validFrets, der someFret am nächsten ist
  for (let v of validFrets) {
    const distance = Math.abs(v - someFret);
    if (distance < minDistance) {
      minDistance = distance;
      fret = v;
    }
  }
  return fret;
}

// ----------------------------------------------------------------------------------------------------------------------------------------------------------
function createTab(bars) {
  const tabDisplay = document.getElementById("tab-display");
  tabDisplay.innerHTML = ""; // leeren

  const slotsPerBar = 16;
  const totalSlots = bars * slotsPerBar;

  //const stringNames = ["e", "B", "G", "D", "A", "E"]; // hohe e oben, tiefe E unten

  for (let s = 5; s > -1; s--) {
    const line = document.createElement("div");
    line.className = "tab-line";

    const label = document.createElement("span");
    label.className = "string-label";
    label.textContent = stringNames[s] + " |";
    line.appendChild(label);

    for (let step = 0; step < totalSlots; step++) {
      const slot = document.createElement("span");
      slot.className = "tab-slot";
      slot.textContent = " - ";
      slot.dataset.string = s;
      slot.dataset.step = step;
      line.appendChild(slot);
    }

    tabDisplay.appendChild(line);
  }
}

function addTabListeners() {
  const slots = document.querySelectorAll(".tab-slot");
  slots.forEach(slot => {
    slot.addEventListener("click", () => {
      const string = slot.dataset.string;
      const step = slot.dataset.step;
      const currentText = slot.textContent.trim();

      // Verhindern, dass mehrfach geklickt wird und mehrfach Inputs entstehen
      if (slot.querySelector("input")) return;

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 3;
      input.value = currentText.trim() === "-" ? "" : currentText.trim();
      input.className = "tab-input";

      // Inhalt leeren und Input einfügen
      slot.textContent = "";
      slot.appendChild(input);
      input.focus();

      let finished = false;

      function finishEdit() {
        if (finished) return;
        finished = true;
      
        const result = checkInput(input.value.trim());
      
        if (!result.valid) {
          alert("" + result.reason);
          input.value = currentText.trim() === "-" ? "" : currentText.trim();
          input.focus();
          finished = false; // zurücksetzen, damit erneutes Finish möglich ist
          return;
        }
      
        // Optional: Technik und Bund zwischenspeichern
        const technique = result.technique;
        const fret = getValidFret (string, result.fret);

        console.log(result);
        
        //update displayed tab
        let displayValue = "";
        if (result.empty) displayValue = " - ";
        else displayValue = technique + (fret < 10 ? "0" + fret : fret.toString());
        slot.textContent = displayValue;

        // update saved lick
        const index = lick.findIndex(n => n.stringIndex == string && n.step == step);

        if (result.empty)
        {
          if (index !== -1) lick.splice(index, 1);  //remove note from lick
        } else {
          const note = { step: step, stringIndex: string, fret, duration: null, technique: signToTechniqueMap[technique] };
          if (index !== -1) {
            lick[index] = note;
          } else {
            lick.push(note);
          }
        }

        console.log("index:", index, "step:", step, "string:", string, "technique:", signToTechniqueMap[technique], "fret:", fret);

        planLickPlayback(lick);
        //rateButton.disabled = false;
      }

      input.addEventListener("blur", finishEdit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finishEdit();
        }
      });
    });
  });
}

function checkInput(inputValue) {
  inputValue = inputValue.trim();
  if (inputValue === "" || inputValue === "-") return { valid: true, technique:null, fret:null, empty: true };

  const firstChar = inputValue.charAt(0).toLowerCase();
  let inputTechnique = "";
  let inputFret = "";

  // Ist das erste Zeichen keine Zahl?
  if (isNaN(parseInt(firstChar))) {
    // Technik-Zeichen prüfen
    if (Object.values(techniqueSignsMap).includes(firstChar)) {
      inputTechnique = firstChar;
      inputFret = inputValue.slice(1);
    } else {
      return { valid: false, reason: "Invalid first character (technique)" };
    }
  } else {
    inputTechnique = "";
    inputFret = inputValue;
  }

  // Prüfen, ob inputFret eine gültige Zahl ist
  const fretNumber = parseInt(inputFret);
  if (isNaN(fretNumber) || fretNumber < 0 || fretNumber >= 19) {
    return { valid: false, reason: "Invalid fret" };
  }

  return {
    valid: true,
    technique: inputTechnique,
    fret: fretNumber
  };
}

function setTabSlot(stringIndex, step, value) {
  const slot = document.querySelector(`.tab-slot[data-string="${stringIndex}"][data-step="${step}"]`);
  if (slot) {
    slot.textContent = value.toString().padStart(2, "0");
  }
}

//Display tab --------------------------------------------------------------------------------------------------------------------------------------------
function displayTab(lick) {
  for (const note of lick) {
    if (note.technique === "rest") continue;
    const sign = techniqueSignsMap[note.technique] || "";
    const fretStr = note.fret.toString().padStart(2, '0'); // z. B. "07"
    setTabSlot(note.stringIndex, note.step, sign + fretStr);   // z. B. "h07"
    //console.log(note.stringIndex, note.step, sign + fretStr);
  }
}

//Display tab --------------------------------------------------------------------------------------------------------------------------------------------
/*function displayTab(lick, bars) {
  const lines = Array(stringNames.length).fill(null).map(() => Array(bars * 16).fill(" - "));

  for (const note of lick) {
    if (note.technique === "rest") continue;
    console.log(note.step, note.stringIndex, note.fret, note.technique);
    const sign = techniqueSignsMap[note.technique] || " ";
    const fretStr = note.fret.toString().padStart(2, '0'); // z. B. "07"
    lines[note.stringIndex][note.step] = sign + fretStr;   // z. B. "h07"
    console.log(lines[note.stringIndex][note.step]);
  }

  let header = "    ";
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < 4; i++) header += (i + 1) + "     &     ";
    header += " ";
  }

  let output = header + "\n";
  //hier ein fehler?
  for (let i = stringNames.length - 1; i >= 0; i--) {
    const s = stringNames[i];
    const barLines = [];
    for (let b = 0; b < bars; b++) {
      const chunk = lines[i].slice(b * 16, (b + 1) * 16).join("");
      barLines.push("|" + chunk);
    }
    output += s + " " + barLines.join("") + "| \n";
  }

  tabDisplay.innerHTML = `<pre>${output}</pre>`;
}*/

//Plan Playback ------------------------------------------------------------------------------------------------------------
async function planLickPlayback(lick) {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;

  await setSound(soundSelect.value);

  //console.log("Tone Parameter:", Tone.getContext().updateInterval, Tone.Transport.lookAhead);
  //Tone.getContext().updateInterval = parseFloat(document.getElementById("updateIntervall").value);
  //Tone.Transport.lookAhead = parseFloat(document.getElementById("lookahead").value);

  // Metronom Sound ---------------------------
  if (clickSynth === null)
  {   
    clickSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0
      },
    }).toDestination();  
  }
  clickSynth.volume.value = clickVolMap[clickVolSelect.value]; // Optional: parseInt
  //console.log(clickVolMap[clickVolSelect.value]);

 // Ereignisliste für das Lick ------------------
  const events = lick.map(note => {

    const time = sixteenthsToBBS(note.step);   
    const duration = durationMap[note.duration];
    
    //const time = Tone.Time(sixteenthsToBBS(note.step));   
    //const duration = Tone.Time(durationMap[note.duration]);

    if (note.technique === "rest") {
      return [time, null]; // Pause
    } else {
      const pitch = fretboardArray[note.stringIndex][note.fret];
      return [time, { pitch, duration, step: note.step }];
    }
  });

  if (lickPart) {
    lickPart.dispose();
  }

  // Tone.Part für das Lick ---------------------
  lickPart = new Tone.Part((time, value) => {
    if (value) {
      //highlightStep(value.step);
      synth.triggerAttackRelease(value.pitch, value.duration, time);
    }
  }, events);
  lickPart.start(0);
  lickPart.loop = false;

  // Metronom Loop -----------------------------
  if (clickLoop) {
    clickLoop.dispose();
  }
  clickLoop = new Tone.Loop((time) => {
    clickSynth.triggerAttackRelease("8n", time);
  }, "8n");
  clickLoop.start(0);

  // 16tel-Loop für highlightStep --------------
  let currentStep = 0;  // Laufende Step-Nummer für Highlight
  const highlightLoop = new Tone.Loop((time) => {
    highlightStep(currentStep);
    currentStep++;
  }, "16n");
  highlightLoop.start(0);

  // Zusätzliche Ausklang-Zeit für den Reverb (z. B. 2 Sekunden)
  const reverbTail = 2;

  // Ende des Licks
  const totalTime = Tone.Time(`${parseInt(lengthSelect.value)}m`);
  const totalWithReverb = totalTime + Tone.Time("1m");

  // Events am Ende des Licks ------------------
  Tone.Transport.schedule(() => {
    lickPart.stop();
    clickLoop.stop();
    highlightLoop.stop();
    planLickPlayback(lick);
  }, totalTime);

  Tone.Transport.schedule(() => {
    playButton.disabled = false;
    }, totalWithReverb);
 
  playButton.disabled = false;
}
  
// play -----------------------------------------------------------------------------------------------------------------------------
async function playLick() {
  playButton.disabled = true;  
  //await planLickPlayback(lick);
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = parseInt(tempoSelect.value);  
  Tone.Transport.start();
}

function highlightStep(step) {
  const pre = tabDisplay.querySelector("pre");
  if (!pre) return;

  let lines = pre.innerText.split("\n");

  // Prüfen, ob schon eine Pfeil-Zeile existiert (eine Zeile mit nur Leerzeichen und einem ^)
  if (lines.length > 7) {
    lines = lines.slice(0, 7); // alte Pfeil-Zeile entfernen
  }

  // Tab-Zeilen beibehalten (7 Zeilen: Bundnummer + 6 Saiten)
  const tabLines = lines;

  // Zeile mit Leerzeichen und einem ^ an der passenden Stelle
  const pointerLine = Array(tabLines[0].length).fill(" ");
  const index = 3 + (step * 3); // wie bisher: Position berechnen

  if (index < pointerLine.length) {
    pointerLine[index] = "^";
  }

  const combinedLines = [...tabLines, pointerLine.join("")];

  tabDisplay.innerHTML = `<pre>${combinedLines.join("\n")}</pre>`;
}

function fadeOutDiv(div) {
  div.style.opacity = "1"; // Sofort sichtbar machen

  console.log('Nachricht eingeblendet: ', div);

  // Nach 5 Sekunden wieder ausblenden
  setTimeout(() => {
    div.style.opacity = "0";
  }, 5000);
}

// ------------------------------------------------------------------------------------------------------------- Helper Functions -------------------------------
function getScale(key)
{
  switch (scaleSelect.value) {
    default:
    case "pentatonic":
      return majorPentatonics[key];
    case "bluesScale":
      return majorBluesScales[key];
    case "majorScale":
      return majorScales[key];  
  }
}

function sixteenthsToBBS(sixteenthsTotal) {
  const bars = Math.floor(sixteenthsTotal / 16);
  const afterBars = sixteenthsTotal % 16;
  const beats = Math.floor(afterBars / 4);
  const sixteenths = afterBars % 4;
  return `${bars}:${beats}:${sixteenths}`;
}

function weightedRandomChoice(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const r = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) {
      return items[i];
    }
  }
  return items[0];
}

function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Vermeide 0
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(mean + z * stdDev);
}


// ------------------------------------------------------------------------------------------------------------- Maps and Arrays-------------------------------------
const stringNames = ["E", "A", "D", "G", "B", "e"];
const semitoneStepsBetweenStrings = [5, 5, 5, 4, 5];
const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const majorPentatonics = [
  ["C", "D", "E", "G", "A"],               // C
  ["C#", "D#", "F", "G#", "A#"],           // C#
  ["D", "E", "F#", "A", "B"],              // D
  ["D#", "F", "G", "A#", "C"],              // D#
  ["E", "F#", "G#", "B", "C#"],            // E
  ["F", "G", "A", "C", "D"],                // F
  ["F#", "G#", "A#", "C#", "D#"],           // F#
  ["G", "A", "B", "D", "E"],                // G
  ["G#", "A#", "C", "D#", "F"],             // G#
  ["A", "B", "C#", "E", "F#"],              // A
  ["A#", "C", "D", "F", "G"],               // A#
  ["B", "C#", "D#", "F#", "G#"]             // B
];

const majorBluesScales = [
  ["C", "D", "Eb", "E", "G", "A"],          // C
  ["C#", "D#", "E", "F", "G#", "A#"],       // C#
  ["D", "E", "F", "F#", "A", "B"],           // D
  ["D#", "F", "F#", "G", "A#", "C"],         // D#
  ["E", "F#", "G", "G#", "B", "C#"],         // E
  ["F", "G", "Ab", "A", "C", "D"],           // F
  ["F#", "G#", "A", "A#", "C#", "D#"],       // F#
  ["G", "A", "Bb", "B", "D", "E"],           // G
  ["G#", "A#", "B", "C", "D#", "F"],         // G#
  ["A", "B", "C", "C#", "E", "F#"],          // A
  ["A#", "C", "C#", "D", "F", "G"],          // A#
  ["B", "C#", "D", "D#", "F#", "G#"]         // B
];

const majorScales = [
  ["C", "D", "E", "F", "G", "A", "B"],      // C
  ["C#", "D#", "F", "F#", "G#", "A#", "C"], // C#
  ["D", "E", "F#", "G", "A", "B", "C#"],    // D
  ["D#", "F", "G", "G#", "A#", "C", "D"],   // D#
  ["E", "F#", "G#", "A", "B", "C#", "D#"],  // E
  ["F", "G", "A", "A#", "C", "D", "E"],     // F
  ["F#", "G#", "A#", "B", "C#", "D#", "E#"],// F#
  ["G", "A", "B", "C", "D", "E", "F#"],     // G
  ["G#", "A#", "C", "C#", "D#", "F", "G"],  // G#
  ["A", "B", "C#", "D", "E", "F#", "G#"],   // A
  ["A#", "C", "D", "D#", "F", "G", "A"],    // A#
  ["B", "C#", "D#", "E", "F#", "G#", "A#"]  // B
];


const fretboardArray = [
  ["E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3"],  // E low (stringIndex 0)
  ["A2", "A#2", "B2", "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4"],  // A (1)
  ["D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4"],   // D (2)
  ["G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"],   // G (3)
  ["B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5", "C#5", "D5", "D#5", "E5"],    // B (4)
  ["E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5"]     // e high (5)
];

//Maps value in 16th to string
const durationMap = {
  1: "16n",
  2: "8n",
  3: "8n.",
  4: "4n",
  6: "4n.",
  8: "2n",
  12: "2n.",
  16: "1n"
};

const clickVolMap = {
  0: "-Infinity",
  1: "-45",
  2: "-35",
  3: "-25",
  4: "-15",
  5: "-5"
};

const techniqueMap = {
  note: 0,        // normale Note
  rest: 1,        // Pause
  mute: 2,        // Muted Note
  slideUp: 3,     // Slide zur höheren Note (z.B. 5s7)
  slideDown: 4,   // Slide zur tieferen Note (z.B. 7s5)
  bend: 5,        // Bend (z.B. 7b)
  release: 6,     // Bend-Release (z.B. 7b~7)
  pbRelease: 7,   // PreBend-Release (z.B. 7pb~7)
  hammerOn: 8,    // Hammer-on (z.B. 5h7)
  pullOff: 9,     // Pull-off (z.B. 7p5)  
  doublestop: 10, // Two notes at once
  vibrato: 11,    // Vibrato (z.B. 7~)
  harmonic: 12,
  tap: 13
};

const techniqueSignsMap = {
  note: "",        // normale Note
  rest: "",        // Pause
  mute: "x",        // Muted Note
  slideUp: "/",     // Slide zur höheren Note (z.B. 5/7)
  slideDown: "\\",  // Slide zur tieferen Note (z.B. 7\5)
  bend: "b",        // Bend (z.B. 7b)
  release: "r",     // Bend-Release (z.B. 7b~7)
  pbRelease: "r",   // PreBend-Release (z.B. 7pb~7)
  hammerOn: "h",    // Hammer-on (z.B. 5h7)
  pullOff: "p",     // Pull-off (z.B. 7p5)  
  doublestop: "",  // Two notes at once
  vibrato: "~",     // Vibrato (z.B. 7~)
  harmonic: "f",    // künstliches Flageolett
  tap: "t"          // Tapping
};

const signToTechniqueMap = {
  "": "note",
  "x": "mute",
  "/": "slideUp",
  "\\": "slideDown",
  "b": "bend",
  "r": "release",  // pbRelease wird ignoriert
  "h": "hammerOn",
  "p": "pullOff",
  "~": "vibrato",
  "f": "harmonic",
  "t": "tap"
}

const techniques = [
  "note",
  "rest",
  "mute",
  "slideUp",
  "slideDown",
  "bend",
  "release",
  "pbRelease",
  "hammerOn",
  "pullOff",
  "doublestop",
  "vibrato",
  "harmonic",
  "tap"
];

let techniqueProbabilities = [
    1,          //normale Note
    0.1,        //rest: 1, 
    0.1,        //mute: 2,        
    0.2,        //slideUp: 3,     
    0.2,        //slideDown: 4,  
    0.2,        //bend: 5,      
    0.1,        //release: 6,   
    0,          //pbRelease: 7,
    0.2,        //hammerOn: 8,
    0.1,        //pullOff: 9,
    0.2,        //doublestop: 10,
    0,          //vibrato: 11,
    0,          //harmonic: 12,
    0,          //tap: 13
];
