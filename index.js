// ----------------------- INCLUDERI MODULE -------------------------

const express = require("express");
const fs = require("fs");
const sharp = require("sharp");
const sass = require("sass");
const path = require("path");
const moment = require("moment");
const session = require("express-session");
const express_formidable = require("express-formidable");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
require("moment/locale/ro");
moment.locale("ro");
const app = express();
const port = process.env.PORT || 8080;

const pgSession = require("connect-pg-simple")(session);

const {
  filterImagesByTime,
  convertToRoman,
  categoryNameByKey,
} = require("./module/functions");

const { dbInstance } = require("./module/database");

const { Utilizator } = require("./module/users");

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

const folders_to_create = ["temp", "backup", "resurse/poze_uploadate"];

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

const maxProfileUploadSize = 5 * 1024 * 1024;
const profileAllowedExtensions = ["jpg", "jpeg", "png", "webp"];

// ************************ MIDDLE WARES SI SETARI *****************************************

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

function loggedIn(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/");
  }
}

app.use(
  express_formidable({
    uploadDir: path.join(__dirname, "resurse/poze_uploadate"),
    keepExtensions: true,
  })
);

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
  res.locals.availableCourseCategories =
    await dbInstance.fetchCourseCategories();
  res.locals.loggedIn = req.session.loggedIn;
  res.locals.userData = req.session.userData;
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
  res.render("pagini/index", { errors: [] });
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
    const results = await dbInstance.fetchCourses(filters);
    const price_interval = await dbInstance.fetchPriceRange();
    const course_themes = (await dbInstance.fetchCourseThemes()).map(
      (row) => row.tema_principala
    );
    const course_start_months = await dbInstance.fetchCourseStartMonths();
    const course_locations = await dbInstance.fetchCourseLocations();

    res.render("pagini/cursuri", {
      cursuri: parseCourses(results),
      pret_minim: price_interval["min"],
      pret_maxim: price_interval["max"],
      course_themes: course_themes,
      course_start_months: course_start_months,
      course_locations: course_locations,
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
    const result = await dbInstance.fetchCourses(filters);
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

// ************************ ENDPOINT-URI API ******************************

app.get("/api/curs/:id", async (req, res) => {
  let id = req.params.id;

  if (isNaN(id)) {
    return res.status(400).json({ error: "ID-ul trebuie sa fie un numar" });
  }

  id = parseInt(id);

  if (id <= 0) {
    return res.status(400).json({ error: "ID-ul nu e corect" });
  }

  let filters = { filter_id: id };

  try {
    const result = await dbInstance.fetchCourses(filters);
    if (result.length === 0) {
      return res.status(404).json({ error: "Cursul nu a fost gasit" });
    }
    res.json(parseCourseFull(result[0]));
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Error executing query" });
  }
});

app.get("/api/random-products", async (req, res) => {
  const limit = 9; // Number of random products to fetch

  try {
    const result = await dbInstance.fetchRandomProducts(limit);
    if (result.length === 0) {
      return res.status(404).json({ error: "No products found" });
    }
    res.json(parseCourses(result));
  } catch (error) {
    console.error("Error fetching random products:", error);
    res.status(500).json({ error: "Error executing query" });
  }
});

app.get("/register", (req, res) => {
  res.render("pagini/register", { errors: [], fields: {} });
});

app.post("/register", async (req, res) => {
  const {
    username,
    nume,
    prenume,
    email,
    parola,
    rparola,
    birthdate,
    telephone,
    culoare_chat,
  } = req.fields;
  let errors = [];

  console.log("Form data:", req.fields);

  // Validate required fields
  const requiredFields = [
    "username",
    "nume",
    "email",
    "parola",
    "rparola",
    "birthdate",
    "telephone",
  ];
  requiredFields.forEach((field) => {
    if (!req.fields[field]) {
      errors.push(`Campul ${field} este obligatoriu.`);
    }
  });

  // Validate email format
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailPattern.test(email)) {
    errors.push("Format-ul e-mail-ului nu este corect.");
  }

  // Validate telephone format
  const phonePattern = /^\+?0[0-9]{9,}$/;
  if (!phonePattern.test(telephone)) {
    errors.push("Format-ul numarului de telefon nu este corect.");
  }

  try {
    const existingUser = await Utilizator.getUtilizDupaUsernameAsync(username);
    console.log("Existing user:", existingUser);
    if (existingUser) {
      errors.push("Username already exists.");
    }
  } catch (error) {
    errors.push("Error fetching user: " + error);
  }

  if (errors.length > 0) {
    // Reload the registration page with errors
    console.log("Errors:", errors);
    res
      .status(400)
      .render("pagini/register", { errors: errors, fields: req.fields });
    return;
  }

  // salvare imagine
  let poza = null;
  let pozaPath = null;
  if (req.files && req.files.poza && req.files.poza.size > 0) {
    poza = req.files.poza;
    const pozaSize = poza.size;
    const pozaExt = path.extname(poza.name).slice(1).toLowerCase();

    if (pozaSize > 5 * 1024 * 1024)
      errors.push("Imaginea nu poate fi mai mare de 5MB.");

    if (profileAllowedExtensions.indexOf(pozaExt) == -1)
      errors.push("Extensie invalidă pentru imaginea de profil.");

    if (errors.length > 0) {
      fs.unlink(poza.path, () => {});
      res
        .status(400)
        .render("pagini/register", { errors: errors, fields: req.fields });
      return;
    }

    const pozaFullPath = path.join(__dirname, "poze_uploadate", poza.name);

    const pozaPath = path.join("poze_uploadate", poza.name);

    fs.rename(poza.path, pozaPath, (err) => {
      if (err) {
        errors.push("Salvarea fisierului a esuat.");
      }
    });

    if (errors.length > 0) {
      fs.unlink(pozaPath, () => {});
      res
        .status(500)
        .render("pagini/register", { errors: errors, fields: req.fields });
      return;
    }
  }

  const newUser = new Utilizator({
    username: username,
    nume: nume,
    prenume: prenume,
    email: email,
    parola: parola,
    birth_date: birthdate,
    phone: telephone,
    chat_color: culoare_chat,
    rol: "comun",
    imagine: poza ? "poze_uploadate/" + poza.name : "",
  });

  newUser.print();

  let newUserCheck;

  try {
    // Save the new user
    await newUser.salvareUtilizator();

    newUserCheck = await Utilizator.getUtilizDupaUsernameAsync(username);
  } catch (error) {
    errors.push("Eroare la salvareaa utilizatorului.");
    res
      .status(500)
      .render("pagini/register", { errors: errors, fields: req.fields });
    return;
  }

  const token1 = crypto.randomBytes(50).toString("hex");
  const token2 = Math.floor(Date.now() / 1000);
  const confirmationLink = `localhost:8080/confirm/${token1}-${token2}/${username.toUpperCase()}`;

  try {
    await dbInstance.insertAsync({
      tableName: "confirmation_tokens",
      fields: ["user_id", "token1", "token2"],
      values: [newUserCheck.id, token1, token2],
    });
  } catch (error) {
    console.log(error);
    errors.push("Eroare la salvarea tokenului de confirmare.");
    newUserCheck.sterge();
    res
      .status(500)
      .render("pagini/register", { errors: errors, fields: req.fields });
    return;
  }

  try {
    // Send confirmation email
    await Utilizator.trimiteMail(
      email,
      `Salut, stimate ${nume} ${prenume}.`,
      `Username-ul tău este ${username} pe site-ul <b><i><u>ÎnvățWeb</u></i></b>.
            Apasă <a href="${confirmationLink}">${confirmationLink}</a> pentru a confirma.`,
      `<p>Username-ul tău este <strong>${username}</strong> pe site-ul <b><i><u>Your Site</u></i></b>.</p>
            <p>Apasă <a href="${confirmationLink}">${confirmationLink}</a> pentru a confirma.</p>`
    );
  } catch (error) {
    errors.push(error);
    console.log(error);
    errors.push("Eroare la salvarea utilizatorului utilizatorului.");
    newUserCheck.sterge();
    res
      .status(500)
      .render("pagini/register", { errors: errors, fields: req.fields });
    return;
  }

  res.render("pagini/post-register", { username: username });
});

app.post("/login", async (req, res) => {
  const { username, parola } = req.fields;
  const user = await Utilizator.getUtilizDupaUsernameAsync(username);

  if (!user) {
    console.log("User not found:", username);
    return res
      .status(400)
      .render("/", { errors: ["Invalid username or password"] });
  }

  console.log("user", user);
  console.log("salt", user.salt);

  const inputPassword = await bcrypt.hash(parola, user.salt);
  const validPassword = inputPassword == user.parola;
  if (!validPassword) {
    console.log("Invalid password:", inputPassword);
    console.log("Stored password:", user.parola);

    return res
      .status(400)
      .render("pagini/index", { errors: ["Invalid username or password"] });
  }

  if (user.rol == "comun") {
    res.status(403).render("pagini/index", {
      errors: ["Nu v-ati confirmat contul inca cu adresa de e-mail!"],
    });
  }

  req.session.loggedIn = true;
  req.session.userData = user;

  console.log("ses", req.session);
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }
    res.redirect("/");
  });
});

