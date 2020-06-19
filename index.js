require('@babel/register')({});

const bootstrap = require('./src').default;

bootstrap({}, { verbose: 1 });
