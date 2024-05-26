const { dbInstance } = require("./database"); // Assuming DatabaseClient is in the same directory
const nodemailer = require("nodemailer");
const Rights = require("./drepturi");
const bcrypt = require("bcrypt");

class Utilizator {
  constructor({
    id = null,
    username = "",
    nume = "",
    prenume = "",
    email = "",
    parola = "",
    birth_date = "",
    phone = "",
    chat_color = "",
    rol = "",
    imagine = "",
    salt = "",
  } = {}) {
    this.id = id;
    this.username = username;
    this.nume = nume;
    this.prenume = prenume;
    this.email = email;
    this.parola = parola;
    this.rol = rol;
    this.birth_date = birth_date;
    this.phone = phone;
    this.chat_color = chat_color;
    this.imagine = imagine;
    this.salt = salt;
  }

  print() {
    console.log(this);
  }

  /**
   * Salveaza datele utilizatorului in baza de date, dupa o verificare de existenta
   *
   * @return {Promise} Promisiune care se rezolva dupa salvarea utilizatorului
   */
  async salvareUtilizator() {
    const exists = await Utilizator.getUtilizDupaUsernameAsync(this.username);
    if (exists !== null) {
      throw new Error("Username already exists.");
    }

    const salt = await bcrypt.genSalt(10);
    this.parola = await bcrypt.hash(this.parola, salt);

    await dbInstance.insert(
      {
        tableName: "users",
        fields: [
          "username",
          "first_name",
          "last_name",
          "birth_date",
          "chat_color",
          "phone",
          "email",
          "password",
          "salt",
          "role",
          "profile_image",
        ],
        values: [
          this.username,
          this.prenume,
          this.nume,
          this.birth_date,
          this.chat_color,
          this.phone,
          this.email,
          this.parola,
          salt,
          this.rol,
          this.imagine,
        ],
      },
      (err, res) => {
        if (err) {
          throw err;
        }
        console.log("User saved successfully:", res);
      }
    );
  }

  /**
   * Functie de modificare a datelor utilizatorului
   *
   * @param {Object} updateParams - Obiect cu datele de modificare
   * @return {Promise} O promisiune care se rezolva dupa modificarea utilizatorului
   */
  async modifica(updateParams) {
    if (!this.id) {
      throw new Error("Cannot update a user without an ID.");
    }

    await dbInstance.update(
      {
        tableName: "users",
        fields: Object.keys(updateParams),
        values: Object.values(updateParams),
        conditions: [[`id = ${this.id}`]],
      },
      (err, res) => {
        if (err) {
          throw err;
        }
        console.log("User updated successfully:", res);
      }
    );
  }

