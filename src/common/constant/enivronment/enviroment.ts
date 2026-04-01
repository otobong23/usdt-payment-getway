import * as dotenv from 'dotenv';
dotenv.config();
export const ENVIRONMENT = {
  MAIL: {
    SMTP_USER: process.env.EMAIL_USER,
    AUTH_PASS: process.env.EMAIL_PASS,
  },

  CONNECTION: {
    PORT: process.env.PORT,
    MONGO_DB: process.env.MONGO_DB,
  },

  OWNER: {
    OWNER_EMAIL: process.env.EMAIL_USER,
  },

  TRON: {
    API_KEY: process.env.TRON_API_KEY,
  }
};
