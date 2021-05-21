"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError, ForbiddenError } = require("../expressError");
const { ensureLoggedIn, ensureUserIsAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companyFilterSearchSchema = require("../schemas/companyFilterSearch.json");
const Job = require("../models/job");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: Admin
 */

router.post("/", ensureUserIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, companyNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  //if no filter query, get all companies
  if (Object.keys(req.query).length === 0) {
    const companies = await Company.findAll();
    return res.json({ companies });
  }
  
  //validate query, filters are optional, but no extra queries can be passed
  //change minEmployees and maxEmployees to ints
  let searchData = req.query;
  if (searchData.minEmployees !== undefined) {
    searchData.minEmployees = +searchData.minEmployees;
  }

  if (searchData.maxEmployees !== undefined) {
    searchData.maxEmployees = +searchData.maxEmployees;
  }
  const result = jsonschema.validate(searchData, companyFilterSearchSchema);
  console.log('json schema valid', result);

  //throw error if JSONschema invalid
  if (!result.valid) {
    let errs = result.errors.map(err => err.stack);
    throw new BadRequestError(errs);
  }

  const companies = await Company.filter(searchData);
  return res.json({ companies });
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  try {
    const jobsRes = await Job.getJobsOfCompany(req.params.handle);
    company.jobs = jobsRes;
    return res.json({ company });
  } catch {
    company.jobs = [];
    return res.json({ company });
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: isAdmin
 */

router.patch("/:handle", ensureUserIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, companyUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);

    if (req.body.handle) {
      errs.push("Forbidden: can't change company handle name");
      throw new ForbiddenError(errs);
    }
    
    throw new BadRequestError(errs);
  }

  const company = await Company.update(req.params.handle, req.body);
  return res.json({ company });
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: isAdmin
 */

router.delete("/:handle", ensureUserIsAdmin, async function (req, res, next) {
  await Company.remove(req.params.handle);
  return res.json({ deleted: req.params.handle });
});


module.exports = router;
