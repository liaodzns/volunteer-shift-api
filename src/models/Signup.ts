import { Schema, Types, model } from "mongoose";

export type SignupStatus = "confirmed" | "cancelled";

export interface ISignup {
  shiftId: Types.ObjectId;
  volunteerId: Types.ObjectId;
  status: SignupStatus;
  signedUpAt: Date;
  cancelledAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// JOIN between a volunteer and a shift
const signupSchema = new Schema<ISignup>(
  {
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift", required: true },
    volunteerId: {
      type: Schema.Types.ObjectId,
      ref: "Volunteer",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    signedUpAt: { type: Date, required: true, default: Date.now },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

// Use MongoDB to enforce that a person cannot hold two signup rows for the same shift
signupSchema.index({ shiftId: 1, volunteerId: 1 }, { unique: true });

// Signups have to be read from both directions
signupSchema.index({ volunteerId: 1 });

export const Signup = model<ISignup>("Signup", signupSchema);
