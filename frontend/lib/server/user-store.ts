import 'server-only';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface UserAuditEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  organizationId: string;
  organizationName: string;
  title: string;
  bio: string;
  role: 'ORGANIZATION_ADMIN' | 'INTELLIGENCE_ANALYST' | 'VIEWER';
  isVerified: boolean;
  verificationCode?: string;
  verificationExpiresAt?: number;
  resetPasswordCode?: string;
  resetPasswordExpiresAt?: number;
  twoFactorEnabled: boolean;
  avatarUrl?: string;
  notifications: {
    emailAlerts: boolean;
    sev1Immediate: boolean;
    weeklyDigest: boolean;
    learningShareApproved: boolean;
  };
  recentActivity: UserAuditEntry[];
  createdAt: number;
  updatedAt: number;
}

// In-memory + file-backed persistent user repository
const USERS_FILE = path.join(process.cwd(), '.user_store.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Default initial user
const DEFAULT_ADMIN: UserRecord = {
  id: 'usr_aurora_lead_881',
  name: 'Lead Intelligence Architect',
  email: 'lead.architect@aurora.tech',
  passwordHash: hashPassword('password123'),
  organizationId: 'org_aurora_technologies',
  organizationName: 'Aurora Technologies',
  title: 'Principal Enclave Architect',
  bio: 'Leading failure intelligence, root cause analysis, and multi-tenant reasoning pipelines across Aurora distributed services.',
  role: 'ORGANIZATION_ADMIN',
  isVerified: true,
  twoFactorEnabled: false,
  notifications: {
    emailAlerts: true,
    sev1Immediate: true,
    weeklyDigest: true,
    learningShareApproved: true,
  },
  recentActivity: [
    {
      id: 'act_1',
      action: 'Enclave Initialized',
      details: 'Created primary failure intelligence reasoning enclave for Aurora Cloud Analytics.',
      timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'act_2',
      action: 'Analysis Dispatched',
      details: 'Executed 7-stage autonomous agent analysis on Aurora project artifacts.',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
  createdAt: Date.now() - 3600000 * 24 * 30,
  updatedAt: Date.now(),
};

// Global memory cache with disk fallback
let usersCache: Map<string, UserRecord> = new Map();
let initialized = false;

function loadUsers(): void {
  if (initialized) return;
  usersCache.set(DEFAULT_ADMIN.email.toLowerCase(), DEFAULT_ADMIN);
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        for (const u of data) {
          usersCache.set(u.email.toLowerCase(), u);
        }
      }
    }
  } catch (err) {
    console.warn('[UserStore] Could not read user store file, using in-memory cache:', err);
  }
  initialized = true;
}

function persistUsers(): void {
  try {
    const list = Array.from(usersCache.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[UserStore] Could not write to user store file:', err);
  }
}

// Dispatch email via internal API / SMTP gateway
async function sendAuthEmail(toEmail: string, subject: string, htmlBody: string, textBody: string): Promise<boolean> {
  try {
    const internalUrl = process.env.RAG_INTERNAL_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${internalUrl}/api/email/share-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: toEmail,
        subject,
        message: textBody,
        project_name: 'FailureOps X Security',
      }),
    });
    return response.ok;
  } catch (err) {
    console.warn('[UserStore] SMTP dispatch failed, fallback logged to console:', err);
    return false;
  }
}

