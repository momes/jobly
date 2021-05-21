"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureUserIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSearchSchema = require("../schemas/jobFilterSearch.json");

const router = new express.Router();


/** POST / { job } =>  { jobs }
 *
 * jobs should be { title, salary, equity, companyHandle }
 *
 * Returns { title, salary, equity, companyHandle }
 *
 * Authorization required: Admin
 */

router.post("/", ensureUserIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 TODO add filters
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  //if no filter query, get all jobs
  if (Object.keys(req.query).length === 0) {
    const jobs = await Job.findAll();
    return res.json({ jobs });
  }

  //validate query, filters are optional, but no extra queries can be passed
  //change hasEquity to boolean
  //change minSalary to int
  
  let searchData = req.query;
  if (searchData.hasEquity !== undefined) {
    if (searchData.hasEquity === "true") {
      searchData.hasEquity = true
    }
    if (searchData.hasEquity === "false") {
      searchData.hasEquity = false
    }
  }

  if (searchData.minSalary !== undefined) {
    searchData.minSalary = +searchData.minSalary;
  }

  //validate search params
  const result = jsonschema.validate(searchData, jobFilterSearchSchema);

  //throw error if JSONschema invalid
  if (!result.valid) {
    let errs = result.errors.map(err => err.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.filter(searchData);
  return res.json({ jobs });
  
});

/** GET /[id]  =>  { job }
 *
 *  
 *   returns { title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  if (isNaN(+req.params.id)) {
    throw new BadRequestError(`Job ID must be an integer: ${req.params.id} invalid`);
  }
  const job = await Job.get(+req.params.id);
  return res.json({ job });
});

/** PATCH /[id] { updateData } => { updatedJobData }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: isAdmin
 */

router.patch("/:id", ensureUserIsAdmin, async function (req, res, next) {
  if (isNaN(+req.params.id)) {
    throw new BadRequestError(`Job ID must be an integer: ${req.params.id} invalid`);
  }

  const validator = jsonschema.validate(req.body, jobUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(+req.params.id, req.body);
  return res.json({ job });
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: isAdmin
 */

router.delete("/:id", ensureUserIsAdmin, async function (req, res, next) {
  if (isNaN(+req.params.id)) {
    throw new BadRequestError(`Job ID must be an integer: ${req.params.id} invalid`);
  }

  const deletedJob = await Job.remove(+req.params.id);
  return res.json({ deleted: deletedJob.id });
});


module.exports = router;
