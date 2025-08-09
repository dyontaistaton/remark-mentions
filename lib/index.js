/**
 * @typedef {import('mdast').Root} Root
 *
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 *
 * @typedef {import('mdast-util-find-and-replace').ReplaceFunction} ReplaceFunction
 *
 * @typedef Options
 *  Configuration
 * @property {(username: string) => string} usernameLink
 */

import {findAndReplace} from 'mdast-util-find-and-replace';
const globalIdRegex = '[\\da-z][-\\da-z_=]{0,38}';
const userMentionSymbol = '@';
const inboxMentionSymbol = '#';

const buildRegex = (symbol) =>
	new RegExp(`\\${symbol}:(${globalIdRegex}):`, 'gi');

const mentionTypes = {
	author: buildRegex(userMentionSymbol),
	agent: buildRegex(userMentionSymbol),
	inbox: buildRegex(inboxMentionSymbol),
};

/**
 *
 * @type {import("unified").Plugin<[Options?]|void[], Root>}
 */
export default function remarkMentions(
	opts = {usernameLink: (/** @type {string} */ username) => `/${username}`}
) {
	// @ts-ignore
	return (tree, _file) => {
		findAndReplace(
			tree,
			Object.entries(mentionTypes).map(([key, value]) => [
				value,
				(value, globalId) => replaceMention(value, globalId, key),
			])
		);
	};

	/**
	 * @type {ReplaceFunction}
	 * @param {string} value
	 * @param {string} globalId
	 * @param {string} contentTypeName
	 */
	function replaceMention(value, globalId, contentTypeName) {
		/** @type {PhrasingContent[]} */
		let whitespace = [];

		// Separate leading white space
		if (value.indexOf('@') > 0) {
			whitespace.push({
				type: 'text',
				value: value.substring(0, value.indexOf('@')),
			});
		}

		return [
			...whitespace,
			{
				type: 'html',
				value: `<Mention id="${globalId}" :contentTypeName="${contentTypeName}"></Mention>`,
			},
		];
	}
}
