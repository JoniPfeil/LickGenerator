// script.js

//Lick generation options
const pRest = 0.1;        // Wahrscheinlichkeit für Pausen. Kleinere Werte machen Pausen unwahrscheinlicher.
const stdDevString = 2.0; // Standardabweichung für Saite. Kleinere Werte machen Saitenwechsel unwahrscheinlicher.
const stdDevFret = 2.0;   // Standardabweichung für Bund. Kleinere Werte machen Bundwechsel unwahrscheinlicher.

// html elements
const keySelect = document.getElementById("key");
const scaleSelect = document.getElementById("scale");
const difficultySelect = document.getElementById("difficulty");
const tempoSelect = document.getElementById("tempo");
const lengthSelect = document.getElementById("length");
const soundSelect = document.getElementById("sound");
const generateButton = document.getElementById("generate-button");
const clickVolSelect = document.getElementById("clickVol");
const playButton = document.getElementById("play-button");
const rateButton = document.getElementById("rateLickBtn");
const tabDisplay = document.getElementById("tab-display");


let lick = []; // globale Variable for our lick
let synth = null;
let clickSynth = null;
const loadedInstruments = {}; // Cache für geladene Instrumente
let audioStarted = false;

//const strings = ["E", "A", "D", "G", "B", "e"];
const strings = ["e", "B", "G", "D", "A", "E"];

//Erlaubte Notenlängen in 16teln: 1=16tel; 2=8tel usw.
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

const majorPentatonics = {
  C: ["C", "D", "E", "G", "A"],
  G: ["G", "A", "B", "D", "E"],
  D: ["D", "E", "F#", "A", "B"],
  A: ["A", "B", "C#", "E", "F#"],
  E: ["E", "F#", "G#", "B", "C#"],
  B: ["B", "C#", "D#", "F#", "G#"],
  Fs: ["F#", "G#", "A#", "C#", "D#"],
  F: ["F", "G", "A", "C", "D"]
};

const majorBluesScales = {
  C:  ["C", "D", "Eb", "E", "G", "A"],
  G:  ["G", "A", "Bb", "B", "D", "E"],
  D:  ["D", "E", "F", "F#", "A", "B"],
  A:  ["A", "B", "C", "C#", "E", "F#"],
  E:  ["E", "F#", "G", "G#", "B", "C#"],
  B:  ["B", "C#", "D", "D#", "F#", "G#"],
  Fs: ["F#", "G#", "A", "A#", "C#", "D#"],
  F:  ["F", "G", "Ab", "A", "C", "D"]
};

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

// Globale Funktion zum Setzen des Sounds
async function setSound(selected) {
  if (selected === "synth") {
    synth = new Tone.Synth().toDestination();
  } else {
    // Check: Ist das Instrument schon im Cache?
    if (!loadedInstruments[selected]) {
      // Lade und speichere im Cache
      const instrument = await Soundfont.instrument(Tone.context.rawContext, selected);
      loadedInstruments[selected] = instrument;
    }
    // Erstelle Synth-Wrapper
    const player = loadedInstruments[selected];
    synth = {
      triggerAttackRelease: (note, duration, time) => {
        player.play(note, time, { duration: Tone.Time(duration).toSeconds() });
      }
    };
  }
}

// Event-Listener definieren
soundSelect.addEventListener("change", (e) => setSound(e.target.value));
generateButton.addEventListener("click", () => generateLick());
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
    console.log(clickVolMap[e.target.value]);
  } catch (error) {
    console.error("Fehler clickVol", error);
  }
});

//Generiere neuen Lick
function generateLick() {
  const key = keySelect.value;
  const difficulty = difficultySelect.value;
  const length = parseInt(lengthSelect.value);
  const scale = getScale(key);
  const durations = getNoteDurationOptions(difficulty);
  const durationPs = getNoteDurationProbabilities(difficulty);
  const stepsPerBar = 16;
  const totalSteps = length * stepsPerBar;
  
  lick = []; // globale Variable überschreiben 
  let lastStringIndex = Math.floor(Math.random() * strings.length);
  let lastFret = Math.floor(Math.random() * 18);

  playButton.disabled = true;

  // Audioausgabe aktivieren, damit Lick später abgespielt werden kann
  if (!audioStarted) {
    Tone.start();    //ohne await
    audioStarted = true;
  }

  //For debugging only
  /*lick = [
  { string: "e", fret: 1, step: 0,  duration: 4 },
  { string: "e", fret: 2, step: 4,  duration: 4 },
  { string: "e", fret: 3, step: 8,  duration: 4 },
  { string: "e", fret: 4, step: 12,  duration: 4 },
  { string: "e", fret: 5, step: 16,  duration: 4 },
  { string: "e", fret: 6, step: 20,  duration: 4 },
  { string: "e", fret: 7, step: 24,  duration: 4 },
  { string: "e", fret: 8, step: 28,  duration: 4 }
]; */


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
      console.log({ string, fret, i, duration });
  
      // Letzte Werte aktualisieren
      lastStringIndex = stringIndex;
      lastFret = fret;
    }
    i += duration;
    //console.log(i);
  }
  
  rateButton.disabled = false;
  displayTab(lick, length);  
  planLickPlayback(lick);
}

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

async function planLickPlayback(lick) {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;

  await setSound(soundSelect.value);

  clickSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0
    },
  }).toDestination();  

  clickSynth.volume.value = clickVolMap[clickVolSelect.value]; // Optional: parseInt
  console.log(clickVolMap[clickVolSelect.value]);

 // Ereignisliste für das Lick
  const events = lick.map(note => {
    
    const time = Tone.Time(sixteenthsToBBS(note.step));   
    const duration = Tone.Time(durationMap[note.duration]);

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

  // 16tel-Loop für highlightStep
  let currentStep = 0;  // Laufende Step-Nummer für Highlight
  const highlightLoop = new Tone.Loop((time) => {
    highlightStep(currentStep);
    currentStep++;
  }, "16n");
  highlightLoop.start(0);

  // Ende des Licks
  const totalTime = Tone.Time(`${parseInt(lengthSelect.value)}m`);

  // Events am Ende des Licks
  Tone.Transport.schedule(() => {
    lickPart.stop();
    clickLoop.stop();
    highlightLoop.stop();
    planLickPlayback(lick);
    playButton.disabled = false;
  }, totalTime);
 
  playButton.disabled = false;
}
  

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
