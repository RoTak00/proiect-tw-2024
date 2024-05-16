document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("cookie-banner");
  const acceptButton = document.getElementById("accept-button");
  const cookieName = "cookieAccepted";

  console.log(banner);
  if (!getCookie(cookieName)) {
    banner.classList.remove("cookie-banner-hidden");
    setTimeout(() => {
      console.log("show banner");
      banner.classList.add("cookie-banner-show");
    }, 100);
  }

  acceptButton.addEventListener("click", () => {
    setCookie(cookieName, "true", 1);
    banner.classList.remove("cookie-banner-show");
    setTimeout(() => {
      banner.classList.add("cookie-banner-hidden");
    }, 5000);
  });
});

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; Max-Age=-99999999;";
}

function deleteAllCookies() {
  document.cookie.split(";").forEach(function (c) {
    document.cookie = c.trim().split("=")[0] + "=; Max-Age=-99999999;";
  });
}
