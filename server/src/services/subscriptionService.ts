import prisma from "@repo/db/client";
import { PlanInfo } from "../utils";

export async function getUserWithSubscription(userId: string) {
    const userWithSubscription = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            Subscription: {
                where: {
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() },
                    status: 'active',
                },
                include: {
                    plan: true
                },
            }
        }
    });

    return userWithSubscription;
}
interface CheckLimitsResult {
    success: boolean;
    message?: string;
}

export function checkLimits(plan: PlanInfo): CheckLimitsResult {
    const { dailyTokensUsed, monthlyTokensUsed, dailyTokenLimit, monthlyTokenLimit } = plan;

    if (dailyTokensUsed >= dailyTokenLimit) {
        return {
            success: false,
            message: "You have reached your daily token limit",
        };
    } else if (monthlyTokensUsed >= monthlyTokenLimit) {
        return {
            success: false,
            message: "You have reached your monthly token limit",
        };
    } else {
        return {
            success: true,
        };
    }
}
