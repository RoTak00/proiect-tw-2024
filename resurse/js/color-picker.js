// Initialize Pickr
const pickr = Pickr.create({
  el: "#color-picker",
  theme: "classic", // or 'monolith', or 'nano'
  default: "#000000",
  swatches: [
    "rgba(244, 67, 54)",
    "rgba(233, 30, 99)",
    "rgba(156, 39, 17)",
    "rgba(103, 58, 183)",
    "rgba(63, 81, 181)",
    "rgba(33, 150, 243)",
    "rgba(3, 169, 244)",
    "rgba(0, 188, 212)",
    "rgba(0, 150, 136)",
    "rgba(76, 175, 80)",
    "rgba(139, 195, 74)",
    "rgba(205, 220, 57)",
    "rgba(255, 235, 59)",
    "rgba(255, 193, 7)",
  ],
  components: {
    // Main components
    preview: true,
    opacity: false,
    hue: true,
    // Input / output Options
    interaction: {
      hex: true,
      rgba: true,
      hsla: true,
      hsva: true,
      cmyk: true,
      input: true,
      clear: true,
      save: true,
    },
  },
});

$(document).ready(function () {
  $("#selected-color").css("color", "#000000").text("#000000");
});

// Sync Pickr color with input value
pickr.on("change", (color) => {
  const colorValue = color.toHEXA().toString();
  document.getElementById("sel-culoare").value = colorValue;
  document.getElementById("selected-color").innerHTML = colorValue;
  document.getElementById("selected-color").style.color = colorValue;
});
