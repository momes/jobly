
const { sqlForPartialUpdate, sqlForFilterSearchCompanies } = require("./sql");
const { BadRequestError } = require("../expressError");
const { findAll } = require("../models/company");

describe("sqlForPartialUpdate", function () {
  test("works for valid update data and jsToSql col names", function () {
    const testDataToUpdate = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'email@email.com',
    };
    const jsToSql = {
      firstName: 'first_name',
      lastName: 'last_name',
      isAdmin: 'is_admin',
    };
    const { setCols, values } = sqlForPartialUpdate(testDataToUpdate, jsToSql);
      expect(setCols).toEqual('"first_name"=$1, "last_name"=$2, "email"=$3');
      expect(values).toEqual(['John', 'Doe', 'email@email.com']);
  });

  test("400 Bad Request if no test data passed", function () {
    const testDataToUpdate = {};
    const jsToSql = {
      firstName: 'first_name',
      lastName: 'last_name',
      isAdmin: 'is_admin',
    };
    try {
      sqlForPartialUpdate(testDataToUpdate, jsToSql);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});


describe("sqlForFilterSearchCompanies", function () {
  test("works for all three filter params", function () {
    const testDataToSearch = {
      nameLike: 'net',
      maxEmployees: 500,
      minEmployees: 5
    };
    const { whereQuery, values } = sqlForFilterSearchCompanies(testDataToSearch);
      expect(whereQuery).toEqual("name ILIKE $1 AND num_employees <= $2 AND num_employees >= $3");
      expect(values).toEqual(['%net%', 500, 5]);
  });

  test("works for 2 of three filter params", function () {
    const testDataToSearch = {
      nameLike: 'net',
      minEmployees: 5
    };
    const { whereQuery, values } = sqlForFilterSearchCompanies(testDataToSearch);
      expect(whereQuery).toEqual("name ILIKE $1 AND num_employees >= $2");
      expect(values).toEqual(['%net%', 5]);
  });

  test("works for 1 of three filter params", function () {
    const testDataToSearch = {
      nameLike: 'net'
    };
    const { whereQuery, values } = sqlForFilterSearchCompanies(testDataToSearch);
      expect(whereQuery).toEqual("name ILIKE $1");
      expect(values).toEqual(['%net%']);
  });

  test("400 if no filter params provided", function () {
    const testDataToSearch = {};
    try {
      sqlForFilterSearchCompanies(testDataToSearch);
      fail();
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
  });

  test("400 if invalid filter params provided", function () {
    const testDataToSearch = {
      invalidSearchParam: "badData",
    };
    try {
      sqlForFilterSearchCompanies(testDataToSearch);
      fail();
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
  });
});
