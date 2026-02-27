/**
 * Seeder para integraciones
 */

export interface IntegrationSeed {
  code: string;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  keys: {
    key_name: string;
    key_value: string;
    is_secret: boolean;
  }[];
}

export const integrations: IntegrationSeed[] = [
  {
    code: 'smtp',
    name: 'SMTP',
    type: 'email',
    description: 'Servidor SMTP para envío de correos',
    is_active: true,
    keys: [
      { key_name: 'host', key_value: 'smtp.gmail.com', is_secret: false },
      { key_name: 'port', key_value: '587', is_secret: false },
      { key_name: 'secure', key_value: 'false', is_secret: false },
      { key_name: 'user', key_value: 'danielmontoyaluna67@gmail.com', is_secret: false },
      { key_name: 'password', key_value: 'nbsnetonmmtxmteu', is_secret: true },
      { key_name: 'from_email', key_value: 'danielmontoyaluna67@gmail.com', is_secret: false },
      { key_name: 'from_name', key_value: 'Contagracia', is_secret: false },
    ],
  },
];
