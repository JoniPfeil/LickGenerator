// script.js

//Lick generation options
const pRest = 0.1;        // Wahrscheinlichkeit für Pausen. Kleinere Werte machen Pausen unwahrscheinlicher.
//let stdDevString = 1.5; // Standardabweichung für Saite. Kleinere Werte machen Saitenwechsel unwahrscheinlicher.
//let stdDevFret = 1.5;   // Standardabweichung für Bund. Kleinere Werte machen Bundwechsel unwahrscheinlicher.

// html elements
const keySelect = document.getElementById("key");
const scaleSelect = document.getElementById("scale");
const difficultySelect = document.getElementById("difficulty");
const tempoSelect = document.getElementById("tempo");
const lengthSelect = document.getElementById("length");
const fretChange = document.getElementById("fretChange");
const stringChange = document.getElementById("stringChange");
const slides = document.getElementById("slides");
const bends = document.getElementById("bends");
const doubles = document.getElementById("doubles");
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
let clickSynth = null;
const loadedInstruments = {}; // Cache für geladene Instrumente
let audioStarted = false;
let scale;

const lickInfo = {
  key: null,
  scale: null,
  length: null,
  difficulty: null
};

const supabaseClient = supabase.createClient(
  'https://hrsoaxdhyqkrsodvnbys.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc29heGRoeXFrcnNvZHZuYnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODE4NDMsImV4cCI6MjA2NDI1Nzg0M30.voG9dz3KgQ_W56mcw2okTqRDjNqeB8x63MWpwoaanyc',
  {auth: { autoRefreshToken: false, persistSession: false }}
);

//Reverb erstellen
let reverb = new Tone.Reverb({
  decay: 2.5,
  preDelay: 0.05,
  wet: 0.5
}).toDestination();
//reverb.generate(); // Reverb laden

async function saveLickToSupabase() {
  const lickObj = {
    lick: transposeLick(lick, -lickInfo.transpose),                   // globales Lick-Array in C-Dur
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
    let stringIndex = strings.indexOf(note.string);

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
      string: strings[stringIndex]
    };
  });
}

function getSelectedRating() {
  const selected = document.querySelector('input[name="rating"]:checked');
  return selected ? parseInt(selected.value) : null;
}

const strings = ["E", "A", "D", "G", "B", "e"];
const semitoneStepsBetweenStrings = [5, 5, 5, 4, 5];

// Alle 12 Halbtöne in Reihenfolge, C als Referenz
const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
  doubleStop: 10, // Two notes at once
  vibrato: 11,    // Vibrato (z.B. 7~)
  harmonic: 12,
  tap: 13
};

const techniqueSignsMap = {
  note: " ",        // normale Note
  rest: " ",        // Pause
  mute: "X",        // Muted Note
  slideUp: "/",     // Slide zur höheren Note (z.B. 5/7)
  slideDown: "\\",  // Slide zur tieferen Note (z.B. 7\5)
  bend: "b",        // Bend (z.B. 7b)
  release: "r",     // Bend-Release (z.B. 7b~7)
  pbRelease: " ",   // PreBend-Release (z.B. 7pb~7)
  hammerOn: "h",    // Hammer-on (z.B. 5h7)
  pullOff: "p",     // Pull-off (z.B. 7p5)  
  doubleStop: " ",  // Two notes at once
  vibrato: "~",     // Vibrato (z.B. 7~)
  harmonic: "f",    // künstliches Flageolett
  tap: "t"          // Tapping
};

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
  "doubleStop",
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
    0.2,        //doubleStop: 10,
    0,          //vibrato: 11,
    0,          //harmonic: 12,
    0,          //tap: 13
];

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

