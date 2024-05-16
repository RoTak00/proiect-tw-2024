const { Client } = require("pg");
const { categoryNameByKey } = require("./functions");
const moment = require("moment");

class DatabaseClient {
  static instance = null;
  constructor() {
    if (DatabaseClient.instance !== null) {
      throw new Error(
        "Error: Instantiation failed: Use DatabaseClient.getInstance() instead of new."
      );
    }
    DatabaseClient.instance = this;

    return DatabaseClient.instance;
  }

  /**
   * Se initializeaza si deschide conexiunea la baza de date PostgreSQL
   *
   * @param {string} database
   * @param {string} user
   * @param {string} password
   * @param {string} host
   * @param {integer} port
   * @returns {void}
   *
   *
   */
  connectToDatabase(database, user, password, host, port) {
    this.client = new Client({
      database,
      user,
      password,
      host,
      port,
    });
    this.client.connect();
  }

  /**
   *
   * Gettern pentru client de baza de date
   *
   * @returns {Client}
   */
  getClient() {
    return this.client;
  }

  /**
   *
   * Getter pentru instanta de baza de date
   *
   * @returns {Client}
   */
  getInstance() {
    if (DatabaseClient.instance === null) {
      DatabaseClient.instance = this;
    }

    this.connectToDatabase(
      "InvatWeb_Local",
      "vsc_user",
      "vscpa55",
      "localhost",
      5432
    );

    return DatabaseClient.instance;
  }

  /**
   * Selecteaza din tabela tableName campurile fields pe baza conditiilor conditions
   * Apeleaza functia callback pe rezultat
   *
   * @param {array[tableName, fields, conditions]} params
   * @param {(err, res)} callback
   *
   *
   */
  select(params, callback) {
    const { tableName, fields, conditions } = params;
    const conditionsString = conditions
      ? conditions.map((group) => `(${group.join(" AND ")})`).join(" OR ")
      : "true";
    const query = `SELECT ${fields.join(
      ", "
    )} FROM ${tableName} WHERE ${conditionsString}`;

    this.client.query(query, (err, res) => {
      callback(err, res ? res.rows : null);
    });
  }

