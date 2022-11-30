import * as request from "supertest";
import * as server from "../../index";

beforeAll((done) => {
  done();
});

afterAll((done) => {
  server.close(() => {
    done();
  });
});

describe("health", () => {
  test("health is running", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
  });
});
