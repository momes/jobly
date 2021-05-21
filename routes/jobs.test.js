"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 50000,
    equity: 0.005,
    companyHandle: "c1",
  };

  test("ok for users that are admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: resp.body.job.id,
        title: "new",
        salary: 50000,
        equity: '0.005',
        companyHandle: "c1",
      }
    });
  });

  test("not ok for users that are not admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 50000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: "BADSALARYDATA",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
        [
          {
            title: "c1Job",
            salary: 50000,
            equity: '0.0005',
            companyHandle: "c1"
          },
          {
            title: "c2Job",
            salary: 70000,
            equity: '0',
            companyHandle: "c2"
          },
          {
            title: "c3Job",
            salary: 100000,
            equity: null,
            companyHandle: "c3"
          },
        ],
    });
  });
  test("return filtered jobs", async function () {
    const resp = await request(app).get("/jobs?title=c1&hasEquity=true");
    expect(resp.body).toEqual({
      jobs:
        [
          {
            companyHandle: "c1",
            companyName: "C1",
            id: (expect.any(Number)),
            salary: 50000,
            equity: '0.0005',
            title: 'c1Job'
          },
        ],
    });
  });

  test("return filtered jobs after formatting params for JSON validation", async function () {
    const resp = await request(app).get("/jobs?minSalary=90000&hasEquity=false");
    expect(resp.body).toEqual({
      jobs:
        [
          {
            title: "c3Job",
            salary: 100000,
            companyHandle: "c3",
            companyName: "C3",
            id: (expect.any(Number)),
            equity: null,
            title: 'c3Job'
          },
        ],
    });
  });

  test("400 ERROR for invalid JSON schema for query search", async function () {
    const resp = await request(app).get("/jobs?title=c&hasEquity=yes");
    expect(resp.statusCode).toEqual(400);
  });
  
  test("400 ERROR for extra query params", async function () {
    const resp = await request(app).get("/jobs?title=c&&bonusParam=true");
    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const jobToGet = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToGetID = jobToGet.rows[0].id;
    const resp = await request(app).get(`/jobs/${jobToGetID}`);
    expect(resp.body).toEqual({
      job: {
        title: "c1Job",
        salary: 50000,
        equity: '0.0005',
        companyHandle: "c1"
      },
    });
  });

  test("not found for job id that doesnt exist", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request for job id that is not a valid integer id", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {

  test("works for admins", async function () {
    const jobToPatch = await db.query(
      `SELECT id
           FROM jobs
           WHERE company_handle = 'c1'`);
    const jobToPatchID = jobToPatch.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobToPatchID}`)
      .send({
        title: "C1Jobnew",
        salary: 100000,
        equity: 0.5,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: jobToPatchID,
        title: "C1Jobnew",
        salary: 100000,
        equity: '0.5',
        companyHandle: 'c1'
      },
    });
  });

  test("unauth for anon", async function () {
    const jobToPatch = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToPatchID = jobToPatch.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobToPatchID}`)
      .send({
        title: "C1Jobnew",
        salary: 100000,
        equity: 0.5,
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admins", async function () {
    const jobToPatch = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToPatchID = jobToPatch.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobToPatchID}`)
      .send({
        title: "C1Jobnew",
        salary: 100000,
        equity: 0.5,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`)
      .send({
        title: "C1Jobnew",
        salary: 100000,
        equity: 0.5,
      });
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on bad url param id", async function () {
    const resp = await request(app)
      .patch(`/jobs/badIDparam`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on id change attempt", async function () {
    const jobToPatch = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToPatchID = jobToPatch.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobToPatchID}`)
      .send({
        id: 1,
        title: "C1Jobnew",
        salary: 100000,
        equity: 0.5,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const jobToPatch = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToPatchID = jobToPatch.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobToPatchID}`)
      .send({
        title: "C1Jobnew",
        salary: "stringBAD DATA",
        equity: 0.5,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const jobToDelete = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToDeleteID = jobToDelete.rows[0].id;
    const resp = await request(app)
      .delete(`/jobs/${jobToDeleteID}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: jobToDeleteID });
  });

  test("unauth for anon", async function () {
    const jobToDelete = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToDeleteID = jobToDelete.rows[0].id;
    const resp = await request(app)
      .delete(`/jobs/${jobToDeleteID}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non admins", async function () {
    const jobToDelete = await db.query(
      `SELECT id
             FROM jobs
             WHERE company_handle = 'c1'`);
    const jobToDeleteID = jobToDelete.rows[0].id;
    const resp = await request(app)
      .delete(`/jobs/${jobToDeleteID}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });


  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request for bad id url param", async function () {
    const resp = await request(app)
      .delete(`/jobs/badendpoint`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});
