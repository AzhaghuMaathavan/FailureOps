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

function renderVerificationEmailHtml(code: string, name: string, email: string, isResend: boolean = false): string {
  const directUrl = `https://failureops.shyxon.com/verify?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
  const title = isResend ? 'New Verification PIN' : 'Verify Your Intelligence Workspace';
  const subtitle = isResend 
    ? 'A new verification code was requested for your account.' 
    : 'Welcome to FailureOps X. Please verify your email to activate your autonomous reasoning enclave:';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Security Verification</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    a, a:link, a:visited { text-decoration: none; color: #ff7a00; }
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; padding: 12px !important; }
      .card-inner { padding: 24px 16px !important; }
      .code-display { font-size: 30px !important; letter-spacing: 8px !important; padding: 16px 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #ff7a00 0%, #ea580c 45%, #38bdf8 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px; letter-spacing: 1px;">FX</td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FAILUREOPS <span style="color: #ff7a00;">X</span></td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
                      &#9679; SECURE ENCLAVE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="card-inner" style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">${title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${name}</strong>, ${subtitle}
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center" style="background: #0d1527; border: 1px solid rgba(255, 122, 0, 0.4); border-radius: 12px; padding: 24px 16px; box-shadow: 0 0 30px rgba(255, 122, 0, 0.12) inset;">
                    <div style="font-size: 11px; font-family: 'SF Mono', Consolas, monospace; color: #ff9838; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                      AUTHENTICATION PIN
                    </div>
                    <div class="code-display" style="font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ff7a00; text-indent: 12px; padding: 8px 0;">
                      ${code}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                      &#128274; Single-use security token &bull; Expires in 15 minutes
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${directUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 15px rgba(255, 122, 0, 0.35); letter-spacing: 0.3px;">
                      Verify &amp; Access Enclave &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c1322; border: 1px solid #19263f; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">SECURITY LEVEL:</span> RESTRICTED
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">ENCRYPTION:</span> TLS 1.3 / AES-256
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">GATEWAY:</span> SMTP SSL-465
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">DOMAIN:</span> failureops.shyxon.com
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                    <strong style="color: #f59e0b;">Security Notice:</strong> FailureOps automated systems will never request your PIN or credentials. If you did not initiate this request, you can safely disregard this message.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8;">FAILUREOPS X &bull; AUTONOMOUS FAILURE INTELLIGENCE ENCLAVE</p>
              <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">
                Dispatched by FailureOps X SMTP Gateway (contact@shyxon.com)<br />
                &copy; 2026 FailureOps X Technologies. All rights reserved. Confidential &amp; Proprietary.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderPasswordResetEmailHtml(code: string, name: string, email: string): string {
  const directUrl = `https://failureops.shyxon.com/forgot-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Password Recovery</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; padding: 12px !important; }
      .code-display { font-size: 30px !important; letter-spacing: 8px !important; padding: 16px 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #f59e0b 0%, #ff7a00 50%, #ef4444 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px;">FX</td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FAILUREOPS <span style="color: #ff7a00;">X</span></td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-family: monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                      &#9888; CREDENTIAL RESET
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Password Recovery Request</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${name}</strong>, a request was submitted to reset your account password. Use the following verification PIN to authorize password reset:
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center" style="background: #0d1527; border: 1px solid rgba(255, 122, 0, 0.4); border-radius: 12px; padding: 24px 16px;">
                    <div style="font-size: 11px; font-family: monospace; color: #ff9838; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">RECOVERY PIN</div>
                    <div class="code-display" style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ff7a00; text-indent: 12px;">${code}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for 15 minutes</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${directUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
                      Reset Password Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center; font-size: 11px; color: #475569;">
              FailureOps X Security Enclave &bull; Dispatched via contact@shyxon.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Dispatch email via internal API / SMTP gateway
async function sendAuthEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string,
  options?: { verificationCode?: string; recipientName?: string; actionUrl?: string; emailType?: string }
): Promise<boolean> {
  try {
    const internalUrl = process.env.RAG_INTERNAL_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${internalUrl}/api/email/share-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: toEmail,
        subject,
        message: textBody,
        html_body: htmlBody,
        project_name: 'FailureOps X Security',
        verification_code: options?.verificationCode,
        recipient_name: options?.recipientName,
        action_url: options?.actionUrl,
        email_type: options?.emailType,
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
    for (const u of Array.from(usersCache.values())) {
      if (u.id === id) return u;
    }
    return null;
  },


  async createUser(input: {
    name: string;
    email: string;
    password: string;
    organizationName?: string;
    isVerified?: boolean;
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
      isVerified: input.isVerified !== undefined ? input.isVerified : true,
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
    const html = renderVerificationEmailHtml(verificationCode, newUser.name, cleanEmail, false);

    await sendAuthEmail(
      cleanEmail,
      `Your FailureOps X Verification Code: ${verificationCode}`,
      html,
      `Your FailureOps X 6-digit verification code is: ${verificationCode}. It expires in 15 minutes.`,
      {
        verificationCode,
        recipientName: newUser.name,
        actionUrl: `https://failureops.shyxon.com/verify?email=${encodeURIComponent(cleanEmail)}&code=${verificationCode}`,
        emailType: 'VERIFICATION',
      }
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

    const html = renderVerificationEmailHtml(code, user.name, cleanEmail, true);

    await sendAuthEmail(
      cleanEmail,
      `Your New FailureOps X Verification Code: ${code}`,
      html,
      `Your new FailureOps X verification code is: ${code}. It expires in 15 minutes.`,
      {
        verificationCode: code,
        recipientName: user.name,
        actionUrl: `https://failureops.shyxon.com/verify?email=${encodeURIComponent(cleanEmail)}&code=${code}`,
        emailType: 'VERIFICATION',
      }
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

    const html = renderPasswordResetEmailHtml(resetCode, user.name, cleanEmail);

    await sendAuthEmail(
      cleanEmail,
      `FailureOps X Password Reset PIN: ${resetCode}`,
      html,
      `Your FailureOps X password reset code is: ${resetCode}. It expires in 15 minutes.`,
      {
        verificationCode: resetCode,
        recipientName: user.name,
        actionUrl: `https://failureops.shyxon.com/forgot-password?email=${encodeURIComponent(cleanEmail)}&code=${resetCode}`,
        emailType: 'PASSWORD_RESET',
      }
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
