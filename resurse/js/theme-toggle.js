document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const currentTheme = localStorage.getItem("theme") || "light";

  let bodyElement = document.getElementsByTagName("body")[0];
  bodyElement.classList.add(currentTheme + "-theme");
  if (currentTheme === "dark") {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // FontAwesome icon for the moon
  }

  themeToggle.addEventListener("click", () => {
    if (bodyElement.classList.contains("light-theme")) {
      bodyElement.classList.remove("light-theme");
      bodyElement.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // FontAwesome icon for the moon
    } else {
      bodyElement.classList.remove("dark-theme");
      bodyElement.classList.add("light-theme");
      localStorage.setItem("theme", "light");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // FontAwesome icon for the sun
    }
  });
});
