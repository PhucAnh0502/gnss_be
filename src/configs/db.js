import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
    throw new Error('Missing SUPABASE_CONNECTION_STRING in environment variables.');
}

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        prepareThreshold: 0
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
})

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('[DATABASE] Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('[DATABASE] Unable to connect to the database:', error);

        if (error?.original?.code === 'ENOTFOUND') {
            console.error('[DATABASE] Database hostname could not be resolved. Please verify SUPABASE_CONNECTION_STRING in .env and ensure your DNS/network is working.');
        }

        return false;
    }
}

export default sequelize;