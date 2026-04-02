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
    USDT_CONTRACT: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    USDT_CONTRACT_HEX: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c'
  },
  
  WALLET_ADDRESS: 'TXGCn6nh4Ar9gcJ2KEXHHLD3mUUX98UGGZ'
};
