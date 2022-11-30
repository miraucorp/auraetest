"use strict";
require("dotenv").config();
const Koa = require("koa");
const variables = require("./variables");
const logMiddleware = require("au-helpers").logger;
const logger = require("./logger");
const requestId = require("au-helpers").requestId;
const responseHandler = require("au-helpers").responseHandler;
const router = require("./routes");
const koaBody = require("koa-body");
const cors = require("koa2-cors");
const tracing = require("au-helpers").tracing;
const context = require("au-helpers").context;
// Init the DB
require("./db/knex-client");

const app = new Koa();

tracing.koaTracer(app, {
  serviceName: variables.serviceName,
  serviceDomain: variables.serviceDomain,
  logger: logger
});

app.use(context.contextMiddleware());
app.use(koaBody());
app.use(tracing.tracingMiddleware());
app.use(tracing.axiosTracingMiddleware());
app.use(requestId());
app.use(logMiddleware({ logger }));
app.use(responseHandler());
app.use(cors({ origin: "*" }));
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const server = app.listen(variables.appPort, () => {
  logger.info(
    `API server listening on ${variables.host}:${variables.appPort}, in ${variables.env
    }`
  );
});

// Expose server
module.exports = server;
