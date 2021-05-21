"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when request user must be an admin
 *
 * If not or anon, raises Unauthorized.
 */

 function ensureUserIsAdmin(req, res, next) {
  try {
    if (!res.locals.user || res.locals.user.isAdmin !== true) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when request user be the logged in user OR admin
 *
 * If not or anon, raises Unauthorized.
 */

 function ensureUserMatchesReqOrAdmin(req, res, next) {
  try {
    if (!res.locals.user || (res.locals.user.username !== req.params.username && res.locals.user.isAdmin !== true)) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/**ensure user for patch and delete user routes is the logged in user */


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureUserIsAdmin,
  ensureUserMatchesReqOrAdmin
};
