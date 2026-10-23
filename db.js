require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

// Pass a custom fetch configuration to increase the network timeout threshold
const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    timeout: 30000 // Increases the threshold to 30 seconds to bypass router delays
  }
});

const pool = {
  query: async (text, params) => {
    const rows = await sql.query(text, params);
    return {
      rows: rows,
      rowCount: rows.length
    };
  }
};

module.exports = pool;
