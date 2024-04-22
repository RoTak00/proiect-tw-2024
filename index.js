// ----------------------- INCLUDERI MODULE -------------------------

const express = require("express");
const fs = require("fs");
const sharp = require("sharp");
const sass = require("sass");
const path = require("path");
const moment = require("moment");
require("moment/locale/ro");
moment.locale("ro");
const app = express();
const port = process.env.PORT || 8080;

const {
  filterImagesByTime,
  convertToRoman,
  categoryNameByKey,
} = require("./module/functions");

const { dbClient } = require("./module/database");

// ----------------------- DEFINIRE VARIABILE INITIALE -------------------------

const errorInfoPath = path.join(__dirname, "erori.json");
const galleryJSON = require(path.join(__dirname, "resurse/data/gallery.json"));
var obGlobal = {
  obErori: null,
  folderScss: path.join(__dirname, "resurse/scss/"),
  folderCss: path.join(__dirname, "resurse/css/"),
  folderBackup: path.join(__dirname, "resurse/css/backup/"),
  cssFiles: "",
  galleryData: null,
};

if (!initErori()) {
  console.error("Nu se pot initializa erorile.");
  process.exit(1);
}
obGlobal.galleryData = filterImagesByTime(galleryJSON);
compilareScss();
fs.watch(obGlobal.folderScss, (eventType, filename) => {
  if (eventType === "rename" || eventType === "change") {
    compilareScss(filename);
  }
});

const folders_to_create = ["temp", "backup"];

folders_to_create.forEach((folder) => {
  const folder_path = path.join(__dirname, folder);

  fs.access(folder_path, (err) => {
    if (err) {
      fs.mkdir(folder_path, { recursive: true }, (err) => {
        if (err) {
          console.error(`Eroare la crearea folderului ${folder_path}:`, err);
        } else {
        }
      });
    } else {
    }
  });
});

// ************************ MIDDLE WARES SI SETARI *****************************************

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use("/resurse", (req, res, next) => {
  const fullPath = path.join(__dirname, "resurse", req.path);
  fs.stat(fullPath, (err, stats) => {
    if (err) {
      // Dacă există o eroare în accesarea fișierului/directorului, trimite la handler-ul de erori
      next();
    } else if (stats.isDirectory()) {
      // Dacă calea este un director, returnează eroarea 403
      afisareEroare(res, 403);
    } else {
      // Dacă nu este director, continuă cu restul middleware-urilor (posibil cel de servire statică a fișierelor)
      next();
    }
  });
});

app.use((req, res, next) => {
  if (req.path.endsWith(".ejs")) {
    // În acest caz, nu trimitem titlu, text sau imagine specifică,
    // deci funcția afisareEroare va folosi valorile predefinite pentru eroarea 400 din JSON
    return afisareEroare(res, 400);
  }
  next();
});

app.use(express.static(__dirname + "/resurse"));

app.use((req, res, next) => {
  next();
});

app.use(async (req, res, next) => {
  res.locals.ip = req.ip;
  res.locals.cssFile = obGlobal.cssFiles;
  obGlobal.galleryData = filterImagesByTime(galleryJSON);
  res.locals.galleryData = obGlobal.galleryData;
  obGlobal.dynamicGallery = filterImagesByTime(galleryJSON, 1);
  res.locals.dynamicGallery = obGlobal.dynamicGallery;
  res.locals.convertToRoman = convertToRoman;
  res.locals.availableCourseCategories = await dbClient.fetchCourseCategories();
  next();
});

// ************************ ROUTES *****************************************

// Route to handle resized images, allowing for subdirectories
app.get("/resized-images/:size/*", async (req, res) => {
  const size = parseInt(req.params.size);
  const imagePath = path.join(__dirname, "resurse", "imagini", req.params[0]);
  const directory = path.dirname(imagePath);
  const outputImagePath = path.join(
    directory,
    `${size}_${path.basename(imagePath)}`
  );

  try {
    if (!fs.existsSync(outputImagePath)) {
      // Check if the resized image already exists
      await sharp(imagePath).resize(size).toFile(outputImagePath);
    }
    res.sendFile(outputImagePath);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Error processing image");
  }
});

app.get(["/", "/index", "/home"], (req, res) => {
  res.render("pagini/index");
});

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});

app.get("/cursuri", async (req, res) => {
  let filters = {};
  if (req.query.filter) {
    if (req.query.filter_category) {
      filters["filter_category"] = req.query.filter_category;
    }
  }

  try {
    const results = await dbClient.fetchCourses(filters);
    const price_interval = await dbClient.fetchPriceRange();
    const course_themes = (await dbClient.fetchCourseThemes()).map(
      (row) => row.tema_principala
    );

    res.render("pagini/cursuri", {
      cursuri: parseCourses(results),
      pret_minim: price_interval["min"],
      pret_maxim: price_interval["max"],
      course_themes: course_themes,
      optiuni: [],
    });
  } catch (error) {
    console.error("Error executing query:", error);
    afisareEroare(res, 500);
  }
});

