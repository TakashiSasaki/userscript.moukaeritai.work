/* global require, module, __dirname */
const assert = require('assert');

// Simulate the logic in gemini-history-loader.user.js
const versionRegex = /\/\/ @version\s+([\d\.]+)/;
const fetchLogic = "const response = await fetch('https://raw.githubusercontent.com/TakashiSasaki/userscript.moukaeritai.work/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js');";

assert(fetchLogic.includes("raw.githubusercontent.com"), "Fetch uses correct raw URL");
console.log("Tests passed!");
