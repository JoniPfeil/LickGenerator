document.addEventListener("DOMContentLoaded", () => {
  const tonartSelect = document.getElementById("tonart");
  const tempoSelect = document.getElementById("tempo");
  const schwierigkeitsSelect = document.getElementById("schwierigkeit");
  const takteSelect = document.getElementById("takte");

  const generateBtn = document.getElementById("generate");
  const playBtn = document.getElementById("play");
  const likeBtn = document.getElementById("like");
  const dislikeBtn = document.getElementById("dislike");

  const lickDisplay = document.getElementById("lick-display");

  generateBtn.addEventListener("click", () => {
    const tonart = tonartSelect.value;
    const tempo = Number(tempoSelect.value);
    const schwierigkeit = schwierigkeitsSelect.value;
    const takte = Number(takteSelect.value);

    const lick = generateLickContent(schwierigkeit, takte);

    lickDisplay.textContent = lick;

    // Aktiviere die Buttons
    playBtn.disabled = false;
    likeBtn.disabled = false;
    dislikeBtn.disabled = false;

    // Temporär: Play Button macht noch nichts
    playBtn.onclick = () => {
      alert("Sound wird später hinzugefügt :)");
    };

    likeBtn.onclick = () => {
      alert("👍 Danke für dein Feedback!");
    };

    dislikeBtn.onclick = () => {
      alert("👎 Wir verbessern das Modell!");
    };
  });
});

function generateLickContent(schwierigkeit, takte) {
  const saiten = ['e', 'B', 'G', 'D', 'A', 'E'];
  const bundMax = 12;
  const notenoptionen = [];

  // Erlaube rhythmische Werte abhängig von Schwierigkeit
  if (schwierigkeit === 'easy') {
    notenoptionen.push(4, 2, 'pause');
  } else if (schwierigkeit === 'medium') {
    notenoptionen.push(8, 4, 2, 'pause');
  } else if (schwierigkeit === 'hard') {
    notenoptionen.push(16, 8, 4, 2, 'pause');
  }

  const noteToSteps = { 2: 2, 4: 4, 8: 8, 16: 16 };
  const stepsPerBeat = 16; // maximale Auflösung (1/16tel)
  const beatsPerTakt = 4;
  const totalSteps = takte * beatsPerTakt * stepsPerBeat;

  const tab = saiten.map(() => Array(totalSteps).fill('--'));

  let i = 0;
  while (i < totalSteps) {
    const rhythm = notenoptionen[Math.floor(Math.random() * notenoptionen.length)];
    const duration = (rhythm === 'pause') ? Math.floor(stepsPerBeat / 4) : Math.floor(stepsPerBeat / rhythm);
    const d = Math.max(duration, 1);

    if (i + d > totalSteps) break;

    if (rhythm === 'pause') {
      i += d;
      continue;
    }

    const saiteIndex = Math.floor(Math.random() * saiten.length);
    const bund = Math.floor(Math.random() * bundMax) + 1;
    const bundText = bund < 10 ? `${bund}-` : `${bund}`;

    tab[saiteIndex][i] = bundText;
    i += d;
  }

  return tab.map((line, idx) => {
    return saiten[idx] + '| ' + line.join(' ');
  }).join('\n');
}
