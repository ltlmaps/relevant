const mongoose = require('mongoose');

const { Schema } = mongoose;

const CommunityMemberSchema = new Schema(
  {
    user: { type: Schema.Types.Mixed, ref: 'User', index: true },
    embeddedUser: {
      _id: String,
      name: String,
      image: String,
      handle: String
    },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
    community: String,
    role: { type: String, default: 'user' },
    reputation: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    invites: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

// TODO rep key to search by
CommunityMemberSchema.virtual('repKey').get(function getProfile() {
  return this.user + '_' + this.communityId;
});

export default mongoose.model('CommunityMember', CommunityMemberSchema);
