// script.js

// Script dynamisch laden
const script = document.createElement('script');
script.src = "https://unpkg.com/soundfont-player@0.15.0/dist/soundfont-player.js";

script.onload = () => {
  console.log('✅ SoundfontPlayer geladen:', typeof SoundfontPlayer);
};

script.onerror = () => {
  console.error("❌ Fehler beim Laden von soundfont-player.js");
};

document.head.appendChild(script);

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
let lick = []; // globale Variable für den aktuellen Lick

let synth = null;
const loadedInstruments = {}; // Cache

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

const durationMap = {
  1: "16n",
  2: "8n",
  3: "6n",
  4: "4n",
  6: "3n",
  8: "2n"
};

function getNoteDurationOptions(difficulty) {
  //Notenlänge in 16teln: 1=16tel; 2=8tel usw.
  switch (difficulty) {
    case "easy":
      return [4, 6, 8];
    case "medium":
      return [2, 3, 4, 6, 8];
    case "hard":
      return [1, 2, 3, 4, 6];
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

function generateLick() {
  playButton.disabled = false;
  likeButton.disabled = false;
  dislikeButton.disabled = false;

  const key = keySelect.value;
  const difficulty = difficultySelect.value;
  const length = parseInt(lengthSelect.value);

  const scale = majorScales[key];
  const durations = getNoteDurationOptions(difficulty);

  const stepsPerBar = 16;
  const totalSteps = length * stepsPerBar;
  lick = []; // globale Variable überschreiben

  const pRest = 0.1;
  const stdDevString = 1.5; // Standardabweichung für Saite
  const stdDevFret = 2.0;   // Standardabweichung für Bund
  
  let lastStringIndex = Math.floor(Math.random() * strings.length);
  let lastFret = Math.floor(Math.random() * 18);

  for (let i = 0; i < totalSteps;) {
    const isRest = Math.random() < pRest;
    let duration = durations[Math.floor(Math.random() * durations.length)];

    // Verhindere Überschreiten des totalSteps
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
  
      // Gültige Bünde für diese Saite
      const validFrets = fretboard[string]
        .map((note, fret) => {
          const noteWithoutOctave = note.slice(0, -1); // z.B. "F#3" → "F#"
          return scale.includes(noteWithoutOctave) ? fret : null;
        })
        .filter(f => f !== null);
  
      if (validFrets.length === 0) continue;
  
      // Bund nach Normalverteilung wählen
      let fret;
      do {
        fret = Math.round(randomNormal(lastFret, stdDevFret));
      } while (
        fret < 0 ||
        fret >= fretboard[string].length
      );

      if (fret === lastFret && stringIndex === lastStringIndex) {continue;}
  
      lick.push({ string, fret, step: i, duration: duration });
  
      // Letzte Werte aktualisieren
      lastStringIndex = stringIndex;
      lastFret = fret;
    }
    i += duration;
    console.log(i);
  }
  displayTab(lick, length);
}

generateButton.addEventListener("click", generateLick);

playButton.addEventListener("click", () => {
  if (lick.length > 0) {
    playLick(lick);
  }
});

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

  let currentStep = 0;
  const schedule = [];

  for (const note of lick) {
    const time = (note.step / 4);
    if (note.string === null) {
      schedule.push({ time, pitch: null, step: note.step, duration: note.duration });
    } else {
      const pitch = fretboard[note.string][note.fret];
      schedule.push({ time, pitch, step: note.step, duration: note.duration });
    }
  }

  let lastStep = 0;
  schedule.forEach(n => {
    Tone.Transport.schedule(time => {
      highlightStep(n.step);
      if (n.pitch) {
        synth.triggerAttackRelease(n.pitch, durationMap[n.duration], time);
      }
    }, n.time);
    if (n.step > lastStep) lastStep = n.step;
  });

  const totalBeats = (lastStep + 4) / 4;
  for (let beat = 0; beat <= totalBeats * 2; beat++) {
    const clickTime = beat * 0.5;
    const isQuarter = beat % 2 === 0;
    Tone.Transport.schedule(time => {
      //const pitch = isQuarter ? "C4" : "C3";
      clickSynth.triggerAttackRelease("8n", time);
    }, clickTime);
  }

  Tone.Transport.schedule(() => {
    clearHighlights();
  }, totalBeats);

  await Tone.start();
  Tone.Transport.start();
  playButton.disabled = false;
}

function highlightStep(step) {
 /* const pre = tabDisplay.querySelector("pre");
  if (!pre) return;
  const lines = pre.innerText.split("\n");
  const newLines = lines.map(line => {
    const parts = line.split("");
    const index = 3 + (step * 3);
    if (index < parts.length - 1 && parts[index + 1] !== " ") {
      parts[index] = "[";
      parts[index + 2] = "]";
    }
    return parts.join("");
  });
  tabDisplay.innerHTML = `<pre>${newLines.join("\n")}</pre>`;*/
}

function clearHighlights() {
 /* const pre = tabDisplay.querySelector("pre");
  if (!pre) return;
  tabDisplay.innerHTML = `<pre>${pre.innerText.replace(/\[|\]/g, "")}</pre>`;*/
}
