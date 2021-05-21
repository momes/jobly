"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
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
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let companies = await Company.findAll();
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let company = await Company.get("c1");
    expect(company).toEqual({
      handle: "c1",
      name: "C1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
        "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
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
      minEmployees: 1, 
      maxEmployees: 2, 
      nameLike: 'c'
    }
    let companies = await Company.filter(searchParams);
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    ]);
  });

  test("works with two filters", async function () {
    const searchParams = {
      minEmployees: 1, 
      nameLike: 'c'
    }
    let companies = await Company.filter(searchParams);
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });

  test("works with one filter", async function () {
    const searchParams = {
      minEmployees: 3
    }
    let companies = await Company.filter(searchParams);
    expect(companies).toEqual([
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      }
    ]);
  });

  test("400 Error if min is greater than max", async function () {
    const searchParams = {
      minEmployees: 3,
      maxEmployees: 1
    }
    try {
      await Company.filter(searchParams);
      fail();
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
  });

  test("404 Error search params are valid but no results are matched", async function () {
    const searchParams = {
      minEmployees: 10,
      maxEmployees: 50
    }
    try {
      await Company.filter(searchParams);
      fail();
      } catch (err) {
        console.log('reaching catch');
        expect(err instanceof NotFoundError).toBeTruthy();
      }
  });
});


describe("_sqlForFilterSearchCompanies", function () {
  test("works for all three filter params", function () {
    const searchParams = {
      nameLike: 'net',
      minEmployees: 5,
      maxEmployees: 500,
    };
    const query = Company._sqlForFilterSearchCompanies(searchParams);
    expect(query).toEqual({ querySql: `
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
           ['%net%', 5, 500]
      });
  });

  test("works for 2 of three filter params", function () {
    const searchParams = {
      nameLike: 'net',
      minEmployees: 5
    };
    const query = Company._sqlForFilterSearchCompanies(searchParams);
    expect(query).toEqual({ 
      querySql: `
      SELECT 
        handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
      FROM companies
      WHERE name ILIKE $1 AND num_employees >= $2
      ORDER BY name`,
     
           searchValues:
           ['%net%', 5]
      })
  });

  test("works for 1 of three filter params", function () {
    const searchParams = {
      nameLike: 'net'
    };
    const query = Company._sqlForFilterSearchCompanies(searchParams);
    expect(query).toEqual({ 
      querySql: `
      SELECT 
        handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
      FROM companies
      WHERE name ILIKE $1
      ORDER BY name`,
     
           searchValues:
           ['%net%']
      });
  });

  test("400 if no filter params provided", function () {
    const searchParams = {};
    try {
      Company._sqlForFilterSearchCompanies(searchParams);
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
      Company._sqlForFilterSearchCompanies(searchParams);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});