/** @type {import('prettier').Config} **/
const config = {
    quoteProps: 'consistent',
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
    tabWidth: 4,
    semi: true,
    useTabs: false,
    bracketSpacing: true,
    endOfLine: 'lf',
    overrides: [
        {
            files: ['*.vue', '*.scss', '*.sass', '*.less', '*.yaml', '*.yml', '*.json'],
            options: { tabWidth: 2 },
        },
    ],
};

export default config;
