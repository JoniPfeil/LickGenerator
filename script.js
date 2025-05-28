let currentTab = [];
const playButton = document.getElementById("play-button");
const tempoSelect = document.getElementById("tempo");
const generateButton = document.getElementById("generate-button");
const difficultySelect = document.getElementById("difficulty");
const lengthSelect = document.getElementById("length");
const tabDiv = document.getElementById("tab");

const synth = new Tone.PluckSynth().toDestination();

const stringToNote = {
  'e': 'E4',
  'B': 'B3',
  'G': 'G3',
  'D': 'D3',
  'A': 'A2',
  'E': 'E2'
};

// Bestimmt die Mindestnotendauer je nach Schwierigkeit
function getMinStepSize(difficulty) {
  switch (difficulty) {
    case 'easy': return 4;   // Viertelnoten → 4 Schritte pro Takt
    case 'medium': return 2; // Achtel → 8 Schritte pro Takt
    case 'hard': return 1;   // Sechzehntel → 16 Schritte pro Takt
    default: return 1;
  }
}

function generateLick(difficulty, measures) {
  const tab = [[], [], [], [], [], []]; // e B G D A E
  const minStep = getMinStepSize(difficulty);
  const stepsPerMeasure = 16;

  for (let m = 0; m < measures; m++) {
    let step = 0;
    while (step < stepsPerMeasure) {
      const remaining = stepsPerMeasure - step;
      const noteLength = Math.max(minStep, Math.pow(2, Math.floor(Math.random() * 4)));
      const duration = Math.min(noteLength, remaining);

      const isRest = Math.random() < 0.2;
      const stringIndex = Math.floor(Math.random() * 6);
      const fret = Math.floor(Math.random() * 12);

      for (let s = 0; s < 6; s++) {
        for (let i = 0; i < duration; i++) {
          if (s === stringIndex && !isRest && i === 0) {
            tab[s].push(fret < 10 ? "0" + fret : "" + fret);
          } else {
            tab[s].push("--");
          }
        }
      }
      step += duration;
    }
  }

  return tab;
}

function generateLickContent(tab) {
  const saiten = ['e', 'B', 'G', 'D', 'A', 'E'];
  const steps = tab[0].length;
  const contentLines = [];

  // Taktzähler über dem Tab
  let countLine = "    ";
  for (let i = 0; i < steps; i++) {
    if (i % 4 === 0) {
      countLine += String((i / 4) % 4 + 1).padStart(2, ' ') + " ";
    } else {
      countLine += "   ";
    }
  }
  contentLines.push(countLine);

  // Tab-Zeilen mit Taktstrichen
  for (let s = 0; s < 6; s++) {
    let line = saiten[s] + " |";
    for (let i = 0; i < steps; i++) {
      const val = tab[s][i];
      const span = `<span class="tab-note" data-step="${i}" data-string="${s}">${val}</span>`;
      line += span + (i % 4 === 3 ? "|" : " ");
    }
    contentLines.push(line);
  }

  tabDiv.innerHTML = "<pre>" + contentLines.join("\n") + "</pre>";
}

function fretToNote(string, fret) {
  const baseNote = stringToNote[string];
  const midi = Tone.Frequency(baseNote).toMidi() + fret;
  return Tone.Frequency(midi, 'midi').toNote();
}

function playLick(tab, bpm) {
  const intervalMs = (60 / bpm / 4) * 1000; // Sechzehntel-Noten
  const saiten = ['e', 'B', 'G', 'D', 'A', 'E'];
  const maxSteps = tab[0].length;

  // Alle Tab-Note-Elemente erfassen
  const noteElements = document.querySelectorAll(".tab-note");

  // Start mit visuellem Reset
  noteElements.forEach(el => el.classList.remove("active"));

  let step = 0;

  function playStep() {
    if (step >= maxSteps) return;

    for (let s = 0; s < saiten.length; s++) {
      const val = tab[s][step];
      if (val !== "--") {
        const fret = parseInt(val);
        if (!isNaN(fret)) {
          const note = fretToNote(saiten[s], fret);
          synth.triggerAttackRelease(note, "16n");
        }
      }
    }

    // Highlight
    noteElements.forEach(el => {
      const elStep = parseInt(el.dataset.step);
      el.classList.toggle("active", elStep === step);
    });

    step++;
    setTimeout(playStep, intervalMs);
  }

  playStep();
}

// --- Event Handling ---
generateButton.addEventListener("click", () => {
  const difficulty = difficultySelect.value;
  const measures = parseInt(lengthSelect.value);
  currentTab = generateLick(difficulty, measures);
  generateLickContent(currentTab);

  playButton.disabled = false;
  document.getElementById("like-button").disabled = false;
  document.getElementById("dislike-button").disabled = false;
});

playButton.addEventListener("click", () => {
  const tempo = parseInt(tempoSelect.value);
  playLick(currentTab, tempo);
});
