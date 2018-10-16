const fs = require('fs');
const path = require('path');

function capitalize(text) {
    return text.substr(0, 1).toUpperCase() + text.substr(1);
}

module.exports = function loader(source) {
    const str = 'exports.locals =';
    const locals = JSON.parse(source.substring(source.indexOf(str) + str.length, source.length - 1));
    const name = path.basename(this.resource, '.scss');

    var jsonFileName = path.resolve(__dirname, '../server/elements/' + name + '.scss.cs');
    fs.writeFileSync(jsonFileName, `
    using System;
    using System.Collections;

    namespace Elements.Css
    {
        public partial class CssModules
        {
            public static readonly Hashtable ${name.split('-').map(capitalize).join('')}  = new Hashtable { 
                ${Object.keys(locals).map(key => `{"${key}", "${locals[key]}"} `).join(',')}
            };
        }
    }
    `);

    return source;
}