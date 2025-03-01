import prisma from '@repo/db/client';
import { Request, Response, NextFunction } from 'express';
import { shouldResetDaily, shouldResetMonthly } from '../utils';
import { getUserWithSubscription } from '../services/subscriptionService';
// This should only be called after `ensureUserExists` middleware
export async function resetLimits(req: Request, res: Response, next: NextFunction) {
    if (!req.auth.userId) {
        res.status(401).json({ msg: 'Unauthorized' });
        return;
    }
    // Indicates that the user has created just now, we don't need to reset
    if (req.plan) {
        next();
        return;
    }

    try {
        const userWithSubscription = await getUserWithSubscription(req.auth.userId);
        // Happens if reset limits is called before ensureUserExists
        if (!userWithSubscription) {
            throw new Error("User not found");
        }
        const subscription = userWithSubscription.Subscription[0];
        // We ensure that a user contains a single active subscription
        // Check if token limits need to be reset
        const updates = {};
        // Check if daily reset is needed (if it's past midnight)
        if (shouldResetDaily(subscription.dailyTokensReset)) {
            (updates as any)['dailyTokensUsed'] = 0;
            (updates as any)['dailyTokensReset'] = new Date();
        }
        // Check if monthly reset is needed (if it's a new month)
        if (shouldResetMonthly(subscription.monthlyTokensReset)) {
            (updates as any)['monthlyTokensUsed'] = 0;
            (updates as any)['monthlyTokensReset'] = new Date();
        }
        // If updates are needed, apply them
        if (Object.keys(updates).length > 0) {
            const updatedSubscription = await prisma.subscription.update({
                where: {
                    id: subscription.id,
                    userId: req.auth.userId,
                },
                data: updates,
                include: {
                    plan: true
                }
            });
            req.plan = {
                dailyTokenLimit: updatedSubscription.plan.dailyTokenLimit,
                monthlyTokenLimit: updatedSubscription.plan.monthlyTokenLimit,
                dailyTokensUsed: updatedSubscription.dailyTokensUsed,
                monthlyTokensUsed: updatedSubscription.monthlyTokensUsed
            }
            next();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to reset limits",
        });
    }
}