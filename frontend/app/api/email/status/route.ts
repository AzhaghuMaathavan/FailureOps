export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { serverConfig } from '@/lib/server/config';

export async function GET() {
  try {
    const res = await fetch(`${serverConfig.backendInternalUrl}/api/email/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ success: res.ok, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to check SMTP status' },
      { status: 500 }
    );
  }
}
