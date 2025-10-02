// backend/models/ResourceUsage.js
const mongoose = require("mongoose");

const QuantitySchema = new mongoose.Schema(
  {
    value: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["kg", "g", "L", "ml", "seeds", "plants"],
      required: true,
    },
  },
  { _id: false }
);

const ResourceUsageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["fertilizer", "seeds", "pesticide"],
      required: true,
      index: true,
    },
    plot: { type: mongoose.Schema.Types.ObjectId, ref: "Plot", required: true },
    fieldName: { type: String }, // if you use subfields inside plots, keep this free text
    date: { type: Date, default: Date.now, index: true },

    // common
    quantity: { type: QuantitySchema, required: true },
    cost: { type: Number, default: 0, min: 0 },

    // fertilizer specific
    fertilizerName: { type: String },
    cropSupported: { type: String },

    // seeds/redo specific
    plantedAreaAcres: { type: Number, min: 0 },

    // pesticide specific
    pesticideNames: [{ type: String }],

    // meta
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

ResourceUsageSchema.index({ plot: 1, date: -1 });

module.exports = mongoose.model("ResourceUsage", ResourceUsageSchema);
