const { Client } = require("pg");
const { categoryNameByKey } = require("./functions");

class DatabaseClient {
  constructor() {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = this;
      this.client = new Client({
        database: "InvatWeb_Local",
        user: "vsc_user",
        password: "vscpa55",
        host: "localhost",
        port: 5432,
      });
      this.client.connect();
    }
    return DatabaseClient.instance;
  }

  async fetchCourses(filters = {}) {
    let query = "SELECT * FROM cursuri WHERE true";

    if (filters["filter_id"])
      query += ` AND id = ${parseInt(filters["filter_id"])}`;

    if (filters["filter_category"])
      query += ` AND categorie = '${filters["filter_category"]}'`;

    try {
      const results = await this.client.query(query);
      return results.rows;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }

  async fetchCourseCategories() {
    let query = "SELECT DISTINCT categorie FROM cursuri";
    try {
      const results = await this.client.query(query);
      return results.rows.map((row) => {
        return { key: row.categorie, value: categoryNameByKey(row.categorie) };
      });
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }

  async fetchPriceRange() {
    let query = "SELECT min(pret) as min, max(pret) as max FROM cursuri";
    try {
      const results = await this.client.query(query);
      return results.rows[0];
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
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
Object.freeze(dbClient);

module.exports = { dbClient };
