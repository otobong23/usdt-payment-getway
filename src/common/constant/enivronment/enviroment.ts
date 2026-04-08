import * as dotenv from 'dotenv';
dotenv.config();
export const ENVIRONMENT = {
  // MAIL: {
  //   SMTP_USER: process.env.EMAIL_USER,
  //   AUTH_PASS: process.env.EMAIL_PASS,
  // },

  // OWNER: {
  //   OWNER_EMAIL: process.env.EMAIL_USER,
  // },

  CONNECTION: {
    PORT: process.env.PORT || 8080,
    MONGO_DB: process.env.MONGO_DB,
  },

  TRON: {
    API_KEY: process.env.TRON_API_KEY,
    USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    USDT_CONTRACT_HEX: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c'
  },
  
  WALLET_ADDRESS: {
    USDT_TRC20: 'TXGCn6nh4Ar9gcJ2KEXHHLD3mUUX98UGGZ',
    USDT_BEP20: '0x5236b9c8642d640f2847e71d177ae231f8ec8762'
  },

  WEBHOOK: {
    URL: process.env.WEBHOOK_URL,
    SECRET: process.env.WEBHOOK_SECRET
  },

  NODE_ENV: process.env.NODE_ENV || 'development'
};
