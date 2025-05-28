document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generate-btn');
  const playButton = document.getElementById('play-btn');
  const likeButton = document.getElementById('like-btn');
  const dislikeButton = document.getElementById('dislike-btn');
  const lickDisplay = document.getElementById('lick-display');

  generateButton.addEventListener('click', () => {
    const difficulty = document.getElementById('difficulty').value;
    const takte = parseInt(document.getElementById('takte').value);
    const lick = generateLickContent(difficulty, takte);
    lickDisplay.textContent = lick;

    playButton.disabled = false;
    likeButton.disabled = false;
    dislikeButton.disabled = false;
  });

  playButton.addEventListener('click', () => {
    // Sound-Wiedergabe kommt später
    alert('Sound wird bald unterstützt 🎸');
  });

  likeButton.addEventListener('click', () => {
    alert('👍 Danke für dein Feedback!');
  });

  dislikeButton.addEventListener('click', () => {
    alert('👎 Danke für dein Feedback!');
  });
});

function generateLickContent(schwierigkeit, takte) {
  const saiten = ['e', 'B', 'G', 'D', 'A', 'E'];
  const bundMax = 12;
  const notenoptionen = [];

  // Rhythmusoptionen abhängig von Schwierigkeit
  if (schwierigkeit === 'easy') {
    notenoptionen.push(4, 2, 'pause');
  } else if (schwierigkeit === 'medium') {
    notenoptionen.push(8, 4, 2, 'pause');
  } else if (schwierigkeit === 'hard') {
    notenoptionen.push(16, 8, 4, 2, 'pause');
  }

  const stepsPerBeat = 4;
  const beatsPerTakt = 4;
  const stepsPerTakt = stepsPerBeat * beatsPerTakt;
  const totalSteps = takte * stepsPerTakt;

  // Tab-Vorlage
  const tab = saiten.map(() => Array(totalSteps).fill('--'));

  let i = 0;
  while (i < totalSteps) {
    const rhythm = notenoptionen[Math.floor(Math.random() * notenoptionen.length)];
    const duration = (rhythm === 'pause') ? 1 : Math.max(1, stepsPerTakt / rhythm);

    if (i + duration > totalSteps) break;

    if (rhythm === 'pause') {
      i += duration;
      continue;
    }

    const saiteIndex = Math.floor(Math.random() * saiten.length);
    const bund = Math.floor(Math.random() * bundMax) + 1;
    const bundText = bund < 10 ? `0${bund}` : `${bund}`;

    tab[saiteIndex][i] = bundText;
    i += duration;
  }

  // Kopfzeile mit Zählzeiten
  let header = '   ';
  for (let t = 0; t < takte; t++) {
    for (let b = 1; b <= 4; b++) {
      header += b.toString().padEnd(stepsPerBeat * 3, ' ');
    }
  }

  // Tabzeilen mit Taktstrichen
  const tabLines = tab.map((line, idx) => {
    let result = saiten[idx] + ' |';
    for (let j = 0; j < totalSteps; j++) {
      result += ' ' + line[j];
      if ((j + 1) % stepsPerTakt === 0 && j !== totalSteps - 1) {
        result += ' |';
      }
    }
    result += ' |';
    return result;
  });

  return header + '\n' + tabLines.join('\n');
}
