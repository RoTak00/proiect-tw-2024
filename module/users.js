const { dbInstance } = require("./database"); // Assuming DatabaseClient is in the same directory
const nodemailer = require("nodemailer");
const Rights = require("./drepturi");

class Utilizator {
  constructor({
    id = null,
    username = "",
    nume = "",
    email = "",
    parola = "",
    rol = "",
  } = {}) {
    this.id = id;
    this.username = username;
    this.nume = nume;
    this.email = email;
    this.parola = parola;
    this.rol = rol;
  }

  async salvareUtilizator() {
    const exists = await dbInstance.selectAsync({
      tableName: "utilizatori",
      fields: ["id"],
      conditions: [`username = '${this.username}'`],
    });
    if (exists.length > 0) {
      throw new Error("Username already exists.");
    }

    await dbInstance.insert(
      {
        tableName: "utilizatori",
        fields: ["username", "nume", "email", "parola", "rol"],
        values: [this.username, this.nume, this.email, this.parola, this.rol],
      },
      (err, res) => {
        if (err) {
          throw err;
        }
        console.log("User saved successfully:", res);
      }
    );
  }

  async modifica(updateParams) {
    if (!this.id) {
      throw new Error("Cannot update a user without an ID.");
    }

    await dbInstance.update(
      {
        tableName: "utilizatori",
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

  async sterge() {
    if (!this.id) {
      throw new Error("Cannot delete a user without an ID.");
    }

    await dbInstance.deleteRecord(
      {
        tableName: "utilizatori",
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

  static async getUtilizDupaUsername(username) {
    const result = await dbInstance.selectAsync({
      tableName: "utilizatori",
      fields: ["*"],
      conditions: [`username = '${username}'`],
    });
    if (result.length === 0) {
      return null;
    }
    return new Utilizator(result[0]);
  }

  static async getUtilizDupaUsernameAsync(username) {
    const results = await dbInstance.selectAsync({
      tableName: "utilizatori",
      fields: ["*"],
      conditions: [`username = '${username}'`],
    });
    if (results.length === 0) {
      return null;
    }
    return new Utilizator(results[0]);
  }

  static cauta(obParam, callback) {
    const fields = Object.keys(obParam).filter(
      (key) => obParam[key] !== undefined
    );
    const conditions = fields.map((field) => `${field} = '${obParam[field]}'`);

    dbInstance.select(
      {
        tableName: "utilizatori",
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

  static async cautaAsync(obParam) {
    const fields = Object.keys(obParam).filter(
      (key) => obParam[key] !== undefined
    );
    const conditions = fields.map((field) => `${field} = '${obParam[field]}'`);

    const results = await dbInstance.selectAsync({
      tableName: "utilizatori",
      fields: ["*"],
      conditions: conditions,
    });
    return results.map((user) => new Utilizator(user));
  }

  areDreptul(drept) {
    if (!this.rol || !Rights[this.rol]) {
      return false;
    }
    return Rights[this.rol].includes(drept);
  }

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
