
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolving .env from project root
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: envPath });

const logFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migration_output.log');
const log = (msg) => {
    const message = `[${new Date().toISOString()}] ${msg}`;
    console.log(message);
    fs.appendFileSync(logFile, message + '\n');
};

log(`Loading .env from: ${envPath}`);

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ponghospital',
    port: process.env.DB_PORT || 3306,
};

log(`DB Config: Host=${dbConfig.host}, User=${dbConfig.user}, DB=${dbConfig.database}`);

async function migrate() {
    let connection;
    try {
        log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        log('Connected successfully.');

        // Check if image_path column exists in pr_posters
        const [columns] = await connection.execute(`SHOW COLUMNS FROM pr_posters LIKE 'image_path'`);

        if (columns.length === 0) {
            log('Adding image_path column...');
            await connection.execute(`ALTER TABLE pr_posters ADD COLUMN image_path VARCHAR(512) NULL AFTER title`);
            log('image_path column added.');
        } else {
            log('image_path column already exists: ' + JSON.stringify(columns));
        }

        // Modify image_data to be nullable
        log('Modifying image_data to be NULLABLE...');
        await connection.execute(`ALTER TABLE pr_posters MODIFY COLUMN image_data LONGBLOB NULL`);
        log('image_data modified.');

        log('Migration complete.');
    } catch (error) {
        log('Migration failed: ' + error.message);
        console.error(error);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

migrate();
