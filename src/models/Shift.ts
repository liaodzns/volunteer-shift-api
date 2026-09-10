import { Schema, model } from "mongoose";

export type ShiftStatus = "open" | "cancelled";

export interface IShift {
  title: string;
  location: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  confirmedCount: number;
  status: ShiftStatus;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    // keep a second source of truth in case there is a mismatch in the document 
    confirmedCount: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["open", "cancelled"],
      default: "open",
    },
  },
  { timestamps: true }
);

export const Shift = model<IShift>("Shift", shiftSchema);
