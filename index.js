const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 8080;

const errorInfoPath = path.join(__dirname, "erori.json");
let errorData;

try {
  const rawData = fs.readFileSync(errorInfoPath);
  errorData = JSON.parse(rawData);
} catch (error) {
  console.error(
    "Failed to read or parse the error information JSON file.",
    error
  );
}

const folders_to_create = ["temp", "temp1"];

folders_to_create.forEach((folder) => {
  const folder_path = path.join(__dirname, folder);

  fs.access(folder_path, (err) => {
    if (err) {
      fs.mkdir(folder_path, { recursive: true }, (err) => {
        if (err) {
          console.error(`Eroare la crearea folderului ${folder_path}:`, err);
        } else {
          console.log(`Folderul ${folder_path} a fost creat cu succes.`);
        }
      });
    } else {
      console.log(`Folderul ${folder_path} există deja.`);
    }
  });
});

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
      displayError(res, 403);
    } else {
      // Dacă nu este director, continuă cu restul middleware-urilor (posibil cel de servire statică a fișierelor)
      next();
    }
  });
});

app.use((req, res, next) => {
  if (req.path.endsWith(".ejs")) {
    // În acest caz, nu trimitem titlu, text sau imagine specifică,
    // deci funcția displayError va folosi valorile predefinite pentru eroarea 400 din JSON
    return displayError(res, 400);
  }
  next();
});

app.use(express.static(__dirname + "/resurse"));

app.use((req, res, next) => {
  console.log(`Received request for ${req.url}`);
  next();
});

app.use((req, res, next) => {
  res.locals.ip = req.ip; // Setează adresa IP în `locals`, făcând-o disponibilă în toate template-urile
  next();
});

app.get(["/", "/index", "/home"], (req, res) => {
  /*console.log(`Directorul curent: ${__dirname}`);
  console.log(`Fișierul curent: ${__filename}`);
  console.log(`Folderul curent de lucru: ${process.cwd()}`);

  const isSame = __dirname === process.cwd();
  console.log(`__dirname și process.cwd() sunt aceleași?: ${isSame}`);*/

  res.render("pagini/index");
});

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});

app.get("/*", (req, res) => {
  let page = req.params[0];
  if (page.endsWith("/")) {
    page = page.slice(0, -1);
  }

  const filePath = __dirname + `/views/pagini/${page}.ejs`;

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      displayError(res, 404);
    } else {
      res.render(
        `pagini/${page}`,
        { page: page },
        function (error, renderResult) {
          if (error) {
            if (error.message.startsWith("Failed to lookup view")) {
              displayError(res, 404);
            } else {
              displayError(res, 500);
            }
          } else {
            res.send(renderResult);
          }
        }
      );
    }
  });
});

app.listen(port, () => {
  console.log(`Serverul rulează pe portul ${port}`);
});

function displayError(res, identifier, title, text, image) {
  console.log(errorData);
  let errorInfo = errorData.eroare_default;
  let status = 200; // Default HTTP status code

  // If an identifier is provided, try to find a matching error in errorData.info_erori
  if (identifier) {
    const foundError = errorData.info_erori.find(
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
  outputErrorInfo.imagine = image
    ? path.join(errorData.cale_baza, image)
    : path.join(errorData.cale_baza, errorInfo.imagine);

  // Render the error page
  res.status(status).render("pagini/eroare", {
    titlu: outputErrorInfo.titlu,
    text: outputErrorInfo.text,
    imagine: outputErrorInfo.imagine,
  });
}
