import { base44 } from './base44Client';


export const getAdminUsers = base44.functions.getAdminUsers;

export const updateUserSchedule = base44.functions.updateUserSchedule;

export const sendVerificationEmail = base44.functions.sendVerificationEmail;

export const createCheckout = base44.functions.createCheckout;

export const stripeWebhook = base44.functions.stripeWebhook;

export const createPortalSession = base44.functions.createPortalSession;

export const updateExercise = base44.functions.updateExercise;

export const syncExercisesToSchedules = base44.functions.syncExercisesToSchedules;

export const updateUserSubscription = base44.functions.updateUserSubscription;

export const checkAndAwardAchievements = base44.functions.checkAndAwardAchievements;

export const sendBuddyInvite = base44.functions.sendBuddyInvite;

export const acceptBuddyInvite = base44.functions.acceptBuddyInvite;

export const sendEmail = base44.functions.sendEmail;

export const applyBuddyPromo = base44.functions.applyBuddyPromo;

