// script.js
/*
// Script dynamisch laden
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/soundfont-player@0.15.0/dist/soundfont-player.js";

script.onload = () => {
  console.log('✅ SoundfontPlayer geladen:', typeof SoundfontPlayer);
};

script.onerror = () => {
  console.error("❌ Fehler beim Laden von soundfont-player.js");
};

document.head.appendChild(script);
*/

//Lick generation options
const pRest = 0.1;        // Wahrscheinlichkeit für Pausen. Kleinere Werte machen Pausen unwahrscheinlicher.
const stdDevString = 2.0; // Standardabweichung für Saite. Kleinere Werte machen Saitenwechsel unwahrscheinlicher.
const stdDevFret = 2.0;   // Standardabweichung für Bund. Kleinere Werte machen Bundwechsel unwahrscheinlicher.

// html elements
const keySelect = document.getElementById("key");
const difficultySelect = document.getElementById("difficulty");
const tempoSelect = document.getElementById("tempo");
const lengthSelect = document.getElementById("length");
const soundSelect = document.getElementById("sound");
const generateButton = document.getElementById("generate-button");
const playButton = document.getElementById("play-button");
const likeButton = document.getElementById("like-button");
const dislikeButton = document.getElementById("dislike-button");
const tabDisplay = document.getElementById("tab-display");

//const strings = ["E", "A", "D", "G", "B", "e"];
const strings = ["e", "B", "G", "D", "A", "E"];
let lick = []; // globale Variable for our lick

let synth = null;
const loadedInstruments = {}; // Instrument cache

//Used scales (major with one blues note)
const majorScales = {
  C: ["C", "D", "Eb", "E", "F", "G", "A", "B"],
  G: ["G", "A", "Bb", "B", "C", "D", "E", "F#"],
  D: ["D", "E", "F", "F#", "G", "A", "B", "C#"],
  A: ["A", "B", "C", "C#", "D", "E", "F#", "G#"],
  E: ["E", "F#", "G", "G#", "A", "B", "C#", "D#"],
  B: ["B", "C#", "D", "D#", "E", "F#", "G#", "A#"],
  Fs: ["F#", "G#", "A", "A#", "B", "C#", "D#", "E#"],
  F: ["F", "G", "Ab", "A", "Bb", "C", "D", "E"]
};

const fretboard = {
  e:  ["E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5"],
  B:  ["B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5", "C#5", "D5", "D#5", "E5"],
  G:  ["G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"],
  D:  ["D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4"],
  A:  ["A2", "A#2", "B2", "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4"],
  E:  ["E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3"]
};

function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Vermeide 0
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(mean + z * stdDev);
}

//Maps value in 16th to string
const durationMap = {
  1: "16n",
  2: "8n",
  3: "6n",
  4: "4n",
  6: "3n",
  8: "2n"
};

//Erlaubte Notenlängen in 16teln: 1=16tel; 2=8tel usw.
function getNoteDurationOptions(difficulty) {
  switch (difficulty) {
    case "easy":
      return [4, 6, 8];
    case "medium":
      return [2, 3, 4, 6, 8];
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
      return [5, 5, 3, 2, 1];
    case "hard":
      return [5, 5, 3, 2, 2];
  }
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
}

// Globale Funktion zum Setzen des Sounds
async function setSound(selected) {
  if (selected === "synth") {
    synth = new Tone.Synth().toDestination();
  } else {
    if (!loadedInstruments[selected]) {
      const instrument = await SoundfontPlayer.instrument(Tone.context.rawContext, selected);
      loadedInstruments[selected] = instrument;
    }
    const player = loadedInstruments[selected];
    synth = {
      triggerAttackRelease: (note, duration, time) => {
        player.play(note, time, { duration: Tone.Time(duration).toSeconds() });
      }
    };
  }
}

// Event-Listener fürs Dropdown
soundSelect.addEventListener("change", (e) => {
  setSound(e.target.value);
});

