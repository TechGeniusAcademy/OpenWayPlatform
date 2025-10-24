import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'html',
    enum: ['html', 'javascript', 'python', 'css', 'other']
  },
  userId: {
    type: Number,  // Изменено с ObjectId на Number, так как используется PostgreSQL
    required: true
  },
  fileSystem: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  filesCount: {
    type: Number,
    default: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware для обновления updatedAt
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Project', projectSchema);
