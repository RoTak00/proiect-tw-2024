function filterImagesByTime(data) {
  const currentHour = new Date().getHours();
  const currentQuarter = Math.floor(new Date().getMinutes() / 15) + 1;
  const filteredImages = data.imagini.filter(
    (img) => parseInt(img.sfert_ora) === currentQuarter
  );
  return {
    ...data,
    imagini: filteredImages.slice(0, 10), // Limitare la 10 imagini
  };
}

function convertToRoman(num) {
  const romanLookup = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let roman = "";
  for (let i in romanLookup) {
    while (num >= romanLookup[i]) {
      roman += i;
      num -= romanLookup[i];
    }
  }
  return roman;
}

module.exports = {
  filterImagesByTime,
  convertToRoman,
};
