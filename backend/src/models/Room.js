const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  language: {
    type: String,
    default: 'javascript',
    enum: ['javascript', 'python', 'java', 'cpp', 'csharp', 'ruby', 'go', 'rust', 'php', 'html', 'css', 'typescript']
  },
  code: {
    type: String,
    default: '' // Initial code content
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false // Only needed if isPrivate is true
  },
  maxParticipants: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Index for faster queries
roomSchema.index({ createdAt: -1 });
roomSchema.index({ 'participants.user': 1 });

module.exports = mongoose.model('Room', roomSchema);