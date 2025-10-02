import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

// যদি index আগে না থাকে তবে text index তৈরি
questionSchema.index({ question: "text", answer: "text" });

// Duplicate model error এড়াতে
export default mongoose.models.Question ||
  mongoose.model("Question", questionSchema);
