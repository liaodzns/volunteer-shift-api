import request from "supertest";
import app from "../src/app";
import { Shift } from "../src/models/Shift";
import { Signup } from "../src/models/Signup";
import { Volunteer } from "../src/models/Volunteer";

const HOUR = 60 * 60 * 1000;

/** Inserts a shift, by default one that starts tomorrow with four seats. */
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

/** Inserts a volunteer with a unique email. */
async function insertVolunteer(email = "ann@example.com") {
  return Volunteer.create({
    firstName: "Ann",
    lastName: "Chen",
    email,
  });
}

describe("POST /api/shifts/:shiftId/signups", () => {
  it("claims a seat and increments the confirmed count", async () => {
    const shift = await insertShift();
    const volunteer = await insertVolunteer();

    const response = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("confirmed");

    const updatedShift = await Shift.findById(shift._id);
    expect(updatedShift?.confirmedCount).toBe(1);
  });

  it("rejects a second signup by the same volunteer", async () => {
    const shift = await insertShift();
    const volunteer = await insertVolunteer();

    await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    const response = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_SIGNED_UP");

    // The rejected attempt must not have taken a seat.
    const updatedShift = await Shift.findById(shift._id);
    expect(updatedShift?.confirmedCount).toBe(1);
  });

  it("rejects a signup for a full shift", async () => {
    const shift = await insertShift({ capacity: 1, confirmedCount: 1 });
    const volunteer = await insertVolunteer();

    const response = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SHIFT_FULL");
  });

  it("rejects a signup for a shift that has already started", async () => {
    const startTime = new Date(Date.now() - 2 * HOUR);
    const shift = await insertShift({
      startTime,
      endTime: new Date(startTime.getTime() + 3 * HOUR),
    });
    const volunteer = await insertVolunteer();

    const response = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("SHIFT_ALREADY_STARTED");
  });

  it("rejects a signup for a cancelled shift", async () => {
    const shift = await insertShift({ status: "cancelled" });
    const volunteer = await insertVolunteer();

    const response = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SHIFT_CANCELLED");
  });

  it("returns 404 when the volunteer or the shift does not exist", async () => {
    const shift = await insertShift();
    const missingId = "64b7f0f0f0f0f0f0f0f0f0f0";
    const volunteer = await insertVolunteer();

    const missingVolunteer = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: missingId });
    expect(missingVolunteer.status).toBe(404);

    const missingShift = await request(app)
      .post(`/api/shifts/${missingId}/signups`)
      .send({ volunteerId: volunteer.id });
    expect(missingShift.status).toBe(404);
  });

  it("returns 400 with field level details for invalid input", async () => {
    const shift = await insertShift();

    const missingBody = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({});
    expect(missingBody.status).toBe(400);
    expect(missingBody.body.error.code).toBe("VALIDATION_ERROR");
    expect(missingBody.body.error.details.volunteerId).toBeDefined();

    const malformedId = await request(app)
      .post("/api/shifts/not-an-id/signups")
      .send({ volunteerId: "64b7f0f0f0f0f0f0f0f0f0f0" });
    expect(malformedId.status).toBe(400);
    expect(malformedId.body.error.details.shiftId).toBeDefined();
  });
});

