export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  model: string;
  brand: string;
  year: string;
  chassis: string;
  odometer: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  code?: string;
}

export interface PartItem {
  id: string;
  name: string;
  code: string;
  supplier: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
}

export interface OSItemService {
  id: string;
  name: string;
  price: number;
  quantity: number;
  code?: string;
}

export interface OSItemPart {
  id: string;
  name: string;
  code: string;
  salePrice: number;
  quantity: number;
}

export type OSStatus = 'Aberta' | 'Em andamento' | 'Concluída' | 'Entregue';

export interface WorkOrder {
  id: string;
  osNumber: string;
  date: string;
  clientId: string;
  vehicleId: string;
  services: OSItemService[];
  parts: OSItemPart[];
  notes: string;
  status: OSStatus;
  servicesTotal: number;
  partsTotal: number;
  grandTotal: number;
  signature?: string; // Base64 signature SVG/Drawing
  createdAt: string;
}

export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Débito' | 'Crédito' | 'Boleto';
export type BillingStatus = 'Pendente' | 'Parcialmente pago' | 'Pago' | 'Cancelado';

export interface Installment {
  number: number;
  amount: number;
  dueDate: string;
  status: 'Pendente' | 'Pago';
  paidAt?: string;
}

export interface Billing {
  id: string;
  osId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: BillingStatus;
  installments: Installment[];
  dueDate: string;
  createdAt: string;
}

export type TransactionType = 'Entrada' | 'Saída';
export type TransactionCategory = 'Pagamento OS' | 'Compra Peças' | 'Salário' | 'Operacional' | 'Outros';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface CompanySettings {
  id?: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  logoUrl: string;
  autoSequence: boolean;
  nextOSNumber: number;
  pdfNotes: string;
}
