// === Konfiguration ===============================================================================
const lickLengthBars = 2;
const totalSteps = 16*lickLengthBars;         // Takte in 16tel-Schritten
const featuresPerStep = 5;     // fret, stringIndex, duration, isRest, isNewNote
const fretMax = 17;            // höchster Bund, den du erwartest
const stringMax = 5;           // Saiten: 0–5
const durationMax = 8;         // längste Dauer = halbe Note = 8/16
const maxRating = 5;
// =================================================================================================

let nn = null;
const trainButton = document.getElementById("trainButton");
trainButton.addEventListener("click", () => startTraining());

const supabaseClient = supabase.createClient(
  'https://hrsoaxdhyqkrsodvnbys.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc29heGRoeXFrcnNvZHZuYnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODE4NDMsImV4cCI6MjA2NDI1Nzg0M30.voG9dz3KgQ_W56mcw2okTqRDjNqeB8x63MWpwoaanyc',
  {auth: { autoRefreshToken: false, persistSession: false }}
);

// ml5-Konfiguration (global)
const nnOptions = {
  inputs: lickLengthBars*80,
  outputs: 1,
  task: 'regression',
  debug: true,
  learningRate: 0.01,
  hiddenUnits: 128 // probier z. B. auch mal 128 oder 32
};

// Ablauf starten
async function startTraining() {
  nn = ml5.neuralNetwork(nnOptions);
  const raw = await loadData();
  const flat = flattenData(raw);
  trainModel(flat);
}

// Teil 1: Daten aus Supabase laden
async function loadData() {
  console.log("📥 Lade Daten aus Supabase...");

  const { data, error } = await supabaseClient
    .from('ratedLicks')
    .select('lick, rating')
    .eq('length', lickLengthBars)
    //.eq('transpose', 0);

  if (error) {
    console.error('❌ Fehler beim Laden:', error);
    return [];
  }

  return data.filter(entry => entry.lick && entry.rating != null);
}

// Teil 2: Licks flatten
function flattenData(rawData) {
  
  console.log("🧹 Flache Vektoren erzeugen...");

  return rawData.map(entry => ({
    input: flattenLick(entry.lick),
    output: { rating: entry.rating/maxRating }
  }));
}

// Teil 3: Training starten
function trainModel(flattenedData) {
  console.log(`🧠 Trainingsdaten: ${flattenedData.length} Einträge`);

  flattenedData.forEach(d => nn.addData(d.input, d.output));    //{xs: d.input, ys: d.output}

  const options = {
    epochs: 128,
    batchSize: 16
  };

  console.log("🚀 Starte Training...");

  nn.train(options, () => {
    console.log("✅ Training abgeschlossen.");
    // Optional speichern:
    nn.save('guitar-lick-model');
  }); 
}

/**
 * Wandelt ein Lick in einen flachen Vektor mit 5*16*lickLengthBar Features (5 Features pro Sechzehntel) um.
 * Kürzere Licks werden mit Pausen aufgefüllt.
 * Alle Werte werden direkt normalisiert.
 */


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