describe("PATCH /api/signups/:id/cancel", () => {
  it("frees the seat, and a second cancel is rejected", async () => {
    const shift = await insertShift();
    const volunteer = await insertVolunteer();

    const created = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    const cancelled = await request(app).patch(
      `/api/signups/${created.body._id}/cancel`
    );

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("cancelled");
    expect(cancelled.body.cancelledAt).toBeDefined();

    const updatedShift = await Shift.findById(shift._id);
    expect(updatedShift?.confirmedCount).toBe(0);

    const secondCancel = await request(app).patch(
      `/api/signups/${created.body._id}/cancel`
    );

    expect(secondCancel.status).toBe(422);
    expect(secondCancel.body.error.code).toBe("SIGNUP_NOT_ACTIVE");
  });

  it("returns 404 for a signup that does not exist", async () => {
    const response = await request(app).patch(
      "/api/signups/64b7f0f0f0f0f0f0f0f0f0f0/cancel"
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("signing up again after cancelling", () => {
  it("reuses the existing row instead of creating a second one", async () => {
    const shift = await insertShift();
    const volunteer = await insertVolunteer();

    const created = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    await request(app).patch(`/api/signups/${created.body._id}/cancel`);

    const again = await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(again.status).toBe(201);
    expect(again.body._id).toBe(created.body._id);
    expect(again.body.status).toBe("confirmed");
    expect(again.body.cancelledAt).toBeUndefined();

    const rows = await Signup.countDocuments({
      shiftId: shift._id,
      volunteerId: volunteer._id,
    });
    expect(rows).toBe(1);

    const updatedShift = await Shift.findById(shift._id);
    expect(updatedShift?.confirmedCount).toBe(1);
  });
});

describe("two requests racing for the last seat", () => {
  it("gives the seat to exactly one of them", async () => {
    const shift = await insertShift({ capacity: 1 });
    const first = await insertVolunteer("first@example.com");
    const second = await insertVolunteer("second@example.com");

    const responses = await Promise.all([
      request(app)
        .post(`/api/shifts/${shift.id}/signups`)
        .send({ volunteerId: first.id }),
      request(app)
        .post(`/api/shifts/${shift.id}/signups`)
        .send({ volunteerId: second.id }),
    ]);

    const statuses = [responses[0].status, responses[1].status].sort();
    expect(statuses).toEqual([201, 409]);

    const rejected = responses.find((response) => response.status === 409);
    expect(rejected?.body.error.code).toBe("SHIFT_FULL");

    const updatedShift = await Shift.findById(shift._id);
    expect(updatedShift?.confirmedCount).toBe(1);
    expect(updatedShift?.confirmedCount).toBe(updatedShift?.capacity);

    const confirmed = await Signup.countDocuments({
      shiftId: shift._id,
      status: "confirmed",
    });
    expect(confirmed).toBe(1);
  });
});

describe("GET /api/volunteers/:id/signups", () => {
  it("returns the shifts this volunteer has claimed", async () => {
    const shift = await insertShift();
    const volunteer = await insertVolunteer();

    await request(app)
      .post(`/api/shifts/${shift.id}/signups`)
      .send({ volunteerId: volunteer.id });

    const response = await request(app).get(
      `/api/volunteers/${volunteer.id}/signups`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].shiftId.title).toBe("Food bank sorting");
    expect(response.body.pagination.total).toBe(1);
  });

  it("returns 404 for a volunteer that does not exist", async () => {
    const response = await request(app).get(
      "/api/volunteers/64b7f0f0f0f0f0f0f0f0f0f0/signups"
    );

    expect(response.status).toBe(404);
  });
});

describe("overlapping shifts", () => {
  /** Builds a shift running between two offsets, in hours from now. */
  async function insertShiftBetween(
    startHours: number,
    endHours: number,
    title = "Overlapping shift"
  ) {
    return insertShift({
      title,
      startTime: new Date(Date.now() + startHours * HOUR),
      endTime: new Date(Date.now() + endHours * HOUR),
    });
  }

  it("rejects a shift that overlaps one the volunteer already holds", async () => {
    const morning = await insertShiftBetween(24, 27, "Morning sorting");
    const midday = await insertShiftBetween(26, 29, "Midday sorting");
    const volunteer = await insertVolunteer();

    const first = await request(app)
      .post(`/api/shifts/${morning.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/shifts/${midday.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("SCHEDULE_CONFLICT");
    expect(second.body.error.details.conflictingShiftId).toBe(morning.id);

    // The rejected attempt must not have taken a seat on the second shift.
    const updatedMidday = await Shift.findById(midday._id);
    expect(updatedMidday?.confirmedCount).toBe(0);
  });

  it("allows a shift that starts exactly when the held one ends", async () => {
    const morning = await insertShiftBetween(24, 27, "Morning sorting");
    const afternoon = await insertShiftBetween(27, 30, "Afternoon sorting");
    const volunteer = await insertVolunteer();

    await request(app)
      .post(`/api/shifts/${morning.id}/signups`)
      .send({ volunteerId: volunteer.id });

    const response = await request(app)
      .post(`/api/shifts/${afternoon.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(201);

    const updatedAfternoon = await Shift.findById(afternoon._id);
    expect(updatedAfternoon?.confirmedCount).toBe(1);
  });

  it("allows an overlapping shift once the first signup is cancelled", async () => {
    const morning = await insertShiftBetween(24, 27, "Morning sorting");
    const midday = await insertShiftBetween(26, 29, "Midday sorting");
    const volunteer = await insertVolunteer();

    const created = await request(app)
      .post(`/api/shifts/${morning.id}/signups`)
      .send({ volunteerId: volunteer.id });

    await request(app).patch(`/api/signups/${created.body._id}/cancel`);

    const response = await request(app)
      .post(`/api/shifts/${midday.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(201);
  });

  it("only blocks the volunteer who holds the overlapping shift", async () => {
    const morning = await insertShiftBetween(24, 27, "Morning sorting");
    const midday = await insertShiftBetween(26, 29, "Midday sorting");
    const ann = await insertVolunteer("ann@example.com");
    const ben = await insertVolunteer("ben@example.com");

    await request(app)
      .post(`/api/shifts/${morning.id}/signups`)
      .send({ volunteerId: ann.id });

    const response = await request(app)
      .post(`/api/shifts/${midday.id}/signups`)
      .send({ volunteerId: ben.id });

    expect(response.status).toBe(201);
  });

  it("ignores a held shift that was cancelled by the organiser", async () => {
    const morning = await insertShiftBetween(24, 27, "Morning sorting");
    const midday = await insertShiftBetween(26, 29, "Midday sorting");
    const volunteer = await insertVolunteer();

    await request(app)
      .post(`/api/shifts/${morning.id}/signups`)
      .send({ volunteerId: volunteer.id });

    await request(app).delete(`/api/shifts/${morning.id}`);

    const response = await request(app)
      .post(`/api/shifts/${midday.id}/signups`)
      .send({ volunteerId: volunteer.id });

    expect(response.status).toBe(201);
  });
});
