import { Client } from 'pg'; 

const client = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: process.env.DB_PASSWORD,
    port: 5432,
});
client.connect();

async function refreshViews() {

    await client.query('REFRESH MATERIALIZED VIEW klines_1m');
    await client.query('REFRESH MATERIALIZED VIEW klines_1h');
    await client.query('REFRESH MATERIALIZED VIEW klines_1w');

}

refreshViews().catch(console.error);

setInterval(() => {
    refreshViews()
}, 1000 * 10 );
