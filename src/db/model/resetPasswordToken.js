import mongoose from 'mongoose';

import { AccessTokenSchema } from './accessToken';

// идентичны
// const ResetPasswordToken = new mongoose.Schema(AccessTokenSchema.obj);

export default mongoose.model('ResetPasswordToken', AccessTokenSchema);
