document.addEventListener("DOMContentLoaded", () => {
  // Variante 1: <span contenteditable>
  document.querySelectorAll(".variant1 .tab-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      cell.focus();
    });
  });

  // Variante 2: <table><td contenteditable>
  document.querySelectorAll(".variant2 td").forEach(cell => {
    cell.addEventListener("click", () => {
      cell.focus();
    });
  });

  // Variante 3: <input type="text">
  document.querySelectorAll(".variant3 input").forEach(input => {
    input.addEventListener("click", () => {
      input.select();
    });
  });
});
