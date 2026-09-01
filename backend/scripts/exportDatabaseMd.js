const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'raz_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function main() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    let md = `# Database Tables & Data: \`${process.env.DB_NAME || 'raz_ai'}\`\n\n`;
    md += `> Generated on: ${new Date().toLocaleString()}\n\n`;

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      md += `## Table: \`${tableName}\`\n\n`;

      // Columns
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      md += `### Schema\n\n`;
      md += `| Column | Data Type | Nullable |\n| --- | --- | --- |\n`;
      for (const col of colsRes.rows) {
        md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} |\n`;
      }
      md += `\n`;

      // Data
      const countRes = await client.query(`SELECT count(*) FROM "${tableName}";`);
      const totalCount = countRes.rows[0].count;
      const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 25;`);

      md += `### Data Preview (Showing ${dataRes.rows.length} of ${totalCount} rows)\n\n`;
      if (dataRes.rows.length === 0) {
        md += `*Table is currently empty.*\n\n`;
      } else {
        const headers = Object.keys(dataRes.rows[0]);
        md += `| ${headers.join(' | ')} |\n`;
        md += `| ${headers.map(() => '---').join(' | ')} |\n`;
        for (const r of dataRes.rows) {
          const vals = headers.map(h => {
            let val = r[h];
            if (val === null || val === undefined) return '*NULL*';
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object') return JSON.stringify(val).replace(/\|/g, '\\|');
            return String(val).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
          });
          md += `| ${vals.join(' | ')} |\n`;
        }
        md += `\n`;
      }
      md += `---\n\n`;
    }

    const outputPath = path.join(__dirname, '..', '..', 'database.md');
    fs.writeFileSync(outputPath, md);
    console.log(`database.md created successfully at ${outputPath}`);
  } catch (err) {
    console.error('Error generating database.md:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
