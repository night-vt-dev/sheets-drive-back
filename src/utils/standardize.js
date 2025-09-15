
exports.standardize = (row = {}) => {
    let standard = {};
    row.keys().forEach(element => {
        standard[element] = row[element][0];
    });
    return standard;
}

exports.foldValues = (row = {}) => {
    let result = [];
    for(col in row) {
        result.push([col]);
    }
    return result;
}