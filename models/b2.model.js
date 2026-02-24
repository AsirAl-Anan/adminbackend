import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const BATCHES = ["25", "26", "27"];

const b2Schema = new mongoose.Schema({
    name: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
        index: true,
    },
    batches: {
        type: [String],
        enum: BATCHES,
        default: [],
    },
    // GRAMMER PART
    uccharons: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Uccharon",
            }
        ],
        default: [],
    },
    banans: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Banans",
            }
        ],
        default: [],
    },
    shobdoSrenis: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ShobdoSreni",
            }
        ],
        default: [],
    },
    shobdoGothons: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ShobdoGothon",
            }
        ],
        default: [],
    },
    // uposhorgos, prottoys & shomashs UNDER shobdoGothons
    bakkoTottos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "BakkoTotto",
            }
        ],
        default: [],
    },
    sudhoproyogs: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Sudhoproyog",
            }
        ],
        default: [],
    },
    // WRITTEN PART
    poribhashikShobdos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PoribhashikShobdo",
            }
        ],
        default: [],
    },
    onubads: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Onubad",
            }
        ],
        default: [],
    },
    dinolipis: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Dinolipi",
            }
        ],
        default: [],
    },
    obhigotas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Obhigota",
            }
        ],
        default: [],
    },
    vhashonRochonas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "VhashonRochon",
            }
        ],
        default: [],
    },
    protibedonRochonas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ProtibedonRochon",
            }
        ],
        default: [],
    },
    boidutikCithis: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "BoidutikCithi",
            }
        ],
        default: [],
    },
    khudeBartas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "KhudeBarta",
            }
        ],
        default: [],
    },
    potroLikhons: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PotroLikhon",
            }
        ],
        default: [],
    },
    abedonPotros: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "AbedonPotro",
            }
        ],
        default: [],
    },
    sharangshos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Sharangsho",
            }
        ],
        default: [],
    },
    sharmormos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Sharmormo",
            }
        ],
        default: [],
    },
    sharshonkheps: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Sharshonkhep",
            }
        ],
        default: [],
    },
    vhabshomprosharons: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Vhabshomprosharon",
            }
        ],
        default: [],
    },
    shonglapRochonas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ShonglapRochon",
            }
        ],
        default: [],
    },
    khudeGolpoRochonas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "KhudeGolpoRochon",
            }
        ],
        default: [],
    },
    probondhoRochonas: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ProbondhoRochon",
            }
        ],
        default: [],
    }
})

const B2 = academicDb.model("B2", b2Schema);

export default B2;