/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 * @typedef Options
 *  Configuration
 * @property {(username: string) => string} usernameLink
 */

import {visit} from 'unist-util-visit';

// Single precompiled regex (case-insensitive kept to preserve original behavior)
// Matches @:id: or #:id: where id follows the original constraints
const mentionPattern = /([@#⚲]):([\da-zA-Z][-\da-zA-Z_=]{0,38}):/gi;

/**
 * remark plugin to turn @:globalId: / #:globalId: into a mention node
 *
 * Performance optimizations implemented:
 * 1. Single regex scan instead of multiple regex passes.
 * 2. Manual single traversal over text nodes (no generic find-and-replace overhead).
 * 3. Quick pre-check to skip most nodes fast.
 * 4. Structured mdast nodes with hName/hProperties (avoid string HTML concatenation until later).
 * 5. Avoid intermediate substring/indexOf whitespace handling by assembling segments during regex iteration.
 *
 * @returns {(tree: Root) => void}
 */
export default function remarkMentions() {
	return function transformer(tree) {
		visit(
			tree,
			'text',
			(
				/** @type {import('mdast').Text} */ node,
				/** @type {number} */ index,
				/** @type {import('unist').Parent} */ parent
			) => {
				if (!parent || typeof node.value !== 'string') return;
				const value = node.value;

				if (!value.includes(':')) return; // cheapest first
				if (value.indexOf('@:') === -1 && value.indexOf('#:') === -1) return;

				mentionPattern.lastIndex = 0;
				/** @type {PhrasingContent[]} */
				const out = [];
				let last = 0;
				/** @type {RegExpExecArray|null} */
				let match;
				while ((match = mentionPattern.exec(value))) {
					const matchIndex = match.index;
					if (matchIndex > last) {
						out.push({type: 'text', value: value.slice(last, matchIndex)});
					}
					const symbol = match[1];
					const globalId = match[2];
					const contentTypeName = symbol === '#' ? 'inbox' : 'author';

					out.push({
						type: 'mention',
						data: {
							hName: 'Mention',
							hProperties: {id: globalId, contentTypeName},
							value: match[0],
						},
					});
					last = mentionPattern.lastIndex;
				}
				if (out.length === 0) return; // no matches
				if (last < value.length) {
					out.push({type: 'text', value: value.slice(last)});
				}

				if (out.length > 1 || (out.length === 1 && out[0].type === 'mention')) {
					parent.children.splice(index, 1, ...out);
					return index + out.length;
				}
			}
		);
	};
}
