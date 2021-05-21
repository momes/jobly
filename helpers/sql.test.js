
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
