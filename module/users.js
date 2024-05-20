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
        conditions: [`id = ${this.id}`],
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
      throw new Error("Cannot delete a user without an ID.");
    }

    await dbInstance.deleteRecord(
      {
        tableName: "users",
        conditions: [`id = ${this.id}`],
      },
      (err, res) => {
        if (err) {
          throw err;
        }
        console.log("User deleted successfully:", res);
      }
    );
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

    const utilizator = new Utilizator(result[0]);

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
      return new Utilizator(results[0]);
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
      conditions: conditions,
    });
    return results.map((user) => new Utilizator(user));
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
