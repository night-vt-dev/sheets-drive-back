
exports.standardize = (row = {}) => {
    let standard = {};
    row.keys().forEach(element => {
        standard[element] = row[element][0];
    });
    return standard;
}