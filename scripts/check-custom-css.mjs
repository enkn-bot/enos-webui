#!/usr/bin/env node
/**
 * Validates custom.css does not contain @font-face declarations.
 * Fonts are owned by anthropic-fonts.css (bundled in the build).
 * @font-face in custom.css causes stale-path regressions because it
 * deploys separately from the build and overrides the working declarations.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'static/static/custom.css'), 'utf8');

// Strip block and line comments before checking, so the explanatory comment
// at the top of custom.css does not trigger a false positive.
const stripped = css
	.replace(/\/\*[\s\S]*?\*\//g, '')
	.replace(/\/\/.*/g, '');

if (/@font-face\s*\{/i.test(stripped)) {
	console.error(
		'custom.css contains @font-face — move font declarations to src/anthropic-fonts.css instead.'
	);
	process.exit(1);
}

console.log('custom.css OK — no @font-face declarations.');
