# Volunteer Shift Signup API

A small REST API for volunteer shift signups, built with TypeScript, Express,
MongoDB (Mongoose), and Zod

## Setup

Install the dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```bash
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/volunteer-shifts
```


## Running

```bash
npm run dev        # start the API with auto-reload on http://localhost:3000
npm run seed       # load a few sample volunteers and shifts
npm test           # run the test suite
npm run test:watch # run the tests in watch mode
npm run typecheck  # type-check without emitting
npm run build      # compile to dist/
npm start          # run the compiled build
```

Check that it is up:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/api/volunteers` | Create a volunteer |
| `GET` | `/api/volunteers` | List volunteers, paginated |
| `GET` | `/api/volunteers/:id` | Fetch one volunteer |
| `GET` | `/api/volunteers/:id/signups` | That volunteer's signups |
| `POST` | `/api/shifts` | Create a shift |
| `GET` | `/api/shifts` | List shifts, paginated, `hasAvailability` filter |
| `GET` | `/api/shifts/:id` | Fetch one shift with its confirmed roster |
| `PATCH` | `/api/shifts/:id` | Update title, location, times, or capacity |
| `DELETE` | `/api/shifts/:id` | Cancel the shift and all its signups |
| `POST` | `/api/shifts/:shiftId/signups` | Claim a seat (body carries `volunteerId`) |
| `PATCH` | `/api/signups/:id/cancel` | Give the seat back |



```bash
# create a volunteer
curl -X POST http://localhost:3000/api/volunteers \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ann","lastName":"Lee","email":"ann@example.com"}'

# create a shift
curl -X POST http://localhost:3000/api/shifts \
  -H "Content-Type: application/json" \
  -d '{"title":"Food drive","location":"Main hall","startTime":"2030-01-01T09:00:00Z","endTime":"2030-01-01T12:00:00Z","capacity":2}'

# claim a seat, using the ids returned above
curl -X POST http://localhost:3000/api/shifts/<shiftId>/signups \
  -H "Content-Type: application/json" \
  -d '{"volunteerId":"<volunteerId>"}'
```

## Project structure

```
src/
  models/       Mongoose schemas and their TypeScript interfaces
  schemas/      Zod schemas for request bodies, params, and query strings
  services/     Business rules
  controllers/  Read the request, call a service, shape the response
  routes/       Route definitions
  middleware/   validate(), errorHandler(), notFound()
  utils/        AppError, pagination helpers
  app.ts        Express app setup, no listening
  server.ts     Database connection and app.listen()
tests/
```

`app.ts` does not call `listen()`, which is what lets Supertest import the app
directly without opening a real port.
