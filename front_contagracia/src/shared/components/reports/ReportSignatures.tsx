'use client';

import * as React from 'react';
import Image from 'next/image';

export type SignerKey = 'legal_rep' | 'contador' | 'revisor_fiscal';

export const SIGNER_LABELS: Record<SignerKey, string> = {
  legal_rep: 'Representante Legal',
  contador: 'Contador',
  revisor_fiscal: 'Revisor Fiscal',
};

export interface SignerDisplay {
  key: SignerKey;
  label: string;
  name?: string;
  signatureSrc: string;
}

function SignerBlock({ signer }: { signer: SignerDisplay }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 160 }}>
      {/* Espacio para la imagen de la firma */}
      <div className="h-16 w-44 flex items-end justify-center">
        {signer.signatureSrc && (
          <Image
            src={signer.signatureSrc}
            alt={`Firma ${signer.label}`}
            width={176}
            height={64}
            className="object-contain max-h-16"
            unoptimized
          />
        )}
      </div>
      {/* Línea de firma */}
      <div className="border-t border-gray-500 dark:border-gray-400 w-44" />
      {/* Nombre y cargo */}
      <div className="text-center mt-0.5">
        {signer.name && (
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
            {signer.name}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{signer.label}</p>
      </div>
    </div>
  );
}

interface ReportSignaturesProps {
  signers: SignerDisplay[];
}

/**
 * Bloque de firmas estilo diploma al final del reporte.
 *
 * Layout según número de firmantes:
 *  - 1: centrado
 *  - 2: izquierda / derecha
 *  - 3: izquierda / derecha  +  centro abajo
 */
export function ReportSignatures({ signers }: ReportSignaturesProps) {
  if (signers.length === 0) return null;

  if (signers.length === 1) {
    return (
      <div className="mt-16 flex justify-center print:mt-10">
        <SignerBlock signer={signers[0]} />
      </div>
    );
  }

  if (signers.length === 2) {
    return (
      <div className="mt-16 flex justify-between px-12 print:mt-10">
        <SignerBlock signer={signers[0]} />
        <SignerBlock signer={signers[1]} />
      </div>
    );
  }

  // 3 firmantes
  return (
    <div className="mt-16 print:mt-10">
      <div className="flex justify-between px-12">
        <SignerBlock signer={signers[0]} />
        <SignerBlock signer={signers[1]} />
      </div>
      <div className="flex justify-center mt-10">
        <SignerBlock signer={signers[2]} />
      </div>
    </div>
  );
}
