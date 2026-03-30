import globals from "globals";

export default [
    {
        files: ["**/*.js", "**/*.user.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script", // UserScripts are typically scripts, not modules
            globals: {
                ...globals.browser,
                ...globals.greasemonkey, // Includes GM_* variables
                GM_info: "readonly",
                $: "readonly", // jQuery if used
            },
        },
        rules: {
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-undef": "error",
            "semi": ["warn", "always"],
            "no-redeclare": "error",
        },
        ignores: [
            "**/node_modules/**",
            "**/*.min.js",
            "**/samples/**", // Ignore sample files
            "**/obsoleted/**", // Ignore obsoleted scripts
        ]
    }
];
