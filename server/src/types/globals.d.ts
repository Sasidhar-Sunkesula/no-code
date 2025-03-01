/// <reference types="@clerk/express/env" />

declare namespace Express {
    interface Request {
        plan?: {
            dailyTokenLimit: number;
            monthlyTokenLimit: number;
            dailyTokensUsed: number;
            monthlyTokensUsed: number;
        }
    }
}