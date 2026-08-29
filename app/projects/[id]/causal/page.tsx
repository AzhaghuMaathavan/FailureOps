'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Pin } from 'lucide-react';
import { CausalNodeGraph } from '@/components/causal/CausalNodeGraph';
import { ActionPageHeader } from '@/components/causal/ActionChrome';

export default function CausalAnalysisPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [pinNonce, setPinNonce] = useState(0);

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="CASCADE GRAPH"
        title="Causal Analysis"
        description="Link team overload and flaky CI to missed delivery — not just correlation."
        action={{
          label: 'Pin bottleneck',
          icon: <Pin className="h-3.5 w-3.5" aria-hidden="true" />,
          onClick: () => setPinNonce((n) => n + 1),
        }}
      />
      <CausalNodeGraph projectId={projectId} pinNonce={pinNonce} />
    </div>
  );
}
