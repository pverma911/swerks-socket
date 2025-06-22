import { Schema } from 'mongoose';

export abstract class BaseModel {
    static getSchemaFields() {
        return {
            isActive: { type: Boolean, default: true }
        };
    }

    static getSchemaOptions() {
        return {
            timestamps: true
        };
    }
}
