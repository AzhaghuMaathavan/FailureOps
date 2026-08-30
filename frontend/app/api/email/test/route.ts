export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${serverConfig.backendInternalUrl}/api/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.detail || 'SMTP send failed' }, { status: res.status });
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch test email' },
      { status: 500 }
    );
  }
}
