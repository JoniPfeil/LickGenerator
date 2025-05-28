function generateLickContent(schwierigkeit, takte) {
  const saiten = ['e', 'B', 'G', 'D', 'A', 'E'];
  const bundMax = 12;
  const notenoptionen = [];

  // Rhythmusauswahl nach Schwierigkeit
  if (schwierigkeit === 'easy') {
    notenoptionen.push(4, 2, 'pause');
  } else if (schwierigkeit === 'medium') {
    notenoptionen.push(8, 4, 2, 'pause');
  } else if (schwierigkeit === 'hard') {
    notenoptionen.push(16, 8, 4, 2, 'pause');
  }

  const stepsPerBeat = 4;      // Wir wollen 16 Steps pro Takt (also 4 pro Schlag bei 4/4)
  const beatsPerTakt = 4;
  const stepsPerTakt = stepsPerBeat * beatsPerTakt;
  const totalSteps = takte * stepsPerTakt;

  // Initialisiere Tab (6 Saiten × Steps)
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

  // Zeilen für Zählzeiten (Kopfzeile)
  let header = '   ';
  for (let t = 0; t < takte; t++) {
    for (let b = 1; b <= 4; b++) {
      header += b.toString().padEnd(stepsPerBeat * 3, ' ');
    }
  }

  // Tab-Zeilen mit Taktstrich nach jedem Takt
  const tabLines = tab.map((line, idx) => {
    let result = saiten[idx] + ' |';
    for (let j = 0; j < totalSteps; j++) {
      result += ' ' + line[j];
      if ((j + 1) % stepsPerTakt === 0 && j !== totalSteps - 1) {
        result += ' |'; // Taktstrich
      }
    }
    result += ' |';
    return result;
  });

  return header + '\n' + tabLines.join('\n');
}
