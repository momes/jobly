"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title
        FROM jobs
        WHERE company_handle=$1 AND title=$2`,
      [companyHandle, title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

    const result = await db.query(
      `INSERT INTO jobs(
          title,
          salary,
          equity,
          company_handle
          )
      VALUES
      ($1, $2, $3, $4)
      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [
        title,
        salary,
        equity,
        companyHandle
      ],
    );
    
    const job = result.rows[0];
    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT title,
          salary,
          equity,
          company_handle AS "companyHandle"
        FROM jobs
        ORDER BY company_handle`);

    return jobsRes.rows;
  }

  /** Given a company handle, return all jobs with that company.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if none found.
   **/

  static async getJobsOfCompany(handle) {
    const jobsRes = await db.query(
      `SELECT 
        id,
        title,
        salary,
        equity
      FROM jobs
      WHERE company_handle=$1
      ORDER BY title`,
      [handle]);

    const jobs = jobsRes.rows;

    if (jobs.length === 0) throw new NotFoundError(`No jobs at: ${handle}`);
    
    return jobs;
  }

  /** Given job id, return job.
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if none found.
   **/

   static async get(id) {
    const result = await db.query(
      `SELECT title,
        salary,
        equity,
        company_handle AS "companyHandle"
      FROM jobs
      WHERE id=$1`,
      [id]);

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No jobs with ID: ${id}`);
    
    return job;
  }

  /** Update job listing with id and `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    if (data.id !== undefined) {
      throw new BadRequestError('You cannot change the ID of a job.')
    }

    if (data.companyHandle !== undefined) {
      throw new BadRequestError('You cannot change the company of a job.')
    }
    
    //TO DO don't need company handle here
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        companyHandle: "company_handle"
      });

    const IdVarIdx = "$" + (values.length + 1);
    
    const querySql = `
      UPDATE jobs
      SET ${setCols}
        WHERE id = ${IdVarIdx}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with ID: ${id}`);
    return job;
    
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]);
    const job = result.rows[0];
    

    if (!job) throw new NotFoundError(`No job with ID: ${id}`);
    return job;
  }

  /** Filter search all jobs.
   *  Filter params include any or all of { title, minSalary, hasEquity }
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */
  
  static async filter(searchParams) {
    const { querySql, searchValues } = Job._sqlForFilterSearchJobs(searchParams);

    const jobsRes = await db.query(querySql, searchValues);

    // if jobsRes.rows is and empty array [], check the length
    if (jobsRes.rows.length === 0) throw new NotFoundError(`No jobs found with search criteria: ${searchParams}`);

    return jobsRes.rows;
  }


  /**Takes a searchData obj with any/all of { title, minSalary, hasEquity }
   * returns an { querySql, searchValues}
   * 
   * Takes: 
   * {
   * title: 'dev',
   * minSalary: 50000,  
   * hasEquity: true, 
   * }
   * 
   * Returns
   * { querySql:
   * `
        SELECT 
          id,
          title,
          salary,
          equity AS "numEmployees",
          company_handle AS "companyHandle",
          c.name As "companyName"
        FROM jobs
        JOIN companies AS c on company_handle=c.handle
        WHERE title ILIKE $1 AND salary >= $2 AND hasEquity > 0
        ORDER BY c.name`,
  
        searchValues:
        ['%dev%', 50000, true]
   }
   */

  static _sqlForFilterSearchJobs(searchData) {
    //should catch this in jobs route, just an extra step here
    const keys = Object.keys(searchData);
    if (keys.length === 0) throw new BadRequestError("No data");

    let whereQueries = [];
    let searchValues = [];
    let idx = 1;
    for (let key in searchData) {
      if (key === 'title') {
        whereQueries.push(`title ILIKE $${idx}`);
        searchValues.push(`%${searchData[key]}%`);
      }
      else if (key === 'minSalary') {
        whereQueries.push(`salary >= $${idx}`);
        searchValues.push(+searchData[key]);
      }
      else if (key === 'hasEquity') {
        if (searchData['hasEquity'] === 'true') {
          whereQueries.push(`equity > $${idx}`);
          searchValues.push(0);
        }
      }
      else {
        throw new BadRequestError(`Bad Key: ${key}`);
      }
      idx++;
    }

    const querySql = `
      SELECT 
        id,
        title,
        salary,
        equity,
        company_handle AS "companyHandle",
        c.name As "companyName"
      FROM jobs
      JOIN companies AS c on company_handle=c.handle
      WHERE ${whereQueries.join(' AND ')}
      ORDER BY c.name`;

    return { querySql, searchValues };
  }
  
}


module.exports = Job;
