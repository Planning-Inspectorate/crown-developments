interface Config {
    logLevel: string;
    NODE_ENV: string;
    httpPort: number;
    srcDir: string;
    session: {
        redis: string;
        secret: string;
    }
    staticDir: string;
}