// Globale Funktion zum Setzen des Sounds (mit Reverb)
async function setSound(selected) {

  if (!reverb.buffer) {
    await reverb.generate(); // Reverb laden
  }
  
  if (selected === "synth") {
    synth = new Tone.Synth().connect(reverb);
  } else {
    if (!loadedInstruments[selected]) {
      // Erzeuge einmalig GainNode für Soundfont
      //const sfGain = Tone.context.createGain();

      const sfGain = new Tone.Gain();     // Tone.Gain
      sfGain.connect(reverb);             // Reverb = Tone.Reverb
      reverb.toDestination();             // oder bereits verbunden

      console.log("sfGain instanceof AudioNode:", sfGain instanceof AudioNode);
      console.log("reverb.ready?", reverb && reverb.input);

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
  }
}



/* Globale Funktion zum Setzen des Sounds (ohne Reverb)
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
} */

// Event-Listener definieren --------------------------------------------------------------------------------------------------
rateButton.addEventListener("click", async () => {
  saveLickToSupabase();
  rateButton.disabled = true;
  rateCurrentLick();
  fadeOutDiv(afterRatingMsg);
});

document.getElementById("reverbWet").addEventListener("input", e => {
  reverb.wet.value = parseFloat(e.target.value);
  console.log(clickVolMap[e.target.value]);
});

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
ratingStars.forEach(input => {
  input.addEventListener('change', () => {
    rateButton.disabled = false;
  });
});

// Generiere neuen Lick ----------------------------------------------------------------------------------------------------------------
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
    1,              //normale Note
    0.1,            //rest: 1, 
    0.1,            //mute: 2,        
    parseFloat(slides.value)/2, //slideUp: 3,     
    parseFloat(slides.value)/2, //slideDown: 4,  
    parseFloat(bends.value),    //bend: 5,      
    0.1,            //release: 6,   
    0,              //pbRelease: 7,
    0.1,            //hammerOn: 8,
    0.1,            //pullOff: 9,
    parseFloat(doubles.value),  //doubleStop: 10,
    0,              //vibrato: 11,
    0,              //harmonic: 12,
    0,              //tap: 13
  ];

  console.log(techniqueProbabilities);

  lickInfo.transpose = keySelect.value;
  lickInfo.key = chromaticScale[keySelect.value];
  lickInfo.scale = scaleSelect.value;
  lickInfo.length = parseInt(lengthSelect.value);
  lickInfo.difficulty = difficultySelect.value;
  
  lick = []; // delete last lick
  let lastStringIndex = Math.floor(Math.random() * strings.length);   //random start string
  let lastFret = Math.floor(Math.random() * 18);                      //random start fret

  playButton.disabled = true;
  rateButton.disabled = true;
  ratingStars.forEach(ratingStars => ratingStars.checked = false);

  // Audioausgabe aktivieren, damit Lick später abgespielt werden kann
  if (!audioStarted) {
    Tone.start();    //ohne await
    audioStarted = true;
  }

  //Generate one note at a time until tab is full
  for (let i = 0; i < totalSteps;) 
  {
    let technique = weightedRandomChoice(techniques, techniqueProbabilities); 
    console.log("technique: ", technique);
    let duration = weightedRandomChoice(durations, durationProbabilities);
    let stringIndex;
    let fret;
    let strintIndex2;  //second string for double stops
    let fret2;         //second fret for double stops

    // Verhindere Überschreiten des Lick-Endes
    if (i + duration > totalSteps) {
      duration = totalSteps - i;
    }

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
      case "doubleStop":
        stringIndex = chooseString (lastStringIndex);
        do {
          stringIndex2 = chooseString (stringIndex);
        } while (stringIndex === strintIndex2);        
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
    console.log({ i, stringIndex, fret, duration, technique});
    if (technique === "doubleStop") {
      lick.push({ step: i, stringIndex: stringIndex2, fret: fret2, duration, technique});
      console.log({ i, stringIndex2, fret2, duration, technique});
    }
    
    // Letzte Werte aktualisieren
    if (stringIndex != null) {lastStringIndex = stringIndex;}
    if (fret != null) {lastFret = fret;}

    i += duration;
  }

  displayTab(lick, length);  
  planLickPlayback(lick);
}

// Saite nach Normalverteilung wählen -------------------------------------------------------------------------------------------
function chooseString (lastStringIndex) {  
  let stringIndex;
  do {
    stringIndex = Math.round(randomNormal(lastStringIndex, parseInt(stringChange.value)));
  } while (stringIndex < 0 || stringIndex >= strings.length);
  return stringIndex;
}

// Saite nach Normalverteilung wählen -------------------------------------------------------------------------------------------
function chooseFret (lastFret) {
  let someFret;
  do {
    someFret = Math.round(randomNormal(lastFret, parseInt(fretChange.value)));
  } while (someFret < 0 || someFret >= fretboardArray[0].length);
  return someFret;
} 

// Get closest valid fret -------------------------------------------------------------------------------------------
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

//Display tab --------------------------------------------------------------------------------------------------------------------------------------------
function displayTab(lick, bars) {
  const lines = Array(strings.length).fill(null).map(() => Array(bars * 16).fill(" - "));

  for (const note of lick) {
    if (note.technique === "rest") continue;
    const sign = techniqueSignsMap[note.technique] || " ";
    const fretStr = note.fret.toString().padStart(2, '0'); // z. B. "07"
    lines[note.stringIndex][note.step] = sign + fretStr;   // z. B. "h07"
  }

  let header = "    ";
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < 4; i++) header += (i + 1) + "     &     ";
    header += " ";
  }

  let output = header + "\n";

  for (let i = strings.length - 1; i >= 0; i--) {
    const s = strings[i];
    const barLines = [];
    for (let b = 0; b < bars; b++) {
      const chunk = lines[i].slice(b * 16, (b + 1) * 16).join("");
      barLines.push("|" + chunk);
    }
    output += s + " " + barLines.join("") + "|\n";
  }

  tabDisplay.innerHTML = `<pre>${output}</pre>`;
}

//Plan Playback ------------------------------------------------------------------------------------------------------------
async function planLickPlayback(lick) {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;

  await setSound(soundSelect.value);

  // Metronom Sound ---------------------------
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

 // Ereignisliste für das Lick ------------------
  const events = lick.map(note => {
    
    const time = Tone.Time(sixteenthsToBBS(note.step));   
    const duration = Tone.Time(durationMap[note.duration]);

    if (note.technique === "rest") {
      return [time, null]; // Pause
    } else {
      const pitch = fretboardArray[note.stringIndex][note.fret];
      return [time, { pitch, duration, step: note.step }];
    }
  });

  // Tone.Part für das Lick ---------------------
  const lickPart = new Tone.Part((time, value) => {
    if (value) {
      highlightStep(value.step);
      synth.triggerAttackRelease(value.pitch, value.duration, time);
    }
  }, events);
  lickPart.start(0);
  lickPart.loop = false;

  // Metronom Loop -----------------------------
  const clickLoop = new Tone.Loop((time) => {
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
