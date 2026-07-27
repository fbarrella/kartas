import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

const smtp = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
};

const gmail = {
    user: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD
};

export const emailConfig = {
    provider,
    from: process.env.EMAIL_FROM || (provider === 'gmail' ? gmail.user : smtp.user)
};

const missingVars = provider === 'gmail'
    ? [!gmail.user && 'GMAIL_USER', !gmail.appPassword && 'GMAIL_APP_PASSWORD'].filter(Boolean)
    : [!smtp.host && 'SMTP_HOST', !smtp.user && 'SMTP_USER', !smtp.password && 'SMTP_PASSWORD'].filter(Boolean);

export const isEmailConfigured = missingVars.length === 0;

// Human-readable detail for why email isn't configured, e.g. for surfacing in
// API responses/logs — null once configured.
export const emailConfigStatus = isEmailConfigured
    ? null
    : `EMAIL_PROVIDER=${provider} but missing: ${missingVars.join(', ')}`;

export const transporter = !isEmailConfigured
    ? null
    : provider === 'gmail'
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmail.user, pass: gmail.appPassword }
        })
        : nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: { user: smtp.user, pass: smtp.password }
        });
