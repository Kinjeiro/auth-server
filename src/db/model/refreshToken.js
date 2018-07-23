import mongoose from 'mongoose';

import { AccessTokenSchema } from './accessToken';

// идентичны
// const RefreshTokenSchema = new mongoose.Schema(AccessTokenSchema.obj);

export default mongoose.model('RefreshToken', AccessTokenSchema);
