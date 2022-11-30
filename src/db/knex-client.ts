import * as Knex from "knex";
import { knexSnakeCaseMappers, Model } from "objection";
import { rds } from "../variables";

export const knex = Knex({
  client: "mysql2",
  connection: {
    database: rds.name,
    user: rds.user,
    password: rds.pass,
    host: rds.host,
    port: rds.port,
  },
  pool: {
    min: 2,
    max: 10,
  },
  ...knexSnakeCaseMappers(),
});

// Bind all models to a knex instance
Model.knex(knex);