export const userStore = {
  getUserByEmail(email: string): UserRecord | null {
    loadUsers();
    return usersCache.get(email.trim().toLowerCase()) || null;
  },

  getUserById(id: string): UserRecord | null {
    loadUsers();
    for (const u of usersCache.values()) {
      if (u.id === id) return u;
    }
    return null;
  },

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    organizationName?: string;
  }): Promise<{ user: UserRecord; verificationCode: string }> {
    loadUsers();
    const cleanEmail = input.email.trim().toLowerCase();
    if (usersCache.has(cleanEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const verificationCode = generate6DigitCode();
    const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const orgName = input.organizationName?.trim() || `${input.name.trim()}'s Organization`;
    const orgId = `org_${orgName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${userId.slice(-4)}`;

    const newUser: UserRecord = {
      id: userId,
      name: input.name.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(input.password),
      organizationId: orgId,
      organizationName: orgName,
      title: 'Intelligence Lead',
      bio: `Member of ${orgName} intelligence reasoning workspace.`,
      role: 'ORGANIZATION_ADMIN',
      isVerified: false,
      verificationCode,
      verificationExpiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      twoFactorEnabled: false,
      notifications: {
        emailAlerts: true,
        sev1Immediate: true,
        weeklyDigest: true,
        learningShareApproved: true,
      },
      recentActivity: [
        {
          id: `act_${Date.now()}`,
          action: 'Account Created',
          details: 'Account registered. Verification code dispatched via email.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    usersCache.set(cleanEmail, newUser);
    persistUsers();

    // Send verification email
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070b14; color: #f1f5f9; padding: 32px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff7a00; font-size: 24px; font-weight: 800; margin: 0;">FAILUREOPS X</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Organizational Failure Intelligence & Decision Enclave</p>
        </div>
        <div style="background: #0f172a; border: 1px solid #334155; padding: 24px; border-radius: 8px; text-align: center;">
          <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">Hello <strong>${newUser.name}</strong>, please use the following 6-digit verification code to activate your intelligence workspace:</p>
          <div style="background: #1e293b; border: 2px solid #ff7a00; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff7a00;">
            ${verificationCode}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `;

    await sendAuthEmail(
      cleanEmail,
      `Your FailureOps X Verification Code: ${verificationCode}`,
      html,
      `Your FailureOps X 6-digit verification code is: ${verificationCode}. It expires in 15 minutes.`
    );

    return { user: newUser, verificationCode };
  },

  verifyEmail(email: string, code: string): UserRecord {
    loadUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = usersCache.get(cleanEmail);
    if (!user) {
      throw new Error('Account not found.');
    }
    if (user.isVerified) {
      return user;
    }
    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      throw new Error('Invalid verification code. Please check your email and try again.');
    }
    if (user.verificationExpiresAt && Date.now() > user.verificationExpiresAt) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpiresAt = undefined;
    user.updatedAt = Date.now();
    user.recentActivity.unshift({
      id: `act_${Date.now()}`,
      action: 'Email Verified',
      details: 'Account successfully verified and activated.',
      timestamp: new Date().toISOString(),
    });

    usersCache.set(cleanEmail, user);
    persistUsers();
    return user;
  },

  async resendVerificationCode(email: string): Promise<string> {
    loadUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = usersCache.get(cleanEmail);
    if (!user) {
      throw new Error('Account not found.');
    }
    if (user.isVerified) {
      throw new Error('Account is already verified.');
    }

    const code = generate6DigitCode();
    user.verificationCode = code;
    user.verificationExpiresAt = Date.now() + 15 * 60 * 1000;
    user.updatedAt = Date.now();

    usersCache.set(cleanEmail, user);
    persistUsers();

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070b14; color: #f1f5f9; padding: 32px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff7a00; font-size: 24px; font-weight: 800; margin: 0;">FAILUREOPS X</h1>
        </div>
        <div style="background: #0f172a; border: 1px solid #334155; padding: 24px; border-radius: 8px; text-align: center;">
          <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">New Verification Code</h2>
          <p style="color: #cbd5e1; font-size: 14px;">Your new 6-digit verification code is:</p>
          <div style="background: #1e293b; border: 2px solid #ff7a00; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff7a00;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Valid for 15 minutes.</p>
        </div>
      </div>
    `;

    await sendAuthEmail(
      cleanEmail,
      `Your New FailureOps X Verification Code: ${code}`,
      html,
      `Your new FailureOps X verification code is: ${code}.`
    );

    return code;
  },

  async requestPasswordReset(email: string): Promise<string> {
    loadUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = usersCache.get(cleanEmail);
    if (!user) {
      // Return a simulated code to prevent email enumeration
      return '123456';
    }

    const resetCode = generate6DigitCode();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpiresAt = Date.now() + 15 * 60 * 1000;
    user.updatedAt = Date.now();

    usersCache.set(cleanEmail, user);
    persistUsers();

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070b14; color: #f1f5f9; padding: 32px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff7a00; font-size: 24px; font-weight: 800; margin: 0;">FAILUREOPS X</h1>
        </div>
        <div style="background: #0f172a; border: 1px solid #334155; padding: 24px; border-radius: 8px; text-align: center;">
          <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #cbd5e1; font-size: 14px;">We received a request to reset your FailureOps X account password. Use the following 6-digit PIN to proceed:</p>
          <div style="background: #1e293b; border: 2px solid #ff7a00; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff7a00;">
            ${resetCode}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This code will expire in 15 minutes. If you did not request a password reset, please secure your account immediately.</p>
        </div>
      </div>
    `;

    await sendAuthEmail(
      cleanEmail,
      `FailureOps X Password Reset PIN: ${resetCode}`,
      html,
      `Your FailureOps X password reset code is: ${resetCode}. It expires in 15 minutes.`
    );

    return resetCode;
  },

  resetPassword(email: string, code: string, newPassword: string): UserRecord {
    loadUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = usersCache.get(cleanEmail);
    if (!user) {
      throw new Error('Account not found.');
    }
    if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
      throw new Error('Invalid or expired reset code. Please check your email and try again.');
    }
    if (user.resetPasswordExpiresAt && Date.now() > user.resetPasswordExpiresAt) {
      throw new Error('Password reset code has expired. Please request a new one.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.isVerified = true; // Auto-verify on password reset
    user.updatedAt = Date.now();
    user.recentActivity.unshift({
      id: `act_${Date.now()}`,
      action: 'Password Reset',
      details: 'Password was successfully updated via email recovery code.',
      timestamp: new Date().toISOString(),
    });

    usersCache.set(cleanEmail, user);
    persistUsers();
    return user;
  },

  updateProfile(
    userId: string,
    updates: {
      name?: string;
      title?: string;
      organizationName?: string;
      bio?: string;
      avatarUrl?: string;
      twoFactorEnabled?: boolean;
      notifications?: Partial<UserRecord['notifications']>;
    }
  ): UserRecord {
    loadUsers();
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.title !== undefined) user.title = updates.title.trim();
    if (updates.organizationName !== undefined) user.organizationName = updates.organizationName.trim();
    if (updates.bio !== undefined) user.bio = updates.bio.trim();
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    if (updates.twoFactorEnabled !== undefined) user.twoFactorEnabled = updates.twoFactorEnabled;
    if (updates.notifications) {
      user.notifications = { ...user.notifications, ...updates.notifications };
    }

    user.updatedAt = Date.now();
    user.recentActivity.unshift({
      id: `act_${Date.now()}`,
      action: 'Profile Updated',
      details: 'Updated account information and preferences.',
      timestamp: new Date().toISOString(),
    });

    usersCache.set(user.email.toLowerCase(), user);
    persistUsers();
    return user;
  },

  changePassword(userId: string, oldPassword: string, newPassword: string): UserRecord {
    loadUsers();
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    if (user.passwordHash !== hashPassword(oldPassword)) {
      throw new Error('Current password is incorrect.');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = Date.now();
    user.recentActivity.unshift({
      id: `act_${Date.now()}`,
      action: 'Password Changed',
      details: 'Account password updated directly from profile settings.',
      timestamp: new Date().toISOString(),
    });

    usersCache.set(user.email.toLowerCase(), user);
    persistUsers();
    return user;
  },

  authenticate(email: string, password: string): UserRecord {
    loadUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = usersCache.get(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid email or password.');
    }

    user.recentActivity.unshift({
      id: `act_${Date.now()}`,
      action: 'User Login',
      details: 'Authenticated into FailureOps X intelligence workspace.',
      timestamp: new Date().toISOString(),
    });

    usersCache.set(cleanEmail, user);
    persistUsers();
    return user;
  },

  sanitizeUser(user: UserRecord) {
    const { passwordHash, verificationCode, resetPasswordCode, ...safeUser } = user;
    return safeUser;
  },
};
