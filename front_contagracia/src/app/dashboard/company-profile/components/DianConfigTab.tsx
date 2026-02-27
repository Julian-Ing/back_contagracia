'use client';

import { CertificateCard, InvoiceSoftwareCard, PayrollSoftwareCard } from '@/modules/electronic-documents/components';

export default function DianConfigTab() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <CertificateCard />
      <InvoiceSoftwareCard />
      <PayrollSoftwareCard />
    </div>
  );
}
