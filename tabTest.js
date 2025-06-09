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
      slot.textContent = "--";
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
      const currentText = slot.textContent;

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 2;
      input.value = currentText.trim() === "--" ? "" : currentText;
      input.style.width = "24px";
      input.className = "tab-input";

      // Replace slot with input
      slot.replaceWith(input);
      input.focus();

      // On blur or Enter, replace input with updated span
      function finishEdit() {
        const newSpan = document.createElement("span");
        newSpan.className = "tab-slot";
        newSpan.dataset.string = string;
        newSpan.dataset.step = step;
        let value = input.value.trim();
        if (value === "") value = "--";
        if (value.length === 1) value = "0" + value;
        newSpan.textContent = value;

        // re-attach listener
        newSpan.addEventListener("click", slot.click);
        input.replaceWith(newSpan);
      }

      input.addEventListener("blur", finishEdit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finishEdit();
      });
    });
  });
}
