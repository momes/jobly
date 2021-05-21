"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
        `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
        `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
        `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /** Filter search all companies.
   *  Filter params include any or all of { minEmployees, maxEmployees, nameLike }
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */
   static async filter(searchParams) {
    const { minEmployees, maxEmployees, nameLike } = searchParams;
  
    //throw 400 Error if minEmployees param is greater than maxEmployees
    if (minEmployees && maxEmployees && maxEmployees < minEmployees) {
      throw new BadRequestError("maxEmployees search parameter must be greater than minEmployees")
    }
    
    const { querySql, searchValues } = Company._sqlForFilterSearchCompanies(searchParams);

    const companiesRes = await db.query(querySql, searchValues);

    // if companiesRes.rows is and empty array [], check the length
    if (companiesRes.rows.length === 0) throw new NotFoundError(`No companies found with search criteria: ${searchParams}`);

    return companiesRes.rows;
  }


/**Takes a searchData obj with any/all of { minEmployees, maxEmployees, nameLike }
 * returns an { querySql, searchValues}
 * 
 * Takes: 
 * {
 * nameLike: 'net',
 * maxEmployees: 100,  
 * minEmployees: 5, 
 * }
 * 
 * Returns
 * { querySql:
 * `
      SELECT 
        handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
      FROM companies
      WHERE name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3
      ORDER BY name`,

      searchValues:
      ['%net%', 5, 100]
 }
 */

  static _sqlForFilterSearchCompanies(searchData) {
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

  const querySql = `
      SELECT 
        handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
      FROM companies
      WHERE ${whereQueries.join(' AND ')}
      ORDER BY name`;

  return { querySql, searchValues };
}
}


module.exports = Company;
