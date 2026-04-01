declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    MONGO_DB: string;

    EMAIL_USER: string;
    EMAIL_PASS: string;

    TRON_API_KEY: string;

    NODE_ENV: "development" | "production" | "test";
  }
}
