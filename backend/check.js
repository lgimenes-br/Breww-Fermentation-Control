import mysql from 'mysql2/promise';
import 'dotenv/config';

async function check() {
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM batches');
        console.log("COLUMNS:");
        rows.forEach(r => console.log(r.Field));
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
}
check();
