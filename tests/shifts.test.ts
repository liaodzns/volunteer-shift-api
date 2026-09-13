import request from "supertest";
import app from "../src/app";
import { Shift } from "../src/models/Shift";
import { Signup } from "../src/models/Signup";
import { Volunteer } from "../src/models/Volunteer";

const HOUR = 60 * 60 * 1000;

/** Builds a valid create-shift body starting a day from now. */
function futureShiftBody(overrides: Record<string, unknown> = {}) {
  const startTime = new Date(Date.now() + 24 * HOUR);
  const endTime = new Date(startTime.getTime() + 3 * HOUR);

  return {
    title: "Food bank sorting",
    location: "Warehouse 3",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    capacity: 4,
    ...overrides,
  };
}

/** Inserts a shift directly, so a test can set confirmedCount or status. */
async function insertShift(overrides: Record<string, unknown> = {}) {
  const startTime = new Date(Date.now() + 24 * HOUR);

  return Shift.create({
    title: "Food bank sorting",
    location: "Warehouse 3",
    startTime,
    endTime: new Date(startTime.getTime() + 3 * HOUR),
    capacity: 4,
    ...overrides,
  });
}

describe("POST /api/shifts", () => {
  it("creates a shift that starts empty and open", async () => {
    const response = await request(app)
      .post("/api/shifts")
      .send(futureShiftBody());

    expect(response.status).toBe(201);
    expect(response.body.confirmedCount).toBe(0);
    expect(response.body.status).toBe("open");
    expect(response.body._id).toBeDefined();
  });

  it("rejects a shift that ends before it starts", async () => {
    const startTime = new Date(Date.now() + 24 * HOUR);
    const endTime = new Date(startTime.getTime() - HOUR);

    const response = await request(app).post("/api/shifts").send(
      futureShiftBody({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.endTime).toBeDefined();
  });
});

describe("GET /api/shifts", () => {
  it("returns every shift with paging metadata by default", async () => {
    await insertShift();
    await insertShift({ capacity: 2, confirmedCount: 2 });

    const response = await request(app).get("/api/shifts");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination.total).toBe(2);
  });

  it("hides full and cancelled shifts when hasAvailability is true", async () => {
    const open = await insertShift({ capacity: 4, confirmedCount: 1 });
    await insertShift({ capacity: 2, confirmedCount: 2 });
    await insertShift({ status: "cancelled" });

    const response = await request(app)
      .get("/api/shifts")
      .query({ hasAvailability: "true" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]._id).toBe(open.id);
  });
});

describe("GET /api/shifts/:id", () => {
  it("returns the remaining seats and the confirmed roster", async () => {
    const shift = await insertShift({ capacity: 4, confirmedCount: 1 });
    const volunteer = await Volunteer.create({
      firstName: "Ann",
      lastName: "Chen",
      email: "ann@example.com",
    });
    await Signup.create({ shiftId: shift._id, volunteerId: volunteer._id });

    const response = await request(app).get(`/api/shifts/${shift.id}`);

    expect(response.status).toBe(200);
    expect(response.body.spotsRemaining).toBe(3);
    expect(response.body.signups).toHaveLength(1);
    expect(response.body.signups[0].volunteerId.email).toBe("ann@example.com");
  });

  it("returns 404 for an id that does not exist", async () => {
    const response = await request(app).get(
      "/api/shifts/64b7f0f0f0f0f0f0f0f0f0f0"
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/shifts/:id", () => {
  it("updates the fields that were sent and leaves the rest alone", async () => {
    const shift = await insertShift();

    const response = await request(app)
      .patch(`/api/shifts/${shift.id}`)
      .send({ title: "Evening sorting", capacity: 6 });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Evening sorting");
    expect(response.body.capacity).toBe(6);
    expect(response.body.location).toBe("Warehouse 3");
  });

  it("refuses to lower capacity below the confirmed count", async () => {
    const shift = await insertShift({ capacity: 4, confirmedCount: 3 });

    const response = await request(app)
      .patch(`/api/shifts/${shift.id}`)
      .send({ capacity: 2 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("CAPACITY_BELOW_CONFIRMED");
  });

  it("refuses a new start time that falls after the stored end time", async () => {
    const shift = await insertShift();
    const afterEnd = new Date(shift.endTime.getTime() + HOUR);

    const response = await request(app)
      .patch(`/api/shifts/${shift.id}`)
      .send({ startTime: afterEnd.toISOString() });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/shifts/:id", () => {
  it("cancels the shift and every confirmed signup on it", async () => {
    const shift = await insertShift({ capacity: 4, confirmedCount: 1 });
    const volunteer = await Volunteer.create({
      firstName: "Ann",
      lastName: "Chen",
      email: "ann@example.com",
    });
    const signup = await Signup.create({
      shiftId: shift._id,
      volunteerId: volunteer._id,
    });

    const response = await request(app).delete(`/api/shifts/${shift.id}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("cancelled");
    expect(response.body.confirmedCount).toBe(0);

    const cancelledSignup = await Signup.findById(signup._id);
    expect(cancelledSignup?.status).toBe("cancelled");
    expect(cancelledSignup?.cancelledAt).toBeDefined();
  });
});
