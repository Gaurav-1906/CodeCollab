const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Helper for safe Redis operations
const safeRedis = async (redis, callback) => {
  if (redis && typeof callback === 'function') {
    try {
      await callback();
    } catch (err) {
      // Silently fail - Redis is optional
    }
  }
};

// @desc    Register a new user
const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ 
        message: userExists.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    const user = await User.create({ username, email, password });

    const gravatar = `https://www.gravatar.com/avatar/${email.toLowerCase().trim()}?d=identicon&s=200`;
    user.avatar = gravatar;
    await user.save();

    const token = generateToken(user._id);

    // Optional Redis cache
    const redis = req.app.get('redis');
    await safeRedis(redis, async () => {
      await redis.setEx(`user:${user._id}`, 3600, JSON.stringify({
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }));
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.status = 'online';
    user.lastSeen = Date.now();
    await user.save();

    const token = generateToken(user._id);

    // Optional Redis cache
    const redis = req.app.get('redis');
    await safeRedis(redis, async () => {
      await redis.setEx(`user:${user._id}`, 3600, JSON.stringify({
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }));
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user
const logoutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      status: 'offline',
      lastSeen: Date.now()
    });

    const redis = req.app.get('redis');
    await safeRedis(redis, async () => {
      await redis.del(`user:${req.user._id}`);
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logoutUser
};