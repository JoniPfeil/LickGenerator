// === Konfiguration ===============================================================================
const lickLengthBars = 2;
const totalSteps = 16*lickLengthBars;         // Takte in 16tel-Schritten
const featuresPerStep = 5;     // fret, stringIndex, duration, isRest, isNewNote
const fretMax = 17;            // höchster Bund, den du erwartest
const stringMax = 5;           // Saiten: 0–5
const durationMax = 8;         // längste Dauer = halbe Note = 8/16
const maxRating = 5;
// =================================================================================================

const nnOptions = {
  task: 'regression',
  debug: true
};

//let nn = null;

const nn = ml5.neuralNetwork(nnOptions);
nn.load('./ml5_LickRatingModel/guitar-lick-model.json', () => {
      console.log("✅ Modell erfolgreich geladen!");
    });

const ml5Button = document.getElementById("ml5Button");
const ml5RatingText = document.getElementById("ml5Rating");

ml5Button.addEventListener("click", () => rateCurrentLick());


async function rateCurrentLick()
{
  console.log("⭐ Lick wird bewerted");
  ml5RatingText.textContent = "now rating...";
  console.log(lick);
  if (nn === null)
  {
    nn = ml5.neuralNetwork(nnOptions);
    await nn.load('ml5_LickRatingModel/', () => {
      console.log("✅ Modell erfolgreich geladen!");
    });
  }
  
  const rating = await ml5predictAsync(lick);
  console.log("⭐ Vorhergesagte Bewertung:", rating);
  ml5RatingText.textContent = rating;
}

// Beispiel: Vorhersage mit einem neuen Lick
async function ml5predictAsync(lick) {
  const input = flattenLick(lick);

  return new Promise((resolve, reject) => {
    nn.predict(input, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const predictedRating = result[0].value * 5; // falls du normalisiert hast
        resolve(predictedRating);
      }
    });
  });
}
  
function flattenLick(lick) {
  const vector = [];

  // Schritt-Mapping vorbereiten
  const stepMap = Array(totalSteps).fill(null);

  for (const note of lick) {
    if (note.step < totalSteps) {
      stepMap[note.step] = note;
    }
  }

  for (let i = 0; i < totalSteps; i++) {
    const note = stepMap[i];

    if (note === null) {
      // Kein Ton an dieser Stelle = Leerer Schritt = Pause
      vector.push(-1);            // fret (normiert: -1 = keine Note)
      vector.push(-1);            // stringIndex (normiert: -1 = keine Note)
      vector.push(0);             // duration (normiert: 0)
      vector.push(1);             // isRest
      vector.push(0);             // isNewNote
    } else {
      // Werte normalisieren
      const fret = note.fret !== null ? note.fret / fretMax : -1;
      const stringIndex = note.stringIndex !== null ? note.stringIndex / stringMax : -1;
      const duration = note.duration / durationMax;
      const isRest = note.isRest ? 1 : 0;

      // Neue Note beginnt, wenn:
      const prevNote = stepMap[i - 1];
      const isNewNote = (
        i === 0 ||
        !prevNote ||
        prevNote.step + prevNote.duration <= note.step
      ) ? 1 : 0;

      vector.push(fret);
      vector.push(stringIndex);
      vector.push(duration);
      vector.push(isRest);
      vector.push(isNewNote);
    }
  }

  return vector;
}
