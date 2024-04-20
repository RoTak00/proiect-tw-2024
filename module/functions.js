const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function filterImagesByTime(data, dynamic_gallery = false) {
  const currentHour = new Date().getHours();
  const currentQuarter = Math.floor(new Date().getMinutes() / 15) + 1;
  const filteredImages = data.imagini.filter(
    (img) => parseInt(img.sfert_ora) === currentQuarter
  );

  if (dynamic_gallery) {
    return {
      ...data,
      imagini: shuffle(filteredImages).slice(0, getRandomInt(6, 12)),
    }; // Shuffle();
  }
  return {
    ...data,
    imagini: shuffle(filteredImages).slice(0, 10),
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
