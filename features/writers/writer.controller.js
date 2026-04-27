import Writer from "../../models/writer.model.js";
import { AppError } from "../../utils/errors.js";

export const getAllWriters = async (req, res) => {
    const { search } = req.query;
    const filter = search
        ? { $or: [{ "name.en": { $regex: search, $options: "i" } }, { "name.bn": { $regex: search } }] }
        : {};
    const writers = await Writer.find(filter).select("name aliases importance").sort({ "name.en": 1 });
    res.json({ success: true, data: writers });
};

export const getWriterById = async (req, res) => {
    const writer = await Writer.findById(req.params.id);
    if (!writer) throw new AppError("Writer not found", 404);
    res.json({ success: true, data: writer });
};

export const createWriter = async (req, res) => {
    const writer = await Writer.create(req.body);
    res.status(201).json({ success: true, data: writer });
};

export const updateWriter = async (req, res) => {
    const writer = await Writer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!writer) throw new AppError("Writer not found", 404);
    res.json({ success: true, data: writer });
};

export const deleteWriter = async (req, res) => {
    const result = await Writer.findByIdAndDelete(req.params.id);
    if (!result) throw new AppError("Writer not found", 404);
    res.json({ success: true, message: "Writer deleted" });
};
