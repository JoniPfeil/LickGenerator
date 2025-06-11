let audioStarted = false;
let synth = null;
let clickSynth = null;
let tonePart = null;
let clickLoop = null;
let reverb = null;
let reverbSmall = null;

const startAudioBtn = document.getElementById("startAudio");
const planToneBtn = document.getElementById("planTone");
const planClickBtn = document.getElementById("planClick");
const playBtn = document.getElementById("play");
const checkboxReverb = document.getElementById("checkboxReverb");

startAudioBtn.addEventListener("click", async () => {
  if (!audioStarted) {
    await Tone.start();
    console.log("AudioContext gestartet.");

    // Reverb erstellen
    reverb = new Tone.Reverb({
      decay: 1.5,
      preDelay: 0.05,
      wet: 0.5
    })
    await reverb.generate();
    reverb.toDestination(); 

    // Reverb Small erstellen: Kurzer Impuls als IR erzeugen
    const irBuffer = Tone.context.createBuffer(1, 4800, 48000); // 100 ms bei 44.1 kHz
    const data = irBuffer.getChannelData(0);
    data[0] = 1.0; // kurzer Impuls
    for (let i = 1; i < data.length; i++) {
      data[i] = Math.random() * 0.1 * (1 - i / data.length); // leichtes Rauschen, abklingend
    }
    reverbSmall = new Tone.Convolver(irBuffer);
    reverbSmall.toDestination();


    // Synth erstellen
    synth = new Tone.Synth();  //.toDestination();
    synth.connect(reverb);

    // ClickSynth erstellen (white noise, kurzer Click)
    clickSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0
      }
    });

    clickSynth.toDestination();
    
    audioStarted = true;
  }
});

checkboxReverb.addEventListener("change", () => {
  synth.disconnect();
  if (checkboxReverb.checked) {
    synth.connect(reverb);
  }
  else
  {
    synth.connect(reverbSmall)();
  }
});

planToneBtn.addEventListener("click", () => {
  if (!synth) {
    alert("Bitte erst 'Start Audio' klicken.");
    return;
  }

  if (tonePart) {
    tonePart.dispose();
  }

  const notes = [
    ["0:0:0", "C4", "4n"],
    ["0:1:0", "D4", "8n"],
    ["0:1:2", "E4", "8n"],
    ["0:2:0", "F4", "4n"],
    ["0:3:0", "G4", "4n"],
    ["1:0:0", "A4", "4n"],
    ["1:1:0", "G4", "8n"],
    ["1:1:2", "F4", "8n"],
    ["1:2:0", "E4", "4n"],
    ["1:3:0", "C4", "4n"]
  ];

  tonePart = new Tone.Part((time, note) => {
    synth.triggerAttackRelease(note.pitch, note.duration, time);
  }, notes.map(n => [n[0], { pitch: n[1], duration: n[2] }]));

  tonePart.loop = false;
  tonePart.start(0);
  console.log("Melodie geplant.");
});

planClickBtn.addEventListener("click", () => {
  if (!clickSynth) {
    alert("Bitte erst 'Start Audio' klicken.");
    return;
  }

  if (clickLoop) {
    clickLoop.dispose();
  }

  let clickCount = 0;
  const maxClicks = 10;

  clickLoop = new Tone.Loop((time) => {
    if (clickCount < maxClicks) {
      clickSynth.triggerAttackRelease("8n", time);
      clickCount++;
    } else {
      clickLoop.stop();
    }
  }, "8n");

  clickLoop.start(0);
  console.log("ClickLoop geplant.");
});

playBtn.addEventListener("click", () => {
  if (!audioStarted) {
    alert("Bitte erst 'Start Audio' klicken.");
    return;
  }

  // Reverb
  //console.log("Reverb input node:", reverb.input);
  //console.log("Reverb output node:", reverb.output);
  
  // Synth
  //console.log("Synth output node:", synth.output);

  Tone.Transport.stop();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = 100;
  Tone.Transport.start();
  console.log("Transport gestartet.");
});
