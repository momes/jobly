const { BadRequestError } = require("../expressError");

/**SQL helper function for partial updates in database. takes 'dataToUpdate' (obj of Js keys and database values) 
 * and 'jsToSql' (obj of Js keys and corresponding sql column-name values)
 * Returns { setCols, values } where  setCols is a string of "col_name=$1, col2_name=$2" 
 * and values is an array of the dataToUpdate values
 * 
 * Takes: 
 * { 
 * firstName: "John",
 * lastName: "Doe",
 * email: "email@email.com",
 * },
 * {
 * firstName: 'first_name',
 * lastName: 'last_name',
 * isAdmin: 'is_admin',
 * });
 * 
 *   =>
 * 
 * Returns:
 * !!!!!put in double quotes for postgres to keep case sensitive
 * { setCols: 'first_name=$1, last_name=$2, email=$3',
 *  values: ['John', 'Doe', 'email@email.com'] }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}



/**Takes a searchData obj with any/all of { minEmployees, maxEmployees, nameLike }
 * returns { whereQuery, values }
 * 
 * Takes: 
 * {
 * nameLike: 'net',
 * maxEmployees: 100,  
 * minEmployees: 5, 
 * }
 * 
 * Returns:
 * {
 * whereQuery: "name ILIKE $1 AND num_employees <= $2 AND num_employees >= $3",
 * values: ['%net%', 100, 5]
 * }
 */

function sqlForFilterSearchCompanies(searchData) {
  //should catch this in companies route, just an extra step here
  const keys = Object.keys(searchData);
  if (keys.length === 0) throw new BadRequestError("No data");

  let whereQueries = [];
  let searchValues = [];
  let idx = 1;
  for (let key in searchData) {
    if (key === 'nameLike') {
      whereQueries.push(`name ILIKE $${idx}`);
      searchValues.push(`%${searchData[key]}%`);
    }
    else if (key === 'minEmployees') {
      whereQueries.push(`num_employees >= $${idx}`);
      searchValues.push(+searchData[key]);
    }
    else if (key === 'maxEmployees') {
      whereQueries.push(`num_employees <= $${idx}`);
      searchValues.push(+searchData[key]);
    }
    else {
      throw new BadRequestError(`Bad Key: ${key}`);
    }
    idx++;
  }

  return {
    whereQuery: whereQueries.join(" AND "),
    values: searchValues,
  };
}

module.exports = { sqlForPartialUpdate, sqlForFilterSearchCompanies };