  /**
   * Selecteaza din tabela tableName campurile fields pe baza conditiilor conditions
   *
   * @param {array[tableName, fields, conditions]} params
   *
   * @returns {array} results
   */
  async selectAsync(params) {
    const { tableName, fields, conditions } = params;
    const conditionsString = conditions
      ? conditions.map((group) => `(${group.join(" AND ")})`).join(" OR ")
      : "true";

    const query = `SELECT ${fields.join(
      ", "
    )} FROM ${tableName} WHERE ${conditionsString}`;

    try {
      const res = await this.client.query(query);
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Actualizeaza in tabela tableName campurile fields cu valorile values pe baza conditiilor conditions
   * Apeleaza functia callback pe rezultat
   *
   * @param {array[tableName, fields, conditions]} params
   * @param {(err, res)} callback
   */
  update(params, callback) {
    const { tableName, fields, values, conditions } = params;
    const setString = fields
      .map((field, index) => `${field} = '${values[index]}'`)
      .join(", ");
    const conditionsString = conditions
      ? conditions.map((group) => `(${group.join(" AND ")})`).join(" OR ")
      : "true";
    const query = `UPDATE ${tableName} SET ${setString} WHERE ${conditionsString}`;

    this.client.query(query, (err, res) => {
      callback(err, res ? res.rowCount : null);
    });
  }

  /**
   * Insereaza in tabela tableName campurile fields valorile values
   * Apeleaza functia callback pe rezultat
   *
   * @param {array[tableName, fields, values]} params
   * @param {(err, res)} callback
   */
  insert(params, callback) {
    const { tableName, fields, values } = params;
    const query = `INSERT INTO ${tableName} (${fields.join(
      ", "
    )}) VALUES (${values.map((value) => `'${value}'`).join(", ")})`;

    this.client.query(query, (err, res) => {
      callback(err, res);
    });
  }

  /**
   * Sterge din tabela tableName pe vaza conditions
   * Apeleaza functia callback pe rezultat
   *
   * @param {array[tableName, conditions]} params
   * @param {(err, res)} callback
   */
  deleteRecord(params, callback) {
    const { tableName, conditions } = params;
    const conditionsString = conditions
      ? conditions.map((group) => `(${group.join(" AND ")})`).join(" OR ")
      : "true";
    const query = `DELETE FROM ${tableName} WHERE ${conditionsString}`;

    this.client.query(query, (err, res) => {
      callback(err, res ? res.rowCount : null);
    });
  }

  /**
   * Selecteaza produsele pe baza filtrelor date
   *
   * @param {{filters}} filters
   *
   * @returns {array} courses
   */
  async fetchCourses(filters = {}) {
    let conditions = ["true"]; // Always true, to concatenate conditions safely

    if (filters.filter_id) {
      conditions.push(`id = ${parseInt(filters.filter_id)}`);
    }
    if (filters.filter_category) {
      conditions.push(`categorie = '${filters.filter_category}'`);
    }

    conditions = [conditions];

    return await this.selectAsync({
      tableName: "cursuri",
      fields: ["*"],
      conditions: conditions,
    });
  }

  /**
   * Preia un numar de produse aleatorii
   *
   * @param {number} limit - Numarul de produse dorite
   * @return {array} products
   */
  async fetchRandomProducts(limit) {
    const query = `SELECT * FROM cursuri ORDER BY RANDOM() LIMIT $1`;
    const values = [limit];
    try {
      const result = await this.client.query(query, values);
      return result.rows;
    } catch (error) {
      console.error("Error fetching random products:", error);
      throw error;
    }
  }

  /**
   * Selecteaza toate categoriile diferite de cursuri care exista
   *
   * @returns {array} categories
   */
  async fetchCourseCategories() {
    const results = await this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT categorie"],
      conditions: null,
    });

    return results.map((row) => {
      return { key: row.categorie, value: categoryNameByKey(row.categorie) };
    });
  }

  /**
   * Selecteaza pretul minim si maxim al cursurilor de vanzare
   *
   * @returns {min: number, max: number} result
   */
  async fetchPriceRange() {
    return this.selectAsync({
      tableName: "cursuri",
      fields: ["MIN(pret) AS min", "MAX(pret) AS max"],
      conditions: null,
    }).then((results) => results[0]);
  }

  /**
   * Selecteaza temele principale de cursuri
   *
   * @returns {array} themes
   */
  async fetchCourseThemes() {
    return this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT tema_principala"],
      conditions: null,
    });
  }

  /**
   * Functie asincrona care selecteaza locatiile de cursuri
   *
   * @returns {array} result
   */
  async fetchCourseLocations() {
    const locations = await this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT locatie"],
      conditions: null,
    });
    return locations.map((row) => ({
      value: row.locatie.charAt(0).toUpperCase() + row.locatie.slice(1),
      key: row.locatie,
    }));
  }

  /**
   * Selecteaza toate lunile de cursuri
   *
   * @return {array} result
   */
  async fetchCourseStartMonths() {
    const results = await this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT data_start"],
      conditions: null,
    });

    let months = results.map((row) => moment(row.data_start).format("MMMM"));
    months = [...new Set(months)]; // Ensure uniqueness

    return months.map((month) => ({
      value: month,
      key: moment(month, "MMMM").format("M"),
    }));
  }

  /**
   * Executa un query
   *
   * @param {string} query - query-ul de executat
   * @return {array} result
   */
  async executeQuery(query) {
    try {
      const results = await this.client.query(query);
      return results.rows;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }
}

const dbClient = new DatabaseClient();
const dbInstance = dbClient.getInstance();

module.exports = { dbInstance };