//Generiere neuen Lick
function generateLick() {
  const key = keySelect.value;
  const difficulty = difficultySelect.value;
  const length = parseInt(lengthSelect.value);
  const scale = majorScales[key];
  const durations = getNoteDurationOptions(difficulty);
  const durationPs = getNoteDurationProbabilities(difficulty);
  const stepsPerBar = 16;
  const totalSteps = length * stepsPerBar;
  
  lick = []; // globale Variable überschreiben 
  let lastStringIndex = Math.floor(Math.random() * strings.length);
  let lastFret = Math.floor(Math.random() * 18);

  for (let i = 0; i < totalSteps;) {
    const isRest = Math.random() < pRest;
    let duration = weightedRandomChoice(durations, durationPs);

    // Verhindere Überschreiten des Lick-Endes
    if (i + duration > totalSteps) {
      duration = totalSteps - i;
    }
  
    if (isRest) 
    {
      lick.push({ string: null, fret: null, step: i, duration: duration });
    } 
    else 
    {
      // Saite nach Normalverteilung wählen
      let stringIndex;
      do {
        stringIndex = Math.round(randomNormal(lastStringIndex, stdDevString));
      } while (stringIndex < 0 || stringIndex >= strings.length);
      const string = strings[stringIndex];

      // Gültige Bünde für diese Saite auswählen
      const validFrets = fretboard[string]  
        .map((note, fret) => {
          const noteWithoutOctave = note.slice(0, -1); // z.B. "F#3" → "F#"
          return scale.includes(noteWithoutOctave) ? fret : null;
        })
        .filter(f => f !== null);
  
      // Bund nach Normalverteilung wählen
      let fret;
      do {
        fret = Math.round(randomNormal(lastFret, stdDevFret));
      } while (
        fret < 0 ||
        fret >= fretboard[string].length
      );

      // Falls Bund und Saite gleich wären, wie bei der Note zuvor, springe zum Schleifenbeginn und suche andere Note. Wiederholung wird also unterbunden.
      if (fret === lastFret && stringIndex === lastStringIndex) {continue;}

      // Note speichern
      lick.push({ string, fret, step: i, duration: duration });
  
      // Letzte Werte aktualisieren
      lastStringIndex = stringIndex;
      lastFret = fret;
    }
    i += duration;
    console.log(i);
  }
  
  playButton.disabled = false;
  likeButton.disabled = false;
  dislikeButton.disabled = false;
  displayTab(lick, length);  
}

generateButton.addEventListener("click", generateLick);
playButton.addEventListener("click", playLick(lick));

function displayTab(lick, bars) {
  const lines = {};
  strings.forEach(s => lines[s] = Array(bars * 16).fill("--"));

  for (const note of lick) {
    if (note.string === null) continue;
    const fretStr = note.fret < 10 ? "0" + note.fret : note.fret.toString();
    lines[note.string][note.step] = fretStr;
  }

  let header = "   ";
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < 4; i++) header += (i + 1) + "           ";
  }

  let output = header + "\n";
  strings.forEach(s => {
    const barLines = [];
    for (let b = 0; b < bars; b++) {
      const chunk = lines[s].slice(b * 16, (b + 1) * 16).join(" ");
      barLines.push("|" + chunk);
    }
    output += s + " " + barLines.join("") + "|\n";
  });

  tabDisplay.innerHTML = `<pre>${output}</pre>`;
}

async function playLick(lick) {
  playButton.disabled = true;
  const tempo = parseInt(tempoSelect.value);

  await setSound(soundSelect.value);

  const clickSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0
    },
    volume: -10
  }).toDestination();

  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = tempo;

  let lastStep = 0;

  // Ereignisliste für das Lick
  const events = lick.map(note => {
    if (note.step > lastStep) lastStep = note.step;

    const time = Tone.Time(`${note.step * 0.25}n`).toBarsBeatsSixteenths();
    const duration = Tone.Time(`${note.duration * 0.25}n`).toNotation();

    if (note.string === null) {
      return [time, null]; // Pause
    } else {
      const pitch = fretboard[note.string][note.fret];
      return [time, { pitch, duration, step: note.step }];
    }
  });

  // Tone.Part für das Lick
  const lickPart = new Tone.Part((time, value) => {
    if (value) {
      highlightStep(value.step);
      synth.triggerAttackRelease(value.pitch, value.duration, time);
    }
  }, events);

  lickPart.start(0);
  lickPart.loop = false;

  // Metronom mit Loop
  const clickLoop = new Tone.Loop((time) => {
    clickSynth.triggerAttackRelease("8n", time);
  }, "8n");

  clickLoop.start(0);

  // Laufende Step-Nummer für Highlight
  let currentStep = 0;
  
  // 16tel-Loop für highlightStep
  const highlightLoop = new Tone.Loop((time) => {
    highlightStep(currentStep);
    currentStep++;
  }, "16n");

  highlightLoop.start(0);

  // Ende des Licks + Aufräumen
  const totalSteps = lastStep + 4;
  const totalTime = Tone.Time(`${totalSteps * 0.25}n`);

  Tone.Transport.schedule(() => {
    lickPart.stop();
    clickLoop.stop();
    clearHighlights();
    playButton.disabled = false;
  }, totalTime);

  await Tone.start();
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


function clearHighlights() {
 /* const pre = tabDisplay.querySelector("pre");
  if (!pre) return;
  tabDisplay.innerHTML = `<pre>${pre.innerText.replace(/\[|\]/g, "")}</pre>`;*/
}
