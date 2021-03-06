const rsAstralRange = '\\ud800-\\udfff';
const rsComboMarksRange = '\\u0300-\\u036f';
const reComboHalfMarksRange = '\\ufe20-\\ufe2f';
const rsComboSymbolsRange = '\\u20d0-\\u20ff';
const rsComboMarksExtendedRange = '\\u1ab0-\\u1aff';
const rsComboMarksSupplementRange = '\\u1dc0-\\u1dff';
const rsComboRange =
	rsComboMarksRange +
	reComboHalfMarksRange +
	rsComboSymbolsRange +
	rsComboMarksExtendedRange +
	rsComboMarksSupplementRange;
const rsVarRange = '\\ufe0e\\ufe0f';
const rsAstral = `[${rsAstralRange}]`;
const rsCombo = `[${rsComboRange}]`;
const rsFitz = '\\ud83c[\\udffb-\\udfff]';
const rsModifier = `(?:${rsCombo}|${rsFitz})`;
const rsNonAstral = `[^${rsAstralRange}]`;
const rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
const rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
const rsZWJ = '\\u200d';
const reOptMod = `${rsModifier}?`;
const rsOptVar = `[${rsVarRange}]?`;
const rsOptJoin = `(?:${rsZWJ}(?:${[rsNonAstral, rsRegional, rsSurrPair].join(
	'|'
)})${rsOptVar + reOptMod})*`;
const rsSeq = rsOptVar + reOptMod + rsOptJoin;
const rsNonAstralCombo = `${rsNonAstral}${rsCombo}?`;
const rsSymbol = `(?:${[
	rsNonAstralCombo,
	rsCombo,
	rsRegional,
	rsSurrPair,
	rsAstral,
].join('|')})`;

const fs = require('fs');
const path = require('path');

/* eslint-disable no-misleading-character-class */
const reHasUnicode = RegExp(
	`[${rsZWJ + rsAstralRange + rsComboRange + rsVarRange}]`
);
const reUnicode = RegExp(`${rsFitz}(?=${rsFitz})|${rsSymbol + rsSeq}`, 'g');
/* eslint-enable no-misleading-character-class */

const hasUnicode = (str) => reHasUnicode.test(str);
const unicodeToArray = (str) => str.match(reUnicode) || [];
const asciiToArray = (str) => str.split('');
const stringToArray = (str) =>
	hasUnicode(str) ? unicodeToArray(str) : asciiToArray(str);

function compareWildcars(text, rule) {
	const escapeRegex = (str) => str.replace(/([.*+^=!:${}()|[\]/\\])/g, '\\$1');
	const regexRule = `^${rule.split('*').map(escapeRegex).join('.*')}$`.replace(
		/\?/g,
		'.'
	);
	return new RegExp(regexRule).test(text);
}

function loadEnvFromJson(preffix, json = {}) {
	const keys = Object.keys(json);
	preffix = preffix ? `${preffix}_` : '';
	for (let i = 0; i < keys.length; i += 1) {
		const key = `${preffix}${keys[i]}`;
		process.env[key] = json[keys[i]];
	}
}

function listFiles(folderPath, recursive = true) {
	if (fs.existsSync(folderPath)) {
		const all = fs.readdirSync(folderPath).map((x) => path.join(folderPath, x));
		const files = all.filter((x) => fs.statSync(x).isFile());
		if (recursive) {
			const dirs = all.filter((x) => !files.includes(x));
			const dirFiles = dirs.reduce(
				(prev, current) => prev.concat(listFiles(current)),
				[]
			);
			return [...files, ...dirFiles];
		}
		return files;
	}
	return [];
}

function getAbsolutePath(relative) {
	if (path.isAbsolute(relative)) {
		return relative;
	}
	return path.normalize(path.join(process.cwd(), relative));
}

function listFilesAbsolute(folderPath, recursive = true) {
	const files = listFiles(folderPath, recursive);
	return files.map((x) => getAbsolutePath(x));
}

function loadEnv(fileName = '.env') {
	const absolutePath = getAbsolutePath(fileName);
	if (fs.existsSync(absolutePath)) {
		const content = fs.readFileSync(absolutePath, 'utf8');
		const lines = content.split(/\n|\r|\r\n/);
		for (let i = 0; i < lines.length; i += 1) {
			const line = lines[i];
			const keyValueArr = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
			if (keyValueArr) {
				const key = keyValueArr[1];
				let val = keyValueArr[2] || '';
				const endVal = val.length - 1;
				const isDoubleQuoted = val[0] === '"' && val[endVal] === '"';
				const isSingleQuoted = val[0] === "'" && val[endVal] === "'";
				if (isSingleQuoted || isDoubleQuoted) {
					val = val.substring(1, endVal);
					if (isDoubleQuoted) {
						val = val.replace(/\\n/g, '\n');
					}
				} else {
					val = val.trim();
				}
				if (process.env[key] === undefined) {
					process.env[key] = val;
				}
			}
		}
	}
}

module.exports = {
	hasUnicode,
	unicodeToArray,
	asciiToArray,
	stringToArray,
	compareWildcars,
	getAbsolutePath,
	listFiles,
	listFilesAbsolute,
	loadEnv,
	loadEnvFromJson,
};
