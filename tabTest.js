createTab(2);
addTabListeners();

function createTab(bars) {
  const tabDisplay = document.getElementById("tab-display");
  tabDisplay.innerHTML = ""; // leeren

  const numStrings = 6;
  const slotsPerBar = 16;
  const totalSlots = bars * slotsPerBar;

  const stringNames = ["e", "B", "G", "D", "A", "E"]; // hohe e oben, tiefe E unten

  for (let s = 0; s < numStrings; s++) {
    const line = document.createElement("div");
    line.className = "tab-line";

    const label = document.createElement("span");
    label.className = "string-label";
    label.textContent = stringNames[s] + " |";
    line.appendChild(label);

    for (let step = 0; step < totalSlots; step++) {
      const slot = document.createElement("span");
      slot.className = "tab-slot";
      slot.textContent = " - ";
      slot.dataset.string = s;
      slot.dataset.step = step;
      line.appendChild(slot);
    }

    tabDisplay.appendChild(line);
  }
}

function addTabListeners() {
  const slots = document.querySelectorAll(".tab-slot");
  slots.forEach(slot => {
    slot.addEventListener("click", () => {
      const string = slot.dataset.string;
      const step = slot.dataset.step;
      const currentText = slot.textContent.trim();

      // Verhindern, dass mehrfach geklickt wird und mehrfach Inputs entstehen
      if (slot.querySelector("input")) return;

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 3;
      input.value = currentText.trim() === "-" ? "" : currentText.trim();
      input.className = "tab-input";
      input.style.width = "24px";

      // Inhalt leeren und Input einfügen
      slot.textContent = "";
      slot.appendChild(input);
      input.focus();

      let finished = false;

      function finishEdit() {
        if (finished) return;
        finished = true;

        let value = input.value.trim();
        if (value === "") value = " - ";
        else if (value.length === 1) value = "0" + value;
        slot.textContent = value; // Inhalt des Span zurücksetzen
      }

      input.addEventListener("blur", finishEdit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finishEdit();
        }
      });
    });
  });
}