  /**
   * Sterge utilizatorul din baza de date
   *
   * @return {Promise} Promisiune care se rezolva dupa stergerea utilizatorului
   */
  async sterge() {
    if (!this.id) {
      throw new Error("Lipseste ID-ul utilizatorului.");
    }

    await dbInstance.deleteRecord(
      {
        tableName: "users",
        conditions: [[`id = ${this.id}`]],
      },
      (err, res) => {
        if (err) {
          throw err;
        }
        console.log("Utilizator sters cu succes:", res);
      }
    );

    if (!this.imagine) return;

    const filePath = path.join(__dirname, this.imagine);

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Eroare la stergerea imaginii:", err);
        return;
      }
      console.log("Imagine stearsa cu succes:", filePath);
    });
  }

  /**
   * Functie de aflare a unui utilizator dupa username
   *
   * @param {string} username - Username-ul utilizatorului
   * @param {Array} fields - Campurile pe care se aplica callback-ul
   * @param {Function} callback - Functia de callback
   *
   * @return {Utilizator | null} Utilizatorul cu username-ul dat, sau null daca nu exista
   */
  static async getUtilizDupaUsername(username, fields, callback) {
    const result = await dbInstance.selectAsync({
      tableName: "users",
      fields: ["*"],
      conditions: [[`username = '${username}'`]],
    });
    if (result.length === 0) {
      return null;
    }

    const utilizator = new Utilizator({
      id: result[0].id,
      prenume: result[0].first_name,
      nume: result[0].last_name,
      email: result[0].email,
      username: result[0].username,
      birth_date: result[0].birth_date,
      phone: result[0].phone,
      chat_color: result[0].chat_color,
      rol: result[0].role,
      imagine: result[0].profile_image,
      salt: result[0].salt,
      parola: result[0].password,
    });

    if (fields) {
      callback(utilizator, fields);
    }
    return utilizator;
  }

  /**
   * Functie de aflare a unui utilizator dupa username
   *
   * @param {string} username - Username-ul utilizatorului
   * @return {Utilizator | null} Utilizatorul cu username-ul dat, sau null daca nu exista
   */
  static async getUtilizDupaUsernameAsync(username) {
    try {
      const results = await dbInstance.selectAsync({
        tableName: "users",
        fields: ["*"],
        conditions: [[`username = '${username}'`]],
      });
      if (results.length === 0) {
        return null;
      }
      const utilizator = new Utilizator({
        id: results[0].id,
        prenume: results[0].first_name,
        nume: results[0].last_name,
        email: results[0].email,
        username: results[0].username,
        birth_date: results[0].birth_date,
        phone: results[0].phone,
        chat_color: results[0].chat_color,
        rol: results[0].role,
        imagine: results[0].profile_image,
        salt: results[0].salt,
        parola: results[0].password,
      });

      return utilizator;
    } catch (err) {
      throw err;
      return null;
    }
  }

  /**
   * Functie de aflare a unor utilizatori dupa un set de parametri
   *
   * @param {Object} obParam - Obiectul de parametri
   * @param {Function} callback - Functia de callback
   * @return {void}
   */
  static cauta(obParam, callback) {
    const fields = Object.keys(obParam).filter(
      (key) => obParam[key] !== undefined
    );
    const conditions = [
      fields.map((field) => `${field} = '${obParam[field]}'`),
    ];

    dbInstance.select(
      {
        tableName: "users",
        fields: ["*"],
        conditions: conditions,
      },
      (err, users) => {
        if (err) {
          callback(err, null);
          return;
        }
        const utilizatori = users.map((user) => new Utilizator(user));
        callback(null, utilizatori);
      }
    );
  }

  /**
   * Functie de aflare a unor utilizatori dupa un set de parametri
   *
   * @param {Object} obParam - Obiectul de parametri
   * @return {Array} utilizatori
   */
  static async cautaAsync(obParam) {
    const fields = Object.keys(obParam).filter(
      (key) => obParam[key] !== undefined
    );
    const conditions = [
      fields.map((field) => `${field} = '${obParam[field]}'`),
    ];

    const results = await dbInstance.selectAsync({
      tableName: "users",
      fields: ["*"],
      conditions: [conditions],
    });
    return results.map(
      (user) =>
        new Utilizator({
          id: user.id,
          prenume: user.first_name,
          nume: user.last_name,
          email: user.email,
          username: user.username,
          birth_date: user.birth_date,
          phone: user.phone,
          chat_color: user.chat_color,
          rol: user.role,
          imagine: user.profile_image,
          salt: user.salt,
          parola: user.password,
        })
    );
  }

  /**
   * Functie de verificare a dreptului utilizatorului.
   *
   * @param {string} drept - Dreptul pe care se verifica
   * @return {boolean} True daca utilizatorul are dreptul, false in caz contrar
   */
  areDreptul(drept) {
    if (!this.rol || !Rights[this.rol]) {
      return false;
    }
    return Rights[this.rol].includes(drept);
  }

  /**
   * Trimite un email
   *
   * @param {string} email - Adresa de email
   * @param {string} subiect - Subiectul
   * @param {string} mesajText - Varianta plaintext a mesajului
   * @param {string} mesajHtml - Varianta HTML a mesajului
   * @param {array} atasamente - (Optional) Atasamente
   * @return {Promise} Promisiune care se rezolva la trimiterea mesajului
   */
  static async trimiteMail(
    email,
    subiect,
    mesajText,
    mesajHtml,
    atasamente = []
  ) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "rotakmailer@gmail.com",
        pass: "gupc hrxt ceqw ntog",
      },
    });

    const mailOptions = {
      from: "invat-web@gmail.com",
      to: email,
      subject: subiect,
      text: mesajText,
      html: mesajHtml,
      attachments: atasamente,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  }
}

module.exports = { Utilizator };
