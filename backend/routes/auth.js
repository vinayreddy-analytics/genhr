import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Candidate from '../models/Candidate.js';
import Recruiter from '../models/Recruiter.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// REGISTER ROUTE (for new signups)
router.post('/register', async (req, res) => {
  try {
    const { email, password, userType, profileData } = req.body;
    
    console.log('Register attempt:', { email, userType });
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user account
    const user = new User({
      email: normalizedEmail,  // Always lowercase
      password: hashedPassword,
      userType
    });

    await user.save();

    // Create profile based on user type
    if (userType === 'candidate') {
      // Remove email and password fields from profileData
      const { email: _, password: __, confirmPassword: ___, ...cleanProfileData } = profileData;
      
      const candidate = new Candidate({
        userId: user._id,
        email: normalizedEmail,  // Use the same lowercase email
        ...cleanProfileData,     // Use cleaned profile data
      });
      await candidate.save();
    } else if (userType === 'recruiter') {
      // Remove email and password fields from profileData
      const { email: _, password: __, confirmPassword: ___, ...cleanProfileData } = profileData;
      
      const recruiter = new Recruiter({
        userId: user._id,
        email: normalizedEmail,  // Use the same lowercase email
        ...cleanProfileData,     // Use cleaned profile data
      });
      await recruiter.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        userType: user.userType,
        email: normalizedEmail  // Token also uses lowercase
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: normalizedEmail,  // Return lowercase email
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email);

    // Normalize email for lookup
    const normalizedEmail = email.toLowerCase();

    // Find user with case-insensitive search (extra safety)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token with normalized email
    const token = jwt.sign(
      { 
        userId: user._id, 
        userType: user.userType,
        email: user.email  // This is already lowercase from DB
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,  // Lowercase from DB
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// GET /api/auth/me - Verify token and get user info
router.get('/me', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      userType: req.user.userType
    }
  });
});

export default router;