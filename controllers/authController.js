import User from '../models/user.model.js';
import { sendEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// Generate token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  };

  // Remove password from output
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: userResponse,
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
// controllers/authController.js - Register function update
export const register = async (req, res, next) => {
  try {
    const { name, email, password, acceptTerms } = req.body;

    console.log('📝 Registration attempt:', { name, email });

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        success: false,
        message: 'Please accept terms and conditions',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    console.log('✅ User created successfully:', user._id);

    // Generate OTP for email verification
    const OTP = user.generateEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    console.log('📧 Generated OTP:', OTP);

    // Send verification email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification OTP - Mini Moonira',
        template: 'emailVerification',
        data: {
          name: user.name,
          otp: OTP,
        },
      });

      console.log('✅ Verification OTP sent to:', user.email);

      res.status(201).json({
        success: true,
        message: 'Registration successful! OTP sent to your email.',
        userId: user._id,
        email: user.email,
        requiresVerification: true,
      });

    } catch (emailError) {
      console.error('❌ Email sending failed completely:', emailError.message);
      
      // For development - auto verify if email fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ DEVELOPMENT: Auto-verifying email due to SMTP failure');
        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpire = undefined;
        await user.save();
        
        sendTokenResponse(user, 201, res);
      } else {
        // Clean up user if email sending fails in production
        await User.findByIdAndDelete(user._id);
        
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
          error: emailError.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    console.log('🔐 Email verification attempt:', { email, otp });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Find user with valid OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    
    const user = await User.findOne({
      email,
      emailVerificationOTP: hashedOTP,
      emailVerificationOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP has expired',
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpire = undefined;
    await user.save();

    console.log('✅ Email verified successfully for:', user.email);

    // Send token response (auto login after verification)
    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
    });
  }
};

// @desc    Resend verification OTP
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Generate new OTP
    const OTP = user.generateEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    console.log('📧 Resending OTP to:', email, 'OTP:', OTP);

    // Send verification email
    try {
      await sendEmail({
        email: user.email,
        subject: 'New Verification OTP - Mini Moonira',
        template: 'emailVerification',
        data: {
          name: user.name,
          otp: OTP,
        },
      });

      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully to your email',
      });

    } catch (emailError) {
      console.error('❌ Email sending error:', emailError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP',
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('🔑 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check if user exists with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for OTP.',
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Update login info
    await user.updateLoginInfo();

    console.log('✅ Login successful for user:', user._id);

    // Adjust token expiration based on remember me
    if (rememberMe) {
      process.env.JWT_COOKIE_EXPIRE = '30'; // 30 days for remember me
    } else {
      process.env.JWT_COOKIE_EXPIRE = '1'; // 1 day for normal login
    }

    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email',
      });
    }

    // Generate OTP
    const OTP = user.generateResetPasswordOTP();
    await user.save({ validateBeforeSave: false });

    console.log('📧 Password reset OTP for:', email, 'OTP:', OTP);

    // Send OTP email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP - Mini Moonira',
        template: 'passwordReset',
        data: {
          name: user.name,
          otp: OTP,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent successfully to your email',
      });

    } catch (emailError) {
      console.error('❌ Email sending error:', emailError.message);
      
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
    });
  }
};

// @desc    Reset password with OTP
// @route   PUT /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP and new password',
      });
    }

    // Find user with valid OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    
    const user = await User.findOne({
      email,
      resetPasswordOTP: hashedOTP,
      resetPasswordOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP has expired',
      });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();

    console.log('✅ Password reset successful for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phoneNumber: req.body.phoneNumber, // User can add phone number later
      profilePicture: req.body.profilePicture,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
};

// @desc    Logout user
// @route   GET /api/v1/auth/logout
// @access  Private
export const logout = (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};