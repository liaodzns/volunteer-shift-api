import request from "supertest";
import app from "../src/app";

const validVolunteer = {
  firstName: "Ann",
  lastName: "Chen",
  email: "Ann@Example.com",
};

describe("POST /api/volunteers", () => {
  it("creates a volunteer and normalises the email to lowercase", async () => {
    const response = await request(app)
      .post("/api/volunteers")
      .send(validVolunteer);

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("ann@example.com");
    expect(response.body.firstName).toBe("Ann");
    expect(response.body._id).toBeDefined();
  });

  it("rejects a second volunteer with the same email", async () => {
    await request(app).post("/api/volunteers").send(validVolunteer);

    const response = await request(app)
      .post("/api/volunteers")
      .send({ ...validVolunteer, firstName: "Different" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("returns 400 with field level details for invalid input", async () => {
    const response = await request(app)
      .post("/api/volunteers")
      .send({ firstName: "Ann", email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.lastName).toBeDefined();
    expect(response.body.error.details.email).toBeDefined();
  });
});

describe("GET /api/volunteers", () => {
  it("returns the volunteers with paging metadata", async () => {
    await request(app).post("/api/volunteers").send(validVolunteer);

    const response = await request(app).get("/api/volunteers");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
});

describe("GET /api/volunteers/:id", () => {
  it("returns the volunteer when the id exists", async () => {
    const created = await request(app)
      .post("/api/volunteers")
      .send(validVolunteer);

    const response = await request(app).get(
      `/api/volunteers/${created.body._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("ann@example.com");
  });

  it("returns 404 for an id that does not exist", async () => {
    const response = await request(app).get(
      "/api/volunteers/64b7f0f0f0f0f0f0f0f0f0f0"
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a malformed id", async () => {
    const response = await request(app).get("/api/volunteers/not-an-id");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
