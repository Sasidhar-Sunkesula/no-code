import prisma from '@repo/db/client';
import { clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { getDateTenYearsFromNow } from '../utils';
import { getUserWithSubscription } from '../services/subscriptionService';

export async function ensureUserExists(req: Request, res: Response, next: NextFunction) {
    // Get the `userId` from the `Auth` object
    const userId = req.auth.userId;

    if (!userId) {
        res.status(401).json({ msg: 'Unauthorized' });
        return;
    }

    try {
        // Check if user exists in your DB
        const userWithSubscription = await getUserWithSubscription(userId);

        // If user doesn't exist, get user data from Clerk and create in your DB
        if (!userWithSubscription) {
            // You can get user info from Clerk using their SDK
            const clerkUser = await clerkClient.users.getUser(userId);
            const newUser = await prisma.user.create({
                data: {
                    id: userId,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    username: clerkUser.username || clerkUser.emailAddresses[0].emailAddress.split('@')[0],
                    profilePicture: clerkUser.imageUrl,
                    Subscription: {
                        create: {
                            // create a free subscription for new users with an end date of 10 years
                            planType: 'free',
                            status: 'active',
                            endDate: getDateTenYearsFromNow()
                        }
                    },
                },
                include: {
                    Subscription: {
                        include: {
                            plan: true
                        }
                    }
                }
            });
            // Add plan info to request for later use
            const subscription = newUser.Subscription[0];
            req.plan = {
                dailyTokenLimit: subscription.plan.dailyTokenLimit,
                monthlyTokenLimit: subscription.plan.monthlyTokenLimit,
                dailyTokensUsed: subscription.dailyTokensUsed,
                monthlyTokensUsed: subscription.monthlyTokensUsed
            }
        }
        next();
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        res.status(500).json({ error: 'Server error' });
        return;
    }
}
