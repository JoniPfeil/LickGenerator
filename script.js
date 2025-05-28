// script.js

const keySelect = document.getElementById("key");
const difficultySelect = document.getElementById("difficulty");
const tempoSelect = document.getElementById("tempo");
const lengthSelect = document.getElementById("length");
const generateButton = document.getElementById("generate-button");
const playButton = document.getElementById("play-button");
const likeButton = document.getElementById("like-button");
const dislikeButton = document.getElementById("dislike-button");
const tabDisplay = document.getElementById("tab-display");

const strings = ["E", "A", "D", "G", "B", "e"];

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
  E:  ["E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#"],
  A:  ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"],
  D:  ["D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#"],
  G:  ["G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#"],
  B:  ["B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#"],
  e:  ["E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#"]
};

function getNoteDurationOptions(difficulty) {
  switch (difficulty) {
    case "easy":
      return [4, 2];
    case "medium":
      return [8, 4, 2];
    case "hard":
      return [16, 8, 4, 2];
  }
}

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
  const lick = [];

  for (let i = 0; i < totalSteps; ) {
    const isRest = Math.random() < 0.2; // 20% Wahrscheinlichkeit für Pause
    const duration = durations[Math.floor(Math.random() * durations.length)];

    if (isRest) 
    {
      lick.push({string: null, fret: null, step: i, duration: duration});
    } 
    else 
    {
      const string = strings[Math.floor(Math.random() * strings.length)];
      const fretOptions = fretboard[string].map((note, fret) => scale.includes(note) ? fret : null).filter(f => f !== null);
      const fret = fretOptions[Math.floor(Math.random() * fretOptions.length)];

      lick.push({ string, fret, step: i, duration: duration });
    }

    i += duration;
  }

  displayTab(lick, length);
  
  playButton.onclick = () => playLick(lick);
}

generateButton.addEventListener("click", generateLick);

function displayTab(lick, bars) {
  const lines = {};
  strings.forEach(s => lines[s] = Array(bars * 16).fill("--"));

  for (const note of lick) {
    if (note.string === null) continue; //not a note
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


function playLick(lick) {
  
  const tempo = parseInt(tempoSelect.value);
  const synth = new Tone.Synth().toDestination();
  const clickSynth = new Tone.MembraneSynth({volume: -12}).toDestination(); // Für den Click

  Tone.Transport.stop();          // stoppt evtl. laufende Wiedergabe
  Tone.Transport.cancel();        // löscht alte Events
  Tone.Transport.stop();          // stoppt evtl. laufende Wiedergabe
  Tone.Transport.position = 0;    // setzt zurück zum Anfang
  
  Tone.Transport.bpm.value = tempo;
  let currentStep = 0;
  const schedule = [];

  for (const note of lick) {
    const time = (note.step / 4) + "n";
    if (note.string === null) {
      schedule.push({ time: note.step / 4, pitch: null, step: note.step, duration: note.duration });
    } 
    else {
      const pitch = fretboard[note.string][note.fret] + "4";
      schedule.push({ time: note.step / 4, pitch, step: note.step, duration: note.duration });
    }
  }

  let lastStep = 0;
  schedule.forEach((n, i) => {
    Tone.Transport.schedule(time => {
      highlightStep(n.step);
      synth.triggerAttackRelease(n.pitch, (n.duration / 4) + "n", time); 
    }, n.time); 
    if (n.step > lastStep) lastStep = n.step;
  }); 

  // Click-Sound auf jeder Achtel (alle 0.5 Beats), höherer Ton auf Vierteln
  const totalBeats = (lastStep + 4) / 4;
  for (let beat = 0; beat <= totalBeats * 2; beat++) {
    const clickTime = beat * 0.5;
    const isQuarter = beat % 2 === 0; // jede 2. Achtel = 1 Viertel
  
    Tone.Transport.schedule(time => {
      const pitch = isQuarter ? "C4" : "C3";
      clickSynth.triggerAttackRelease(pitch, "16n", time);
    }, clickTime);
  }

  Tone.Transport.schedule(() => {
    clearHighlights();
  }, (lastStep + 4) / 4);

  await Tone.start();
  Tone.Transport.start();
}

function highlightStep(step) {
  const pre = tabDisplay.querySelector("pre");
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
  tabDisplay.innerHTML = `<pre>${newLines.join("\n")}</pre>`;
}

function clearHighlights() {
  const pre = tabDisplay.querySelector("pre");
  if (!pre) return;
  tabDisplay.innerHTML = `<pre>${pre.innerText.replace(/\[|\]/g, "")}</pre>`;
}
