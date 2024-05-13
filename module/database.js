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
   * Database client getter
   *
   * @returns {Client}
   */
  getClient() {
    return this.client;
  }

  /**
   *
   * Database query instance getter
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
   *
   * @param {array[]} params
   * @param {*} callback
   */
  select(params, callback) {
    const { tableName, fields, conditions } = params;
    const query = `SELECT ${fields.join(", ")} FROM ${tableName} WHERE ${
      conditions.length ? conditions.join(" AND ") : "true"
    }`;

    this.client.query(query, (err, res) => {
      callback(err, res ? res.rows : null);
    });
  }

  async selectAsync(params) {
    const { tableName, fields, conditions } = params;
    const query = `SELECT ${fields.join(", ")} FROM ${tableName} WHERE ${
      conditions.length ? conditions.join(" AND ") : "true"
    }`;

    try {
      const res = await this.client.query(query);
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  update(params, callback) {
    const { tableName, fields, values, conditions } = params;
    const setClause = fields
      .map((field, i) => `${field} = '${values[i]}'`)
      .join(", ");
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${
      conditions.length ? conditions.join(" AND ") : "true"
    }`;

    this.client.query(query, (err, res) => {
      callback(err, res);
    });
  }

  insert(params, callback) {
    const { tableName, fields, values } = params;
    const query = `INSERT INTO ${tableName} (${fields.join(
      ", "
    )}) VALUES (${values.map((value) => `'${value}'`).join(", ")})`;

    this.client.query(query, (err, res) => {
      callback(err, res);
    });
  }

  deleteRecord(params, callback) {
    const { tableName, conditions } = params;
    const query = `DELETE FROM ${tableName} WHERE ${
      conditions.length ? conditions.join(" AND ") : "true"
    }`;

    this.client.query(query, (err, res) => {
      callback(err, res);
    });
  }

  async fetchCourses(filters = {}) {
    let conditions = ["true"]; // Always true, to concatenate conditions safely

    if (filters.filter_id) {
      conditions.push(`id = ${parseInt(filters.filter_id)}`);
    }
    if (filters.filter_category) {
      conditions.push(`categorie = '${filters.filter_category}'`);
    }

    return await this.selectAsync({
      tableName: "cursuri",
      fields: ["*"],
      conditions: conditions,
    });
  }

  async fetchCourseCategories() {
    const query = "SELECT DISTINCT categorie FROM cursuri";
    try {
      const results = await this.client.query(query);
      return results.rows.map((row) => {
        return { key: row.categorie, value: categoryNameByKey(row.categorie) };
      });
    } catch (error) {
      console.error("Error executing query:", query, error);
      throw error; // Ensure the error is thrown after logging it
    }
  }

  async fetchPriceRange() {
    return this.selectAsync({
      tableName: "cursuri",
      fields: ["MIN(pret) AS min", "MAX(pret) AS max"],
      conditions: [],
    }).then((results) => results[0]);
  }

  async fetchCourseThemes() {
    return this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT tema_principala"],
      conditions: [],
    });
  }

  async fetchCourseLocations() {
    const locations = await this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT locatie"],
      conditions: [],
    });
    return locations.map((row) => ({
      value: row.locatie.charAt(0).toUpperCase() + row.locatie.slice(1),
      key: row.locatie,
    }));
  }

  async fetchCourseStartMonths() {
    const results = await this.selectAsync({
      tableName: "cursuri",
      fields: ["DISTINCT data_start"],
      conditions: [],
    });

    let months = results.map((row) => moment(row.data_start).format("MMMM"));
    months = [...new Set(months)]; // Ensure uniqueness

    return months.map((month) => ({
      value: month,
      key: moment(month, "MMMM").format("M"),
    }));
  }

  // Method to add query functions
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