app.get("/confirm/:token1-:token2/:username", async (req, res) => {
  const { token1, token2, username } = req.params;

  const storedTokens = await dbInstance.selectAsync({
    tableName: "confirmation_tokens",
    fields: ["token1", "token2", "user_id"],
    conditions: [[`token1 = '${token1}'`, `token2 = '${token2}'`]],
  });

  if (storedTokens.length === 0) {
    console.log("Token not found");
    return res.status(400).redirect("/");
  }

  user_id = storedTokens[0].user_id;

  const user_arr = await Utilizator.cautaAsync({ id: user_id });

  if (!user_arr) {
    console.log("User not found");
    return res.status(400).redirect("/");
  }
  const user = user_arr[0];

  if (user.username.toLowerCase() !== username.toLowerCase()) {
    console.log("Username not valid");
    return res.status(400).redirect("/");
  }
  // Validate tokens

  user.rol = "confirmat";
  try {
    await user.modifica({
      role: user.rol,
    });
    req.session.loggedIn = true;
    req.session.user = user;
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.status(400).redirect("/");
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
        { page: page, errors: [] },
        function (error, renderResult) {
          if (error) {
            console.error("Error:", error);
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
      locatie: row.locatie,
      data_start: row.data_start,
      tema_principala: row.tema_principala,
      data_start_text: moment(row.data_start).format("D-MMMM-YYYY (dddd)"),
      rating: row.rating,
    };
  });
}

function parseCourseFull(row) {
  return {
    id: row.id,
    nume: row.nume,
    descriere: row.descriere,
    imagine: row.imagine,
    pret: row.pret,
    categorie: row.categorie,
    categorie_text: categoryNameByKey(row.categorie),
    locatie: row.locatie,
    data_start: row.data_start,
    tema_principala: row.tema_principala,
    data_start_text: moment(row.data_start).format("D-MMMM-YYYY (dddd)"),
    rating: row.rating,
    accesibil_dizabilitati: row.accesibil_dizabilitati,
  };
}
