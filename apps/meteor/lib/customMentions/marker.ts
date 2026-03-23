import { escapeRegExp } from '@rocket.chat/string-helpers';

export const EXPLICIT_CUSTOM_MENTION_GROUP_MARKER = '\u2063';

export const getExplicitlySelectedCustomMentionGroupNames = (text: string): string[] => {
	if (!text) {
		return [];
	}

	const markerPattern = new RegExp(`@([a-zA-Z0-9.]+)${escapeRegExp(EXPLICIT_CUSTOM_MENTION_GROUP_MARKER)}`, 'g');

	return [...text.matchAll(markerPattern)].map((match) => match[1]);
};

export const stripExplicitCustomMentionGroupMarkers = (text: string): string =>
	text.replace(new RegExp(escapeRegExp(EXPLICIT_CUSTOM_MENTION_GROUP_MARKER), 'g'), '');
