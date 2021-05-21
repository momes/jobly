"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 50000,
    equity: 0.005,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);

    expect(job).toEqual({
      id: job.id,
      title: "new",
      salary: 50000,
      equity: '0.005',
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
           FROM jobs
           WHERE title=$1`, ["new"]);
    expect(result.rows).toEqual([
      {
        id: result.rows[0].id,
        title: "new",
        salary: 50000,
        equity: '0.005',
        companyHandle: "c1",
      }
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */
describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "c1Job",
        salary: 50000,
        equity: '0.0005',
        companyHandle: "c1",
      },
      {
        title: "c2Job",
        salary: 70000,
        equity: '0',
        companyHandle: "c2",
      },
      {
        title: "c3Job",
        salary: 100000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** getJobsOfCompany */
describe("get jobs by company", function () {
  test("works", async function () {
    let jobs = await Job.getJobsOfCompany("c1");
    expect(jobs).toEqual([{
      id: (expect.any(Number)),
      title: "c1Job",
      salary: 50000,
      equity: '0.0005'
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Job.getJobsOfCompany("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** getJobsById */
describe("get", function () {
  test("works", async function () {
    const jobToFind = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToFindID = jobToFind.rows[0].id;
    let job = await Job.get(jobToFindID);
    expect(job).toEqual({
      title: "c1Job",
      salary: 50000,
      equity: '0.0005',
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});



/************************************** update */
describe("update", function () {
  const updateData = {
    title: "c1JobNEW",
    salary: 100000,
    equity: 0.001,
  };

  test("works", async function () {
    const jobToUpdate = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const jobToUpdateID = jobToUpdate.rows[0].id;

    let job = await Job.update(jobToUpdateID, updateData);
    expect(job).toEqual({
      id: job.id,
      title: "c1JobNEW",
      salary: 100000,
      equity: '0.001',
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`);
    expect(result.rows).toEqual([{
      title: "c1JobNEW",
      salary: 100000,
      equity: '0.001',
      companyHandle: "c1",
    }]);
  });

  test("works: null fields", async function () {
    const jobToUpdate = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const jobToUpdateID = jobToUpdate.rows[0].id;


    const updateDataSetNulls = {
      title: "c1JobNEW",
      salary: 100000,
      equity: null,
    };
    let job = await Job.update(jobToUpdateID, updateDataSetNulls);
    expect(job).toEqual({
      id: job.id,
      title: "c1JobNEW",
      salary: 100000,
      equity: null,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
          FROM jobs
          WHERE id = ${job.id}`);
    expect(result.rows).toEqual([{
      title: "c1JobNEW",
      salary: 100000,
      equity: null,
      companyHandle: "c1",
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const jobToUpdate = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const jobToUpdateID = jobToUpdate.rows[0].id;
    try {
      await Job.update(jobToUpdateID, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request if trying to change id", async function () {
    const jobToUpdate = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const jobToUpdateID = jobToUpdate.rows[0].id;
    const updateData = {
      id: 10
    };
    try {
      await Job.update(jobToUpdateID, updateData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request if trying to change handle", async function () {
    const jobToUpdate = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const jobToUpdateID = jobToUpdate.rows[0].id;
    const updateData = {
      companyHandle: 'badhandle'
    };
    try {
      await Job.update(jobToUpdateID, updateData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });


});


/************************************** remove */
describe("remove", function () {
  test("works", async function () {
    const jobToDelete = await db.query(
      `SELECT id
         FROM jobs
         WHERE company_handle = 'c1'`);
    const deleteJobID = jobToDelete.rows[0].id;
    const result = await Job.remove(deleteJobID);
    const res = await db.query(
      `SELECT title FROM jobs WHERE id=${deleteJobID}`);
    expect(res.rows.length).toEqual(0);
    expect(result.id).toEqual(deleteJobID);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** filter */
describe("filter", function () {
  test("works with three filters", async function () {
    const searchParams = {
      title: 'c',
      minSalary: 50000,  
      hasEquity: false, 
    }
    let jobs = await Job.filter(searchParams);
    expect(jobs).toEqual([
      { companyName: "C1",
        title: "c1Job",
        salary: 50000,
        equity: '0.0005',
        id: (expect.any(Number)),
        companyHandle: "c1"
      },
      { companyName: "C2",
        title: "c2Job",
        salary: 70000,
        equity: '0',
        id: (expect.any(Number)),
        companyHandle: "c2"
      },
      { companyName: "C3",
        title: "c3Job",
        salary: 100000,
        equity: null,
        id: (expect.any(Number)),
        companyHandle: "c3"
      },
    ]);
  });

  test("works with two filters", async function () {
    const searchParams = {
      title: 'c1Job',
      minSalary: 40000,  
      hasEquity: true,
    }
    let jobs = await Job.filter(searchParams);
    expect(jobs).toEqual([
      { companyName: "C1",
        id: (expect.any(Number)),
        title: "c1Job",
        salary: 50000,
        equity: '0.0005',
        companyHandle: "c1"
      },
    ]);
  });

  test("works with one filter", async function () {
    const searchParams = {
      minSalary: 90000, 
    }
    let jobs = await Job.filter(searchParams);
    expect(jobs).toEqual([
      { companyName: "C3",
        id: (expect.any(Number)),
        title: "c3Job",
        salary: 100000,
        equity: null,
        companyHandle: "c3"
      }
    ]);
  });

  test("404 Error search params are valid but no results are matched", async function () {
    const searchParams = {
      title: 'jobdoesntexist',
      minSalary: 50000,  
      hasEquity: true, 
    }
    try {
      await Job.filter(searchParams);
      fail();
      } catch (err) {
        console.log('reaching catch');
        expect(err instanceof NotFoundError).toBeTruthy();
      }
  });
});


describe("_sqlForFilterSearchJobs", function () {
  test("works for all three filter params", function () {
    const searchParams = {
      title: 'testTITLE',
      minSalary: '50000',  
      hasEquity: 'true'
    };
    const query = Job._sqlForFilterSearchJobs(searchParams);
    expect(query).toEqual({ querySql: `
      SELECT 
        id,
        title,
        salary,
        equity,
        company_handle AS "companyHandle",
        c.name As "companyName"
      FROM jobs
      JOIN companies AS c on company_handle=c.handle
      WHERE title ILIKE $1 AND salary >= $2 AND equity > $3
      ORDER BY c.name`,

      searchValues:
      ['%testTITLE%', 50000, 0]
      });
  });

  test("works for 2 of three filter params, hasEquity is false, returns no equity filter in query", function () {
    const searchParams = {
      title: 'testTITLE',
      hasEquity: 'false'
    };
    const query = Job._sqlForFilterSearchJobs(searchParams);
    expect(query).toEqual({ querySql: `
      SELECT 
        id,
        title,
        salary,
        equity,
        company_handle AS "companyHandle",
        c.name As "companyName"
      FROM jobs
      JOIN companies AS c on company_handle=c.handle
      WHERE title ILIKE $1
      ORDER BY c.name`,

      searchValues:
      ['%testTITLE%']
    });
  });

  test("works for 1 of three filter params", function () {
    const searchParams = {
      minSalary: '50000',
    };
    const query = Job._sqlForFilterSearchJobs(searchParams);
    expect(query).toEqual({ querySql: `
      SELECT 
        id,
        title,
        salary,
        equity,
        company_handle AS "companyHandle",
        c.name As "companyName"
      FROM jobs
      JOIN companies AS c on company_handle=c.handle
      WHERE salary >= $1
      ORDER BY c.name`,

      searchValues:
      [50000]
    });
  });

  test("400 if no filter params provided", function () {
    const searchParams = {};
    try {
      Job._sqlForFilterSearchJobs(searchParams);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("400 if invalid filter params provided", function () {
    const searchParams = {
      invalidSearchParam: "badData",
    };
    try {
      Job._sqlForFilterSearchJobs(searchParams);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
  
});

