import type { INotificationDesktop } from '@rocket.chat/core-typings';
import type { ActivityNotification } from '../hooks/useActivityNotifications';

const STORAGE_KEY = 'activity-center-notifications-v1';
const MAX_ITEMS = 300;

type NotificationEventDetail = {
	notification?: INotificationDesktop;
	fromOpenedRoom?: boolean;
	hasFocus?: boolean;
};

// Module-level state
let notifications: ActivityNotification[] = [];
let listeners: Set<(notifications: ActivityNotification[]) => void> = new Set();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripLeadingSenderPrefix = (text: string, sender?: { username?: string; name?: string }): string => {
	if (!text) {
		return text;
	}

	const prefixes = [sender?.name, sender?.username].filter((value): value is string => Boolean(value));
	for (const prefix of prefixes) {
		const matcher = new RegExp(`^${escapeRegExp(prefix)}:\\s*`, 'i');
		if (matcher.test(text)) {
			return text.replace(matcher, '');
		}
	}

	return text;
};

const loadStoredNotifications = (): ActivityNotification[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw) as ActivityNotification[];
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.map((item) => ({
			...item,
			text: stripLeadingSenderPrefix(item.text, item.sender),
			seen: item.seen ?? false,
		}));
	} catch {
		return [];
	}
};

const saveNotifications = (data: ActivityNotification[]): void => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Ignore storage failures (private mode, quota, etc.)
	}
};

const notifyListeners = (): void => {
	listeners.forEach((listener) => listener([...notifications]));
};

const onNotificationEvent = (event: Event): void => {
	const detail = (event as CustomEvent<NotificationEventDetail>).detail;
	const notification = detail?.notification;

	if (!notification?.payload?._id || !notification.payload.rid || !notification.payload.type || !notification.payload.name) {
		return;
	}

	const sender = {
		username: notification.payload.sender?.username,
		name: notification.payload.sender?.name,
	};

	const item: ActivityNotification = {
		id: `${notification.payload._id}-${Date.now()}`,
		messageId: notification.payload._id,
		rid: notification.payload.rid,
		roomName: notification.payload.name,
		roomType: notification.payload.type,
		sender,
		text: stripLeadingSenderPrefix(notification.payload.message?.msg || notification.text, sender),
		title: notification.title,
		notificationText: notification.text,
		receivedAt: new Date().toISOString(),
		seen: false,
	};

	// Deduplicate by messageId and add to front
	notifications = notifications.filter((existing) => existing.messageId !== item.messageId);
	notifications = [item, ...notifications].slice(0, MAX_ITEMS);

	// Persist to storage
	saveNotifications(notifications);

	// Notify all listeners
	notifyListeners();
};

let initialized = false;

export const initializeNotificationService = (): void => {
	if (initialized) return;

	// Load initial notifications from localStorage
	notifications = loadStoredNotifications();

	// Set up global listener
	window.addEventListener('notification', onNotificationEvent as EventListener);

	initialized = true;
};

export const subscribeToNotifications = (listener: (notifications: ActivityNotification[]) => void): (() => void) => {
	listeners.add(listener);

	// Notify immediately with current state
	listener([...notifications]);

	// Return unsubscribe function
	return () => {
		listeners.delete(listener);
	};
};

export const getNotifications = (): ActivityNotification[] => {
	return [...notifications];
};

export const clearNotificationOne = (id: string): void => {
	notifications = notifications.filter((item) => item.id !== id);
	saveNotifications(notifications);
	notifyListeners();
};

export const clearAllNotifications = (): void => {
	notifications = [];
	saveNotifications(notifications);
	notifyListeners();
};

export const markNotificationAsSeen = (id: string): void => {
	notifications = notifications.map((item) => (item.id === id ? { ...item, seen: true } : item));
	saveNotifications(notifications);
	notifyListeners();
};

export const markAllNotificationsAsSeen = (): void => {
	notifications = notifications.map((item) => ({ ...item, seen: true }));
	saveNotifications(notifications);
	notifyListeners();
};

export const getUnreadNotificationCount = (): number => {
	return notifications.filter((item) => !item.seen).length;
};