app.get("/cursuri/:id", async (req, res) => {
  let filters = { filter_id: req.params.id };
  try {
    const result = await dbClient.fetchCourses(filters);
    if (result.length === 0) {
      afisareEroare(res, 404);
    }
    res.render("pagini/curs", {
      curs: result[0],
      optiuni: [],
    });
  } catch (error) {
    console.error("Error executing query:", error);
    afisareEroare(res, 500);
  }
});

app.get("/*", (req, res) => {
  let page = req.params[0];
  if (page.endsWith("/")) {
    page = page.slice(0, -1);
  }

  const filePath = __dirname + `/views/pagini/${page}.ejs`;

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      afisareEroare(res, 404);
    } else {
      res.render(
        `pagini/${page}`,
        { page: page },
        function (error, renderResult) {
          if (error) {
            if (error.message.startsWith("Failed to lookup view")) {
              afisareEroare(res, 404);
            } else {
              afisareEroare(res, 500);
            }
          } else {
            res.send(renderResult);
          }
        }
      );
    }
  });
});

// ************************ SERVER *****************************************

app.listen(port, () => {
  console.log(`Serverul rulează pe portul ${port}`);
});

// ************************ FUNCTIONS *****************************************

function afisareEroare(res, identifier, title, text, image) {
  let errorInfo = obGlobal.obErori.eroare_default;
  let status = 200; // Default HTTP status code

  // If an identifier is provided, try to find a matching error in obGlobal.obErori.info_erori
  if (identifier) {
    const foundError = obGlobal.obErori.info_erori.find(
      (error) => error.identificator === identifier
    );
    if (foundError) {
      errorInfo = foundError;
      if (foundError.status) {
        status = identifier; // Use the identifier as the status code if it indicates a different HTTP status
      }
    }
  }

  // Override errorInfo properties with arguments if they are provided

  let outputErrorInfo = Object.assign({}, errorInfo);
  outputErrorInfo.titlu = title || errorInfo.titlu;
  outputErrorInfo.text = text || errorInfo.text;
  outputErrorInfo.imagine = image ? image : errorInfo.imagine;

  // Render the error page
  res.status(status).render("pagini/eroare", {
    titlu: outputErrorInfo.titlu,
    text: outputErrorInfo.text,
    imagine: outputErrorInfo.imagine,
  });
}

function initErori() {
  try {
    const rawData = fs.readFileSync(errorInfoPath);
    obGlobal.obErori = JSON.parse(rawData);

    obGlobal.obErori.info_erori.forEach((error) => {
      error.imagine = path.join(obGlobal.obErori.cale_baza, error.imagine);
    });

    return true;
  } catch (error) {
    console.error(
      "Failed to read or parse the error information JSON file.",
      error
    );
    return false;
  }
}

function compilareScss(specific_name = null) {
  if (!specific_name) obGlobal.cssFiles = "";
  // daca nu exista folderul css, il cream
  if (!fs.existsSync(obGlobal.folderCss)) {
    fs.mkdirSync(obGlobal.folderCss, { recursive: true });
  }

  // citim fisierele din scss
  fs.readdirSync(obGlobal.folderScss)
    .filter(
      (file) =>
        path.extname(file) === ".scss" &&
        (specific_name ? file === specific_name : true)
    )
    // pentru fiecare fisier scss
    .forEach((scssFile) => {
      // calculam rezultatul css
      const filePath = path.join(obGlobal.folderScss, scssFile);
      let result = null;
      try {
        result = sass.compile(filePath, { style: "expanded" });
      } catch (error) {
        console.log(error);
        return;
      }
      if (!result) return;

      // daca nu exista folderul backup, il cream
      if (!fs.existsSync(obGlobal.folderBackup)) {
        fs.mkdirSync(obGlobal.folderBackup);
      }

      // daca deja exista fisierul css pe care il vom crea
      if (
        fs.existsSync(
          obGlobal.folderCss + path.basename(scssFile, ".scss") + ".css"
        )
      ) {
        // il copiem in folderul backup
        fs.copyFileSync(
          obGlobal.folderCss + path.basename(scssFile, ".scss") + ".css",
          obGlobal.folderBackup +
            path.basename(scssFile, ".scss") +
            "-" +
            Date.now() +
            ".css"
        );
      }

      if (!specific_name) {
        if (path.basename(scssFile, ".scss") !== "reset") {
          let link_tag =
            '<link rel="stylesheet" href="' +
            path.join("/css", path.basename(scssFile, ".scss")) +
            '.css" />';
          obGlobal.cssFiles += link_tag;
        }
      }

      // scriem noul fisier css
      fs.writeFileSync(
        path.join(
          obGlobal.folderCss,
          path.basename(scssFile, ".scss") + ".css"
        ),
        result.css
      );
    });
}

function parseCourses(rows) {
  return rows.map((row) => {
    return {
      id: row.id,
      nume: row.nume,
      descriere: row.descriere,
      imagine: row.imagine,
      pret: row.pret,
      categorie: row.categorie,
      categorie_text: categoryNameByKey(row.categorie),
      numar_ore: row.numar_ore,
      data_start: row.data_start,
      tema_principala: row.tema_principala,
      distributie_ore: row.distributie_ore,
      data_start_text: moment(row.data_start).format("D-MMMM-YYYY (dddd)"),
    };
  });
}
